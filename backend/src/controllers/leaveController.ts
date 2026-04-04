import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";

const VALID_LEAVE_TYPES = ["ANNUAL", "SICK", "UNPAID"];

const getInclusiveDays = (startDate: Date, endDate: Date): number => {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay) + 1;
};

const formatDate = (date: Date): string =>
  date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const getSupervisedSiteIds = async (supervisorId: string): Promise<string[]> => {
  const links = await prisma.siteSupervisor.findMany({
    where: { userId: supervisorId },
    select: { siteId: true },
  });

  return links.map((link) => link.siteId);
};

const hasDepartmentHeadPrivileges = (req: Request): boolean =>
  !!req.user && (req.user.role === "ADMIN" || req.user.effectiveRole === "DEPARTMENT_HEAD");

const leaveInclude = {
  employee: {
    select: { id: true, fullName: true, username: true, role: true },
  },
  department: {
    select: { id: true, name: true },
  },
  site: {
    select: { id: true, name: true },
  },
  leaveReview: {
    select: { id: true, comment: true, reviewedAt: true, role: true },
    orderBy: { reviewedAt: "desc" },
  },
} satisfies Prisma.LeaveRequestInclude;

const leaveListSelect = {
  id: true,
  startDate: true,
  endDate: true,
  leaveType: true,
  status: true,
  statusBeforeCancellation: true,
  reason: true,
  documentUrl: true,
  createdAt: true,
  updatedAt: true,
  employeeId: true,
  siteId: true,
  departmentId: true,
} satisfies Prisma.LeaveRequestSelect;

type LeaveListRow = Prisma.LeaveRequestGetPayload<{
  select: typeof leaveListSelect;
}>;

const hydrateLeaveRows = async (rows: LeaveListRow[]) => {
  if (rows.length === 0) {
    return [];
  }

  const employeeIds = Array.from(
    new Set(rows.map((row) => row.employeeId).filter((value): value is string => !!value))
  );
  const siteIds = Array.from(
    new Set(rows.map((row) => row.siteId).filter((value): value is string => !!value))
  );
  const departmentIds = Array.from(
    new Set(rows.map((row) => row.departmentId).filter((value): value is string => !!value))
  );
  const leaveRequestIds = rows
    .map((row) => row.id)
    .filter((value): value is string => !!value);

  const [employees, sites, departments, reviews] = await Promise.all([
    employeeIds.length > 0
      ? prisma.user.findMany({
          where: { id: { in: employeeIds } },
          select: { id: true, fullName: true, username: true, role: true },
        })
      : Promise.resolve([]),
    siteIds.length > 0
      ? prisma.site.findMany({
          where: { id: { in: siteIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    departmentIds.length > 0
      ? prisma.department.findMany({
          where: { id: { in: departmentIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    leaveRequestIds.length > 0
      ? prisma.leaveReview.findMany({
          where: { leaveRequestId: { in: leaveRequestIds } },
          select: { id: true, comment: true, reviewedAt: true, role: true, leaveRequestId: true },
          orderBy: { reviewedAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));
  const siteById = new Map(sites.map((site) => [site.id, site]));
  const departmentById = new Map(departments.map((department) => [department.id, department]));
  const reviewsByLeaveRequestId = new Map<string, { id: string; comment: string | null; reviewedAt: Date; role: string }[]>();

  for (const review of reviews) {
    const current = reviewsByLeaveRequestId.get(review.leaveRequestId) || [];
    current.push({
      id: review.id,
      comment: review.comment,
      reviewedAt: review.reviewedAt,
      role: review.role,
    });
    reviewsByLeaveRequestId.set(review.leaveRequestId, current);
  }

  return rows.map((row) => ({
    ...row,
    employee: employeeById.get(row.employeeId) || null,
    site: siteById.get(row.siteId) || null,
    department: departmentById.get(row.departmentId) || null,
    leaveReview: reviewsByLeaveRequestId.get(row.id) || [],
  }));
};

export const leaveController = {
  createLeaveRequest: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const { startDate, endDate, leaveType, reason, departmentId, documentUrl } = req.body;

      if (!startDate || !endDate || !leaveType) {
        res.status(400).json({ message: "Missing required fields" });
        return;
      }

      if (!VALID_LEAVE_TYPES.includes(leaveType)) {
        res.status(400).json({ message: "Invalid leave type" });
        return;
      }

      const parsedStartDate = new Date(startDate);
      const parsedEndDate = new Date(endDate);

      if (Number.isNaN(parsedStartDate.getTime()) || Number.isNaN(parsedEndDate.getTime())) {
        res.status(400).json({ message: "Invalid date format" });
        return;
      }

      if (parsedEndDate < parsedStartDate) {
        res.status(400).json({ message: "End date must be after or equal to start date" });
        return;
      }

      if (leaveType === "SICK") {
        if (!documentUrl || !String(documentUrl).trim()) {
          res.status(400).json({ message: "Medical Document URL is required for Sickleave" });
          return;
        }

        if (!/\.pdf($|\?)/i.test(String(documentUrl).trim())) {
          res.status(400).json({ message: "Medical Document URL must point to a PDF file" });
          return;
        }
      }

      const employee = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: {
          id: true,
          isActive: true,
          siteId: true,
          annualLeaveBalance: true,
        },
      });

      if (!employee || !employee.isActive) {
        res.status(404).json({ message: "Employee not found or inactive" });
        return;
      }

      if (!employee.siteId) {
        res.status(400).json({ message: "Employee must be assigned to a site" });
        return;
      }

      let department;
      if (departmentId) {
        department = await prisma.department.findUnique({
          where: { id: departmentId },
          select: { id: true },
        });

        if (!department) {
          res.status(404).json({ message: "Department not found" });
          return;
        }
      } else {
        department = await prisma.department.findFirst({
          select: { id: true },
          orderBy: { name: "asc" },
        });

        if (!department) {
          try {
            department = await prisma.department.create({
              data: { name: "General" },
              select: { id: true },
            });
          } catch {
            department = await prisma.department.findUnique({
              where: { name: "General" },
              select: { id: true },
            });
          }
        }

        if (!department) {
          res.status(500).json({ message: "Failed to initialize default department" });
          return;
        }
      }

      const requestedDays = getInclusiveDays(parsedStartDate, parsedEndDate);
      if (leaveType === "ANNUAL" && requestedDays > employee.annualLeaveBalance) {
        res.status(400).json({
          message: "Insufficient annual leave balance",
          requestedDays,
          availableBalance: employee.annualLeaveBalance,
        });
        return;
      }

      const leaveRequest = await prisma.leaveRequest.create({
        data: {
          startDate: parsedStartDate,
          endDate: parsedEndDate,
          leaveType,
          reason,
          documentUrl: documentUrl ? String(documentUrl).trim() : undefined,
          employeeId: employee.id,
          siteId: employee.siteId,
          departmentId: department.id,
        },
        include: leaveInclude,
      });

      res.status(201).json({
        message: "Leave request created successfully",
        leaveRequest,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to create leave request", error });
    }
  },

  getMyLeaveRequests: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const leaveRows = await prisma.leaveRequest.findMany({
        where: { employeeId: req.user.userId },
        orderBy: { createdAt: "desc" },
        select: leaveListSelect,
      });

      const leaveRequests = await hydrateLeaveRows(leaveRows);

      res.json({ leaveRequests });
    } catch (error) {
      console.error("getMyLeaveRequests failed", error);
      res.json({ leaveRequests: [], degraded: true });
    }
  },

  cancelLeaveRequest: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const { leaveRequestId } = req.params;

      const leaveRequest = await prisma.leaveRequest.findUnique({
        where: { id: leaveRequestId },
        select: {
          id: true,
          employeeId: true,
          status: true,
          statusBeforeCancellation: true,
        },
      });

      if (!leaveRequest) {
        res.status(404).json({ message: "Leave request not found" });
        return;
      }

      if (leaveRequest.employeeId !== req.user.userId) {
        res.status(403).json({ message: "Forbidden" });
        return;
      }

      if (leaveRequest.status === "PENDING") {
        const updatedLeaveRequest = await prisma.leaveRequest.update({
          where: { id: leaveRequestId },
          data: { status: "CANCELLED" },
          include: leaveInclude,
        });

        res.json({
          message: "Leave request cancelled successfully",
          leaveRequest: updatedLeaveRequest,
        });
        return;
      }

      if (
        leaveRequest.status !== "APPROVED_BY_SUPERVISOR" &&
        leaveRequest.status !== "APPROVED_BY_DEPARTMENT_HEAD"
      ) {
        res.status(400).json({ message: "This leave request cannot be cancelled at its current status" });
        return;
      }

      const updatedLeaveRequest = await prisma.$transaction(async (tx) => {
        const updated = await tx.leaveRequest.update({
          where: { id: leaveRequestId },
          data: {
            status: "CANCELLATION_REQUESTED",
            statusBeforeCancellation: leaveRequest.status,
          },
          include: leaveInclude,
        });

        await tx.leaveReview.create({
          data: {
            leaveRequestId,
            reviewerId: req.user!.userId,
            role: "EMPLOYEE",
            comment: "Cancellation requested by employee",
          },
        });

        return updated;
      });

      res.json({
        message: "Leave cancellation request submitted successfully",
        leaveRequest: updatedLeaveRequest,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to cancel leave request", error });
    }
  },

  getPendingSiteLeaves: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      let whereClause: Prisma.LeaveRequestWhereInput = { status: "PENDING" };

      if (req.user.role === "SUPERVISOR") {
        const supervisedSiteIds = await getSupervisedSiteIds(req.user.userId);
        if (supervisedSiteIds.length === 0) {
          res.status(400).json({ message: "Supervisor has no supervised sites assigned" });
          return;
        }

        whereClause = {
          status: "PENDING",
          siteId: { in: supervisedSiteIds },
        };
      }

      const leaveRows = await prisma.leaveRequest.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        select: leaveListSelect,
      });

      const leaveRequests = await hydrateLeaveRows(leaveRows);

      res.json({ leaveRequests });
    } catch (error) {
      console.error("getPendingSiteLeaves failed", error);
      res.json({ leaveRequests: [], degraded: true });
    }
  },

  getAllLeaves: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      let whereClause: Prisma.LeaveRequestWhereInput = {};

      if (req.user.role === "SUPERVISOR" && !hasDepartmentHeadPrivileges(req)) {
        const supervisedSiteIds = await getSupervisedSiteIds(req.user.userId);
        if (supervisedSiteIds.length === 0) {
          res.status(400).json({ message: "Supervisor has no supervised sites assigned" });
          return;
        }

        whereClause = { siteId: { in: supervisedSiteIds } };
      }

      const leaveRows = await prisma.leaveRequest.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        select: leaveListSelect,
      });

      const leaveRequests = await hydrateLeaveRows(leaveRows);

      res.json({ leaveRequests });
    } catch (error) {
      console.error("getAllLeaves failed", error);
      res.json({ leaveRequests: [], degraded: true });
    }
  },

  reviewLeaveRequest: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const { leaveRequestId } = req.params;
      const { action, comment } = req.body as { action?: string; comment?: string };

      if (!action || !["approve", "reject"].includes(action)) {
        res.status(400).json({ message: "action must be 'approve' or 'reject'" });
        return;
      }

      const leaveRequest = await prisma.leaveRequest.findUnique({
        where: { id: leaveRequestId },
        select: {
          id: true,
          status: true,
          leaveType: true,
          startDate: true,
          endDate: true,
          employeeId: true,
          siteId: true,
          statusBeforeCancellation: true,
          employee: {
            select: {
              role: true,
            },
          },
        },
      });

      if (!leaveRequest) {
        res.status(404).json({ message: "Leave request not found" });
        return;
      }

      const supervisedSiteIds = req.user.role === "SUPERVISOR"
        ? await getSupervisedSiteIds(req.user.userId)
        : [];
      const canActAsDepartmentHead = hasDepartmentHeadPrivileges(req);
      const reviewerUserId = req.user.userId;
      const reviewerRole = req.user.role;
      const canReviewPending = req.user.role === "SUPERVISOR" && supervisedSiteIds.includes(leaveRequest.siteId);
      const canReviewSupervisorPendingAsDepartmentHead =
        canActAsDepartmentHead &&
        leaveRequest.status === "PENDING" &&
        leaveRequest.employee.role === "SUPERVISOR";
      const canReviewDepartmentStage =
        canActAsDepartmentHead && leaveRequest.status === "APPROVED_BY_SUPERVISOR";
      const canReviewCancellation =
        canActAsDepartmentHead && leaveRequest.status === "CANCELLATION_REQUESTED";
      const adminCanAdvance =
        req.user.role === "ADMIN" &&
        (leaveRequest.status === "PENDING" || leaveRequest.status === "APPROVED_BY_SUPERVISOR");

      if (
        !(canReviewPending && leaveRequest.status === "PENDING") &&
        !canReviewSupervisorPendingAsDepartmentHead &&
        !canReviewDepartmentStage &&
        !canReviewCancellation &&
        !adminCanAdvance
      ) {
        res.status(403).json({
          message: "You are not authorized to review this request at its current status",
        });
        return;
      }

      const reviewRoleLabel = reviewerRole === "SUPERVISOR" && canActAsDepartmentHead
        ? "DEPARTMENT_HEAD"
        : reviewerRole;

      await prisma.$transaction(async (tx) => {
        if (leaveRequest.status === "CANCELLATION_REQUESTED") {
          const nextStatus = action === "approve"
            ? "CANCELLED"
            : leaveRequest.statusBeforeCancellation || "APPROVED_BY_DEPARTMENT_HEAD";

          await tx.leaveRequest.update({
            where: { id: leaveRequestId },
            data: {
              status: nextStatus,
              statusBeforeCancellation: null,
            },
          });

          await tx.leaveReview.create({
            data: {
              leaveRequestId,
              reviewerId: reviewerUserId,
              role: reviewRoleLabel,
              comment: comment?.trim() || (action === "approve" ? "Cancellation approved" : "Cancellation rejected"),
            },
          });

          if (
            action === "approve" &&
            leaveRequest.statusBeforeCancellation === "APPROVED_BY_DEPARTMENT_HEAD" &&
            leaveRequest.leaveType === "ANNUAL"
          ) {
            const days = getInclusiveDays(new Date(leaveRequest.startDate), new Date(leaveRequest.endDate));
            await tx.user.update({
              where: { id: leaveRequest.employeeId },
              data: { annualLeaveBalance: { increment: days } },
            });
          }

          return;
        }

        let newStatus: string;
        if (action === "reject") {
          newStatus = "REJECTED";
        } else if (canReviewSupervisorPendingAsDepartmentHead) {
          newStatus = "APPROVED_BY_DEPARTMENT_HEAD";
        } else if (canActAsDepartmentHead && leaveRequest.status === "APPROVED_BY_SUPERVISOR") {
          newStatus = "APPROVED_BY_DEPARTMENT_HEAD";
        } else if (reviewerRole === "SUPERVISOR") {
          newStatus = "APPROVED_BY_SUPERVISOR";
        } else {
          newStatus =
            leaveRequest.status === "PENDING"
              ? "APPROVED_BY_SUPERVISOR"
              : "APPROVED_BY_DEPARTMENT_HEAD";
        }

        await tx.leaveRequest.update({
          where: { id: leaveRequestId },
          data: { status: newStatus },
        });

        await tx.leaveReview.create({
          data: {
            leaveRequestId,
            reviewerId: reviewerUserId,
            role: reviewRoleLabel,
            comment: comment?.trim() || null,
          },
        });

        if (newStatus === "APPROVED_BY_DEPARTMENT_HEAD" && leaveRequest.leaveType === "ANNUAL") {
          const days = getInclusiveDays(new Date(leaveRequest.startDate), new Date(leaveRequest.endDate));
          await tx.user.update({
            where: { id: leaveRequest.employeeId },
            data: { annualLeaveBalance: { decrement: days } },
          });
        }
      });

      res.json({
        message:
          leaveRequest.status === "CANCELLATION_REQUESTED"
            ? `Leave cancellation ${action === "approve" ? "approved" : "rejected"} successfully`
            : `Leave request ${action === "approve" ? "approved" : "rejected"} successfully`,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to review leave request", error });
    }
  },

  downloadSignedLeavePdf: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const { leaveRequestId } = req.params;

      const requester = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: {
          id: true,
          role: true,
          isActive: true,
          canDownloadSignedLeavePdf: true,
        },
      });

      if (!requester || !requester.isActive) {
        res.status(403).json({ message: "Inactive users cannot download signed leave PDFs" });
        return;
      }

      const hasDirectAccess =
        requester.role === "ADMIN" ||
        req.user.effectiveRole === "DEPARTMENT_HEAD" ||
        requester.canDownloadSignedLeavePdf;

      if (!hasDirectAccess) {
        res.status(403).json({ message: "You do not have permission to download signed leave PDFs" });
        return;
      }

      const leaveRequest = await prisma.leaveRequest.findUnique({
        where: { id: leaveRequestId },
        select: {
          id: true,
          leaveType: true,
          status: true,
          startDate: true,
          endDate: true,
          reason: true,
          createdAt: true,
          employee: {
            select: {
              fullName: true,
              username: true,
              role: true,
              annualLeaveBalance: true,
            },
          },
          site: {
            select: {
              name: true,
            },
          },
          department: {
            select: {
              name: true,
            },
          },
          leaveReview: {
            where: { role: "DEPARTMENT_HEAD" },
            orderBy: { reviewedAt: "desc" },
            select: {
              reviewedAt: true,
              reviewer: {
                select: {
                  fullName: true,
                },
              },
            },
          },
        },
      });

      if (!leaveRequest) {
        res.status(404).json({ message: "Leave request not found" });
        return;
      }

      if (leaveRequest.status !== "APPROVED_BY_DEPARTMENT_HEAD") {
        res.status(400).json({ message: "PDF download is available only after final department head approval" });
        return;
      }

      const deptHeadReview = leaveRequest.leaveReview[0];
      const signedBy = deptHeadReview?.reviewer?.fullName ?? "Department Head";
      const signedAt = deptHeadReview?.reviewedAt ?? leaveRequest.createdAt;

      const fileName = `leave-${leaveRequest.id}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=\"${fileName}\"`);

      const qrPayload = JSON.stringify({
        type: "LEAVE_APPROVAL_REFERENCE",
        referenceId: leaveRequest.id,
        employee: leaveRequest.employee.username,
        signedAt: signedAt.toISOString(),
      });
      const qrCodeBuffer = await QRCode.toBuffer(qrPayload, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 160,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      });

      const doc = new PDFDocument({ size: "A4", margin: 48 });
      doc.pipe(res);

      doc.font("Helvetica");

      // --- HEADER ---
      doc.fontSize(12).fillColor("#2b569a").text("Royal Commission for Jubail & Yanbu", 50, 40, { align: "center", width: 500 });
      doc.fontSize(16).fillColor("black").font("Helvetica-Bold").text("LEAVE REQUEST FORM", 50, 65, { align: "center", width: 500 });
      doc.fontSize(10).font("Helvetica").text(`Submission Date: ${formatDate(leaveRequest.createdAt)}`, 50, 85, { align: "right" });
      
      doc.fontSize(11).font("Helvetica-Bold").text("Project: O&M of Computers No. 13690 (POM N-2759) in Yanbu", 50, 95, { align: "center", width: 500 });
      doc.text("Company: Al-Aseel Solutions Ltd.", 50, 110, { align: "center", width: 500 });

      doc.font("Helvetica");

      // --- COLORS & HELPERS ---
      const primaryBlue = "#2b569a";
      const borderColor = "#000000";
      
      let y = 140;
      
      // --- TABLE 1: Applicant Information ---
      doc.rect(50, y, 495, 20).fillAndStroke(primaryBlue, borderColor);
      doc.fillColor("white").font("Helvetica-Bold").text("Applicant Information", 50, y + 6, { align: "center", width: 495 });
      y += 20;

      // Row 1: Employee Name
      doc.rect(50, y, 495, 25).stroke(borderColor);
      doc.rect(50, y, 140, 25).fillAndStroke(primaryBlue, borderColor);
      doc.fillColor("white").text("Employee Name", 55, y + 8);
      doc.fillColor("black").font("Helvetica").text(leaveRequest.employee.fullName, 195, y + 8);
      y += 25;

      // Row 2: Job Title / Dept
      doc.rect(50, y, 495, 25).stroke(borderColor);
      // Col 1
      doc.rect(50, y, 140, 25).fillAndStroke(primaryBlue, borderColor);
      doc.fillColor("white").font("Helvetica-Bold").text("Job Title", 55, y + 8);
      doc.fillColor("black").font("Helvetica").text(leaveRequest.employee.role, 195, y + 8);
      // Col 2
      doc.rect(300, y, 80, 25).fillAndStroke(primaryBlue, borderColor);
      doc.fillColor("white").font("Helvetica-Bold").text("Department", 305, y + 8);
      doc.fillColor("black").font("Helvetica").text(leaveRequest.department?.name ?? "-", 385, y + 8);
      y += 25;

      // Row 3: Start Date / End Date
      doc.rect(50, y, 495, 25).stroke(borderColor);
      // Col 1
      doc.rect(50, y, 140, 25).fillAndStroke(primaryBlue, borderColor);
      doc.fillColor("white").font("Helvetica-Bold").text("Leave Start Date", 55, y + 8);
      doc.fillColor("black").font("Helvetica").text(formatDate(leaveRequest.startDate), 195, y + 8);
      // Col 2
      doc.rect(300, y, 80, 25).fillAndStroke(primaryBlue, borderColor);
      doc.fillColor("white").font("Helvetica-Bold").text("Leave End Date", 305, y + 8);
      doc.fillColor("black").font("Helvetica").text(formatDate(leaveRequest.endDate), 385, y + 8);
      y += 25;

      // Row 4: Requested Days / Balance
      const totalDays = getInclusiveDays(leaveRequest.startDate, leaveRequest.endDate);
      doc.rect(50, y, 495, 25).stroke(borderColor);
      // Col 1
      doc.rect(50, y, 140, 25).fillAndStroke(primaryBlue, borderColor);
      doc.fillColor("white").font("Helvetica-Bold").text("Requested Days", 55, y + 8);
      doc.fillColor("black").font("Helvetica").text(String(totalDays), 195, y + 8);
      // Col 2
      doc.rect(300, y, 80, 25).fillAndStroke(primaryBlue, borderColor);
      doc.fillColor("white").font("Helvetica-Bold").text("Rem. Balance", 305, y + 8);
      doc.fillColor("black").font("Helvetica").text(leaveRequest.employee.annualLeaveBalance !== null ? String(leaveRequest.employee.annualLeaveBalance) : "-", 385, y + 8);
      y += 25;

      // Row 5: Leave Type / Emp Signature
      doc.rect(50, y, 495, 25).stroke(borderColor);
      // Col 1
      doc.rect(50, y, 140, 25).fillAndStroke(primaryBlue, borderColor);
      doc.fillColor("white").font("Helvetica-Bold").text("Leave Type", 55, y + 8);
      doc.fillColor("black").font("Helvetica").text(leaveRequest.leaveType, 195, y + 8);
      // Col 2
      doc.rect(300, y, 80, 25).fillAndStroke(primaryBlue, borderColor);
      doc.fillColor("white").font("Helvetica-Bold").text("Emp Signature", 305, y + 8);
      doc.fillColor("black").font("Helvetica").text("Electronic Signature", 385, y + 8);
      y += 25;

      // Row 6: Supervisor Rec / Sup Signature
      doc.rect(50, y, 495, 25).stroke(borderColor);
      // Col 1
      doc.rect(50, y, 140, 25).fillAndStroke(primaryBlue, borderColor);
      doc.fillColor("white").font("Helvetica-Bold").text("Supervisor Rec.", 55, y + 8);
      
      doc.fillColor("black").font("Helvetica").text("[ X ] Approved     [   ] Rejected", 195, y + 8);

      // Col 2
      doc.rect(300, y, 80, 25).fillAndStroke(primaryBlue, borderColor);
      doc.fillColor("white").font("Helvetica-Bold").text("Sup. Signature", 305, y + 8);
      doc.fillColor("black").font("Helvetica").text("Electronic Signature", 385, y + 8);
      y += 25;

      // Row 7: Notes
      doc.rect(50, y, 495, 40).stroke(borderColor);
      doc.rect(50, y, 140, 40).fillAndStroke(primaryBlue, borderColor);
      doc.fillColor("white").font("Helvetica-Bold").text("Notes", 55, y + 16);
      doc.fillColor("black").font("Helvetica").text(leaveRequest.reason || "None", 195, y + 6, { width: 340, height: 30 });
      y += 40;

      // --- TABLE 2: Management Approval ---
      y += 20;
      doc.rect(50, y, 495, 20).fillAndStroke(primaryBlue, borderColor);
      doc.fillColor("white").font("Helvetica-Bold").text("Management Approval", 50, y + 6, { align: "center", width: 495 });
      y += 20;

      // Row 1: RC Department Director
      doc.rect(50, y, 495, 70).stroke(borderColor);
      doc.rect(50, y, 220, 70).stroke(borderColor); // col 1
      doc.fillColor("black").font("Helvetica").text("RC Department Director:", 55, y + 5);
      
      doc.text("[ X ] Approved", 280, y + 5);
      doc.text("[   ] Rejected", 280, y + 18);
      doc.text(`Signature: ${signedBy}`, 280, y + 36);
      doc.text(`Date: ${formatDate(signedAt)}`, 280, y + 52);

      doc.image(qrCodeBuffer, 470, y + 5, { width: 60 }); 

      y += 70;

      // Row 2: RC Project Manager Signature
      doc.rect(50, y, 495, 55).stroke(borderColor);
      doc.rect(50, y, 220, 55).stroke(borderColor); // col 1
      doc.fillColor("black").font("Helvetica").text("RC Project Manager Signature:", 55, y + 5);
      doc.text("Signature:", 280, y + 5);
      doc.text("Date:", 280, y + 35);
      y += 55;

      // Row 3: Project Manager
      doc.rect(50, y, 495, 55).stroke(borderColor);
      doc.rect(50, y, 220, 55).stroke(borderColor); // col 1
      doc.fillColor("black").font("Helvetica").text("Project Manager:", 55, y + 5);
      doc.text("Signature:", 280, y + 5);
      doc.text("Date:", 280, y + 35);

      doc.end();
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to generate signed leave PDF", error });
      }
    }
  },
};
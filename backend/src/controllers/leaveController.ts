import { Request, Response } from "express";
import { Prisma, PrismaClient } from "@prisma/client";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";

const prisma = new PrismaClient();

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

      doc
        .rect(40, 34, 515, 90)
        .fillAndStroke("#f6f9ff", "#d3e0ff");
      doc.fillColor("#0b3a86");
      doc.fontSize(11).text("Royal Commission LeaveFlow", 56, 52, { align: "left" });
      doc.fontSize(21).text("Leave Approval Certificate", 56, 70, { align: "left" });
      doc
        .fontSize(10)
        .fillColor("#5b6477")
        .text("Official copy for approved leave request", 56, 96, { align: "left" });

      doc
        .roundedRect(415, 52, 118, 54, 8)
        .fillAndStroke("#ecfdf5", "#6abf8f");
      doc.fillColor("#13653f").fontSize(11).text("FINAL APPROVED", 427, 70);
      doc.fillColor("#13653f").fontSize(9).text("Department Head Signed", 425, 86);

      doc.fillColor("black");
      doc.y = 146;

      doc.fontSize(12).text(`Employee: ${leaveRequest.employee.fullName}`);
      doc.text(`Username: ${leaveRequest.employee.username}`);
      doc.text(`Leave Type: ${leaveRequest.leaveType}`);
      doc.text(`Department: ${leaveRequest.department?.name ?? "-"}`);
      doc.text(`Site: ${leaveRequest.site?.name ?? "-"}`);
      doc.text(`Start Date: ${formatDate(leaveRequest.startDate)}`);
      doc.text(`End Date: ${formatDate(leaveRequest.endDate)}`);
      doc.text(`Total Days: ${getInclusiveDays(leaveRequest.startDate, leaveRequest.endDate)}`);
      doc.text(`Status: Final Approval Completed`);

      if (leaveRequest.reason) {
        doc.moveDown(0.6);
        doc.fontSize(11).fillColor("#374151").text("Reason", { underline: true });
        doc.fillColor("black").fontSize(12).text(leaveRequest.reason);
      }

      doc.moveDown(2.2);

      const stampCenterX = 116;
      const stampCenterY = doc.y + 58;
      doc.circle(stampCenterX, stampCenterY, 52).lineWidth(2).stroke("#b42318");
      doc.circle(stampCenterX, stampCenterY, 41).lineWidth(1).stroke("#b42318");
      doc
        .fontSize(10)
        .fillColor("#b42318")
        .text("OFFICIAL", stampCenterX - 26, stampCenterY - 10, { width: 52, align: "center" });
      doc
        .fontSize(8)
        .fillColor("#b42318")
        .text("RCJY", stampCenterX - 18, stampCenterY + 8, { width: 36, align: "center" });

      doc
        .roundedRect(190, stampCenterY - 36, 330, 108, 10)
        .fillAndStroke("#fbfcff", "#d5ddee");
      doc.image(qrCodeBuffer, 430, stampCenterY - 24, { width: 72, height: 72 });
      doc
        .moveTo(208, stampCenterY + 18)
        .lineTo(410, stampCenterY + 18)
        .lineWidth(1)
        .stroke("#9aa4b2");
      doc.fontSize(10).fillColor("#6b7280").text("Department Head Signature", 208, stampCenterY - 20);
      doc.fontSize(16).fillColor("#111827").text(signedBy, 208, stampCenterY - 2);
      doc.fontSize(10).fillColor("#6b7280").text(`Signed on ${formatDate(signedAt)}`, 208, stampCenterY + 28);
      doc.fontSize(8).fillColor("#6b7280").text("Scan to verify reference", 420, stampCenterY + 52, {
        width: 92,
        align: "center",
      });

      doc.moveDown(2);
      doc
        .fontSize(9)
        .fillColor("#9ca3af")
        .text(`Reference: ${leaveRequest.id}`, { align: "center" });

      doc.end();
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to generate signed leave PDF", error });
      }
    }
  },
};
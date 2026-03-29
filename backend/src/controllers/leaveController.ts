import { Request, Response } from "express";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const VALID_LEAVE_TYPES = ["ANNUAL", "SICK", "UNPAID"];

const getInclusiveDays = (startDate: Date, endDate: Date): number => {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay) + 1;
};

const getSupervisedSiteIds = async (supervisorId: string): Promise<string[]> => {
  const sites = await prisma.site.findMany({
    where: { supervisorId },
    select: { id: true },
  });

  return sites.map((site) => site.id);
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

      const leaveRequests = await prisma.leaveRequest.findMany({
        where: { employeeId: req.user.userId },
        orderBy: { createdAt: "desc" },
        include: leaveInclude,
      });

      res.json({ leaveRequests });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leave requests", error });
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

      const leaveRequests = await prisma.leaveRequest.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        include: leaveInclude,
      });

      res.json({ leaveRequests });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending leaves", error });
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

      const leaveRequests = await prisma.leaveRequest.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        include: leaveInclude,
      });

      res.json({ leaveRequests });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch all leaves", error });
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
};
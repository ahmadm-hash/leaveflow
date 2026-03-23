import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const VALID_LEAVE_TYPES = ["ANNUAL", "SICK", "COMPASSIONATE", "UNPAID"];

const getInclusiveDays = (startDate: Date, endDate: Date): number => {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay) + 1;
};

export const leaveController = {
  createLeaveRequest: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const { startDate, endDate, leaveType, reason, departmentId, documentUrl } = req.body;

      if (!startDate || !endDate || !leaveType || !departmentId) {
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

      const department = await prisma.department.findUnique({
        where: { id: departmentId },
        select: { id: true },
      });

      if (!department) {
        res.status(404).json({ message: "Department not found" });
        return;
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
          documentUrl,
          employeeId: employee.id,
          siteId: employee.siteId,
          departmentId,
        },
        include: {
          department: {
            select: {
              id: true,
              name: true,
            },
          },
          site: {
            select: {
              id: true,
              name: true,
            },
          },
        },
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
        include: {
          department: {
            select: {
              id: true,
              name: true,
            },
          },
          site: {
            select: {
              id: true,
              name: true,
            },
          },
          leaveReview: {
            select: {
              id: true,
              comment: true,
              reviewedAt: true,
              role: true,
            },
            orderBy: { reviewedAt: "desc" },
          },
        },
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

      if (leaveRequest.status !== "PENDING") {
        res.status(400).json({ message: "Only pending requests can be cancelled" });
        return;
      }

      const updatedLeaveRequest = await prisma.leaveRequest.update({
        where: { id: leaveRequestId },
        data: { status: "CANCELLED" },
      });

      res.json({
        message: "Leave request cancelled successfully",
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

      const supervisor = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: {
          id: true,
          siteId: true,
          role: true,
        },
      });

      if (!supervisor) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      if (!supervisor.siteId && supervisor.role === "SUPERVISOR") {
        res.status(400).json({ message: "Supervisor has no site assigned" });
        return;
      }

      const whereClause = supervisor.role === "SUPERVISOR"
        ? { siteId: supervisor.siteId!, status: "PENDING" }
        : { status: "PENDING" };

      const leaveRequests = await prisma.leaveRequest.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        include: {
          employee: {
            select: {
              id: true,
              fullName: true,
              username: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
            },
          },
          site: {
            select: {
              id: true,
              name: true,
            },
          },
        },
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

      const reviewer = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { id: true, siteId: true, role: true },
      });

      if (!reviewer) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      const whereClause =
        reviewer.role === "SUPERVISOR" && reviewer.siteId
          ? { siteId: reviewer.siteId }
          : {};

      const leaveRequests = await prisma.leaveRequest.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        include: {
          employee: {
            select: { id: true, fullName: true, username: true },
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
        },
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

      const reviewer = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { id: true, role: true },
      });

      if (!reviewer) {
        res.status(404).json({ message: "Reviewer not found" });
        return;
      }

      const leaveRequest = await prisma.leaveRequest.findUnique({
        where: { id: leaveRequestId },
        select: { id: true, status: true, leaveType: true, startDate: true, endDate: true, employeeId: true },
      });

      if (!leaveRequest) {
        res.status(404).json({ message: "Leave request not found" });
        return;
      }

      // Determine allowed statuses per role
      const canReview =
        (reviewer.role === "SUPERVISOR" && leaveRequest.status === "PENDING") ||
        (reviewer.role === "DEPARTMENT_HEAD" && leaveRequest.status === "APPROVED_BY_SUPERVISOR") ||
        (reviewer.role === "ADMIN" &&
          (leaveRequest.status === "PENDING" || leaveRequest.status === "APPROVED_BY_SUPERVISOR"));

      if (!canReview) {
        res.status(403).json({
          message: "You are not authorized to review this request at its current status",
        });
        return;
      }

      let newStatus: string;
      if (action === "reject") {
        newStatus = "REJECTED";
      } else if (reviewer.role === "DEPARTMENT_HEAD") {
        newStatus = "APPROVED_BY_DEPARTMENT_HEAD";
      } else if (reviewer.role === "SUPERVISOR") {
        newStatus = "APPROVED_BY_SUPERVISOR";
      } else {
        // ADMIN: advance by one step
        newStatus =
          leaveRequest.status === "PENDING"
            ? "APPROVED_BY_SUPERVISOR"
            : "APPROVED_BY_DEPARTMENT_HEAD";
      }

      await prisma.$transaction(async (tx) => {
        await tx.leaveRequest.update({
          where: { id: leaveRequestId },
          data: { status: newStatus },
        });

        await tx.leaveReview.create({
          data: {
            leaveRequestId,
            reviewerId: reviewer.id,
            role: reviewer.role,
            comment: comment?.trim() || null,
          },
        });

        // Deduct annual leave balance on final approval
        if (
          newStatus === "APPROVED_BY_DEPARTMENT_HEAD" &&
          leaveRequest.leaveType === "ANNUAL"
        ) {
          const days = getInclusiveDays(
            new Date(leaveRequest.startDate),
            new Date(leaveRequest.endDate)
          );
          await tx.user.update({
            where: { id: leaveRequest.employeeId },
            data: { annualLeaveBalance: { decrement: days } },
          });
        }
      });

      res.json({ message: `Leave request ${action === "approve" ? "approved" : "rejected"} successfully` });
    } catch (error) {
      res.status(500).json({ message: "Failed to review leave request", error });
    }
  },
};

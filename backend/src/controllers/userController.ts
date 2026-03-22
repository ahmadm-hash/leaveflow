import { Request, Response } from "express";
import { Prisma, PrismaClient } from "@prisma/client";
import { hashPassword } from "../utils/password";

const prisma = new PrismaClient();
const VALID_ROLES = ["EMPLOYEE", "SUPERVISOR", "DEPARTMENT_HEAD", "ADMIN"] as const;

export const userController = {
  // Get current user profile
  getProfile: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: {
          id: true,
          email: true,
          username: true,
          fullName: true,
          role: true,
          annualLeaveBalance: true,
          site: {
            select: {
              id: true,
              name: true,
              location: true,
            },
          },
        },
      });

      res.json({ user });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch profile", error });
    }
  },

  // Update user profile
  updateProfile: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const { fullName, email } = req.body;

      const updatedUser = await prisma.user.update({
        where: { id: req.user.userId },
        data: {
          ...(fullName && { fullName }),
          ...(email && { email }),
        },
        select: {
          id: true,
          email: true,
          username: true,
          fullName: true,
          role: true,
        },
      });

      res.json({
        message: "Profile updated successfully",
        user: updatedUser,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update profile", error });
    }
  },

  // Get all users (Department Head & Admin)
  getAllUsers: async (req: Request, res: Response): Promise<void> => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          username: true,
          fullName: true,
          role: true,
          isActive: true,
          site: {
            select: {
              id: true,
              name: true,
              location: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.json({ users });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users", error });
    }
  },

  // Get users by site (Supervisor only)
  getUsersBySite: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      // Get supervisor's site
      const supervisor = await prisma.user.findUnique({
        where: { id: req.user.userId },
      });

      if (!supervisor?.siteId) {
        res.status(400).json({ message: "Supervisor has no site assigned" });
        return;
      }

      const users = await prisma.user.findMany({
        where: {
          siteId: supervisor.siteId,
          role: "EMPLOYEE",
        },
        select: {
          id: true,
          email: true,
          username: true,
          fullName: true,
          role: true,
          isActive: true,
          annualLeaveBalance: true,
        },
      });

      res.json({ users });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch site users", error });
    }
  },

  // Create user with role-based restrictions
  createUser: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const { email, username, password, fullName, role, siteId } = req.body as {
        email?: string;
        username?: string;
        password?: string;
        fullName?: string;
        role?: string;
        siteId?: string;
      };

      if (!email || !username || !password || !fullName || !role) {
        res.status(400).json({ message: "Missing required fields" });
        return;
      }

      if (!VALID_ROLES.includes(role as (typeof VALID_ROLES)[number])) {
        res.status(400).json({ message: "Invalid role value" });
        return;
      }

      const creator = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: {
          id: true,
          role: true,
          siteId: true,
          isActive: true,
        },
      });

      if (!creator || !creator.isActive) {
        res.status(403).json({ message: "Only active users can create accounts" });
        return;
      }

      let assignedSiteId = siteId?.trim();

      if (creator.role === "SUPERVISOR") {
        if (role !== "EMPLOYEE") {
          res.status(403).json({ message: "Supervisors can only create employee accounts" });
          return;
        }

        if (!creator.siteId) {
          res.status(400).json({ message: "Supervisor must be assigned to a site before creating employees" });
          return;
        }

        const supervisedSite = await prisma.site.findFirst({
          where: {
            id: creator.siteId,
            supervisorId: creator.id,
          },
          select: { id: true },
        });

        if (!supervisedSite) {
          res.status(403).json({
            message: "Only supervisors assigned by the department head can create employee accounts",
          });
          return;
        }

        assignedSiteId = creator.siteId;
      }

      if (creator.role === "DEPARTMENT_HEAD") {
        if (role !== "SUPERVISOR") {
          res.status(403).json({ message: "Department heads can only create supervisor accounts" });
          return;
        }

        if (!assignedSiteId) {
          res.status(400).json({ message: "Site ID is required when creating a supervisor" });
          return;
        }
      }

      if (creator.role === "ADMIN" && (role === "EMPLOYEE" || role === "SUPERVISOR") && !assignedSiteId) {
        res.status(400).json({ message: "Site ID is required for employee and supervisor accounts" });
        return;
      }

      if (assignedSiteId) {
        const site = await prisma.site.findUnique({
          where: { id: assignedSiteId },
          select: { id: true, supervisorId: true },
        });

        if (!site) {
          res.status(400).json({ message: "Invalid site ID" });
          return;
        }

        if (role === "SUPERVISOR" && site.supervisorId) {
          res.status(400).json({ message: "This site already has an assigned supervisor" });
          return;
        }
      }

      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email }, { username }],
        },
      });

      if (existingUser) {
        res.status(400).json({ message: "User already exists" });
        return;
      }

      const hashedPassword = await hashPassword(password);

      const createdUser = await prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
        const user = await transaction.user.create({
          data: {
            email,
            username,
            password: hashedPassword,
            fullName,
            role,
            siteId: assignedSiteId,
          },
          select: {
            id: true,
            email: true,
            username: true,
            fullName: true,
            role: true,
            isActive: true,
            site: {
              select: {
                id: true,
                name: true,
                location: true,
              },
            },
          },
        });

        if (role === "SUPERVISOR" && assignedSiteId) {
          await transaction.site.update({
            where: { id: assignedSiteId },
            data: { supervisorId: user.id },
          });
        }

        return user;
      });

      res.status(201).json({
        message: `${role === "EMPLOYEE" ? "Employee" : role === "SUPERVISOR" ? "Supervisor" : "User"} created successfully`,
        user: createdUser,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to create user", error });
    }
  },

  // Deactivate user
  deactivateUser: async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });

      res.json({ message: "User deactivated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to deactivate user", error });
    }
  },

  // Promote user to supervisor
  promoteToSupervisor: async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, siteId } = req.body;

      if (!userId || !siteId) {
        res.status(400).json({ message: "Missing required fields" });
        return;
      }

      const site = await prisma.site.findUnique({
        where: { id: siteId },
        select: { id: true, supervisorId: true },
      });

      if (!site) {
        res.status(400).json({ message: "Invalid site ID" });
        return;
      }

      if (site.supervisorId && site.supervisorId !== userId) {
        res.status(400).json({ message: "This site already has an assigned supervisor" });
        return;
      }

      await prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
        await transaction.user.update({
          where: { id: userId },
          data: {
            role: "SUPERVISOR",
            siteId,
          },
        });

        await transaction.site.update({
          where: { id: siteId },
          data: { supervisorId: userId },
        });
      });

      res.json({ message: "User promoted to supervisor successfully" });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Failed to promote user", error });
    }
  },
};

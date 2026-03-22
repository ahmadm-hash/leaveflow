import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

      await prisma.user.update({
        where: { id: userId },
        data: {
          role: "SUPERVISOR" as string,
          siteId,
        },
      });

      res.json({ message: "User promoted to supervisor successfully" });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Failed to promote user", error });
    }
  },
};

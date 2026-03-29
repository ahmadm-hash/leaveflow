import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { hashPassword, comparePassword } from "../utils/password";
import { generateToken } from "../utils/jwt";

const prisma = new PrismaClient();

export const authController = {
  // Public self-registration is disabled. Users must be created by authorized staff.
  register: async (req: Request, res: Response): Promise<void> => {
    res.status(403).json({
      message: "Self-registration is disabled. Please contact your supervisor or department head.",
    });
  },

  // Login
  login: async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, password } = req.body as { username?: string; password?: string };
      const normalizedLogin = username?.trim();

      // Validate input
      if (!normalizedLogin || !password) {
        res.status(400).json({ message: "Username and password required" });
        return;
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: normalizedLogin.includes("@")
          ? { email: normalizedLogin.toLowerCase() }
          : { username: normalizedLogin },
      });

      if (!user || !user.isActive) {
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }

      // Compare passwords
      const isPasswordValid = await comparePassword(password, user.password);

      if (!isPasswordValid) {
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }

      // Generate token
      const token = generateToken({
        userId: user.id,
        username: user.username,
        role: user.role,
      });

      // Do not block login if audit storage fails.
      try {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: "LOGIN",
            ipAddress: req.ip || "unknown",
          },
        });
      } catch (auditError) {
        console.warn("Audit log write failed during login", auditError);
      }

      res.json({
        message: "Login successful",
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          delegatedDepartmentHead: user.delegatedDepartmentHead,
          canDownloadSignedLeavePdf: user.canDownloadSignedLeavePdf,
          annualLeaveBalance: user.annualLeaveBalance,
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Login failed", error });
    }
  },

  // Reset password
  resetPassword: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const { userId } = req.params;
      const { newPassword } = req.body;

      if (!newPassword) {
        res.status(400).json({ message: "New password required" });
        return;
      }

      const canResetAnyPassword = req.user.role === "ADMIN" || req.user.effectiveRole === "DEPARTMENT_HEAD";
      const isSelfReset = req.user.userId === userId;

      let canSupervisorResetEmployee = false;
      if (!canResetAnyPassword && !isSelfReset && req.user.role === "SUPERVISOR") {
        const supervisedSites = await prisma.site.findMany({
          where: { supervisorId: req.user.userId },
          select: { id: true },
        });

        const targetEmployee = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, role: true, siteId: true },
        });

        const supervisedSiteIds = supervisedSites.map((site) => site.id);
        canSupervisorResetEmployee =
          !!targetEmployee &&
          targetEmployee.role === "EMPLOYEE" &&
          !!targetEmployee.siteId &&
          supervisedSiteIds.includes(targetEmployee.siteId);
      }

      if (!canResetAnyPassword && !isSelfReset && !canSupervisorResetEmployee) {
        res.status(403).json({ message: "Forbidden: You can only reset your own password" });
        return;
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, isActive: true },
      });

      if (!targetUser || !targetUser.isActive) {
        res.status(404).json({ message: "User not found or inactive" });
        return;
      }

      const hashedPassword = await hashPassword(newPassword);

      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      res.status(500).json({ message: "Password reset failed", error });
    }
  },
};

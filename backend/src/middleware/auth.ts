import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "../utils/jwt";

const prisma = new PrismaClient();

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
        role: string;
        effectiveRole: string;
        delegatedDepartmentHead: boolean;
      };
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Unauthorized: No token provided" });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      res.status(401).json({ message: "Unauthorized: Invalid token" });
      return;
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        role: true,
        delegatedDepartmentHead: true,
        isActive: true,
      },
    });

    if (!currentUser || !currentUser.isActive) {
      res.status(401).json({ message: "Unauthorized: User not found or inactive" });
      return;
    }

    req.user = {
      userId: currentUser.id,
      username: currentUser.username,
      role: currentUser.role,
      delegatedDepartmentHead: currentUser.delegatedDepartmentHead,
      effectiveRole:
        currentUser.role === "SUPERVISOR" && currentUser.delegatedDepartmentHead
          ? "DEPARTMENT_HEAD"
          : currentUser.role,
    };
    next();
  } catch (error) {
    res.status(500).json({ message: "Authentication error" });
  }
};

// Role-based authorization middleware
export const authorizeRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const matchesEffectiveDepartmentHead =
      allowedRoles.includes("DEPARTMENT_HEAD") && req.user.effectiveRole === "DEPARTMENT_HEAD";

    if (!allowedRoles.includes(req.user.role) && !matchesEffectiveDepartmentHead) {
      res
        .status(403)
        .json({ message: "Forbidden: Insufficient permissions" });
      return;
    }

    next();
  };
};

import { Request, Response } from "express";
import { Prisma, PrismaClient } from "@prisma/client";
import { hashPassword } from "../utils/password";

const prisma = new PrismaClient();
const VALID_ROLES = ["EMPLOYEE", "SUPERVISOR", "DEPARTMENT_HEAD", "ADMIN"] as const;

const getSupervisedSiteIds = async (supervisorId: string): Promise<string[]> => {
  const sites = await prisma.site.findMany({
    where: { supervisorId },
    select: { id: true },
    orderBy: { name: "asc" },
  });

  return sites.map((site) => site.id);
};

const userSelect = {
  id: true,
  email: true,
  username: true,
  fullName: true,
  role: true,
  isActive: true,
  annualLeaveBalance: true,
  delegatedDepartmentHead: true,
  site: {
    select: {
      id: true,
      name: true,
      location: true,
    },
  },
  supervisedSites: {
    select: {
      id: true,
      name: true,
      location: true,
    },
    orderBy: { name: "asc" },
  },
} satisfies Prisma.UserSelect;

// Scalar-only select for resilient list queries
const userScalarSelect = {
  id: true,
  email: true,
  username: true,
  fullName: true,
  role: true,
  isActive: true,
  annualLeaveBalance: true,
  delegatedDepartmentHead: true,
  siteId: true,
} satisfies Prisma.UserSelect;

type UserScalarRow = Prisma.UserGetPayload<{ select: typeof userScalarSelect }>;

const hydrateUserRows = async (rows: UserScalarRow[]) => {
  const siteIds = Array.from(new Set(rows.map((r) => r.siteId).filter(Boolean))) as string[];
  const userIds = rows.map((r) => r.id);

  const [sites, supervisorSiteLinks] = await Promise.all([
    siteIds.length > 0
      ? prisma.site.findMany({
          where: { id: { in: siteIds } },
          select: { id: true, name: true, location: true },
        })
      : Promise.resolve([]),
    prisma.site.findMany({
      where: { supervisorId: { in: userIds } },
      select: { id: true, name: true, location: true, supervisorId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const siteById = new Map(sites.map((s) => [s.id, s]));
  const supervisedSitesByUser = new Map<string, { id: string; name: string; location: string }[]>();
  for (const site of supervisorSiteLinks) {
    if (!site.supervisorId) continue;
    const current = supervisedSitesByUser.get(site.supervisorId) ?? [];
    current.push({ id: site.id, name: site.name, location: site.location });
    supervisedSitesByUser.set(site.supervisorId, current);
  }

  return rows.map((row) => ({
    ...row,
    site: row.siteId ? (siteById.get(row.siteId) ?? null) : null,
    supervisedSites: supervisedSitesByUser.get(row.id) ?? [],
  }));
};

const fallbackHydratedUsers = (rows: UserScalarRow[]) =>
  rows.map((row) => ({
    ...row,
    site: null,
    supervisedSites: [] as { id: string; name: string; location: string }[],
  }));

export const userController = {
  getProfile: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: userSelect,
      });

      res.json({ user });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch profile", error });
    }
  },

  updateProfile: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const { fullName, email } = req.body as { fullName?: string; email?: string };

      const updatedUser = await prisma.user.update({
        where: { id: req.user.userId },
        data: {
          ...(fullName && { fullName }),
          ...(email && { email }),
        },
        select: userSelect,
      });

      res.json({
        message: "Profile updated successfully",
        user: updatedUser,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update profile", error });
    }
  },

  getAllUsers: async (_req: Request, res: Response): Promise<void> => {
    try {
      const rows = await prisma.user.findMany({
        select: userScalarSelect,
        orderBy: { createdAt: "desc" },
      });
      let users: Awaited<ReturnType<typeof hydrateUserRows>>;

      try {
        users = await hydrateUserRows(rows);
      } catch (hydrateError) {
        console.error("[getAllUsers] hydrate fallback:", hydrateError);
        users = fallbackHydratedUsers(rows);
      }

      res.json({ users });
    } catch (error) {
      console.error("[getAllUsers] error:", error);
      res.json({ users: [], degraded: true });
    }
  },

  getUsersBySite: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const supervisedSiteIds = await getSupervisedSiteIds(req.user.userId);

      if (supervisedSiteIds.length === 0) {
        res.status(400).json({ message: "Supervisor has no supervised sites assigned" });
        return;
      }

      const rows = await prisma.user.findMany({
        where: {
          siteId: { in: supervisedSiteIds },
          role: "EMPLOYEE",
        },
        select: userScalarSelect,
        orderBy: { fullName: "asc" },
      });

      let users: Awaited<ReturnType<typeof hydrateUserRows>>;
      try {
        users = await hydrateUserRows(rows);
      } catch (hydrateError) {
        console.error("[getUsersBySite] hydrate fallback:", hydrateError);
        users = fallbackHydratedUsers(rows);
      }

      res.json({ users });
    } catch (error) {
      console.error("[getUsersBySite] error:", error);
      res.json({ users: [], degraded: true });
    }
  },

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
          isActive: true,
          delegatedDepartmentHead: true,
        },
      });

      if (!creator || !creator.isActive) {
        res.status(403).json({ message: "Only active users can create accounts" });
        return;
      }

      const creatorActsAsDepartmentHead =
        creator.role === "DEPARTMENT_HEAD" ||
        creator.role === "ADMIN" ||
        (creator.role === "SUPERVISOR" && creator.delegatedDepartmentHead);

      let assignedSiteId = siteId?.trim() || undefined;

      if (creator.role === "SUPERVISOR" && !creator.delegatedDepartmentHead) {
        if (role !== "EMPLOYEE") {
          res.status(403).json({ message: "Supervisors can only create employee accounts" });
          return;
        }

        const supervisedSiteIds = await getSupervisedSiteIds(creator.id);
        if (supervisedSiteIds.length === 0) {
          res.status(400).json({ message: "Supervisor must supervise at least one site before creating employees" });
          return;
        }

        assignedSiteId = assignedSiteId || supervisedSiteIds[0];
        if (!assignedSiteId || !supervisedSiteIds.includes(assignedSiteId)) {
          res.status(403).json({ message: "You can only create employees for your supervised sites" });
          return;
        }
      }

      if (creatorActsAsDepartmentHead && creator.role !== "ADMIN") {
        if (role !== "EMPLOYEE" && role !== "SUPERVISOR") {
          res.status(403).json({ message: "Department head privileges can only create employee or supervisor accounts" });
          return;
        }
      }

      if ((role === "EMPLOYEE" || role === "SUPERVISOR") && !assignedSiteId) {
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
            delegatedDepartmentHead: false,
          },
          select: userSelect,
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

  deactivateUser: async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      await prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
        await transaction.user.update({
          where: { id: userId },
          data: { isActive: false, delegatedDepartmentHead: false },
        });

        await transaction.site.updateMany({
          where: { supervisorId: userId },
          data: { supervisorId: null },
        });
      });

      res.json({ message: "User deactivated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to deactivate user", error });
    }
  },

  promoteToSupervisor: async (req: Request, res: Response): Promise<void> => {
    req.body.enabled = true;
    await userController.toggleSupervisorAccess(req, res);
  },

  toggleSupervisorAccess: async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, enabled, primarySiteId } = req.body as {
        userId?: string;
        enabled?: boolean;
        primarySiteId?: string;
      };

      if (!userId || typeof enabled !== "boolean") {
        res.status(400).json({ message: "userId and enabled are required" });
        return;
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, siteId: true, isActive: true },
      });

      if (!targetUser || !targetUser.isActive) {
        res.status(404).json({ message: "User not found or inactive" });
        return;
      }

      if (targetUser.role === "ADMIN" || targetUser.role === "DEPARTMENT_HEAD") {
        res.status(400).json({ message: "This user role cannot be changed with supervisor access toggle" });
        return;
      }

      if (enabled) {
        const resolvedPrimarySiteId = primarySiteId?.trim() || targetUser.siteId;
        if (!resolvedPrimarySiteId) {
          res.status(400).json({ message: "Primary site is required when enabling supervisor access" });
          return;
        }

        const site = await prisma.site.findUnique({
          where: { id: resolvedPrimarySiteId },
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
              siteId: resolvedPrimarySiteId,
            },
          });

          await transaction.site.update({
            where: { id: resolvedPrimarySiteId },
            data: { supervisorId: userId },
          });
        });

        res.json({ message: "Supervisor access enabled successfully" });
        return;
      }

      await prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
        await transaction.user.update({
          where: { id: userId },
          data: {
            role: "EMPLOYEE",
            delegatedDepartmentHead: false,
          },
        });

        await transaction.site.updateMany({
          where: { supervisorId: userId },
          data: { supervisorId: null },
        });
      });

      res.json({ message: "Supervisor access removed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update supervisor access", error });
    }
  },

  assignSupervisorSites: async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, siteIds } = req.body as { userId?: string; siteIds?: string[] };

      if (!userId || !Array.isArray(siteIds)) {
        res.status(400).json({ message: "userId and siteIds are required" });
        return;
      }

      const normalizedSiteIds = Array.from(new Set(siteIds.map((siteId) => siteId.trim()).filter(Boolean)));

      const supervisor = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, siteId: true },
      });

      if (!supervisor || supervisor.role !== "SUPERVISOR") {
        res.status(400).json({ message: "Target user must be a supervisor" });
        return;
      }

      if (normalizedSiteIds.length > 0) {
        const conflictingSites = await prisma.site.findMany({
          where: {
            id: { in: normalizedSiteIds },
            NOT: { OR: [{ supervisorId: null }, { supervisorId: userId }] },
          },
          select: { name: true },
        });

        if (conflictingSites.length > 0) {
          res.status(400).json({
            message: `Some sites already have other supervisors assigned: ${conflictingSites.map((site) => site.name).join(", ")}`,
          });
          return;
        }
      }

      await prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
        await transaction.site.updateMany({
          where: {
            supervisorId: userId,
            ...(normalizedSiteIds.length > 0 ? { id: { notIn: normalizedSiteIds } } : {}),
          },
          data: { supervisorId: null },
        });

        if (normalizedSiteIds.length > 0) {
          await transaction.site.updateMany({
            where: { id: { in: normalizedSiteIds } },
            data: { supervisorId: userId },
          });
        }

        await transaction.user.update({
          where: { id: userId },
          data: { siteId: normalizedSiteIds[0] ?? null },
        });
      });

      res.json({ message: "Supervisor sites updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update supervisor sites", error });
    }
  },

  setDepartmentHeadDelegation: async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, enabled } = req.body as { userId?: string; enabled?: boolean };

      if (!userId || typeof enabled !== "boolean") {
        res.status(400).json({ message: "userId and enabled are required" });
        return;
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, isActive: true },
      });

      if (!targetUser || !targetUser.isActive) {
        res.status(404).json({ message: "User not found or inactive" });
        return;
      }

      if (targetUser.role !== "SUPERVISOR") {
        res.status(400).json({ message: "Only supervisors can receive department head delegation" });
        return;
      }

      await prisma.user.update({
        where: { id: userId },
        data: { delegatedDepartmentHead: enabled },
      });

      res.json({
        message: enabled
          ? "Department head delegation granted successfully"
          : "Department head delegation removed successfully",
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update department head delegation", error });
    }
  },
};
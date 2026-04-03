import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../utils/password";
const VALID_ROLES = ["EMPLOYEE", "SUPERVISOR", "DEPARTMENT_HEAD", "ADMIN"] as const;

const getSupervisedSiteIds = async (supervisorId: string): Promise<string[]> => {
  const links = await prisma.siteSupervisor.findMany({
    where: { userId: supervisorId },
    select: { siteId: true },
  });

  return links.map((link) => link.siteId);
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
  canDownloadSignedLeavePdf: true,
  site: {
    select: {
      id: true,
      name: true,
      location: true,
    },
  },
  supervisedSites: {
    select: {
      site: {
        select: {
          id: true,
          name: true,
          location: true,
        },
      },
    },
    orderBy: { site: { name: "asc" } },
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
  canDownloadSignedLeavePdf: true,
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
    userIds.length > 0
      ? prisma.siteSupervisor.findMany({
          where: { userId: { in: userIds } },
          select: {
            userId: true,
            site: { select: { id: true, name: true, location: true } },
          },
          orderBy: { site: { name: "asc" } },
        })
      : Promise.resolve([]),
  ]);

  const siteById = new Map(sites.map((s) => [s.id, s]));
  const supervisedSitesByUser = new Map<string, { id: string; name: string; location: string }[]>();
  for (const link of supervisorSiteLinks) {
    const current = supervisedSitesByUser.get(link.userId) ?? [];
    current.push(link.site);
    supervisedSitesByUser.set(link.userId, current);
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
          select: { id: true },
        });

        if (!site) {
          res.status(400).json({ message: "Invalid site ID" });
          return;
        }

        if (role === "SUPERVISOR") {
          const hasOtherSupervisor = await prisma.siteSupervisor.findFirst({
            where: { siteId: assignedSiteId },
          });
          if (hasOtherSupervisor) {
            res.status(400).json({ message: "This site already has an assigned supervisor" });
            return;
          }
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
          await transaction.siteSupervisor.create({
            data: {
              siteId: assignedSiteId,
              userId: user.id,
            },
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

        await transaction.siteSupervisor.deleteMany({
          where: { userId },
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
          select: { id: true },
        });

        if (!site) {
          res.status(400).json({ message: "Invalid site ID" });
          return;
        }

        const existingLink = await prisma.siteSupervisor.findFirst({
          where: {
            siteId: resolvedPrimarySiteId,
            NOT: { userId },
          },
        });

        if (existingLink) {
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

          const existing = await transaction.siteSupervisor.findUnique({
            where: { siteId_userId: { siteId: resolvedPrimarySiteId, userId } },
          });
          if (!existing) {
            await transaction.siteSupervisor.create({
              data: {
                siteId: resolvedPrimarySiteId,
                userId,
              },
            });
          }
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

        await transaction.siteSupervisor.deleteMany({
          where: { userId },
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
        select: { id: true, role: true },
      });

      if (!supervisor || supervisor.role !== "SUPERVISOR") {
        res.status(400).json({ message: "Target user must be a supervisor" });
        return;
      }

      // Validate all sites exist
      if (normalizedSiteIds.length > 0) {
        const existingSites = await prisma.site.findMany({
          where: { id: { in: normalizedSiteIds } },
          select: { id: true },
        });

        if (existingSites.length !== normalizedSiteIds.length) {
          res.status(400).json({ message: "Some sites do not exist" });
          return;
        }
      }

      await prisma.$transaction(async (transaction) => {
        // Remove all existing site assignments for this supervisor
        await transaction.siteSupervisor.deleteMany({
          where: { userId },
        });

        // Create new site assignments
        if (normalizedSiteIds.length > 0) {
          await transaction.siteSupervisor.createMany({
            data: normalizedSiteIds.map((siteId) => ({
              siteId,
              userId,
            })),
            skipDuplicates: true,
          });

          // Update user's primary site to first assigned site
          await transaction.user.update({
            where: { id: userId },
            data: { siteId: normalizedSiteIds[0] },
          });
        } else {
          // Clear primary site if no sites assigned
          await transaction.user.update({
            where: { id: userId },
            data: { siteId: null },
          });
        }
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

  setSignedLeavePdfAccess: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      if (req.user.effectiveRole !== "DEPARTMENT_HEAD" && req.user.role !== "ADMIN") {
        res.status(403).json({ message: "Only department head can grant this permission" });
        return;
      }

      const { userId, enabled } = req.body as { userId?: string; enabled?: boolean };

      if (!userId || typeof enabled !== "boolean") {
        res.status(400).json({ message: "userId and enabled are required" });
        return;
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, isActive: true, role: true },
      });

      if (!targetUser || !targetUser.isActive) {
        res.status(404).json({ message: "User not found or inactive" });
        return;
      }

      if (targetUser.role === "ADMIN") {
        res.status(400).json({ message: "Admin users do not need this permission" });
        return;
      }

      await prisma.user.update({
        where: { id: userId },
        data: { canDownloadSignedLeavePdf: enabled },
      });

      res.json({
        message: enabled
          ? "Signed leave PDF permission granted"
          : "Signed leave PDF permission removed",
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update signed PDF permission", error });
    }
  },
};
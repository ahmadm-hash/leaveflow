import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const siteController = {
  getSites: async (req: Request, res: Response): Promise<void> => {
    try {
      const sites = await prisma.site.findMany({
        select: {
          id: true,
          name: true,
          location: true,
          supervisors: {
            select: {
              supervisor: {
                select: {
                  id: true,
                  fullName: true,
                  username: true,
                },
              },
            },
          },
        },
        orderBy: { name: "asc" },
      });

      // Transform to include first supervisor info for backward compatibility
      const transformedSites = sites.map((site) => ({
        id: site.id,
        name: site.name,
        location: site.location,
        supervisors: site.supervisors.map((s) => s.supervisor),
        supervisor: site.supervisors[0]?.supervisor || null, // First supervisor for backward compat
      }));

      res.json({ sites: transformedSites });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sites", error });
    }
  },

  createSite: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      if (req.user.effectiveRole !== "DEPARTMENT_HEAD") {
        res.status(403).json({ message: "Forbidden: Only department head or delegated department head can create sites" });
        return;
      }

      const { name, location } = req.body as { name?: string; location?: string };

      if (!name || !name.trim() || !location || !location.trim()) {
        res.status(400).json({ message: "Site name and location are required" });
        return;
      }

      const existing = await prisma.site.findUnique({ where: { name: name.trim() } });
      if (existing) {
        res.status(400).json({ message: "Site already exists" });
        return;
      }

      const site = await prisma.site.create({
        data: {
          name: name.trim(),
          location: location.trim(),
        },
        select: {
          id: true,
          name: true,
          location: true,
        },
      });

      res.status(201).json({ message: "Site created successfully", site });
    } catch (error) {
      res.status(500).json({ message: "Failed to create site", error });
    }
  },
};

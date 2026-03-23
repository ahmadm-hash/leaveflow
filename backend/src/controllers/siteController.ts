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
          supervisorId: true,
          supervisor: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
        orderBy: { name: "asc" },
      });

      res.json({ sites });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sites", error });
    }
  },

  createSite: async (req: Request, res: Response): Promise<void> => {
    try {
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

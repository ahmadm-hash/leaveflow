import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const departmentController = {
  getDepartments: async (req: Request, res: Response): Promise<void> => {
    try {
      const departments = await prisma.department.findMany({
        select: {
          id: true,
          name: true,
          headId: true,
          head: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
        orderBy: { name: "asc" },
      });

      res.json({ departments });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch departments", error });
    }
  },

  createDepartment: async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, headId } = req.body as { name?: string; headId?: string };

      if (!name || !name.trim()) {
        res.status(400).json({ message: "Department name is required" });
        return;
      }

      const existing = await prisma.department.findUnique({ where: { name: name.trim() } });
      if (existing) {
        res.status(400).json({ message: "Department already exists" });
        return;
      }

      const department = await prisma.department.create({
        data: {
          name: name.trim(),
          ...(headId ? { headId } : {}),
        },
        select: {
          id: true,
          name: true,
          headId: true,
        },
      });

      res.status(201).json({ message: "Department created successfully", department });
    } catch (error) {
      res.status(500).json({ message: "Failed to create department", error });
    }
  },
};

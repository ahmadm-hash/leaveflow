import { prisma } from "../lib/prisma";
import { hashPassword } from "./password";

const defaultDepartmentHead = {
  email: process.env.DEPARTMENT_HEAD_EMAIL || "department.head@leaveflow.local",
  username: process.env.DEPARTMENT_HEAD_USERNAME || "department.head",
  password: process.env.DEPARTMENT_HEAD_PASSWORD || "ChangeMe123!",
  fullName: process.env.DEPARTMENT_HEAD_FULL_NAME || "Department Head",
};

export const ensureDepartmentHeadUser = async (): Promise<void> => {
  const existingDepartmentHead = await prisma.user.findFirst({
    where: {
      OR: [
        { email: defaultDepartmentHead.email },
        { username: defaultDepartmentHead.username },
      ],
    },
    select: {
      id: true,
      role: true,
      username: true,
      email: true,
    },
  });

  if (existingDepartmentHead) {
    if (existingDepartmentHead.role !== "DEPARTMENT_HEAD") {
      await prisma.user.update({
        where: { id: existingDepartmentHead.id },
        data: { role: "DEPARTMENT_HEAD" },
      });
      console.log(`Updated ${existingDepartmentHead.username} to DEPARTMENT_HEAD.`);
    }
    return;
  }

  const hashedPassword = await hashPassword(defaultDepartmentHead.password);

  await prisma.user.create({
    data: {
      email: defaultDepartmentHead.email,
      username: defaultDepartmentHead.username,
      password: hashedPassword,
      fullName: defaultDepartmentHead.fullName,
      role: "DEPARTMENT_HEAD",
    },
  });

  console.log(`Created default DEPARTMENT_HEAD user: ${defaultDepartmentHead.username}`);
};
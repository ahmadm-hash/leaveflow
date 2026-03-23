import { Router } from "express";
import { departmentController } from "../controllers/departmentController";
import { authMiddleware, authorizeRole } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);

router.get("/", departmentController.getDepartments);

router.post(
  "/",
  authorizeRole("ADMIN", "DEPARTMENT_HEAD"),
  departmentController.createDepartment
);

export default router;

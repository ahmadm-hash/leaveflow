import { Router } from "express";
import { authController } from "../controllers/authController";
import { authMiddleware, authorizeRole } from "../middleware/auth";

const router = Router();

// Public routes
router.post("/register", authController.register);
router.post("/login", authController.login);

// Protected routes
router.post(
  "/reset-password/:userId",
  authMiddleware,
  authorizeRole("EMPLOYEE", "SUPERVISOR", "DEPARTMENT_HEAD", "ADMIN"),
  authController.resetPassword
);

export default router;

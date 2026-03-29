import { Router } from "express";
import { userController } from "../controllers/userController";
import { authMiddleware, authorizeRole } from "../middleware/auth";

const router = Router();

// All authenticated routes
router.use(authMiddleware);

// Get current user profile
router.get("/profile", userController.getProfile);

// Update profile
router.put("/profile", userController.updateProfile);

// Admin & Department Head routes
router.get(
  "/",
  authorizeRole("ADMIN", "DEPARTMENT_HEAD"),
  userController.getAllUsers
);

router.post(
  "/",
  authorizeRole("SUPERVISOR", "DEPARTMENT_HEAD"),
  userController.createUser
);

// Supervisor routes
router.get(
  "/site-employees",
  authorizeRole("SUPERVISOR"),
  userController.getUsersBySite
);

// Admin only routes
router.post(
  "/promote-supervisor",
  authorizeRole("ADMIN", "DEPARTMENT_HEAD"),
  userController.promoteToSupervisor
);

router.put(
  "/supervisor-access",
  authorizeRole("ADMIN", "DEPARTMENT_HEAD"),
  userController.toggleSupervisorAccess
);

router.put(
  "/supervisor-sites",
  authorizeRole("ADMIN", "DEPARTMENT_HEAD"),
  userController.assignSupervisorSites
);

router.put(
  "/department-head-delegation",
  authorizeRole("ADMIN", "DEPARTMENT_HEAD"),
  userController.setDepartmentHeadDelegation
);

router.put(
  "/leave-pdf-access",
  authorizeRole("DEPARTMENT_HEAD"),
  userController.setSignedLeavePdfAccess
);

router.put(
  "/:userId/deactivate",
  authorizeRole("ADMIN", "DEPARTMENT_HEAD"),
  userController.deactivateUser
);

export default router;

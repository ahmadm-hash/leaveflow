import { Router } from "express";
import { leaveController } from "../controllers/leaveController";
import { authMiddleware, authorizeRole } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);

router.post("/", authorizeRole("EMPLOYEE", "SUPERVISOR", "DEPARTMENT_HEAD", "ADMIN"), leaveController.createLeaveRequest);
router.get("/my", leaveController.getMyLeaveRequests);
router.put("/:leaveRequestId/cancel", leaveController.cancelLeaveRequest);
router.get(
  "/pending/site",
  authorizeRole("SUPERVISOR", "DEPARTMENT_HEAD", "ADMIN"),
  leaveController.getPendingSiteLeaves
);

export default router;

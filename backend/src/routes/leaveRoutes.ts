import { Router } from "express";
import { leaveController } from "../controllers/leaveController";
import { authMiddleware, authorizeRole } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);

router.post("/", authorizeRole("EMPLOYEE", "SUPERVISOR", "DEPARTMENT_HEAD", "ADMIN"), leaveController.createLeaveRequest);
router.get("/my", leaveController.getMyLeaveRequests);
router.get(
  "/all",
  authorizeRole("SUPERVISOR", "DEPARTMENT_HEAD", "ADMIN"),
  leaveController.getAllLeaves
);
router.put("/:leaveRequestId/cancel", leaveController.cancelLeaveRequest);
router.get(
  "/pending/site",
  authorizeRole("SUPERVISOR", "DEPARTMENT_HEAD", "ADMIN"),
  leaveController.getPendingSiteLeaves
);
router.post(
  "/:leaveRequestId/review",
  authorizeRole("SUPERVISOR", "DEPARTMENT_HEAD", "ADMIN"),
  leaveController.reviewLeaveRequest
);
router.get(
  "/:leaveRequestId/signed-pdf",
  authorizeRole("EMPLOYEE", "SUPERVISOR", "DEPARTMENT_HEAD", "ADMIN"),
  leaveController.downloadSignedLeavePdf
);

export default router;


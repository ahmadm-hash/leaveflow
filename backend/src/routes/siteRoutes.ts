import { Router } from "express";
import { siteController } from "../controllers/siteController";
import { authMiddleware, authorizeRole } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);

router.get("/", siteController.getSites);

router.post(
  "/",
  authorizeRole("DEPARTMENT_HEAD", "SUPERVISOR"),
  siteController.createSite
);

export default router;

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import leaveRoutes from "./routes/leaveRoutes";
import departmentRoutes from "./routes/departmentRoutes";
import siteRoutes from "./routes/siteRoutes";
import { ensureDepartmentHeadUser } from "./utils/ensureDepartmentHeadUser";

dotenv.config();

const app = express();
const cliPortArg = process.argv.find((arg) => arg.startsWith("--port="));
const cliPort = cliPortArg ? cliPortArg.split("=")[1] : undefined;
const resolvedPort = cliPort || process.env.BACKEND_PORT || process.env.PORT || "5000";
const PORT = Number(resolvedPort);
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/sites", siteRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "Server is running", timestamp: new Date() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
    error: process.env.NODE_ENV === "development" ? err : {},
  });
});

const startServer = async () => {
  await ensureDepartmentHeadUser();

  app.listen(PORT, () => {
    console.log(`🚀 LeaveFlow Backend running on port ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});

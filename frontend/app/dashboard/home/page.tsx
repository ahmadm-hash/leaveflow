"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "../../store/authStore";
import { leaveService, LeaveRequestItem } from "../../lib/leaveService";
import { StatusBadge } from "../../components/StatusBadge";

export default function DashboardHome() {
  const user = useAuthStore((state) => state.user);
  const [leaves, setLeaves] = useState<LeaveRequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    leaveService
      .getMyLeaveRequests()
      .then((data) => setLeaves(data.leaveRequests ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total: leaves.length,
    pending: leaves.filter((l) => l.status === "PENDING").length,
    approved: leaves.filter((l) => l.status === "APPROVED_BY_DEPARTMENT_HEAD").length,
    rejected: leaves.filter((l) => l.status === "REJECTED").length,
  };

  const recentLeaves = leaves.slice(0, 5);

  const isManager =
    user?.role === "SUPERVISOR" || user?.role === "DEPARTMENT_HEAD" || user?.role === "ADMIN";

  const roleColors: Record<string, string> = {
    EMPLOYEE: "#007bff",
    SUPERVISOR: "#6f42c1",
    DEPARTMENT_HEAD: "#fd7e14",
    ADMIN: "#dc3545",
  };
  const roleColor = roleColors[user?.role ?? "EMPLOYEE"] ?? "#007bff";

  return (
    <div>
      {/* Welcome */}
      <div
        style={{
          background: `linear-gradient(135deg, ${roleColor}18 0%, #ffffff 100%)`,
          border: `1px solid ${roleColor}30`,
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "24px",
        }}
      >
        <h1 style={{ margin: "0 0 4px 0", fontSize: "22px", color: "#333" }}>
          Welcome back, {user?.fullName?.split(" ")[0]}!
        </h1>
        <p style={{ margin: "0 0 16px 0", color: "#666", fontSize: "14px" }}>
          {user?.role} {user?.site ? `· ${user.site.name}` : ""}
        </p>
        {user?.annualLeaveBalance !== undefined && (
          <div
            style={{
              backgroundColor: "white",
              border: "1px solid #e0e0e0",
              borderRadius: "8px",
              padding: "12px 20px",
              textAlign: "center",
              display: "inline-block",
              minWidth: "140px",
            }}
          >
            <div style={{ fontSize: "26px", fontWeight: "700", color: "#28a745" }}>
              {user.annualLeaveBalance}
            </div>
            <div style={{ fontSize: "12px", color: "#666" }}>Annual leave days left</div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "15px", color: "#555", margin: "0 0 12px 0", fontWeight: "600" }}>
          Quick Actions
        </h2>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <QuickAction href="/dashboard/leaves/new" label="+ New Leave Request" color="#007bff" />
          <QuickAction href="/dashboard/leaves" label="View My Leaves" color="#6c757d" />
          {isManager && <QuickAction href="/dashboard/manage" label="Review Leaves" color="#28a745" />}
          {isManager && <QuickAction href="/dashboard/users" label="Manage Users" color="#6f42c1" />}
          <QuickAction href="/dashboard/profile" label="Edit Profile" color="#fd7e14" />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        <StatCard label="Total Requests" value={stats.total} color="#6c757d" />
        <StatCard label="Pending" value={stats.pending} color="#ffc107" />
        <StatCard label="Approved" value={stats.approved} color="#28a745" />
        <StatCard label="Rejected" value={stats.rejected} color="#dc3545" />
      </div>

      {/* Recent Leaves */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "10px",
          border: "1px solid #e0e0e0",
          padding: "20px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ margin: 0, fontSize: "16px", color: "#333", fontWeight: "600" }}>
            Recent Leave Requests
          </h2>
          <Link href="/dashboard/leaves" style={{ color: "#007bff", fontSize: "13px", textDecoration: "none" }}>
            View all
          </Link>
        </div>

        {loading ? (
          <div style={{ color: "#999", fontSize: "14px", padding: "20px 0", textAlign: "center" }}>Loading...</div>
        ) : recentLeaves.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px 0" }}>
            <div style={{ fontSize: "36px", marginBottom: "8px" }}>📋</div>
            <div style={{ color: "#666", fontSize: "14px", marginBottom: "12px" }}>No leave requests yet.</div>
            <Link
              href="/dashboard/leaves/new"
              style={{
                backgroundColor: "#007bff",
                color: "white",
                padding: "8px 20px",
                borderRadius: "6px",
                textDecoration: "none",
                fontSize: "14px",
              }}
            >
              Submit your first request
            </Link>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr>
                {["Type", "Start", "End", "Status"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "8px 12px",
                      textAlign: "left",
                      color: "#888",
                      fontWeight: "500",
                      borderBottom: "1px solid #f0f0f0",
                      fontSize: "12px",
                      textTransform: "uppercase" as const,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentLeaves.map((leave) => (
                <tr key={leave.id}>
                  <td style={{ padding: "10px 12px", color: "#333", fontWeight: "500" }}>{leave.leaveType}</td>
                  <td style={{ padding: "10px 12px", color: "#555" }}>{formatDate(leave.startDate)}</td>
                  <td style={{ padding: "10px 12px", color: "#555" }}>{formatDate(leave.endDate)}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <StatusBadge status={leave.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function QuickAction({ href, label, color }: { href: string; label: string; color: string }) {
  return (
    <Link
      href={href}
      style={{
        backgroundColor: color,
        color: "white",
        padding: "9px 18px",
        borderRadius: "8px",
        textDecoration: "none",
        fontSize: "13px",
        fontWeight: "500",
        display: "inline-block",
      }}
    >
      {label}
    </Link>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "8px",
        border: "1px solid #e0e0e0",
        padding: "16px",
        textAlign: "center",
        borderTop: `3px solid ${color}`,
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ fontSize: "26px", fontWeight: "700", color }}>{value}</div>
      <div style={{ fontSize: "12px", color: "#666", marginTop: "3px" }}>{label}</div>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

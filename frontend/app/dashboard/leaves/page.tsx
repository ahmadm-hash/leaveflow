"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { leaveService, LeaveRequestItem } from "../../lib/leaveService";
import { Card } from "../../components/Card";
import { StatusBadge } from "../../components/StatusBadge";
import { Alert } from "../../components/Alert";
import { toast, Toaster } from "sonner";

export default function LeavesPage() {
  const [leaves, setLeaves] = useState<LeaveRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await leaveService.getMyLeaveRequests();
      setLeaves(data.leaveRequests ?? []);
    } catch {
      setError("Failed to load leave requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCancel = async (id: string) => {
    setCancelling(id);
    try {
      await leaveService.cancelLeaveRequest(id);
      toast.success("Leave request cancelled");
      await load();
    } catch (err: unknown) {
      const msg =
        err instanceof Object && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(msg ?? "Failed to cancel");
    } finally {
      setCancelling(null);
    }
  };

  const stats = {
    total: leaves.length,
    pending: leaves.filter((l) => l.status === "PENDING").length,
    approved: leaves.filter((l) => l.status === "APPROVED_BY_DEPARTMENT_HEAD").length,
    rejected: leaves.filter((l) => l.status === "REJECTED").length,
  };

  return (
    <div>
      <Toaster position="top-right" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1 style={{ color: "#333", fontSize: "24px", margin: 0 }}>My Leave Requests</h1>
        <Link
          href="/dashboard/leaves/new"
          style={{
            backgroundColor: "#007bff",
            color: "white",
            padding: "9px 20px",
            borderRadius: "6px",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          + New Request
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        <StatBox label="Total" value={stats.total} color="#6c757d" />
        <StatBox label="Pending" value={stats.pending} color="#ffc107" />
        <StatBox label="Approved" value={stats.approved} color="#28a745" />
        <StatBox label="Rejected" value={stats.rejected} color="#dc3545" />
      </div>

      {error && <Alert type="error" message={error} />}

      <Card>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>Loading...</div>
        ) : leaves.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>📋</div>
            <div style={{ color: "#666", fontSize: "15px" }}>No leave requests yet.</div>
            <Link
              href="/dashboard/leaves/new"
              style={{ color: "#007bff", fontSize: "14px", textDecoration: "none" }}
            >
              Submit your first request →
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8f9fa" }}>
                  {["Type", "Start", "End", "Days", "Department", "Status", "Actions"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 12px",
                        textAlign: "left",
                        color: "#555",
                        fontWeight: "600",
                        borderBottom: "2px solid #e0e0e0",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leaves.map((leave) => {
                  const days =
                    Math.floor(
                      (new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) /
                        86400000
                    ) + 1;
                  return (
                    <tr key={leave.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={tdStyle}>
                        <span style={{ fontWeight: "500" }}>{leave.leaveType}</span>
                      </td>
                      <td style={tdStyle}>{formatDate(leave.startDate)}</td>
                      <td style={tdStyle}>{formatDate(leave.endDate)}</td>
                      <td style={tdStyle}>{days}</td>
                      <td style={tdStyle}>{leave.department?.name ?? "-"}</td>
                      <td style={tdStyle}>
                        <StatusBadge status={leave.status} />
                      </td>
                      <td style={tdStyle}>
                        {leave.status === "PENDING" && (
                          <button
                            onClick={() => handleCancel(leave.id)}
                            disabled={cancelling === leave.id}
                            style={{
                              backgroundColor: "#fff",
                              color: "#dc3545",
                              border: "1px solid #dc3545",
                              padding: "4px 12px",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "12px",
                            }}
                          >
                            {cancelling === leave.id ? "..." : "Cancel"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "8px",
        border: "1px solid #e0e0e0",
        padding: "16px",
        textAlign: "center",
        borderTop: `3px solid ${color}`,
      }}
    >
      <div style={{ fontSize: "26px", fontWeight: "700", color }}>{value}</div>
      <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>{label}</div>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const tdStyle: React.CSSProperties = { padding: "10px 12px", color: "#333" };

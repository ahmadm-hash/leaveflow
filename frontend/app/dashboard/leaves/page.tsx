"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { leaveService, LeaveRequestItem } from "../../lib/leaveService";
import { Card } from "../../components/Card";
import { StatusBadge } from "../../components/StatusBadge";
import { Alert } from "../../components/Alert";
import { toast, Toaster } from "sonner";
import { ClipboardList, Plus } from "lucide-react";

export default function LeavesPage() {
  const [leaves, setLeaves] = useState<LeaveRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const fetchLeavesWithRetry = async (attempts = 6): Promise<LeaveRequestItem[]> => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const data = await leaveService.getMyLeaveRequests();
        return data.leaveRequests ?? [];
      } catch (err) {
        lastError = err;
        if (attempt < attempts) {
          await new Promise((resolve) => setTimeout(resolve, Math.min(250 * attempt * attempt, 1800)));
        }
      }
    }

    throw lastError;
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const leaveRequests = await fetchLeavesWithRetry();
      setLeaves(leaveRequests);
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
      const response = await leaveService.cancelLeaveRequest(id);
      toast.success(response.message ?? "Leave request updated");
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
        <h1 style={{ color: "#052976", fontSize: "26px", margin: 0, fontWeight: 700 }}>My Leave Requests</h1>
        <Link
          href="/dashboard/leaves/new"
          className="brand-btn brand-btn-primary hover-lift"
          style={{
            backgroundColor: "#052976",
            color: "white",
            padding: "10px 22px",
            borderRadius: "10px",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: "600",
          }}
        >
          + New Request
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        <StatBox label="Total" value={stats.total} color="#103576" />
        <StatBox label="Pending" value={stats.pending} color="#bc9470" />
        <StatBox label="Approved" value={stats.approved} color="#20cc76" />
        <StatBox label="Rejected" value={stats.rejected} color="#dc3545" />
      </div>

      {error && <Alert type="error" message={error} />}

      <Card>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>Loading...</div>
        ) : leaves.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
            <ClipboardList size={54} color="#a0aec0" strokeWidth={1.5} />
            <div style={{ color: "#6f6a63", fontSize: "16px", fontWeight: "500", marginTop: "8px" }}>No leave requests yet.</div>
            <Link
              href="/dashboard/leaves/new"
              style={{ color: "#0A358A", fontSize: "14px", textDecoration: "none", fontWeight: 700, padding: "8px 16px", background: "#f0f4ff", borderRadius: "8px", marginTop: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Plus size={16} /> Create Request
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="brand-table">
              <thead>
                <tr style={{ backgroundColor: "#fff8f0" }}>
                  {["Type", "Start", "End", "Days", "Department", "Status", "Actions"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 12px",
                        textAlign: "left",
                        color: "#6f6a63",
                        fontWeight: "600",
                        borderBottom: "2px solid #dcc8b6",
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
                        {(leave.status === "PENDING" ||
                          leave.status === "APPROVED_BY_SUPERVISOR" ||
                          leave.status === "APPROVED_BY_DEPARTMENT_HEAD") && (
                          <button
                            onClick={() => handleCancel(leave.id)}
                            disabled={cancelling === leave.id}
                            className="brand-btn brand-btn-outline"
                            style={{
                              backgroundColor: "#fff",
                              color: "#9f2f2f",
                              border: "1px solid #dc3545",
                              padding: "5px 12px",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontSize: "12px",
                            }}
                          >
                            {cancelling === leave.id
                              ? "..."
                              : leave.status === "PENDING"
                                ? "Cancel"
                                : "Request Cancellation"}
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
        borderRadius: "12px",
        border: "1px solid #dcc8b6",
        padding: "18px",
        textAlign: "center",
        borderTop: `3px solid ${color}`,
        boxShadow: "0 8px 22px rgba(5,41,118,0.05)",
      }}
    >
      <div style={{ fontSize: "26px", fontWeight: "700", color }}>{value}</div>
      <div style={{ fontSize: "12px", color: "#6f6a63", marginTop: "2px" }}>{label}</div>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const tdStyle: React.CSSProperties = { padding: "12px 12px", color: "#1d2751" };

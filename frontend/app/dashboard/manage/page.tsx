"use client";

import { useEffect, useState } from "react";
import { leaveService, LeaveRequestItem } from "../../lib/leaveService";
import { useAuthStore } from "../../store/authStore";
import { Card } from "../../components/Card";
import { StatusBadge } from "../../components/StatusBadge";
import { Alert } from "../../components/Alert";
import { toast, Toaster } from "sonner";

type FilterStatus = "all" | "PENDING" | "APPROVED_BY_SUPERVISOR" | "CANCELLATION_REQUESTED";

export default function ManageLeavesPage() {
  const user = useAuthStore((s) => s.user);
  const [leaves, setLeaves] = useState<LeaveRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("PENDING");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const fetchLeavesWithRetry = async (attempts = 3): Promise<LeaveRequestItem[]> => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const data = await leaveService.getAllLeaveRequests();
        return data.leaveRequests ?? [];
      } catch (error) {
        lastError = error;
        if (attempt < attempts) {
          await sleep(350 * attempt);
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

  const canReview = (leave: LeaveRequestItem) => {
    const status = leave.status;

    if (user?.role === "SUPERVISOR") return status === "PENDING";
    if (user?.role === "DEPARTMENT_HEAD" || user?.delegatedDepartmentHead) {
      return (
        status === "APPROVED_BY_SUPERVISOR" ||
        status === "CANCELLATION_REQUESTED" ||
        (status === "PENDING" && leave.employee?.role === "SUPERVISOR")
      );
    }
    if (user?.role === "ADMIN") {
      return status === "PENDING" || status === "APPROVED_BY_SUPERVISOR" || status === "CANCELLATION_REQUESTED";
    }
    return false;
  };

  const filtered =
    filter === "all" ? leaves : leaves.filter((l) => l.status === filter);

  const handleReview = async (id: string, action: "approve" | "reject") => {
    setSubmitting(true);
    try {
      await leaveService.reviewLeaveRequest(id, action, comment.trim() || undefined);
      toast.success(`Leave request ${action === "approve" ? "approved" : "rejected"}`);
      setReviewingId(null);
      setComment("");
      await load();
    } catch (err: unknown) {
      const msg =
        err instanceof Object && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(msg ?? "Failed to review request");
    } finally {
      setSubmitting(false);
    }
  };

  const stats = {
    pending: leaves.filter((l) => l.status === "PENDING").length,
    awaitingDept: leaves.filter((l) => l.status === "APPROVED_BY_SUPERVISOR").length,
    cancellationRequests: leaves.filter((l) => l.status === "CANCELLATION_REQUESTED").length,
    fullyApproved: leaves.filter((l) => l.status === "APPROVED_BY_DEPARTMENT_HEAD").length,
    rejected: leaves.filter((l) => l.status === "REJECTED").length,
  };

  return (
    <div>
      <Toaster position="top-right" />
      <h1 style={{ color: "#333", fontSize: "24px", marginBottom: "24px" }}>Manage Leave Requests</h1>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "16px", marginBottom: "24px" }}>
        <StatBox label="Pending" value={stats.pending} color="#ffc107" />
        <StatBox label="Awaiting Dept. Head" value={stats.awaitingDept} color="#17a2b8" />
        <StatBox label="Cancellation Requests" value={stats.cancellationRequests} color="#fd7e14" />
        <StatBox label="Fully Approved" value={stats.fullyApproved} color="#28a745" />
        <StatBox label="Rejected" value={stats.rejected} color="#dc3545" />
      </div>

      {error && <Alert type="error" message={error} />}

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        {(["all", "PENDING", "APPROVED_BY_SUPERVISOR", "CANCELLATION_REQUESTED"] as FilterStatus[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "6px 16px",
              borderRadius: "20px",
              border: "1px solid",
              borderColor: filter === f ? "#007bff" : "#ddd",
              backgroundColor: filter === f ? "#007bff" : "white",
              color: filter === f ? "white" : "#555",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: filter === f ? "600" : "400",
            }}
          >
            {f === "all"
              ? "All"
              : f === "PENDING"
                ? "Pending"
                : f === "APPROVED_BY_SUPERVISOR"
                  ? "Awaiting Dept. Head"
                  : "Cancellation Requests"}
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
            No leave requests found.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8f9fa" }}>
                  {["Employee", "Type", "Start", "End", "Days", "Department", "Status", "Actions"].map((h) => (
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
                {filtered.map((leave) => {
                  const days =
                    Math.floor(
                      (new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) /
                        86400000
                    ) + 1;
                  const isReviewing = reviewingId === leave.id;
                  return (
                    <>
                      <tr key={leave.id} style={{ borderBottom: isReviewing ? "none" : "1px solid #f0f0f0" }}>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: "500" }}>{leave.employee?.fullName ?? "-"}</div>
                          <div style={{ fontSize: "12px", color: "#888" }}>@{leave.employee?.username}</div>
                        </td>
                        <td style={tdStyle}>{leave.leaveType}</td>
                        <td style={tdStyle}>{formatDate(leave.startDate)}</td>
                        <td style={tdStyle}>{formatDate(leave.endDate)}</td>
                        <td style={tdStyle}>{days}</td>
                        <td style={tdStyle}>{leave.department?.name ?? "-"}</td>
                        <td style={tdStyle}>
                          <StatusBadge status={leave.status} />
                        </td>
                        <td style={tdStyle}>
                          {canReview(leave) && !isReviewing && (
                            <button
                              onClick={() => setReviewingId(leave.id)}
                              style={{
                                backgroundColor: "#007bff",
                                color: "white",
                                border: "none",
                                padding: "5px 14px",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px",
                              }}
                            >
                              Review
                            </button>
                          )}
                          {isReviewing && (
                            <button
                              onClick={() => { setReviewingId(null); setComment(""); }}
                              style={{
                                backgroundColor: "#f8f9fa",
                                color: "#555",
                                border: "1px solid #ddd",
                                padding: "5px 10px",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px",
                              }}
                            >
                              Close
                            </button>
                          )}
                        </td>
                      </tr>
                      {isReviewing && (
                        <tr key={`${leave.id}-review`} style={{ borderBottom: "1px solid #f0f0f0", backgroundColor: "#fafafa" }}>
                          <td colSpan={8} style={{ padding: "12px 16px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "480px" }}>
                              {leave.reason && (
                                <div style={{ fontSize: "13px", color: "#555" }}>
                                  <strong>Reason:</strong> {leave.reason}
                                </div>
                              )}
                              {leave.status === "CANCELLATION_REQUESTED" && (
                                <div style={{ fontSize: "13px", color: "#856404" }}>
                                  <strong>Notice:</strong> Employee requested cancellation after approval.
                                </div>
                              )}
                              <textarea
                                placeholder="Add a comment (optional)..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                rows={2}
                                style={{
                                  width: "100%",
                                  padding: "8px 10px",
                                  border: "1px solid #ddd",
                                  borderRadius: "6px",
                                  fontSize: "13px",
                                  resize: "vertical",
                                  boxSizing: "border-box",
                                }}
                              />
                              <div style={{ display: "flex", gap: "8px" }}>
                                <button
                                  onClick={() => handleReview(leave.id, "approve")}
                                  disabled={submitting}
                                  style={{
                                    backgroundColor: "#28a745",
                                    color: "white",
                                    border: "none",
                                    padding: "7px 20px",
                                    borderRadius: "5px",
                                    cursor: "pointer",
                                    fontSize: "13px",
                                    fontWeight: "500",
                                  }}
                                >
                                  {submitting
                                    ? "..."
                                    : leave.status === "CANCELLATION_REQUESTED"
                                      ? "✓ Approve Cancellation"
                                      : "✓ Approve"}
                                </button>
                                <button
                                  onClick={() => handleReview(leave.id, "reject")}
                                  disabled={submitting}
                                  style={{
                                    backgroundColor: "#dc3545",
                                    color: "white",
                                    border: "none",
                                    padding: "7px 20px",
                                    borderRadius: "5px",
                                    cursor: "pointer",
                                    fontSize: "13px",
                                    fontWeight: "500",
                                  }}
                                >
                                  {submitting
                                    ? "..."
                                    : leave.status === "CANCELLATION_REQUESTED"
                                      ? "✗ Reject Cancellation"
                                      : "✗ Reject"}
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
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

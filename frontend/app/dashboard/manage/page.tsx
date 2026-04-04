"use client";

import { useEffect, useState } from "react";
import { leaveService, LeaveRequestItem } from "../../lib/leaveService";
import { useAuthStore } from "../../store/authStore";
import { Card } from "../../components/Card";
import { StatusBadge } from "../../components/StatusBadge";
import { Alert } from "../../components/Alert";
import { toast, Toaster } from "sonner";
import { Clock, UserCheck, XCircle, CheckCircle2, Ban, FolderKanban, FileDown, Check, X, FileSearch } from "lucide-react";

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
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const fetchLeavesWithRetry = async (attempts = 8): Promise<LeaveRequestItem[]> => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const data = await leaveService.getAllLeaveRequests();
        return data.leaveRequests ?? [];
      } catch (error) {
        lastError = error;
        if (attempt < attempts) {
          // Backoff helps ride through short backend instability windows.
          await sleep(Math.min(250 * attempt * attempt, 2200));
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

  const canDownloadSignedPdf =
    user?.role === "ADMIN" || user?.role === "DEPARTMENT_HEAD" || user?.delegatedDepartmentHead || user?.canDownloadSignedLeavePdf;

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

  const handleDownloadSignedPdf = async (leaveRequestId: string) => {
    setDownloadingId(leaveRequestId);
    try {
      const { blob, fileName } = await leaveService.downloadSignedLeavePdf(leaveRequestId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      toast.success("Signed leave PDF downloaded");
    } catch (err: unknown) {
      const msg =
        err instanceof Object && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(msg ?? "Failed to download signed PDF");
    } finally {
      setDownloadingId(null);
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
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <div style={{ backgroundColor: "rgba(10, 53, 138, 0.08)", padding: "10px", borderRadius: "12px" }}>
          <FolderKanban size={28} color="#0A358A" />
        </div>
        <h1 style={{ color: "#0A358A", fontSize: "28px", margin: 0, fontWeight: 800, letterSpacing: "-0.5px" }}>Manage Leave Requests</h1>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "32px" }}>
        <StatBox label="Pending" value={stats.pending} color="#bc9470" icon={Clock} />
        <StatBox label="Awaiting Dept. Head" value={stats.awaitingDept} color="#4cc4ff" icon={UserCheck} />
        <StatBox label="Cancellation Requests" value={stats.cancellationRequests} color="#8142ff" icon={XCircle} />
        <StatBox label="Fully Approved" value={stats.fullyApproved} color="#20cc76" icon={CheckCircle2} />
        <StatBox label="Rejected" value={stats.rejected} color="#dc3545" icon={Ban} />
      </div>

      {error && <Alert type="error" message={error} />}

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", overflowX: "auto", paddingBottom: "4px" }}>
        {(["all", "PENDING", "APPROVED_BY_SUPERVISOR", "CANCELLATION_REQUESTED"] as FilterStatus[]).map((f) => (
          <button
            className="brand-btn"
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "10px 20px",
              borderRadius: "24px",
              border: filter === f ? "none" : "1px solid rgba(5, 41, 118, 0.15)",
              backgroundColor: filter === f ? "#0A358A" : "white",
              color: filter === f ? "white" : "#495277",
              boxShadow: filter === f ? "0 6px 18px rgba(10, 53, 138, 0.25)" : "none",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: filter === f ? "700" : "500",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              whiteSpace: "nowrap"
            }}
            onMouseEnter={(e) => {
              if (filter !== f) {
                e.currentTarget.style.backgroundColor = "rgba(10, 53, 138, 0.04)";
                e.currentTarget.style.borderColor = "rgba(10, 53, 138, 0.3)";
              }
            }}
            onMouseLeave={(e) => {
              if (filter !== f) {
                e.currentTarget.style.backgroundColor = "white";
                e.currentTarget.style.borderColor = "rgba(5, 41, 118, 0.15)";
              }
            }}
          >
            {f === "all"
              ? "All Requests"
              : f === "PENDING"
                ? "Pending"
                : f === "APPROVED_BY_SUPERVISOR"
                  ? "Awaiting Dept. Head"
                  : "Cancellation Requests"}
          </button>
        ))}
      </div>

      <Card style={{ borderRadius: "20px", border: "1px solid rgba(255, 255, 255, 0.8)", boxShadow: "0 10px 40px -10px rgba(5, 41, 118, 0.1)" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#999", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
            <div className="lucide-spin">
               <FileSearch size={32} color="#0A358A" />
            </div>
            <div style={{ fontSize: "15px", fontWeight: "500", letterSpacing: "0.05em" }}>Loading requests...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#666", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
            <FileSearch size={48} color="#a0aec0" strokeWidth={1} />
            <div style={{ fontSize: "16px", fontWeight: "500" }}>No leave requests found matching the current filter.</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="brand-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#F7F9FC" }}>
                  {["Employee details", "Leave Type", "Start Date", "End Date", "Total Days", "Department", "Current Status", "Available Actions"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "16px 20px",
                        textAlign: "left",
                        color: "#8B95A5",
                        fontWeight: "800",
                        fontSize: "11px",
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        borderBottom: "1px solid rgba(5, 41, 118, 0.1)",
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
                      <tr key={leave.id} style={{ borderBottom: isReviewing ? "none" : "1px solid rgba(5,41,118,0.05)", backgroundColor: "white", transition: "background-color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#F7F9FC"} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: "700", color: "#0A358A" }}>{leave.employee?.fullName ?? "-"}</div>
                          <div style={{ fontSize: "12px", color: "#8B95A5", marginTop: "2px" }}>@{leave.employee?.username}</div>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: "inline-flex", padding: "4px 10px", backgroundColor: "#F0F4FA", color: "#0A358A", borderRadius: "12px", fontSize: "12px", fontWeight: "600" }}>
                            {leave.leaveType}
                          </div>
                        </td>
                        <td style={tdStyle}>{formatDate(leave.startDate)}</td>
                        <td style={tdStyle}>{formatDate(leave.endDate)}</td>
                        <td style={tdStyle}>
                          <span style={{ fontWeight: 700 }}>{days}</span> {days === 1 ? "day" : "days"}
                        </td>
                        <td style={tdStyle}>{leave.department?.name ?? "-"}</td>
                        <td style={tdStyle}>
                          <StatusBadge status={leave.status} />
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            {canReview(leave) && !isReviewing && (
                              <button
                                className="brand-btn hover-lift"
                                onClick={() => setReviewingId(leave.id)}
                                style={{
                                  backgroundColor: "#0A358A",
                                  color: "white",
                                  border: "none",
                                  padding: "8px 16px",
                                  borderRadius: "8px",
                                  cursor: "pointer",
                                  fontSize: "13px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  fontWeight: "500",
                                  boxShadow: "0 2px 8px rgba(10,53,138,0.15)"
                                }}
                              >
                                <Check size={16} />
                                Review
                              </button>
                            )}
                            {canDownloadSignedPdf && leave.status === "APPROVED_BY_DEPARTMENT_HEAD" && (
                              <button
                                className="brand-btn hover-lift"
                                onClick={() => handleDownloadSignedPdf(leave.id)}
                                disabled={downloadingId === leave.id}
                                style={{
                                  backgroundColor: "white",
                                  color: "#0A358A",
                                  border: "1px solid rgba(10,53,138,0.2)",
                                  padding: "8px 16px",
                                  borderRadius: "8px",
                                  cursor: downloadingId === leave.id ? "not-allowed" : "pointer",
                                  fontSize: "13px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  fontWeight: "500"
                                }}
                              >
                                {downloadingId === leave.id ? (
                                  <div className="lucide-spin"><FileDown size={16} /></div>
                                ) : (
                                  <FileDown size={16} />
                                )}
                                Form
                              </button>
                            )}
                            {isReviewing && (
                              <button
                                className="brand-btn hover-lift"
                                onClick={() => { setReviewingId(null); setComment(""); }}
                                style={{
                                  backgroundColor: "#F7F9FC",
                                  color: "#4A5568",
                                  border: "1px solid #E2E8F0",
                                  padding: "8px 16px",
                                  borderRadius: "8px",
                                  cursor: "pointer",
                                  fontSize: "13px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  fontWeight: "500"
                                }}
                              >
                                <X size={16} />
                                Close
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isReviewing && (
                        <tr key={`${leave.id}-review`} style={{ borderBottom: "1px solid rgba(5,41,118,0.05)", backgroundColor: "#FAFCFF" }}>
                          <td colSpan={8} style={{ padding: "24px 32px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "600px", margin: "0 auto", width: "100%" }}>
                              {leave.reason && (
                                <div style={{ fontSize: "14px", color: "#4A5568", backgroundColor: "white", padding: "16px", borderRadius: "12px", border: "1px solid rgba(5,41,118,0.05)", boxShadow: "0 2px 10px rgba(5,41,118,0.02)" }}>
                                  <strong style={{ color: "#1A202C", display: "block", marginBottom: "6px" }}>Employee Reason:</strong>
                                  <span style={{ lineHeight: "1.5" }}>{leave.reason}</span>
                                </div>
                              )}
                              {leave.status === "CANCELLATION_REQUESTED" && (
                                <div style={{ fontSize: "14px", color: "#C05621", backgroundColor: "#FFFAF0", padding: "16px", borderRadius: "12px", border: "1px solid #FBD38D", display: "flex", alignItems: "flex-start", gap: "10px" }}>
                                  <XCircle size={20} color="#DD6B20" style={{ flexShrink: 0, marginTop: "2px" }} />
                                  <div>
                                    <strong style={{ display: "block", marginBottom: "4px" }}>Cancellation Notice</strong>
                                    Employee has requested to cancel this leave after approval.
                                  </div>
                                </div>
                              )}
                              <div style={{ backgroundColor: "white", padding: "16px", borderRadius: "12px", border: "1px solid rgba(5,41,118,0.05)", boxShadow: "0 2px 10px rgba(5,41,118,0.02)" }}>
                                <strong style={{ color: "#1A202C", display: "block", marginBottom: "12px", fontSize: "14px" }}>Action needed:</strong>
                                <textarea
                                  placeholder="Add a review comment (optional)..."
                                  value={comment}
                                  onChange={(e) => setComment(e.target.value)}
                                  rows={3}
                                  style={{
                                    width: "100%",
                                    padding: "14px",
                                    border: "1px solid #E2E8F0",
                                    borderRadius: "10px",
                                    fontSize: "14px",
                                    resize: "vertical",
                                    boxSizing: "border-box",
                                    outline: "none",
                                    marginBottom: "16px",
                                    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                                  }}
                                  onFocus={(e) => {
                                    e.target.style.borderColor = "#0A358A";
                                    e.target.style.boxShadow = "0 0 0 3px rgba(10,53,138,0.1)";
                                  }}
                                  onBlur={(e) => {
                                    e.target.style.borderColor = "#E2E8F0";
                                    e.target.style.boxShadow = "none";
                                  }}
                                />
                              <div style={{ display: "flex", gap: "12px" }}>
                                  <button
                                    className="brand-btn hover-lift"
                                    onClick={() => handleReview(leave.id, "approve")}
                                    disabled={submitting}
                                    style={{
                                      backgroundColor: "#0A358A",
                                      color: "white",
                                      border: "none",
                                      padding: "10px 24px",
                                      borderRadius: "10px",
                                      cursor: "pointer",
                                      fontSize: "14px",
                                      fontWeight: "600",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "8px",
                                      flex: "1",
                                      justifyContent: "center"
                                    }}
                                  >
                                    {submitting ? (
                                      <div className="lucide-spin"><Check size={18} /></div>
                                    ) : (
                                      <CheckCircle2 size={18} />
                                    )}
                                    {leave.status === "CANCELLATION_REQUESTED" ? "Approve Cancellation" : "Approve Leave"}
                                  </button>
                                  <button
                                    className="brand-btn hover-lift"
                                    onClick={() => handleReview(leave.id, "reject")}
                                    disabled={submitting}
                                    style={{
                                      backgroundColor: "white",
                                      color: "#EF4444",
                                      border: "1px solid #EF4444",
                                      padding: "10px 24px",
                                      borderRadius: "10px",
                                      cursor: "pointer",
                                      fontSize: "14px",
                                      fontWeight: "600",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "8px",
                                      flex: "1",
                                      justifyContent: "center"
                                    }}
                                  >
                                    {submitting ? (
                                      <div className="lucide-spin"><X size={18} /></div>
                                    ) : (
                                      <XCircle size={18} />
                                    )}
                                    {leave.status === "CANCELLATION_REQUESTED" ? "Reject Cancellation" : "Reject Leave"}
                                  </button>
                                </div>
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

function StatBox({ label, value, color, icon: Icon }: { label: string; value: number; color: string; icon: React.ElementType }) {
  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "16px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        position: "relative",
        overflow: "hidden",
        border: "1px solid rgba(0,0,0,0.04)",
        boxShadow: "0 8px 30px rgba(5,41,118,0.06)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 12px 40px rgba(5,41,118,0.12)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 8px 30px rgba(5,41,118,0.06)";
      }}
    >
      <div style={{ position: "absolute", right: "-10px", top: "-10px", opacity: 0.08 }}>
        <Icon size={120} color={color} />
      </div>
      
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px", zIndex: 1 }}>
        <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: color }}></div>
        <div style={{ fontSize: "13px", color: "#6f6a63", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      </div>
      <div style={{ fontSize: "40px", fontWeight: "800", color: "#1d2751", lineHeight: 1, zIndex: 1 }}>{value}</div>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const tdStyle: React.CSSProperties = { padding: "16px 20px", color: "#1A202C", fontSize: "14px", fontWeight: "500", verticalAlign: "middle" };

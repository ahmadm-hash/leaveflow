"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { leaveService } from "../../lib/leaveService";

interface LeaveRequestItem {
  id: string;
  startDate: string;
  endDate: string;
  leaveType: "ANNUAL" | "SICK" | "COMPASSIONATE" | "UNPAID";
  status: string;
  reason?: string;
  department?: {
    name: string;
  };
}

const LEAVE_TYPES = ["ANNUAL", "SICK", "COMPASSIONATE", "UNPAID"] as const;

export default function DashboardHome() {
  const user = useAuthStore((state) => state.user);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [leaveType, setLeaveType] = useState<(typeof LEAVE_TYPES)[number]>("ANNUAL");
  const [departmentId, setDepartmentId] = useState("");
  const [reason, setReason] = useState("");

  const loadMyLeaves = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await leaveService.getMyLeaveRequests();
      setLeaveRequests(response.leaveRequests || []);
    } catch (loadError: any) {
      setError(loadError?.response?.data?.message || "Failed to fetch leave requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyLeaves();
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await leaveService.createLeaveRequest({
        startDate,
        endDate,
        leaveType,
        departmentId,
        reason,
      });

      setStartDate("");
      setEndDate("");
      setLeaveType("ANNUAL");
      setDepartmentId("");
      setReason("");
      setSuccess("Leave request submitted successfully");
      await loadMyLeaves();
    } catch (submitError: any) {
      setError(submitError?.response?.data?.message || "Failed to submit leave request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (leaveRequestId: string) => {
    setError(null);
    setSuccess(null);
    try {
      await leaveService.cancelLeaveRequest(leaveRequestId);
      setSuccess("Leave request cancelled successfully");
      await loadMyLeaves();
    } catch (cancelError: any) {
      setError(cancelError?.response?.data?.message || "Failed to cancel leave request");
    }
  };

  return (
    <div>
      <h1 style={{ color: "#333", marginBottom: "20px" }}>Dashboard</h1>

      {error && (
        <div
          style={{
            backgroundColor: "#ffe3e3",
            color: "#a61e4d",
            border: "1px solid #faa2c1",
            borderRadius: "8px",
            padding: "10px 14px",
            marginBottom: "12px",
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            backgroundColor: "#d3f9d8",
            color: "#2b8a3e",
            border: "1px solid #8ce99a",
            borderRadius: "8px",
            padding: "10px 14px",
            marginBottom: "12px",
          }}
        >
          {success}
        </div>
      )}

      <div
        style={{
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
        }}
      >
        <h2 style={{ color: "#666", marginBottom: "20px" }}>Welcome, {user?.fullName}!</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div
            style={{
              backgroundColor: "#f8f9fa",
              padding: "20px",
              borderRadius: "8px",
              border: "1px solid #e9ecef",
            }}
          >
            <h3 style={{ color: "#495057", marginBottom: "10px" }}>Account Status</h3>
            <p style={{ color: "#666", marginBottom: "5px" }}>
              <strong>Email:</strong> {user?.email}
            </p>
            <p style={{ color: "#666", marginBottom: "5px" }}>
              <strong>Role:</strong> {user?.role}
            </p>
          </div>

          <div
            style={{
              backgroundColor: "#f8f9fa",
              padding: "20px",
              borderRadius: "8px",
              border: "1px solid #e9ecef",
            }}
          >
            <h3 style={{ color: "#495057", marginBottom: "10px" }}>Annual Leave Balance</h3>
            <p style={{ color: "#666", marginBottom: "5px" }}>
              <strong>Remaining:</strong> {user?.annualLeaveBalance ?? "N/A"} day(s)
            </p>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: "20px",
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
        }}
      >
        <h2 style={{ color: "#333", marginBottom: "16px" }}>Submit Leave Request</h2>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "6px", color: "#555" }}>Start Date</label>
              <input
                required
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "6px", color: "#555" }}>End Date</label>
              <input
                required
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "6px", color: "#555" }}>Leave Type</label>
              <select
                value={leaveType}
                onChange={(event) => setLeaveType(event.target.value as (typeof LEAVE_TYPES)[number])}
                style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }}
              >
                {LEAVE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "6px", color: "#555" }}>Department ID</label>
              <input
                required
                type="text"
                value={departmentId}
                onChange={(event) => setDepartmentId(event.target.value)}
                placeholder="Enter department ID"
                style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }}
              />
            </div>
          </div>

          <div style={{ marginTop: "12px" }}>
            <label style={{ display: "block", marginBottom: "6px", color: "#555" }}>Reason</label>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Optional reason"
              rows={3}
              style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: "12px",
              backgroundColor: "#228be6",
              color: "white",
              border: "none",
              padding: "10px 14px",
              borderRadius: "6px",
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.75 : 1,
            }}
          >
            {submitting ? "Submitting..." : "Submit Leave Request"}
          </button>
        </form>
      </div>

      <div
        style={{
          marginTop: "20px",
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
        }}
      >
        <h2 style={{ color: "#333", marginBottom: "16px" }}>My Leave Requests</h2>

        {loading ? (
          <p style={{ color: "#666" }}>Loading leave requests...</p>
        ) : leaveRequests.length === 0 ? (
          <p style={{ color: "#999" }}>No leave requests found.</p>
        ) : (
          <div style={{ display: "grid", gap: "10px" }}>
            {leaveRequests.map((request) => (
              <div
                key={request.id}
                style={{
                  border: "1px solid #e9ecef",
                  borderRadius: "8px",
                  padding: "12px",
                  backgroundColor: "#f8f9fa",
                }}
              >
                <p style={{ margin: 0, color: "#333" }}>
                  <strong>{request.leaveType}</strong> | {new Date(request.startDate).toLocaleDateString()} -{" "}
                  {new Date(request.endDate).toLocaleDateString()}
                </p>
                <p style={{ margin: "6px 0", color: "#666", fontSize: "14px" }}>
                  Status: <strong>{request.status}</strong>
                </p>
                {request.department?.name && (
                  <p style={{ margin: "6px 0", color: "#666", fontSize: "14px" }}>
                    Department: {request.department.name}
                  </p>
                )}
                {request.reason && (
                  <p style={{ margin: "6px 0", color: "#666", fontSize: "14px" }}>
                    Reason: {request.reason}
                  </p>
                )}
                {request.status === "PENDING" && (
                  <button
                    onClick={() => handleCancel(request.id)}
                    style={{
                      marginTop: "6px",
                      backgroundColor: "#e03131",
                      color: "white",
                      border: "none",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    Cancel Request
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

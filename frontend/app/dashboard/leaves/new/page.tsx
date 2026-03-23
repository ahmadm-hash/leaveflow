"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { leaveService, Department } from "../../../lib/leaveService";
import { useAuthStore } from "../../../store/authStore";
import { Card } from "../../../components/Card";
import { Alert } from "../../../components/Alert";
import { toast, Toaster } from "sonner";

const LEAVE_TYPES = ["ANNUAL", "SICK", "COMPASSIONATE", "UNPAID"] as const;

export default function NewLeavePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    startDate: "",
    endDate: "",
    leaveType: "ANNUAL" as (typeof LEAVE_TYPES)[number],
    departmentId: "",
    reason: "",
    documentUrl: "",
  });

  useEffect(() => {
    leaveService
      .getDepartments()
      .then((data) => setDepartments(data.departments))
      .catch(() => setError("Failed to load departments"))
      .finally(() => setLoadingDepts(false));
  }, []);

  const days =
    form.startDate && form.endDate
      ? Math.floor(
          (new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86400000
        ) + 1
      : 0;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (days < 1) {
      setError("End date must be on or after start date");
      return;
    }

    if (!form.departmentId) {
      setError("Please select a department");
      return;
    }

    setSubmitting(true);
    try {
      await leaveService.createLeaveRequest({
        startDate: form.startDate,
        endDate: form.endDate,
        leaveType: form.leaveType,
        departmentId: form.departmentId,
        reason: form.reason || undefined,
      });
      toast.success("Leave request submitted successfully!");
      router.push("/dashboard/leaves");
    } catch (err: unknown) {
      const msg =
        err instanceof Object && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(msg ?? "Failed to submit leave request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: "640px" }}>
      <Toaster position="top-right" />
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <button
          onClick={() => router.back()}
          style={{ background: "none", border: "none", color: "#007bff", cursor: "pointer", fontSize: "14px" }}
        >
          ← Back
        </button>
        <h1 style={{ color: "#333", fontSize: "24px", margin: 0 }}>New Leave Request</h1>
      </div>

      {user?.annualLeaveBalance !== undefined && (
        <div
          style={{
            backgroundColor: "#e8f0fe",
            border: "1px solid #c2d0f8",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "20px",
            fontSize: "14px",
            color: "#1a3a8f",
          }}
        >
          Annual leave balance: <strong>{user.annualLeaveBalance} days</strong>
        </div>
      )}

      {error && <Alert type="error" message={error} />}

      <Card>
        <form onSubmit={handleSubmit}>
          {/* Dates */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={labelStyle}>Start Date *</label>
              <input
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                required
                min={new Date().toISOString().split("T")[0]}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>End Date *</label>
              <input
                type="date"
                name="endDate"
                value={form.endDate}
                onChange={handleChange}
                required
                min={form.startDate || new Date().toISOString().split("T")[0]}
                style={inputStyle}
              />
            </div>
          </div>

          {days > 0 && (
            <div
              style={{
                backgroundColor: "#f0f8f0",
                borderRadius: "6px",
                padding: "8px 12px",
                marginBottom: "16px",
                fontSize: "13px",
                color: "#2d6a4f",
                fontWeight: "500",
              }}
            >
              Duration: {days} day{days !== 1 ? "s" : ""}
            </div>
          )}

          {/* Leave Type */}
          <div>
            <label style={labelStyle}>Leave Type *</label>
            <select name="leaveType" value={form.leaveType} onChange={handleChange} style={inputStyle}>
              {LEAVE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0) + t.slice(1).toLowerCase().replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          {/* Department */}
          <div>
            <label style={labelStyle}>Department *</label>
            {loadingDepts ? (
              <div style={{ color: "#999", fontSize: "13px", padding: "8px 0" }}>Loading departments...</div>
            ) : (
              <select
                name="departmentId"
                value={form.departmentId}
                onChange={handleChange}
                required
                style={inputStyle}
              >
                <option value="">Select a department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Reason */}
          <div>
            <label style={labelStyle}>Reason (optional)</label>
            <textarea
              name="reason"
              value={form.reason}
              onChange={handleChange}
              rows={3}
              placeholder="Briefly describe the reason..."
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {/* Document URL (for medical) */}
          {form.leaveType === "SICK" && (
            <div>
              <label style={labelStyle}>Medical Document URL (optional)</label>
              <input
                type="url"
                name="documentUrl"
                value={form.documentUrl}
                onChange={handleChange}
                placeholder="https://..."
                style={inputStyle}
              />
            </div>
          )}

          <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
            <button type="submit" disabled={submitting} style={primaryBtnStyle}>
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard/leaves")}
              style={secondaryBtnStyle}
            >
              Cancel
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "5px",
  color: "#555",
  fontSize: "13px",
  fontWeight: "500",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid #ddd",
  borderRadius: "6px",
  fontSize: "14px",
  boxSizing: "border-box",
  marginBottom: "16px",
  backgroundColor: "white",
};

const primaryBtnStyle: React.CSSProperties = {
  backgroundColor: "#007bff",
  color: "white",
  border: "none",
  padding: "10px 24px",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "500",
};

const secondaryBtnStyle: React.CSSProperties = {
  backgroundColor: "#f8f9fa",
  color: "#333",
  border: "1px solid #ddd",
  padding: "10px 24px",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "14px",
};

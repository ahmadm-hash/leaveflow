"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { leaveService } from "../../../lib/leaveService";
import { useAuthStore } from "../../../store/authStore";
import { Card } from "../../../components/Card";
import { Alert } from "../../../components/Alert";
import { toast, Toaster } from "sonner";

const LEAVE_TYPES = ["ANNUAL", "SICK", "UNPAID"] as const;

export default function NewLeavePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    startDate: "",
    endDate: "",
    leaveType: "ANNUAL" as (typeof LEAVE_TYPES)[number],
    reason: "",
    documentUrl: "",
  });

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

    if (form.leaveType === "SICK" && !form.documentUrl.trim()) {
      setError("Medical Document URL is required for Sickleave");
      return;
    }

    if (form.leaveType === "SICK" && !/\.pdf($|\?)/i.test(form.documentUrl.trim())) {
      setError("Medical Document URL must point to a PDF file");
      return;
    }

    setSubmitting(true);
    try {
      await leaveService.createLeaveRequest({
        startDate: form.startDate,
        endDate: form.endDate,
        leaveType: form.leaveType,
        reason: form.reason || undefined,
        documentUrl: form.documentUrl.trim() || undefined,
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
          style={{ background: "none", border: "none", color: "#052976", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}
        >
          ← Back
        </button>
        <h1 style={{ color: "#052976", fontSize: "26px", margin: 0, fontWeight: 700 }}>New Leave Request</h1>
      </div>

      {user?.annualLeaveBalance !== undefined && (
        <div
          style={{
            backgroundColor: "#eef4ff",
            border: "1px solid #bfd0ff",
            borderRadius: "12px",
            padding: "14px 16px",
            marginBottom: "20px",
            fontSize: "14px",
            color: "#103576",
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
                backgroundColor: "#edf9f2",
                borderRadius: "10px",
                padding: "10px 12px",
                marginBottom: "16px",
                fontSize: "13px",
                color: "#0a9d76",
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
                  {t === "SICK" ? "Sickleave" : t.charAt(0) + t.slice(1).toLowerCase().replace("_", " ")}
                </option>
              ))}
            </select>
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
              <label style={labelStyle}>Medical Document URL (PDF) *</label>
              <input
                type="url"
                name="documentUrl"
                value={form.documentUrl}
                onChange={handleChange}
                required
                placeholder="https://example.com/medical-report.pdf"
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
  marginBottom: "6px",
  color: "#6f6a63",
  fontSize: "13px",
  fontWeight: "600",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 13px",
  border: "1px solid #dcc8b6",
  borderRadius: "10px",
  fontSize: "14px",
  boxSizing: "border-box",
  marginBottom: "18px",
  backgroundColor: "white",
};

const primaryBtnStyle: React.CSSProperties = {
  backgroundColor: "#052976",
  color: "white",
  border: "none",
  padding: "11px 24px",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "600",
};

const secondaryBtnStyle: React.CSSProperties = {
  backgroundColor: "#fff8f0",
  color: "#1d2751",
  border: "1px solid #dcc8b6",
  padding: "11px 24px",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "14px",
};

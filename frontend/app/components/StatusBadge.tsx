"use client";

interface StatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: "Pending", color: "#856404", bg: "#fff3cd" },
  APPROVED_BY_SUPERVISOR: { label: "Approved by Supervisor", color: "#0c5460", bg: "#d1ecf1" },
  APPROVED_BY_DEPARTMENT_HEAD: { label: "Fully Approved", color: "#155724", bg: "#d4edda" },
  CANCELLATION_REQUESTED: { label: "Cancellation Requested", color: "#856404", bg: "#fff3cd" },
  REJECTED: { label: "Rejected", color: "#721c24", bg: "#f8d7da" },
  CANCELLED: { label: "Cancelled", color: "#6c757d", bg: "#e2e3e5" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, color: "#333", bg: "#eee" };

  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: "12px",
        fontSize: "12px",
        fontWeight: "600",
        color: config.color,
        backgroundColor: config.bg,
        whiteSpace: "nowrap",
      }}
    >
      {config.label}
    </span>
  );
}

"use client";

interface StatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: "Pending", color: "#8a6848", bg: "#f3e6d8" },
  APPROVED_BY_SUPERVISOR: { label: "Approved by Supervisor", color: "#103576", bg: "#e7efff" },
  APPROVED_BY_DEPARTMENT_HEAD: { label: "Fully Approved", color: "#0a9d76", bg: "#daf7ea" },
  CANCELLATION_REQUESTED: { label: "Cancellation Requested", color: "#8a6848", bg: "#f3e6d8" },
  REJECTED: { label: "Rejected", color: "#721c24", bg: "#f8d7da" },
  CANCELLED: { label: "Cancelled", color: "#5b6680", bg: "#eceff6" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, color: "#1d2751", bg: "#eef2ff" };

  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: "999px",
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

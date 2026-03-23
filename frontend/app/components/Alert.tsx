"use client";

interface AlertProps {
  type: "success" | "error" | "info";
  message: string;
}

const styles: Record<string, { color: string; bg: string; border: string }> = {
  success: { color: "#155724", bg: "#d4edda", border: "#c3e6cb" },
  error: { color: "#721c24", bg: "#f8d7da", border: "#f5c6cb" },
  info: { color: "#0c5460", bg: "#d1ecf1", border: "#bee5eb" },
};

export function Alert({ type, message }: AlertProps) {
  const s = styles[type];
  return (
    <div
      style={{
        padding: "10px 14px",
        borderRadius: "6px",
        border: `1px solid ${s.border}`,
        backgroundColor: s.bg,
        color: s.color,
        fontSize: "14px",
        marginBottom: "16px",
      }}
    >
      {message}
    </div>
  );
}

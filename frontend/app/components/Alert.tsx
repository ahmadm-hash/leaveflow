"use client";

interface AlertProps {
  type: "success" | "error" | "info";
  message: string;
}

const styles: Record<string, { color: string; bg: string; border: string }> = {
  success: { color: "#0a9d76", bg: "#daf7ea", border: "#b7e8d3" },
  error: { color: "#721c24", bg: "#f8d7da", border: "#f5c6cb" },
  info: { color: "#103576", bg: "#e7efff", border: "#bfd0ff" },
};

export function Alert({ type, message }: AlertProps) {
  const s = styles[type];
  return (
    <div
      style={{
        padding: "12px 15px",
        borderRadius: "10px",
        border: `1px solid ${s.border}`,
        backgroundColor: s.bg,
        color: s.color,
        fontSize: "14px",
        marginBottom: "18px",
        boxShadow: "0 8px 20px rgba(5,41,118,0.04)",
      }}
    >
      {message}
    </div>
  );
}

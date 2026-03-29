"use client";

interface CardProps {
  title?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function Card({ title, children, style }: CardProps) {
  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "8px",
        border: "1px solid #dcc8b6",
        padding: "20px",
        marginBottom: "20px",
        boxShadow: "0 8px 22px rgba(5,41,118,0.06)",
        ...style,
      }}
    >
      {title && (
        <h2 style={{ margin: "0 0 16px 0", fontSize: "18px", color: "#052976", fontWeight: "600" }}>
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  color?: string;
}

export function StatCard({ label, value, color = "#052976" }: StatCardProps) {
  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "8px",
        border: `1px solid #dcc8b6`,
        padding: "20px",
        textAlign: "center",
        boxShadow: "0 8px 22px rgba(5,41,118,0.06)",
        borderTop: `3px solid ${color}`,
      }}
    >
      <div style={{ fontSize: "28px", fontWeight: "700", color }}>{value}</div>
      <div style={{ fontSize: "13px", color: "#666", marginTop: "4px" }}>{label}</div>
    </div>
  );
}

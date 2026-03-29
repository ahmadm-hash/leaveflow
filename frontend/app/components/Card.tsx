"use client";

import { theme } from "../lib/theme";

interface CardProps {
  title?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function Card({ title, children, style }: CardProps) {
  return (
    <div
      style={{
        backgroundColor: theme.colors.white,
        borderRadius: theme.radius.lg,
        border: `1px solid ${theme.colors.sand300}`,
        padding: "20px",
        marginBottom: "20px",
        boxShadow: theme.shadow.soft,
        ...style,
      }}
    >
      {title && (
        <h2 style={{ margin: "0 0 16px 0", fontSize: "18px", color: theme.colors.navy900, fontWeight: "600" }}>
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

export function StatCard({ label, value, color = theme.colors.navy900 }: StatCardProps) {
  return (
    <div
      style={{
        backgroundColor: theme.colors.white,
        borderRadius: theme.radius.lg,
        border: `1px solid ${theme.colors.sand300}`,
        padding: "20px",
        textAlign: "center",
        boxShadow: theme.shadow.soft,
        borderTop: `3px solid ${color}`,
      }}
    >
      <div style={{ fontSize: "28px", fontWeight: "700", color }}>{value}</div>
      <div style={{ fontSize: "13px", color: theme.colors.ink700, marginTop: "4px" }}>{label}</div>
    </div>
  );
}

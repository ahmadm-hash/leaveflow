export const theme = {
  colors: {
    sky500: "#4cc4ff",
    green500: "#20cc76",
    green700: "#0a9d76",
    blue500: "#2633ff",
    blue700: "#103576",
    navy900: "#052976",
    purple500: "#8142ff",
    bronze500: "#bc9470",
    sand300: "#dcc8b6",
    paper100: "#f4eee9",
    paper50: "#fff9f3",
    ink900: "#1d2751",
    ink700: "#6f6a63",
    danger600: "#b83232",
    white: "#ffffff",
  },
  radius: {
    sm: "8px",
    md: "10px",
    lg: "12px",
    xl: "14px",
    pill: "999px",
  },
  shadow: {
    soft: "0 8px 22px rgba(5,41,118,0.05)",
    card: "0 10px 24px rgba(5,41,118,0.06)",
  },
  transition: {
    fast: "all 0.18s ease",
  },
};

export const ROLE_COLORS: Record<string, string> = {
  EMPLOYEE: theme.colors.green500,
  SUPERVISOR: theme.colors.blue500,
  DEPARTMENT_HEAD: theme.colors.navy900,
  ADMIN: theme.colors.purple500,
};

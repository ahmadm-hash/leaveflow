"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "../store/authStore";
import { useRouter } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated, logout, hasHydrated } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    setLoading(false);
  }, [isAuthenticated, hasHydrated, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  const handleLogout = () => {
    logout();
    document.cookie = "token=; path=/; max-age=0; samesite=lax";
    router.push("/login");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      {/* Sidebar */}
      <div
        style={{
          width: "250px",
          backgroundColor: "white",
          borderRight: "1px solid #ddd",
          padding: "20px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
        }}
      >
        <h2 style={{ marginBottom: "30px", color: "#333" }}>LeaveFlow</h2>
        <div style={{ marginBottom: "20px" }}>
          <p style={{ color: "#666", fontSize: "14px" }}>{user?.fullName}</p>
          <p style={{ color: "#999", fontSize: "12px" }}>Role: {user?.role}</p>
        </div>

        <nav>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            <li style={{ marginBottom: "10px" }}>
              <a
                href="/dashboard/home"
                style={{
                  color: "#007bff",
                  textDecoration: "none",
                  fontSize: "14px",
                }}
              >
                Dashboard
              </a>
            </li>
            <li style={{ marginBottom: "10px" }}>
              <a
                href="/dashboard/profile"
                style={{
                  color: "#007bff",
                  textDecoration: "none",
                  fontSize: "14px",
                }}
              >
                Profile
              </a>
            </li>
            <li>
              <button
                onClick={handleLogout}
                style={{
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                  width: "100%",
                  textAlign: "left",
                }}
              >
                Logout
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: "20px" }}>{children}</div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "../store/authStore";
import { useRouter } from "next/navigation";
import { authService } from "../lib/authService";

function NavItem({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        padding: "9px 12px",
        borderRadius: "6px",
        color: active ? "#007bff" : "#555",
        backgroundColor: active ? "#e8f0fe" : "transparent",
        textDecoration: "none",
        fontSize: "14px",
        fontWeight: active ? "600" : "400",
        marginBottom: "2px",
      }}
    >
      {label}
    </Link>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout, hasHydrated, setUser } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    setLoading(false);
  }, [isAuthenticated, hasHydrated, router]);

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) return;

    let isMounted = true;

    const refreshUserProfile = async () => {
      try {
        const response = await authService.getProfile();
        if (isMounted && response?.user) {
          setUser(response.user);
        }
      } catch {
        // Keep existing user data if profile refresh fails.
      }
    };

    void refreshUserProfile();

    return () => {
      isMounted = false;
    };
  }, [hasHydrated, isAuthenticated, pathname, setUser]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", color: "#999" }}>
        Loading...
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    document.cookie = "token=; path=/; max-age=0; samesite=lax";
    router.push("/login");
  };

  const isManager =
    user?.role === "SUPERVISOR" || user?.role === "DEPARTMENT_HEAD" || user?.role === "ADMIN";
  const canUseDepartmentHeadTools =
    user?.role === "DEPARTMENT_HEAD" || user?.role === "ADMIN" || user?.delegatedDepartmentHead;
  const canUseUsersPage = user?.role === "SUPERVISOR" || canUseDepartmentHeadTools;

  const roleColors: Record<string, string> = {
    EMPLOYEE: "#007bff",
    SUPERVISOR: "#6f42c1",
    DEPARTMENT_HEAD: "#fd7e14",
    ADMIN: "#dc3545",
  };
  const roleColor = roleColors[user?.role ?? "EMPLOYEE"] ?? "#007bff";

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      {/* Sidebar */}
      <div
        style={{
          width: "240px",
          minWidth: "240px",
          backgroundColor: "white",
          borderRight: "1px solid #e0e0e0",
          padding: "0",
          boxShadow: "2px 0 8px rgba(0,0,0,0.04)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Logo */}
        <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid #f0f0f0" }}>
          <Link href="/dashboard/home" style={{ textDecoration: "none" }}>
            <span style={{ fontSize: "20px", fontWeight: "700", color: "#007bff" }}>LeaveFlow</span>
          </Link>
        </div>

        {/* User card */}
        <div style={{ padding: "16px", borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                backgroundColor: roleColor,
                color: "white",
                fontSize: "16px",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {user?.fullName?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#333", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user?.fullName}
              </div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "600",
                  color: roleColor,
                  backgroundColor: roleColor + "18",
                  padding: "1px 7px",
                  borderRadius: "8px",
                }}
              >
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ padding: "12px 8px", flex: 1 }}>
          <div style={{ fontSize: "11px", fontWeight: "600", color: "#aaa", padding: "4px 12px 6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Main
          </div>
          <NavItem href="/dashboard/home" label="🏠 Dashboard" active={pathname === "/dashboard/home"} />
          <NavItem href="/dashboard/leaves" label="📋 My Leaves" active={pathname.startsWith("/dashboard/leaves")} />
          <NavItem href="/dashboard/profile" label="👤 Profile" active={pathname === "/dashboard/profile"} />

          {isManager && (
            <>
              <div style={{ fontSize: "11px", fontWeight: "600", color: "#aaa", padding: "12px 12px 6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Management
              </div>
              <NavItem href="/dashboard/manage" label="✅ Review Leaves" active={pathname === "/dashboard/manage"} />
              {canUseUsersPage && (
                <NavItem href="/dashboard/users" label="👥 Users" active={pathname === "/dashboard/users"} />
              )}
            </>
          )}
        </nav>

        {/* Logout */}
        <div style={{ padding: "12px 8px", borderTop: "1px solid #f0f0f0" }}>
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              backgroundColor: "transparent",
              color: "#dc3545",
              border: "1px solid #dc3545",
              padding: "8px 12px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "500",
              textAlign: "center",
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: "28px", overflowX: "auto" }}>{children}</div>
    </div>
  );
}

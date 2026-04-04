"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "../store/authStore";
import { useRouter } from "next/navigation";
import { authService } from "../lib/authService";


function NavItem({ href, label, active, icon }: { href: string; label: string; active: boolean; icon: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 16px",
        borderRadius: "12px",
        color: active ? "#0A358A" : "#495277",
        backgroundColor: active ? "#ffffff" : "transparent",
        boxShadow: active ? "0 4px 15px rgba(5, 41, 118, 0.05)" : "none",
        textDecoration: "none",
        fontSize: "15px",
        fontWeight: active ? "700" : "500",
        marginBottom: "8px",
        transition: "all 0.25s ease",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.5)";
          e.currentTarget.style.transform = "translateX(4px)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.transform = "translateX(0)";
        }
      }}
    >
      <span style={{ fontSize: "18px" }}>{icon}</span>
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
  const canUseSitesPage = canUseDepartmentHeadTools;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "transparent" }}>
      {/* Sidebar - Glassmorphic design */}
      <div
        style={{
          width: "280px",
          minWidth: "280px",
          margin: "16px 0 16px 16px",
          background: "rgba(255, 255, 255, 0.6)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.8)",
          borderRadius: "24px",
          boxShadow: "0 10px 40px -10px rgba(5, 41, 118, 0.08)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
      >
        {/* Logo */}
        <div style={{ padding: "32px 24px 24px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{
            width: "56px",
            height: "56px",
            borderRadius: "18px",
            background: "linear-gradient(135deg, #3f2b96 0%, #0A358A 100%)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
            fontWeight: "800",
            letterSpacing: "0.05em",
            boxShadow: "0 8px 20px rgba(10, 53, 138, 0.3)"
          }}>
            RJ
          </div>
          <Link href="/dashboard/home" style={{ textDecoration: "none" }}>
             <div style={{ fontSize: "18px", fontWeight: "800", color: "#0A358A", lineHeight: 1.2 }}>
               RC Jubail<br/>& Yanbu
             </div>
          </Link>
        </div>

        {/* User card */}
        <div style={{ padding: "0 20px 24px" }}>
          <div
            style={{
              padding: "16px",
              background: "#ffffff",
              borderRadius: "18px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
              boxShadow: "0 4px 15px rgba(5, 41, 118, 0.04)"
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                backgroundColor: "#0A358A",
                color: "white",
                fontSize: "20px",
                fontWeight: "800",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {user?.fullName?.[0]?.toUpperCase() ?? "D"}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: "15px", fontWeight: "700", color: "#0A358A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: "4px" }}>
                {user?.fullName || "Department Head"}
              </div>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: "800",
                  color: "#0A358A",
                  backgroundColor: "#E8F0FF",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em"
                }}
              >
                {user?.role || "DEPARTMENT_HEAD"}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ padding: "12px 20px", flex: 1, overflowY: "auto" }}>
          <div style={{ fontSize: "12px", fontWeight: "800", color: "#8B95A5", padding: "8px 8px 12px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            MAIN SECTION
          </div>
          <NavItem href="/dashboard/home" label="Dashboard" active={pathname === "/dashboard/home"} icon="🏠" />
          <NavItem href="/dashboard/leaves" label="My Leaves" active={pathname.startsWith("/dashboard/leaves")} icon="📋" />
          <NavItem href="/dashboard/profile" label="Profile" active={pathname === "/dashboard/profile"} icon="👤" />

          {isManager && (
            <>
              <div style={{ fontSize: "12px", fontWeight: "800", color: "#8B95A5", padding: "24px 8px 12px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                MANAGEMENT
              </div>
              <NavItem href="/dashboard/manage" label="Review Leaves" active={pathname === "/dashboard/manage"} icon="✅" />
              {canUseUsersPage && (
                <NavItem href="/dashboard/users" label="Users" active={pathname === "/dashboard/users"} icon="👥" />
              )}
              {canUseSitesPage && (
                <NavItem href="/dashboard/sites" label="Sites" active={pathname === "/dashboard/sites"} icon="🏗️" />
              )}
            </>
          )}
        </nav>

        {/* Logout */}
        <div style={{ padding: "20px" }}>
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              backgroundColor: "#FFF5F5",
              color: "#DC3545",
              border: "1px solid #FFE5E5",
              padding: "14px",
              borderRadius: "14px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "700",
              textAlign: "center",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#FFE5E5";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#FFF5F5";
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: "32px 40px", overflowX: "auto" }}>
        <div style={{ maxWidth: "1600px", margin: "0 auto" }}>
          {children}
        </div>
      </div>
    </div>
  );
}


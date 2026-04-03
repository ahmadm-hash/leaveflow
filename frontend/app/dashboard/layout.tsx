"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "../store/authStore";
import { useRouter } from "next/navigation";
import { authService } from "../lib/authService";
import { ROLE_COLORS } from "../lib/theme";

function NavItem({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        padding: "12px 16px",
        borderRadius: "12px",
        color: active ? "#052976" : "var(--rc-ink-700)",
        backgroundColor: active ? "rgba(255, 255, 255, 0.6)" : "transparent",
        boxShadow: active ? "0 4px 12px rgba(5, 41, 118, 0.05)" : "none",
        textDecoration: "none",
        fontSize: "14px",
        fontWeight: active ? "700" : "500",
        marginBottom: "6px",
        transition: "all 0.25s ease",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
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

  const roleColor = ROLE_COLORS[user?.role ?? "EMPLOYEE"] ?? "#052976";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "transparent" }}>
      {/* Sidebar - Glassmorphic design */}
      <div
        className="glass-panel"
        style={{
          width: "280px",
          minWidth: "280px",
          margin: "16px 0 16px 16px",
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--glass-shadow)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Logo */}
        <div style={{ padding: "24px", paddingBottom: "20px", display: "flex", alignItems: "center", gap: "14px" }}>
          <div className="brand-mark">RJ</div>
          <Link href="/dashboard/home" className="heading-gradient" style={{ textDecoration: "none", fontSize: "16px", lineHeight: 1.2 }}>
            RC Jubail<br/>& Yanbu
          </Link>
        </div>

        {/* User card - Floating glass pill */}
        <div style={{ padding: "0 16px 16px" }}>
          <div
            style={{
              padding: "12px",
              background: "rgba(255,255,255,0.5)",
              borderRadius: "16px",
              border: "1px solid rgba(255,255,255,0.6)",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              boxShadow: "0 4px 12px rgba(5, 41, 118, 0.03)"
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                backgroundColor: roleColor,
                color: "white",
                fontSize: "18px",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: `0 4px 12px ${roleColor}40`
              }}
            >
              {user?.fullName?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#1d2751", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user?.fullName}
              </div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: roleColor,
                  backgroundColor: roleColor + "18",
                  padding: "2px 8px",
                  borderRadius: "6px",
                  display: "inline-block",
                  marginTop: "3px"
                }}
              >
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ padding: "12px 16px", flex: 1, overflowY: "auto" }}>
          <div style={{ fontSize: "11px", fontWeight: "800", color: "var(--rc-ink-700)", padding: "4px 8px 8px", textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.7 }}>
            Main Section
          </div>
          <NavItem href="/dashboard/home" label="🏠 Dashboard" active={pathname === "/dashboard/home"} />
          <NavItem href="/dashboard/leaves" label="📋 My Leaves" active={pathname.startsWith("/dashboard/leaves")} />
          <NavItem href="/dashboard/profile" label="👤 Profile" active={pathname === "/dashboard/profile"} />

          {isManager && (
            <>
              <div style={{ fontSize: "11px", fontWeight: "800", color: "var(--rc-ink-700)", padding: "20px 8px 8px", textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.7 }}>
                Management
              </div>
              <NavItem href="/dashboard/manage" label="✅ Review Leaves" active={pathname === "/dashboard/manage"} />
              {canUseUsersPage && (
                <NavItem href="/dashboard/users" label="👥 Users" active={pathname === "/dashboard/users"} />
              )}
              {canUseSitesPage && (
                <NavItem href="/dashboard/sites" label="🏗️ Sites" active={pathname === "/dashboard/sites"} />
              )}
            </>
          )}
        </nav>

        {/* Logout */}
        <div style={{ padding: "16px" }}>
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              backgroundColor: "rgba(255, 255, 255, 0.4)",
              color: "var(--rc-danger-600)",
              border: "1px solid rgba(184, 50, 50, 0.2)",
              padding: "12px",
              borderRadius: "12px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "700",
              textAlign: "center",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(184, 50, 50, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.4)";
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

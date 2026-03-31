"use client";

import { useEffect, useState } from "react";
import { authService, ManagedUser, ManagedUserPayload } from "../../lib/authService";
import { leaveService, Site } from "../../lib/leaveService";
import { useAuthStore } from "../../store/authStore";
import { Card } from "../../components/Card";
import { Alert } from "../../components/Alert";
import { toast, Toaster } from "sonner";
import { ROLE_COLORS, theme } from "../../lib/theme";

type Tab = "list" | "create";

const roleColors: Record<string, string> = {
  ...ROLE_COLORS,
  ADMIN: theme.colors.danger600,
};

export default function UsersPage() {
  const user = useAuthStore((state) => state.user);
  const [tab, setTab] = useState<Tab>("list");
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canCreateEmployee = user?.role === "SUPERVISOR";
  const canCreateSupervisor = user?.role === "DEPARTMENT_HEAD" || user?.role === "ADMIN";
  const canManageSupervisors = user?.role === "DEPARTMENT_HEAD" || user?.role === "ADMIN";
  const canResetEmployeePasswords = user?.role === "SUPERVISOR";
  const canGrantSignedPdfAccess = user?.role === "DEPARTMENT_HEAD" || user?.delegatedDepartmentHead;

  const defaultForm: ManagedUserPayload = {
    fullName: "",
    email: "",
    username: "",
    password: "",
    role: canCreateEmployee ? "EMPLOYEE" : "SUPERVISOR",
    siteId: "",
  };

  const [form, setForm] = useState<ManagedUserPayload>(defaultForm);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersResp, sitesResp] = await Promise.all([
        user?.role === "SUPERVISOR" ? authService.getSiteEmployees() : authService.getAllUsers(),
        leaveService.getSites(),
      ]);
      setUsers(usersResp.users ?? []);
      setSites(sitesResp.sites ?? []);
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [user?.role]);

  const handleDeactivate = async (userId: string) => {
    if (!confirm("Are you sure you want to deactivate this user?")) return;
    setDeactivating(userId);
    try {
      await authService.deactivateUser(userId);
      toast.success("User deactivated");
      await load();
    } catch {
      toast.error("Failed to deactivate user");
    } finally {
      setDeactivating(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload: ManagedUserPayload = {
        ...form,
        ...(canCreateEmployee ? { role: "EMPLOYEE" } : {}),
        ...(form.siteId ? { siteId: form.siteId } : {}),
      };
      await authService.createUser(payload);
      toast.success(`${payload.role === "EMPLOYEE" ? "Employee" : "Supervisor"} created successfully`);
      setForm(defaultForm);
      setTab("list");
      await load();
    } catch (err: unknown) {
      const msg =
        err instanceof Object && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(msg ?? "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSupervisor = async (managedUser: ManagedUser) => {
    const enabling = managedUser.role !== "SUPERVISOR";

    if (enabling && !managedUser.site?.id) {
      toast.error("Employee must have a primary site before supervisor access can be enabled");
      return;
    }

    try {
      await authService.toggleSupervisorAccess({
        userId: managedUser.id,
        enabled: enabling,
        primarySiteId: managedUser.site?.id,
      });
      toast.success(enabling ? "Supervisor access enabled" : "Supervisor access removed");
      await load();
    } catch (err: unknown) {
      const msg =
        err instanceof Object && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(msg ?? "Failed to update supervisor access");
    }
  };

  const toggleDelegation = async (managedUser: ManagedUser) => {
    try {
      await authService.setDepartmentHeadDelegation({
        userId: managedUser.id,
        enabled: !managedUser.delegatedDepartmentHead,
      });
      toast.success(!managedUser.delegatedDepartmentHead ? "Department head powers delegated" : "Delegation removed");
      await load();
    } catch (err: unknown) {
      const msg =
        err instanceof Object && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(msg ?? "Failed to update delegation");
    }
  };

  const handleResetPassword = async (managedUser: ManagedUser) => {
    const newPassword = prompt(`Enter a new password for ${managedUser.fullName}`);
    if (!newPassword) return;

    try {
      await authService.resetPassword(managedUser.id, newPassword);
      toast.success("Password reset successfully");
    } catch (err: unknown) {
      const msg =
        err instanceof Object && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(msg ?? "Failed to reset password");
    }
  };

  const toggleSignedPdfAccess = async (managedUser: ManagedUser) => {
    try {
      await authService.setSignedLeavePdfAccess({
        userId: managedUser.id,
        enabled: !managedUser.canDownloadSignedLeavePdf,
      });
      toast.success(!managedUser.canDownloadSignedLeavePdf ? "PDF access granted" : "PDF access removed");
      await load();
    } catch (err: unknown) {
      const msg =
        err instanceof Object && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(msg ?? "Failed to update PDF access");
    }
  };

  return (
    <div>
      <Toaster position="top-right" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1 style={{ color: "#052976", fontSize: "26px", margin: 0, fontWeight: 700 }}>User Management</h1>
        <div style={{ display: "flex", gap: "10px" }}>
          {(canCreateEmployee || canCreateSupervisor) && (
            <button className="brand-btn hover-lift" onClick={() => setTab(tab === "create" ? "list" : "create")} style={tabButtonStyle(tab === "create", "#052976")}>
              {tab === "create" ? "← Back to List" : `+ Add ${canCreateEmployee ? "Employee" : "User"}`}
            </button>
          )}
        </div>
      </div>

      {error && <Alert type="error" message={error} />}

      {tab === "create" && (canCreateEmployee || canCreateSupervisor) && (
        <Card title={`Create ${canCreateEmployee ? "Employee" : "Account"}`} style={{ maxWidth: "560px" }}>
          <form onSubmit={handleCreate}>
            <label style={labelStyle}>Full Name *</label>
            <input name="fullName" value={form.fullName} onChange={handleChange} required style={inputStyle} />

            <label style={labelStyle}>Email *</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required style={inputStyle} />

            <label style={labelStyle}>Username *</label>
            <input name="username" value={form.username} onChange={handleChange} required style={inputStyle} />

            <label style={labelStyle}>Password *</label>
            <input type="password" name="password" value={form.password} onChange={handleChange} required minLength={6} style={inputStyle} />

            {(canCreateSupervisor || user?.role === "ADMIN") && (
              <>
                <label style={labelStyle}>Role *</label>
                <select name="role" value={form.role} onChange={handleChange} style={inputStyle}>
                  <option value="EMPLOYEE">Employee</option>
                  <option value="SUPERVISOR">Supervisor</option>
                </select>
              </>
            )}

            <label style={labelStyle}>Primary Site *</label>
            <select name="siteId" value={form.siteId} onChange={handleChange} required style={inputStyle}>
              <option value="">Select a site</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name} ({site.location})
                </option>
              ))}
            </select>

            <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
              <button className="brand-btn brand-btn-primary hover-lift" type="submit" disabled={submitting} style={primaryBtnStyle}>
                {submitting ? "Creating..." : "Create Account"}
              </button>
              <button className="brand-btn brand-btn-soft" type="button" onClick={() => { setForm(defaultForm); setTab("list"); }} style={secondaryBtnStyle}>
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {tab === "list" && (
        <div>
          {loading ? (
            <Card>
              <div style={{ textAlign: "center", padding: "60px 40px", color: "#999" }}>
                <div style={{ fontSize: "16px", fontWeight: "500" }}>Loading users...</div>
              </div>
            </Card>
          ) : users.length === 0 ? (
            <Card>
              <div style={{ textAlign: "center", padding: "60px 40px", color: "#999" }}>
                <div style={{ fontSize: "16px" }}>📭 No users found.</div>
              </div>
            </Card>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "20px" }}>
              {users.map((managedUser) => {
                const isInactive = managedUser.isActive === false;
                return (
                  <div
                    key={managedUser.id}
                    style={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e8dccf",
                      borderRadius: "12px",
                      padding: "20px",
                      opacity: isInactive ? 0.65 : 1,
                      transition: "all 0.3s ease",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                      cursor: "default",
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px",
                    }}
                    onMouseEnter={(e) => {
                      if (!isInactive) {
                        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 12px rgba(0,0,0,0.1)";
                        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)";
                      (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                    }}
                  >
                    {/* Header Section */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: "16px", color: "#052976" }}>
                          {managedUser.fullName}
                        </div>
                        <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
                          @{managedUser.username}
                        </div>
                        <div style={{ fontSize: "12px", color: "#aaa", marginTop: "2px", wordBreak: "break-all" }}>
                          {managedUser.email}
                        </div>
                      </div>
                      <span style={statusPillStyle(managedUser.isActive !== false)}>
                        {managedUser.isActive !== false ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {/* Role & Badges Section */}
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                      <span style={roleBadgeStyle(managedUser.role)}>{managedUser.role}</span>
                      {managedUser.delegatedDepartmentHead && (
                        <span style={miniBadgeStyle("#bc9470")}>👑 Delegated Head</span>
                      )}
                      {managedUser.canDownloadSignedLeavePdf && (
                        <span style={miniBadgeStyle("#2d6a4f")}>📄 PDF Access</span>
                      )}
                    </div>

                    {/* Site & Info Section */}
                    {managedUser.site && (
                      <div style={{ padding: "10px 12px", backgroundColor: "#f9f6f1", borderRadius: "8px", fontSize: "13px" }}>
                        <div style={{ color: "#888", marginBottom: "2px" }}>Primary Site</div>
                        <div style={{ fontWeight: "600", color: "#052976" }}>{managedUser.site.name}</div>
                      </div>
                    )}

                    {/* Divider */}
                    <div style={{ height: "1px", backgroundColor: "#e8dccf" }}></div>

                    {/* Actions Section */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {canManageSupervisors && managedUser.id !== user?.id && (managedUser.role === "EMPLOYEE" || managedUser.role === "SUPERVISOR") && (
                        <button
                          className="brand-btn brand-btn-outline"
                          onClick={() => toggleSupervisor(managedUser)}
                          style={{
                            ...outlineButtonStyle("#2633ff"),
                            width: "100%",
                            padding: "8px 12px",
                            fontSize: "13px",
                          }}
                        >
                          {managedUser.role === "SUPERVISOR" ? "🚫 Remove Supervisor" : "⭐ Make Supervisor"}
                        </button>
                      )}

                      {canManageSupervisors && managedUser.role === "SUPERVISOR" && managedUser.id !== user?.id && (
                        <button
                          className="brand-btn brand-btn-outline"
                          onClick={() => toggleDelegation(managedUser)}
                          style={{
                            ...outlineButtonStyle("#bc9470"),
                            width: "100%",
                            padding: "8px 12px",
                            fontSize: "13px",
                          }}
                        >
                          {managedUser.delegatedDepartmentHead ? "🔄 Remove Delegation" : "👑 Delegate Powers"}
                        </button>
                      )}

                      {canResetEmployeePasswords && managedUser.role === "EMPLOYEE" && managedUser.isActive !== false && (
                        <button
                          className="brand-btn brand-btn-outline"
                          onClick={() => handleResetPassword(managedUser)}
                          style={{
                            ...outlineButtonStyle("#198754"),
                            width: "100%",
                            padding: "8px 12px",
                            fontSize: "13px",
                          }}
                        >
                          🔐 Reset Password
                        </button>
                      )}

                      {canGrantSignedPdfAccess && managedUser.isActive !== false && managedUser.id !== user?.id && (
                        <button
                          className="brand-btn brand-btn-outline"
                          onClick={() => toggleSignedPdfAccess(managedUser)}
                          style={{
                            ...outlineButtonStyle("#2d6a4f"),
                            width: "100%",
                            padding: "8px 12px",
                            fontSize: "13px",
                          }}
                        >
                          {managedUser.canDownloadSignedLeavePdf ? "📄 Revoke PDF Access" : "📄 Grant PDF Access"}
                        </button>
                      )}

                      {managedUser.isActive !== false && managedUser.id !== user?.id && canManageSupervisors && (
                        <button
                          className="brand-btn brand-btn-outline"
                          onClick={() => handleDeactivate(managedUser.id)}
                          disabled={deactivating === managedUser.id}
                          style={{
                            ...outlineButtonStyle("#dc3545"),
                            width: "100%",
                            padding: "8px 12px",
                            fontSize: "13px",
                            opacity: deactivating === managedUser.id ? 0.6 : 1,
                          }}
                        >
                          {deactivating === managedUser.id ? "⏳ Processing..." : "🚫 Deactivate"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "6px",
  color: "#6f6a63",
  fontSize: "13px",
  fontWeight: "600",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 13px",
  border: "1px solid #dcc8b6",
  borderRadius: "10px",
  fontSize: "14px",
  boxSizing: "border-box",
  marginBottom: "14px",
  backgroundColor: "white",
};

const primaryBtnStyle: React.CSSProperties = {
  backgroundColor: "#052976",
  color: "white",
  border: "none",
  padding: "10px 20px",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "600",
};

const secondaryBtnStyle: React.CSSProperties = {
  backgroundColor: "#fff8f0",
  color: "#1d2751",
  border: "1px solid #dcc8b6",
  padding: "10px 20px",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "14px",
};

const roleBadgeStyle = (role: string): React.CSSProperties => ({
  padding: "3px 10px",
  borderRadius: "12px",
  fontSize: "12px",
  fontWeight: "600",
  color: roleColors[role],
  backgroundColor: roleColors[role] + "22",
});

const miniBadgeStyle = (color: string): React.CSSProperties => ({
  padding: "3px 10px",
  borderRadius: "12px",
  fontSize: "12px",
  fontWeight: "600",
  color,
  backgroundColor: `${color}22`,
});

const statusPillStyle = (active: boolean): React.CSSProperties => ({
  fontSize: "12px",
  fontWeight: "600",
  color: active ? "#0a9d76" : "#721c24",
  backgroundColor: active ? "#daf7ea" : "#f8d7da",
  padding: "3px 8px",
  borderRadius: "10px",
});

const outlineButtonStyle = (color: string): React.CSSProperties => ({
  backgroundColor: "#fff",
  color,
  border: `1px solid ${color}`,
  padding: "4px 12px",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "12px",
});

const tabButtonStyle = (active: boolean, color: string): React.CSSProperties => ({
  backgroundColor: active ? "#6c757d" : color,
  color: "white",
  border: "none",
  padding: "10px 20px",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "600",
});
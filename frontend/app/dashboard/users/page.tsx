"use client";

import { useEffect, useState } from "react";
import { authService, ManagedUser, ManagedUserPayload } from "../../lib/authService";
import { leaveService, Site } from "../../lib/leaveService";
import { useAuthStore } from "../../store/authStore";
import { Card } from "../../components/Card";
import { Alert } from "../../components/Alert";
import { toast, Toaster } from "sonner";

type Tab = "list" | "create" | "createSite";

interface SitePayload {
  name: string;
  location: string;
}

const roleColors: Record<string, string> = {
  EMPLOYEE: "#007bff",
  SUPERVISOR: "#6f42c1",
  DEPARTMENT_HEAD: "#fd7e14",
  ADMIN: "#dc3545",
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
  const [managingSitesFor, setManagingSitesFor] = useState<string | null>(null);
  const [selectedSupervisorSites, setSelectedSupervisorSites] = useState<string[]>([]);

  const canCreateEmployee = user?.role === "SUPERVISOR";
  const canCreateSupervisor = user?.role === "DEPARTMENT_HEAD" || user?.role === "ADMIN";
  const canCreateSite = user?.role === "DEPARTMENT_HEAD" || user?.role === "SUPERVISOR";
  const canManageSupervisors = user?.role === "DEPARTMENT_HEAD" || user?.role === "ADMIN";
  const canResetEmployeePasswords = user?.role === "SUPERVISOR";

  const defaultForm: ManagedUserPayload = {
    fullName: "",
    email: "",
    username: "",
    password: "",
    role: canCreateEmployee ? "EMPLOYEE" : "SUPERVISOR",
    siteId: "",
  };

  const [form, setForm] = useState<ManagedUserPayload>(defaultForm);
  const [siteForm, setSiteForm] = useState<SitePayload>({ name: "", location: "" });

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

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await authService.createSite({
        name: siteForm.name.trim(),
        location: siteForm.location.trim(),
      });
      toast.success("Site created successfully");
      setSiteForm({ name: "", location: "" });
      setTab("list");
      await load();
    } catch (err: unknown) {
      const msg =
        err instanceof Object && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(msg ?? "Failed to create site");
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

  const openSiteManager = (managedUser: ManagedUser) => {
    setManagingSitesFor(managedUser.id);
    setSelectedSupervisorSites((managedUser.supervisedSites ?? []).map((site) => site.id));
  };

  const saveSupervisorSites = async (userId: string) => {
    try {
      await authService.assignSupervisorSites({ userId, siteIds: selectedSupervisorSites });
      toast.success("Supervisor sites updated");
      setManagingSitesFor(null);
      await load();
    } catch (err: unknown) {
      const msg =
        err instanceof Object && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(msg ?? "Failed to update supervisor sites");
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

  return (
    <div>
      <Toaster position="top-right" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1 style={{ color: "#333", fontSize: "24px", margin: 0 }}>User Management</h1>
        <div style={{ display: "flex", gap: "10px" }}>
          {(canCreateEmployee || canCreateSupervisor) && (
            <button onClick={() => setTab(tab === "create" ? "list" : "create")} style={tabButtonStyle(tab === "create", "#007bff")}>
              {tab === "create" ? "← Back to List" : `+ Add ${canCreateEmployee ? "Employee" : "User"}`}
            </button>
          )}
          {canCreateSite && (
            <button onClick={() => setTab(tab === "createSite" ? "list" : "createSite")} style={tabButtonStyle(tab === "createSite", "#28a745")}>
              {tab === "createSite" ? "← Back to List" : "+ Add Site"}
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
              <button type="submit" disabled={submitting} style={primaryBtnStyle}>
                {submitting ? "Creating..." : "Create Account"}
              </button>
              <button type="button" onClick={() => { setForm(defaultForm); setTab("list"); }} style={secondaryBtnStyle}>
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {tab === "createSite" && canCreateSite && (
        <Card title="Create Site" style={{ maxWidth: "560px" }}>
          <form onSubmit={handleCreateSite}>
            <label style={labelStyle}>Site Name *</label>
            <input name="name" value={siteForm.name} onChange={(e) => setSiteForm((prev) => ({ ...prev, name: e.target.value }))} required style={inputStyle} />

            <label style={labelStyle}>Location *</label>
            <input name="location" value={siteForm.location} onChange={(e) => setSiteForm((prev) => ({ ...prev, location: e.target.value }))} required style={inputStyle} />

            <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
              <button type="submit" disabled={submitting} style={primaryBtnStyle}>
                {submitting ? "Creating..." : "Create Site"}
              </button>
              <button type="button" onClick={() => setTab("list")} style={secondaryBtnStyle}>
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {tab === "list" && (
        <Card>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>Loading...</div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>No users found.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8f9fa" }}>
                    {["Name", "Role", "Primary Site", "Supervised Sites", "Status", "Actions"].map((header) => (
                      <th key={header} style={thStyle}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((managedUser) => {
                    const isManagingSites = managingSitesFor === managedUser.id;
                    const siteNames = (managedUser.supervisedSites ?? []).map((site) => site.name);
                    return (
                      <>
                        <tr key={managedUser.id} style={{ borderBottom: isManagingSites ? "none" : "1px solid #f0f0f0", opacity: managedUser.isActive === false ? 0.6 : 1 }}>
                          <td style={tdStyle}>
                            <div style={{ fontWeight: 600 }}>{managedUser.fullName}</div>
                            <div style={{ fontSize: "12px", color: "#777", marginTop: "4px" }}>
                              @{managedUser.username} · {managedUser.email}
                            </div>
                          </td>
                          <td style={tdStyle}>
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                              <span style={roleBadgeStyle(managedUser.role)}>{managedUser.role}</span>
                              {managedUser.delegatedDepartmentHead && (
                                <span style={miniBadgeStyle("#fd7e14")}>Delegated Head</span>
                              )}
                            </div>
                          </td>
                          <td style={tdStyle}>{managedUser.site?.name ?? "-"}</td>
                          <td style={tdStyle}>{siteNames.length > 0 ? siteNames.join(", ") : "-"}</td>
                          <td style={tdStyle}>
                            <span style={statusPillStyle(managedUser.isActive !== false)}>
                              {managedUser.isActive !== false ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                              {canManageSupervisors && managedUser.id !== user?.id && (managedUser.role === "EMPLOYEE" || managedUser.role === "SUPERVISOR") && (
                                <button onClick={() => toggleSupervisor(managedUser)} style={outlineButtonStyle("#6f42c1")}>
                                  {managedUser.role === "SUPERVISOR" ? "Remove Supervisor" : "Make Supervisor"}
                                </button>
                              )}

                              {canManageSupervisors && managedUser.role === "SUPERVISOR" && (
                                <button onClick={() => openSiteManager(managedUser)} style={outlineButtonStyle("#0d6efd")}>
                                  Manage Sites
                                </button>
                              )}

                              {canManageSupervisors && managedUser.role === "SUPERVISOR" && managedUser.id !== user?.id && (
                                <button onClick={() => toggleDelegation(managedUser)} style={outlineButtonStyle("#fd7e14")}>
                                  {managedUser.delegatedDepartmentHead ? "Remove Delegation" : "Delegate Powers"}
                                </button>
                              )}

                              {canResetEmployeePasswords && managedUser.role === "EMPLOYEE" && managedUser.isActive !== false && (
                                <button onClick={() => handleResetPassword(managedUser)} style={outlineButtonStyle("#198754")}>
                                  Reset Password
                                </button>
                              )}

                              {managedUser.isActive !== false && managedUser.id !== user?.id && canManageSupervisors && (
                                <button onClick={() => handleDeactivate(managedUser.id)} disabled={deactivating === managedUser.id} style={outlineButtonStyle("#dc3545")}>
                                  {deactivating === managedUser.id ? "..." : "Deactivate"}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {isManagingSites && (
                          <tr key={`${managedUser.id}-sites`} style={{ backgroundColor: "#fafafa", borderBottom: "1px solid #f0f0f0" }}>
                            <td colSpan={6} style={{ padding: "16px" }}>
                              <div style={{ maxWidth: "820px" }}>
                                <div style={{ fontWeight: 600, color: "#333", marginBottom: "10px" }}>
                                  Assign supervised sites to {managedUser.fullName}
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px", marginBottom: "14px" }}>
                                  {sites.map((site) => {
                                    const occupiedByOther = !!site.supervisorId && site.supervisorId !== managedUser.id;
                                    return (
                                      <label key={site.id} style={checkboxCardStyle(occupiedByOther)}>
                                        <input
                                          type="checkbox"
                                          checked={selectedSupervisorSites.includes(site.id)}
                                          disabled={occupiedByOther}
                                          onChange={(event) => {
                                            setSelectedSupervisorSites((prev) => {
                                              if (event.target.checked) {
                                                return [...prev, site.id];
                                              }
                                              return prev.filter((value) => value !== site.id);
                                            });
                                          }}
                                        />
                                        <div>
                                          <div style={{ fontWeight: 600, color: "#333" }}>{site.name}</div>
                                          <div style={{ fontSize: "12px", color: "#777", marginTop: "4px" }}>
                                            {site.location}
                                            {occupiedByOther ? " · already assigned" : ""}
                                          </div>
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                                <div style={{ display: "flex", gap: "10px" }}>
                                  <button onClick={() => saveSupervisorSites(managedUser.id)} style={primaryBtnStyle}>
                                    Save Sites
                                  </button>
                                  <button onClick={() => setManagingSitesFor(null)} style={secondaryBtnStyle}>
                                    Close
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "4px",
  color: "#555",
  fontSize: "13px",
  fontWeight: "500",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid #ddd",
  borderRadius: "6px",
  fontSize: "14px",
  boxSizing: "border-box",
  marginBottom: "14px",
  backgroundColor: "white",
};

const primaryBtnStyle: React.CSSProperties = {
  backgroundColor: "#007bff",
  color: "white",
  border: "none",
  padding: "9px 20px",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "500",
};

const secondaryBtnStyle: React.CSSProperties = {
  backgroundColor: "#f8f9fa",
  color: "#333",
  border: "1px solid #ddd",
  padding: "9px 20px",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "14px",
};

const thStyle: React.CSSProperties = {
  padding: "10px 12px",
  textAlign: "left",
  color: "#555",
  fontWeight: "600",
  borderBottom: "2px solid #e0e0e0",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = { padding: "12px", color: "#333", verticalAlign: "top" };

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
  color: active ? "#155724" : "#721c24",
  backgroundColor: active ? "#d4edda" : "#f8d7da",
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

const checkboxCardStyle = (disabled: boolean): React.CSSProperties => ({
  display: "flex",
  gap: "10px",
  alignItems: "flex-start",
  padding: "12px",
  border: `1px solid ${disabled ? "#ececec" : "#dbe4ff"}`,
  borderRadius: "10px",
  backgroundColor: disabled ? "#f8f9fa" : "white",
  opacity: disabled ? 0.7 : 1,
});

const tabButtonStyle = (active: boolean, color: string): React.CSSProperties => ({
  backgroundColor: active ? "#6c757d" : color,
  color: "white",
  border: "none",
  padding: "9px 20px",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "500",
});
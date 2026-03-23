"use client";

import { useEffect, useState } from "react";
import { authService, ManagedUser, ManagedUserPayload } from "../../lib/authService";
import { leaveService, Site } from "../../lib/leaveService";
import { useAuthStore } from "../../store/authStore";
import { Card } from "../../components/Card";
import { Alert } from "../../components/Alert";
import { toast, Toaster } from "sonner";

type Tab = "list" | "create";

const roleColors: Record<string, string> = {
  EMPLOYEE: "#007bff",
  SUPERVISOR: "#6f42c1",
  DEPARTMENT_HEAD: "#fd7e14",
  ADMIN: "#dc3545",
};

export default function UsersPage() {
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<Tab>("list");
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canCreateEmployee = user?.role === "SUPERVISOR";
  const canCreateSupervisor = user?.role === "DEPARTMENT_HEAD" || user?.role === "ADMIN";
  const isAdmin = user?.role === "ADMIN";

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

  useEffect(() => { load(); }, []);

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

  return (
    <div>
      <Toaster position="top-right" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1 style={{ color: "#333", fontSize: "24px", margin: 0 }}>User Management</h1>
        {(canCreateEmployee || canCreateSupervisor) && (
          <button
            onClick={() => setTab(tab === "create" ? "list" : "create")}
            style={{
              backgroundColor: tab === "create" ? "#6c757d" : "#007bff",
              color: "white",
              border: "none",
              padding: "9px 20px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            {tab === "create" ? "← Back to List" : `+ Add ${canCreateEmployee ? "Employee" : "Supervisor"}`}
          </button>
        )}
      </div>

      {error && <Alert type="error" message={error} />}

      {tab === "create" && (canCreateEmployee || canCreateSupervisor) && (
        <Card title={`Create ${canCreateEmployee ? "Employee" : "Supervisor"} Account`} style={{ maxWidth: "560px" }}>
          <form onSubmit={handleCreate}>
            <label style={labelStyle}>Full Name *</label>
            <input name="fullName" value={form.fullName} onChange={handleChange} required style={inputStyle} />

            <label style={labelStyle}>Email *</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required style={inputStyle} />

            <label style={labelStyle}>Username *</label>
            <input name="username" value={form.username} onChange={handleChange} required style={inputStyle} />

            <label style={labelStyle}>Password *</label>
            <input type="password" name="password" value={form.password} onChange={handleChange} required minLength={6} style={inputStyle} />

            {(canCreateSupervisor || isAdmin) && (
              <>
                <label style={labelStyle}>Role *</label>
                <select name="role" value={form.role} onChange={handleChange} style={inputStyle}>
                  {isAdmin && <option value="EMPLOYEE">Employee</option>}
                  {(canCreateSupervisor || isAdmin) && <option value="SUPERVISOR">Supervisor</option>}
                  {isAdmin && <option value="DEPARTMENT_HEAD">Department Head</option>}
                  {isAdmin && <option value="ADMIN">Admin</option>}
                </select>
              </>
            )}

            {(form.role === "SUPERVISOR" || form.role === "EMPLOYEE") && (canCreateSupervisor || isAdmin) && (
              <>
                <label style={labelStyle}>Assign to Site *</label>
                <select name="siteId" value={form.siteId} onChange={handleChange} required style={inputStyle}>
                  <option value="">Select a site</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id} disabled={form.role === "SUPERVISOR" && !!s.supervisorId}>
                      {s.name} ({s.location}){form.role === "SUPERVISOR" && s.supervisorId ? " — taken" : ""}
                    </option>
                  ))}
                </select>
              </>
            )}

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
                    {["Name", "Username", "Email", "Role", "Site", "Status", "Actions"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 12px",
                          textAlign: "left",
                          color: "#555",
                          fontWeight: "600",
                          borderBottom: "2px solid #e0e0e0",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: "1px solid #f0f0f0", opacity: u.isActive === false ? 0.6 : 1 }}>
                      <td style={tdStyle}>{u.fullName}</td>
                      <td style={tdStyle}>@{u.username}</td>
                      <td style={tdStyle}>{u.email}</td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            padding: "3px 10px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: "600",
                            color: roleColors[u.role],
                            backgroundColor: roleColors[u.role] + "22",
                          }}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td style={tdStyle}>{u.site?.name ?? "-"}</td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: "600",
                            color: u.isActive !== false ? "#155724" : "#721c24",
                            backgroundColor: u.isActive !== false ? "#d4edda" : "#f8d7da",
                            padding: "3px 8px",
                            borderRadius: "10px",
                          }}
                        >
                          {u.isActive !== false ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        {u.isActive !== false && u.id !== user?.id && (isAdmin || user?.role === "DEPARTMENT_HEAD") && (
                          <button
                            onClick={() => handleDeactivate(u.id)}
                            disabled={deactivating === u.id}
                            style={{
                              backgroundColor: "#fff",
                              color: "#dc3545",
                              border: "1px solid #dc3545",
                              padding: "4px 12px",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "12px",
                            }}
                          >
                            {deactivating === u.id ? "..." : "Deactivate"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
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
  display: "block", marginBottom: "4px", color: "#555", fontSize: "13px", fontWeight: "500",
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid #ddd", borderRadius: "6px",
  fontSize: "14px", boxSizing: "border-box", marginBottom: "14px", backgroundColor: "white",
};
const primaryBtnStyle: React.CSSProperties = {
  backgroundColor: "#007bff", color: "white", border: "none", padding: "9px 20px",
  borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: "500",
};
const secondaryBtnStyle: React.CSSProperties = {
  backgroundColor: "#f8f9fa", color: "#333", border: "1px solid #ddd", padding: "9px 20px",
  borderRadius: "6px", cursor: "pointer", fontSize: "14px",
};
const tdStyle: React.CSSProperties = { padding: "10px 12px", color: "#333" };

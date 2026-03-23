"use client";

import { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import { Alert } from "../../components/Alert";
import { Card } from "../../components/Card";
import { authService, ManagedUser } from "../../lib/authService";
import { leaveService, Site } from "../../lib/leaveService";
import { useAuthStore } from "../../store/authStore";

interface SitePayload {
  name: string;
  location: string;
}

export default function SitesPage() {
  const user = useAuthStore((state) => state.user);
  const canCreateSite = user?.role === "DEPARTMENT_HEAD" || user?.delegatedDepartmentHead === true;
  const canManageSupervisors = user?.role === "DEPARTMENT_HEAD" || user?.role === "ADMIN";
  const canAccessPage = canCreateSite || canManageSupervisors;

  const [sites, setSites] = useState<Site[]>([]);
  const [supervisors, setSupervisors] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [managingSitesFor, setManagingSitesFor] = useState<string | null>(null);
  const [selectedSupervisorSites, setSelectedSupervisorSites] = useState<string[]>([]);
  const [siteForm, setSiteForm] = useState<SitePayload>({ name: "", location: "" });

  const load = async () => {
    if (!canAccessPage) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [usersResp, sitesResp] = await Promise.all([authService.getAllUsers(), leaveService.getSites()]);
      const allUsers = usersResp.users ?? [];
      setSites(sitesResp.sites ?? []);
      setSupervisors(allUsers.filter((managedUser) => managedUser.role === "SUPERVISOR" && managedUser.isActive !== false));
    } catch {
      setError("Failed to load site management data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [canAccessPage, user?.role, user?.delegatedDepartmentHead]);

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

  if (!canAccessPage) {
    return (
      <div>
        <Alert type="error" message="You do not have permission to manage sites." />
      </div>
    );
  }

  return (
    <div>
      <Toaster position="top-right" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", gap: "16px", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ color: "#333", fontSize: "24px", margin: 0 }}>Site Management</h1>
          <p style={{ margin: "6px 0 0 0", color: "#666", fontSize: "14px" }}>
            كل ما يخص السايتات صار هنا: إنشاء السايتات وربطها بالمشرفين.
          </p>
        </div>
      </div>

      {error && <Alert type="error" message={error} />}

      {canCreateSite && (
        <Card title="Create Site" style={{ maxWidth: "560px" }}>
          <form onSubmit={handleCreateSite}>
            <label style={labelStyle}>Site Name *</label>
            <input
              name="name"
              value={siteForm.name}
              onChange={(e) => setSiteForm((prev) => ({ ...prev, name: e.target.value }))}
              required
              style={inputStyle}
            />

            <label style={labelStyle}>Location *</label>
            <input
              name="location"
              value={siteForm.location}
              onChange={(e) => setSiteForm((prev) => ({ ...prev, location: e.target.value }))}
              required
              style={inputStyle}
            />

            <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
              <button type="submit" disabled={submitting} style={primaryBtnStyle}>
                {submitting ? "Creating..." : "Create Site"}
              </button>
            </div>
          </form>
        </Card>
      )}

      <Card title="Sites Directory">
        {loading ? (
          <div style={{ textAlign: "center", padding: "32px", color: "#999" }}>Loading...</div>
        ) : sites.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px", color: "#666" }}>No sites found.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8f9fa" }}>
                  {["Site", "Location", "Assigned Supervisor"].map((header) => (
                    <th key={header} style={thStyle}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sites.map((site) => (
                  <tr key={site.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={tdStyle}>{site.name}</td>
                    <td style={tdStyle}>{site.location}</td>
                    <td style={tdStyle}>{site.supervisor?.fullName ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {canManageSupervisors && (
        <Card title="Supervisor Site Assignments">
          {loading ? (
            <div style={{ textAlign: "center", padding: "32px", color: "#999" }}>Loading...</div>
          ) : supervisors.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px", color: "#666" }}>No supervisors available.</div>
          ) : (
            <div style={{ display: "grid", gap: "14px" }}>
              {supervisors.map((managedUser) => {
                const isManagingSites = managingSitesFor === managedUser.id;
                const siteNames = (managedUser.supervisedSites ?? []).map((site) => site.name);
                return (
                  <div key={managedUser.id} style={supervisorCardStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontWeight: 600, color: "#333" }}>{managedUser.fullName}</div>
                        <div style={{ fontSize: "12px", color: "#777", marginTop: "4px" }}>
                          @{managedUser.username} · {managedUser.email}
                        </div>
                        <div style={{ fontSize: "13px", color: "#555", marginTop: "8px" }}>
                          {siteNames.length > 0 ? siteNames.join(", ") : "No supervised sites yet"}
                        </div>
                      </div>
                      <button onClick={() => openSiteManager(managedUser)} style={outlineButtonStyle("#0d6efd")}>
                        {isManagingSites ? "Editing" : "Manage Sites"}
                      </button>
                    </div>

                    {isManagingSites && (
                      <div style={{ marginTop: "14px", borderTop: "1px solid #eef2f7", paddingTop: "14px" }}>
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
                    )}
                  </div>
                );
              })}
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

const tdStyle: React.CSSProperties = {
  padding: "12px",
  color: "#333",
  verticalAlign: "top",
};

const outlineButtonStyle = (color: string): React.CSSProperties => ({
  backgroundColor: "#fff",
  color,
  border: `1px solid ${color}`,
  padding: "6px 12px",
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

const supervisorCardStyle: React.CSSProperties = {
  border: "1px solid #e8edf5",
  borderRadius: "12px",
  padding: "16px",
  backgroundColor: "#fcfdff",
};

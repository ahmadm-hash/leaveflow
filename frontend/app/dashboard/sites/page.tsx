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

    const retry = async <T,>(fn: () => Promise<T>, attempts = 6): Promise<T> => {
      let lastErr: unknown;
      for (let i = 1; i <= attempts; i++) {
        try { return await fn(); } catch (e) {
          lastErr = e;
          if (i < attempts) await new Promise((r) => setTimeout(r, Math.min(250 * i * i, 2000)));
        }
      }
      throw lastErr;
    };

    try {
      const [usersResp, sitesResp] = await Promise.all([
        retry(() => authService.getAllUsers()),
        retry(() => leaveService.getSites()),
      ]);
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
          <h1 style={{ color: "#052976", fontSize: "26px", margin: 0, fontWeight: 700 }}>Site Management</h1>
          <p style={{ margin: "8px 0 0 0", color: "#6f6a63", fontSize: "14px" }}>
            Everything related to sites is managed here: creating sites and assigning supervisors.
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
              <button className="brand-btn brand-btn-primary hover-lift" type="submit" disabled={submitting} style={primaryBtnStyle}>
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
            <table className="brand-table">
              <thead>
                <tr style={{ backgroundColor: "#fff8f0" }}>
                  {["Site", "Location", "Assigned Supervisors"].map((header) => (
                    <th key={header} style={thStyle}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sites.map((site) => (
                  <tr key={site.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={tdStyle}>{site.name}</td>
                    <td style={tdStyle}>{site.location}</td>
                    <td style={tdStyle}>
                      {site.supervisors && site.supervisors.length > 0
                        ? site.supervisors.map((s) => s.fullName).join(", ")
                        : "-"}
                    </td>
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
                        <div style={{ fontWeight: 600, color: "#1d2751" }}>{managedUser.fullName}</div>
                        <div style={{ fontSize: "12px", color: "#6f6a63", marginTop: "4px" }}>
                          @{managedUser.username} · {managedUser.email}
                        </div>
                        <div style={{ fontSize: "13px", color: "#6f6a63", marginTop: "8px" }}>
                          {siteNames.length > 0 ? siteNames.join(", ") : "No supervised sites yet"}
                        </div>
                      </div>
                      <button className="brand-btn brand-btn-outline" onClick={() => openSiteManager(managedUser)} style={outlineButtonStyle("#052976")}>
                        {isManagingSites ? "Editing" : "Manage Sites"}
                      </button>
                    </div>

                    {isManagingSites && (
                      <div style={{ marginTop: "14px", borderTop: "1px solid #ebe1d2", paddingTop: "14px" }}>
                        <div style={{ fontWeight: 600, color: "#1d2751", marginBottom: "10px" }}>
                          Assign supervised sites to {managedUser.fullName}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px", marginBottom: "14px" }}>
                          {sites.map((site) => {
                            const otherSupervisors = (site.supervisors ?? []).filter((s) => s.id !== managedUser.id);
                            const isAssignedToOther = otherSupervisors.length > 0;
                            return (
                              <label key={site.id} style={checkboxCardStyle(isAssignedToOther)}>
                                <input
                                  type="checkbox"
                                  checked={selectedSupervisorSites.includes(site.id)}
                                  disabled={isAssignedToOther}
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
                                  <div style={{ fontWeight: 600, color: "#1d2751" }}>{site.name}</div>
                                  <div style={{ fontSize: "12px", color: "#6f6a63", marginTop: "4px" }}>
                                    {site.location}
                                    {isAssignedToOther
                                      ? ` · assigned to ${otherSupervisors.map((s) => s.fullName).join(", ")}`
                                      : ""}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                        <div style={{ display: "flex", gap: "10px" }}>
                          <button className="brand-btn brand-btn-primary hover-lift" onClick={() => saveSupervisorSites(managedUser.id)} style={primaryBtnStyle}>
                            Save Sites
                          </button>
                          <button className="brand-btn brand-btn-soft" onClick={() => setManagingSitesFor(null)} style={secondaryBtnStyle}>
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

const thStyle: React.CSSProperties = {
  padding: "10px 12px",
  textAlign: "left",
  color: "#6f6a63",
  fontWeight: "600",
  borderBottom: "2px solid #dcc8b6",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "12px",
  color: "#1d2751",
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
  border: `1px solid ${disabled ? "#ececec" : "#bfd0ff"}`,
  borderRadius: "10px",
  backgroundColor: disabled ? "#f7f3ed" : "white",
  opacity: disabled ? 0.7 : 1,
});

const supervisorCardStyle: React.CSSProperties = {
  border: "1px solid #dcc8b6",
  borderRadius: "12px",
  padding: "16px",
  backgroundColor: "#fffdf9",
};

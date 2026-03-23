"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { authService } from "../../lib/authService";
import { Card } from "../../components/Card";
import { Alert } from "../../components/Alert";
import { toast, Toaster } from "sonner";

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFullName(user?.fullName ?? "");
    setEmail(user?.email ?? "");
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await authService.updateProfile({ fullName, email });
      setUser({ ...user!, fullName: response.user.fullName, email: response.user.email });
      setEditing(false);
      toast.success("Profile updated successfully");
    } catch (err: unknown) {
      const msg =
        err instanceof Object && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(msg ?? "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      setError("Unable to identify current user");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Password confirmation does not match");
      return;
    }

    setPasswordLoading(true);
    setError(null);
    try {
      await authService.resetPassword(user.id, newPassword);
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed successfully");
    } catch (err: unknown) {
      const msg =
        err instanceof Object && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(msg ?? "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const roleColors: Record<string, string> = {
    EMPLOYEE: "#007bff",
    SUPERVISOR: "#6f42c1",
    DEPARTMENT_HEAD: "#fd7e14",
    ADMIN: "#dc3545",
  };

  return (
    <div>
      <Toaster position="top-right" />
      <h1 style={{ color: "#333", marginBottom: "24px", fontSize: "24px" }}>My Profile</h1>

      {error && <Alert type="error" message={error} />}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px" }}>
        {/* Left: Avatar + role */}
        <Card>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                backgroundColor: roleColors[user?.role ?? "EMPLOYEE"] ?? "#007bff",
                color: "white",
                fontSize: "32px",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              {user?.fullName?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div style={{ fontWeight: "600", fontSize: "16px", color: "#333" }}>{user?.fullName}</div>
            <div style={{ fontSize: "13px", color: "#666", marginTop: "4px" }}>@{user?.username}</div>
            <span
              style={{
                display: "inline-block",
                marginTop: "10px",
                padding: "4px 12px",
                borderRadius: "12px",
                backgroundColor: roleColors[user?.role ?? "EMPLOYEE"] + "22",
                color: roleColors[user?.role ?? "EMPLOYEE"],
                fontSize: "12px",
                fontWeight: "600",
              }}
            >
              {user?.role}
            </span>
            {user?.site && (
              <div style={{ marginTop: "12px", fontSize: "13px", color: "#555" }}>
                <div style={{ fontWeight: "500" }}>Site</div>
                <div>{user.site.name}</div>
                {user.site.location && <div style={{ color: "#888" }}>{user.site.location}</div>}
              </div>
            )}
          </div>
        </Card>

        {/* Right: Details / Edit form */}
        <div style={{ display: "grid", gap: "20px" }}>
          <Card title="Account Information">
            {!editing ? (
              <div>
                <InfoRow label="Full Name" value={user?.fullName ?? "-"} />
                <InfoRow label="Email" value={user?.email ?? "-"} />
                <InfoRow label="Username" value={user?.username ?? "-"} />
                <InfoRow label="Role" value={user?.role ?? "-"} />
                {user?.annualLeaveBalance !== undefined && (
                  <InfoRow label="Annual Leave Balance" value={`${user.annualLeaveBalance} days`} />
                )}
                <button
                  onClick={() => setEditing(true)}
                  style={primaryBtnStyle}
                >
                  Edit Profile
                </button>
              </div>
            ) : (
              <form onSubmit={handleSave}>
                <label style={labelStyle}>Full Name</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  style={inputStyle}
                />
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={inputStyle}
                />
                <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                  <button type="submit" disabled={loading} style={primaryBtnStyle}>
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setFullName(user?.fullName ?? "");
                      setEmail(user?.email ?? "");
                      setError(null);
                    }}
                    style={secondaryBtnStyle}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </Card>

          <Card title="Change Password">
            <form onSubmit={handlePasswordChange}>
              <label style={labelStyle}>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                required
                style={inputStyle}
              />

              <label style={labelStyle}>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                required
                style={inputStyle}
              />

              <button type="submit" disabled={passwordLoading} style={primaryBtnStyle}>
                {passwordLoading ? "Updating..." : "Change Password"}
              </button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f0f0f0" }}>
      <span style={{ color: "#666", fontSize: "14px" }}>{label}</span>
      <span style={{ color: "#333", fontSize: "14px", fontWeight: "500" }}>{value}</span>
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
  marginBottom: "12px",
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

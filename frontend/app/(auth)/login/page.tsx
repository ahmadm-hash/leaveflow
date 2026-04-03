"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { authService } from "../../lib/authService";
import { toast, Toaster } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authService.login(formData);
      login(response.user, response.token);
      document.cookie = `token=${response.token}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
      toast.success("Login successful!");
      router.push("/dashboard/home");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "transparent",
        position: "relative",
      }}
    >
      <Toaster position="top-right" />
      <div
        className="glass-panel"
        style={{
          padding: "48px 40px",
          width: "100%",
          maxWidth: "440px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
          <img src="/brand/rcjy-logo.png" alt="Royal Commission for Jubail and Yanbu" style={{ width: "100%", maxWidth: "280px", height: "auto" }} />
        </div>
        <h1 className="heading-gradient" style={{ textAlign: "center", marginBottom: "4px", fontSize: "28px" }}>
          LeaveFlow Portal
        </h1>
        <h2 style={{ textAlign: "center", fontSize: "14px", marginBottom: "32px", color: "var(--rc-ink-700)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Secure Login
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", color: "var(--rc-ink-900)", fontWeight: 700, fontSize: "13px" }}>
              Username
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1px solid rgba(255, 255, 255, 0.6)",
                borderRadius: "12px",
                fontSize: "14px",
                boxSizing: "border-box",
                backgroundColor: "rgba(255, 255, 255, 0.5)",
                boxShadow: "inset 0 2px 4px rgba(5, 41, 118, 0.02)",
                outline: "none",
                transition: "all 0.2s ease",
              }}
              onFocus={(e) => {
                e.target.style.backgroundColor = "#fff";
                e.target.style.border = "1px solid var(--rc-blue-500)";
                e.target.style.boxShadow = "0 0 0 3px rgba(38, 51, 255, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.backgroundColor = "rgba(255, 255, 255, 0.5)";
                e.target.style.border = "1px solid rgba(255, 255, 255, 0.6)";
                e.target.style.boxShadow = "inset 0 2px 4px rgba(5, 41, 118, 0.02)";
              }}
            />
          </div>

          <div style={{ marginBottom: "32px" }}>
            <label style={{ display: "block", marginBottom: "8px", color: "var(--rc-ink-900)", fontWeight: 700, fontSize: "13px" }}>
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1px solid rgba(255, 255, 255, 0.6)",
                borderRadius: "12px",
                fontSize: "14px",
                boxSizing: "border-box",
                backgroundColor: "rgba(255, 255, 255, 0.5)",
                boxShadow: "inset 0 2px 4px rgba(5, 41, 118, 0.02)",
                outline: "none",
                transition: "all 0.2s ease",
              }}
              onFocus={(e) => {
                e.target.style.backgroundColor = "#fff";
                e.target.style.border = "1px solid var(--rc-blue-500)";
                e.target.style.boxShadow = "0 0 0 3px rgba(38, 51, 255, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.backgroundColor = "rgba(255, 255, 255, 0.5)";
                e.target.style.border = "1px solid rgba(255, 255, 255, 0.6)";
                e.target.style.boxShadow = "inset 0 2px 4px rgba(5, 41, 118, 0.02)";
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              background: loading ? "var(--rc-ink-700)" : "linear-gradient(135deg, var(--rc-navy-900), var(--rc-blue-700))",
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontSize: "15px",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 700,
              boxShadow: "0 8px 20px rgba(5, 41, 118, 0.2)",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 12px 24px rgba(5, 41, 118, 0.3)";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 8px 20px rgba(5, 41, 118, 0.2)";
              }
            }}
          >
            {loading ? "Authenticating..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

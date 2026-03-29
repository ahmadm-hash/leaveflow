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
        background: "linear-gradient(140deg, #f7f3e9 0%, #f0e8d8 45%, #eef6f2 100%)",
      }}
    >
      <Toaster position="top-right" />
      <div
        style={{
          backgroundColor: "#fffdf8",
          padding: "40px",
          borderRadius: "14px",
          boxShadow: "0 14px 34px rgba(13, 61, 42, 0.15)",
          border: "1px solid #eadfc7",
          width: "100%",
          maxWidth: "400px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
          <span className="brand-mark">RC</span>
        </div>
        <h1 style={{ textAlign: "center", marginBottom: "8px", color: "#0d3d2a", fontSize: "26px" }}>
          Royal Commission LeaveFlow
        </h1>
        <h2 style={{ textAlign: "center", fontSize: "16px", marginBottom: "28px", color: "#6a5b3b", fontWeight: 600 }}>
          Login
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#333" }}>
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
                padding: "10px",
                border: "1px solid #d2c5ab",
                borderRadius: "8px",
                fontSize: "14px",
                boxSizing: "border-box",
                backgroundColor: "#fffefb",
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#333" }}>
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
                padding: "10px",
                border: "1px solid #d2c5ab",
                borderRadius: "8px",
                fontSize: "14px",
                boxSizing: "border-box",
                backgroundColor: "#fffefb",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "11px",
              background: loading ? "#9aa79f" : "linear-gradient(135deg, #126343, #0d3d2a)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
          >
            {loading ? "Loading..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

"use client";

export default function RegisterPage() {
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
        <h2 style={{ textAlign: "center", fontSize: "20px", marginBottom: "20px", color: "#6a5b3b" }}>
          Registration Closed
        </h2>

        <p style={{ color: "#555", lineHeight: 1.6, textAlign: "center", marginBottom: "24px" }}>
          Accounts are created internally. Employees must be added by assigned supervisors,
          and supervisors must be created by the department head.
        </p>

        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <p style={{ color: "#666", fontSize: "14px" }}>
            Already have an account?{" "}
            <a
              href="/login"
              style={{ color: "#126343", textDecoration: "none", fontWeight: 600 }}
            >
              Login here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

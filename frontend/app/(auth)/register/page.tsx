"use client";

export default function RegisterPage() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: "#f5f5f5",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "40px",
          borderRadius: "8px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          width: "100%",
          maxWidth: "400px",
        }}
      >
        <h1 style={{ textAlign: "center", marginBottom: "30px", color: "#333" }}>
          LeaveFlow
        </h1>
        <h2 style={{ textAlign: "center", fontSize: "20px", marginBottom: "30px", color: "#666" }}>
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
              style={{ color: "#007bff", textDecoration: "none" }}
            >
              Login here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

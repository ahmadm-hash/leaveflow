"use client";

export default function RegisterPage() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "linear-gradient(145deg, #fff9f3 0%, #f4eee9 42%, #eef4ff 100%)",
      }}
    >
      <div
        style={{
          backgroundColor: "#fffdf8",
          padding: "40px",
          borderRadius: "14px",
          boxShadow: "0 18px 40px rgba(5, 41, 118, 0.12)",
          border: "1px solid #dcc8b6",
          width: "100%",
          maxWidth: "460px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "18px" }}>
          <img src="/brand/rcjy-logo.png" alt="Royal Commission for Jubail and Yanbu" style={{ width: "100%", maxWidth: "340px", height: "auto" }} />
        </div>
        <h1 style={{ textAlign: "center", marginBottom: "8px", color: "#052976", fontSize: "24px" }}>
          LeaveFlow Portal
        </h1>
        <h2 style={{ textAlign: "center", fontSize: "20px", marginBottom: "20px", color: "#103576" }}>
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
              style={{ color: "#052976", textDecoration: "none", fontWeight: 600 }}
            >
              Login here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

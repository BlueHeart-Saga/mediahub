import { useNavigate } from "react-router-dom";

export default function RegisterBlocked() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "white",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <h2 style={{ color: "#111827", marginBottom: 10 }}>
          Registration Restricted
        </h2>

        <p style={{ color: "#6b7280", fontSize: 14, lineHeight: 1.6 }}>
          Account creation is controlled by the platform administrators.
          <br />
          <br />
          Please contact the Media Hub developer team to join the platform.
        </p>

        <button
          onClick={() => navigate("/contact")}
          style={{
            marginTop: 20,
            background: "#111827",
            color: "white",
            border: "none",
            padding: "10px 18px",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 500,
          }}
          onMouseOver={(e) => (e.target.style.background = "#111827dc")}
          onMouseOut={(e) => (e.target.style.background = "#111827")}
        >
          Contact Developer Team
        </button>
      </div>
    </div>
  );
}
import { useState } from "react";
import { apiFetch } from "../../api/client";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Home } from "lucide-react";
import "../../styles/ForgotPassword.css";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

 const requestOtp = async () => {

  setError("");

  if (!email.trim()) {
    const msg = "Email required";
    setError(msg);
    toast.error(msg);
    return;
  }

  if (loading) return;

  try {

    setLoading(true);

    await apiFetch("/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    toast.success("OTP sent successfully");

    navigate("/reset-password", { state: { email } });

  } catch (err) {

    console.error(err);

    const message =
      err?.response?.data?.detail ||
      err?.detail ||
      "Request failed";

    setError(message);
    toast.error(message);

  } finally {
    setLoading(false);
  }
};

  const handleKeyDown = (e) => {
    if (e.key === "Enter") requestOtp();
  };

  return (
    <div className="fp-page">
      
      <div className="fp-card">

        <div className="fp-top-row">
          <div className="ph-login-logo"></div>
          <div
            className="fp-home"
            onClick={() => navigate("/")}
            title="Go to Home"
          >
            <Home size={18} />
          </div>
        </div>

        <h2>Forgot Password</h2>
        <p className="fp-subtext">Enter your email to receive OTP</p>

        {/* Top Skeleton Decorations */}
        <div className="fp-skeleton-line"></div>
        <div className="fp-skeleton-line short"></div>

        <div className="fp-field">
          <label>Email</label>

          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="email"
          />

          {/* Input Skeleton Accent */}
          <div className="fp-skeleton-input"></div>
        </div>

        <button
          className="fp-button"
          onClick={requestOtp}
          disabled={loading}
        >
          Send OTP
        </button>

        {error && <p className="fp-error">{error}</p>}

        {/* Bottom Skeleton UI */}
        <div className="fp-skeleton-footer">
          <div></div>
          <div></div>
          <div></div>
        </div>

      </div>
    </div>
  );
}
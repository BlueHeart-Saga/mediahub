import { useState } from "react";
import { apiFetch } from "../../api/client";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import "../../styles/ResetPassword.css";
import { Home } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const prefilledEmail = location.state?.email || "";

  const [form, setForm] = useState({
    email: prefilledEmail,
    otp: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {

  setError("");

  if (!form.email || !form.otp || !form.password) {
    const msg = "Fill all fields";
    setError(msg);
    toast.error(msg);
    return;
  }

  if (!/^\d{6}$/.test(form.otp)) {
    const msg = "OTP must be a 6-digit number";
    setError(msg);
    toast.error(msg);
    return;
  }

  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  if (!passwordRegex.test(form.password)) {
    const msg =
      "Password must be 8+ chars with uppercase, lowercase and number";
    setError(msg);
    toast.error(msg);
    return;
  }

  if (loading) return;
  setLoading(true);

  try {

    await apiFetch("/reset-password", {
      method: "POST",
      body: JSON.stringify(form),
    });

    toast.success("Password reset successful");

    navigate("/login");

  } catch (err) {

    console.error(err);

    const message =
      err?.response?.data?.detail ||
      err?.detail ||
      "Reset failed";

    setError(message);
    toast.error(message);

  } finally {
    setLoading(false);
  }
};

  return (
    <div className="rp-page">
      <div className="rp-card">
         <div
    className="ph-login-home"
    onClick={() => navigate("/")}
    title="Go to Home"
  >
    <Home size={18} />
  </div>

        <h2>Reset Password</h2>
        <p className="rp-subtext">Enter OTP and new password</p>

        {/* Static Skeleton Decorations */}
        <div className="rp-skeleton-line"></div>
        <div className="rp-skeleton-line short"></div>

        <div className="rp-field">
          <label>Email</label>
          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>

        <div className="rp-field">
          <label>OTP</label>
          <input
            placeholder="Enter OTP"
            value={form.otp}
            onChange={(e) => setForm({ ...form, otp: e.target.value })}
          />
        </div>

        <div className="rp-field">
          <label>New Password</label>
          <input
            type="password"
            placeholder="New Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>

        <button
          className="rp-button"
          onClick={handleReset}
          disabled={loading}
        >
          Reset Password
        </button>

        {error && <p className="rp-error">{error}</p>}

        <div className="rp-skeleton-footer">
          <div></div>
          <div></div>
        </div>

      </div>
    </div>
  );
}
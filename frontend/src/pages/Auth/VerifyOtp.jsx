import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../api/client";
import toast from "react-hot-toast";
import { Home } from "lucide-react";
import "../../styles/VerifyOtp.css";

export default function VerifyOtp() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    otp: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const handleSubmit = async () => {
    if (loading) return;

    setError("");

    if (!form.email || !form.otp || !form.password) {
      const msg = "All fields required";
      setError(msg);
      toast.error(msg);
      return;
    }

    if (form.otp.length !== 6) {
      const msg = "OTP must be 6 digits";
      setError(msg);
      toast.error(msg);
      return;
    }

    if (form.password.length < 8) {
      const msg = "Password must be at least 8 characters";
      setError(msg);
      toast.error(msg);
      return;
    }

    const hasUpper = /[A-Z]/.test(form.password);
    const hasLower = /[a-z]/.test(form.password);
    const hasNumber = /[0-9]/.test(form.password);

    if (!hasUpper || !hasLower || !hasNumber) {
      const msg = "Password must contain uppercase, lowercase and a number";
      setError(msg);
      toast.error(msg);
      return;
    }


    if (form.password !== form.confirmPassword) {
      const msg = "Passwords do not match";
      setError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);

    try {
      const res = await apiFetch("/verify-otp", {
        method: "POST",
        body: JSON.stringify({
          email: form.email.trim(),
          otp: form.otp,
          password: form.password,
        }),
      });

      if (res?.detail) {
        setError(res.detail);
        toast.error(res.detail);
        return;
      }

      toast.success("Account activated successfully");
      navigate("/login");
    } catch (err) {
      console.error(err);
      toast.error("Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (cooldown > 0) return;

    if (!form.email) {
      const msg = "Enter email first";
      setError(msg);
      toast.error(msg);
      return;
    }

    try {
      const res = await apiFetch("/resend-otp", {
        method: "POST",
        body: JSON.stringify({ email: form.email.trim() }),
      });

      if (res?.detail) {
        setError(res.detail);
        toast.error(res.detail);
        return;
      }

      toast.success("New OTP sent");

      setCooldown(30);

      const interval = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {

  console.error(err);

  const message =
    err?.response?.data?.detail ||
    err?.detail ||
    "Could not resend OTP";

  setError(message);
  toast.error(message);

}
  };

  return (
    <div className="vo-page">
      <div className="vo-card">

        <div className="vo-top-row">
          <div className="ph-login-logo"></div>
          <div
            className="vo-home"
            onClick={() => navigate("/")}
            title="Go to Home"
          >
            <Home size={18} />
          </div>
        </div>

        <h2>Verify OTP</h2>
        <p className="vo-subtext">
          Enter your OTP and create a secure password
        </p>

        {/* Skeleton Decorations */}
        <div className="vo-skeleton-line"></div>
        <div className="vo-skeleton-line short"></div>

        <div className="vo-field">
          <label>Email</label>
          <input
            value={form.email}
            placeholder="Enter your email"
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>

        <div className="vo-field">
          <label>OTP Code</label>
          <input
            value={form.otp}
            maxLength={6}
            placeholder="6-digit code"
            onChange={(e) =>
              setForm({
                ...form,
                otp: e.target.value.replace(/\D/g, ""),
              })
            }
          />
        </div>

        <div className="vo-field">
          <label>Password</label>
          <input
            type="password"
            placeholder="New password"
            value={form.password}
            onChange={(e) =>
              setForm({ ...form, password: e.target.value })
            }
          />
        </div>

        <div className="vo-field">
          <label>Confirm Password</label>
          <input
            type="password"
            placeholder="Confirm password"
            value={form.confirmPassword}
            onChange={(e) =>
              setForm({ ...form, confirmPassword: e.target.value })
            }
          />
        </div>

        <button
          className="vo-primary-btn"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Verifying..." : "Activate Account"}
        </button>

        <button
          className="vo-secondary-btn"
          onClick={resendOtp}
          disabled={cooldown > 0}
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
        </button>

        {error && <p className="vo-error">{error}</p>}

        {/* Footer Skeleton */}
        <div className="vo-skeleton-footer">
          <div></div>
          <div></div>
        </div>

      </div>
    </div>
  );
}
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { resolveDashboardRoute } from "../utils/roleRedirect";
import "../styles/Login.css";
import { Home, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function Login() {

  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: ""
  });

  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {

    if (!form.email || !form.password) {
      toast.error("Email and password required");
      return;
    }

    try {

      setLoading(true);

      const res = await apiFetch("/login", {
        method: "POST",
        body: JSON.stringify(form),
      });

      if (!res?.token) {
        toast.error(res?.detail || "Invalid credentials");
        return;
      }

      

      const payload = await login(res.token);

      if (!payload) {
        toast.error("Login failed");
        return;
      }

      toast.success("Login successful");

      setTimeout(() => {
        navigate(resolveDashboardRoute(payload.role));
      }, 500);

    } catch (err) {

  console.error("Login error:", err);

  const message =
    err?.response?.data?.detail ||
    err?.message ||
    "Server error. Please try again.";

  toast.error(message);
} finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (

    <div className="ph-login-page">

      <div className="ph-login-card">

        {/* Header */}
        <div className="ph-login-header">

          <div className="ph-login-logo"></div>

          <div
            className="ph-login-home"
            onClick={() => navigate("/")}
            title="Go to Home"
          >
            <Home size={18} />
          </div>

          <h2>Welcome Back</h2>
          <p>Podcast Management Platform</p>

        </div>

        {/* Email */}
        <div className="ph-login-field">

          <label>Email</label>

          <input
            placeholder="Enter your email"
            onKeyDown={handleKeyDown}
            value={form.email}
            onChange={(e) =>
              setForm({ ...form, email: e.target.value })
            }
          />

        </div>

        {/* Password */}
        <div className="ph-login-field">

          <label>Password</label>

          <input
            type="password"
            placeholder="Enter your password"
            onKeyDown={handleKeyDown}
            value={form.password}
            onChange={(e) =>
              setForm({ ...form, password: e.target.value })
            }
          />

        </div>

        {/* Login Button */}
        <button
          className={`ph-login-btn ${loading ? "loading" : ""}`}
          onClick={handleLogin}
          disabled={loading}
        >

          {loading ? (
            <>
              <Loader2 size={16} className="spin" />
              Logging in...
            </>
          ) : (
            "Log In"
          )}

        </button>

        {/* Footer */}
        <div className="ph-login-footer">

          <span
            className="ph-login-link"
            onClick={() => navigate("/forgot-password")}
          >
            Forgot Password?
          </span>

        </div>

      </div>

    </div>
  );
}
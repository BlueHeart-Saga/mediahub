import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Lock, Mail, ArrowRight, ShieldCheck, Terminal, ArrowLeft } from "lucide-react";
import { apiFetch } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import "../../styles/DeveloperLogin.css";

export default function DeveloperLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await apiFetch("/developer-login", {
        method: "POST",
        body: JSON.stringify(formData),
      });

      await login(data.token);
      navigate("/developer/superadmin/manage");
    } catch (err) {
      setError(err.message || "Invalid developer credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ph-dev-page">
      <div className="ph-dev-card">
        <div className="ph-dev-header">
          <div className="ph-dev-logo-container">
            <Terminal size={32} />
          </div>
          <h2>Terminal Access</h2>
          <p>Internal Developer Protocol</p>
        </div>

        {error && (
          <div className="ph-dev-error">
            <ShieldCheck size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="ph-dev-form">
          <div className="ph-dev-field">
            <label>Access Key (Email)</label>
            <div className="ph-dev-input-wrapper">
              <Mail className="ph-dev-icon" size={18} />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="ph-dev-input"
                placeholder="developer@mediahub.com"
              />
            </div>
          </div>

          <div className="ph-dev-field">
            <label>Protocol Secret</label>
            <div className="ph-dev-input-wrapper">
              <Lock className="ph-dev-icon" size={18} />
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="ph-dev-input"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="ph-dev-btn"
          >
            {loading ? (
              <>
                <div className="ph-dev-spin" />
                Initializing...
              </>
            ) : (
              <>
                Initialize Connection <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="ph-dev-footer">
          <Link to="/" className="ph-dev-home-link">
            <ArrowLeft size={14} />
            Back to Public Portal
          </Link>
        </div>
      </div>
    </div>
  );
}

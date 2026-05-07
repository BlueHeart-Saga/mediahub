import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Building, MessageSquare, CheckCircle2, Layout, ArrowRight, AlertTriangle, Loader2, ChevronRight } from "lucide-react";
import { apiFetch } from "../api/client";
import "../styles/RegisterBlocked.css";

export default function RegisterBlocked() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", company_name: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiFetch("/registration-requests", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Failed to submit request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="ph-rb-page">
        <div className="ph-rb-card">
          <div className="ph-rb-success">
            <div className="ph-rb-success-icon">
              <CheckCircle2 size={32} />
            </div>
            <h2>Request Submitted</h2>
            <p>
              Thank you for your interest! Our administrative team has received your 
              access request. We will review your application and contact you via email shortly.
            </p>
            <button onClick={() => navigate("/")} className="ph-rb-btn ph-rb-btn-primary" style={{ width: '100%' }}>
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ph-rb-page">
      <div className="ph-rb-card">
        <div className="ph-rb-header">
          <div className="ph-rb-logo"></div>
          <h2>Join the Platform</h2>
          <p>
            Registration is currently restricted to approved partners. 
            Please submit a request to our management team to begin your onboarding process.
          </p>
        </div>

        {!showForm ? (
          <div className="ph-rb-actions">
            <button onClick={() => setShowForm(true)} className="ph-rb-btn ph-rb-btn-primary">
              Request Access Credentials
              <ArrowRight size={18} />
            </button>
            <button onClick={() => navigate("/")} className="ph-rb-btn ph-rb-btn-secondary">
              Back to Home
            </button>
            
            <div style={{ marginTop: '20px', borderTop: '1px solid #f3f4f6', paddingTop: '20px' }}>
               <button 
                onClick={() => navigate("/login")}
                className="ph-rb-btn ph-rb-btn-secondary"
               >
                 Already have an account? Login
               </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="ph-rb-form">
            {error && (
              <div className="ph-rb-error">
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="ph-rb-field">
              <label>Full Name</label>
              <div className="ph-rb-input-wrapper">
                <User className="ph-rb-icon" size={18} />
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  className="ph-rb-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div className="ph-rb-field">
              <label>Work Email</label>
              <div className="ph-rb-input-wrapper">
                <Mail className="ph-rb-icon" size={18} />
                <input
                  type="email"
                  required
                  placeholder="john@company.com"
                  className="ph-rb-input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="ph-rb-field">
              <label>Company Name</label>
              <div className="ph-rb-input-wrapper">
                <Building className="ph-rb-icon" size={18} />
                <input
                  type="text"
                  required
                  placeholder="Your Organization"
                  className="ph-rb-input"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                />
              </div>
            </div>

            <div className="ph-rb-field">
              <label>Additional Information</label>
              <div className="ph-rb-input-wrapper">
                <MessageSquare className="ph-rb-icon" style={{ top: '14px' }} size={18} />
                <textarea
                  placeholder="Tell us about your podcast or interest..."
                  className="ph-rb-input ph-rb-textarea"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
              </div>
            </div>

            <div className="ph-rb-actions">
              <button
                type="submit"
                disabled={loading}
                className={`ph-rb-btn ph-rb-btn-primary ${loading ? 'opacity-70 cursor-wait' : ''}`}
              >
                {loading ? (
                  <>
                    <Loader2 className="ph-rb-spin" size={18} />
                    Processing Request...
                  </>
                ) : (
                  "Submit Application"
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="ph-rb-btn ph-rb-btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
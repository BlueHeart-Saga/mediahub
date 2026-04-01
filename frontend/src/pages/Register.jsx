// Register.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import { resolveDashboardRoute } from "../utils/roleRedirect";
import { useAuth } from "../context/AuthContext";
import "../styles/Register.css";

// Toast Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-content">
        {type === 'success' && (
          <svg className="toast-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )}
        {type === 'error' && (
          <svg className="toast-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )}
        {type === 'info' && (
          <svg className="toast-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        )}
        <span className="toast-message">{message}</span>
      </div>
      <button className="toast-close" onClick={onClose}>×</button>
    </div>
  );
};

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Toast functions
  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const handleRegister = async () => {
    // Validation
    if (!form.name.trim()) {
      addToast("Name is required", "error");
      return;
    }
    
    if (!form.email.trim()) {
      addToast("Email is required", "error");
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      addToast("Invalid email format", "error");
      return;
    }
    
    if (!form.password) {
      addToast("Password is required", "error");
      return;
    }
    
    if (form.password.length < 8) {
      addToast("Password must be at least 8 characters long", "error");
      return;
    }

    setLoading(true);
    
    try {
      const res = await apiFetch("/register-super-admin", {
        method: "POST",
        body: JSON.stringify(form),
      });

      console.log("Registration response:", res);

      // Show success toast with backend message
      if (res.message) {
        addToast(res.message, "success");
      } else {
        addToast("Registration successful! Please login.", "success");
      }

      // Show user_id if present
      if (res.user_id) {
        addToast(`User ID: ${res.user_id}`, "info");
      }

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/login");
      }, 2000);

    } catch (err) {
      console.error("Registration error:", err);
      
      // Show error toast with backend error message
      if (err.detail) {
        addToast(err.detail, "error");
      } else if (err.message) {
        addToast(err.message, "error");
      } else {
        addToast("Registration failed. Please try again.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !loading) {
      handleRegister();
    }
  };

  return (
    <div className="ph-register-page">
      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      <div className="ph-register-card">
        {/* Header */}
        <div className="ph-register-header">
          <div className="ph-register-logo"></div>
          <h2>Create Account</h2>
          <p>Register Super Admin</p>
        </div>

        {/* Fields */}
        <div className="ph-register-field">
          <label>Name</label>
          <input
            type="text"
            placeholder="Enter your name"
            value={form.name}
            onKeyDown={handleKeyDown}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            disabled={loading}
          />
        </div>

        <div className="ph-register-field">
          <label>Email</label>
          <input
            type="email"
            placeholder="Enter your email"
            value={form.email}
            onKeyDown={handleKeyDown}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            disabled={loading}
          />
        </div>

        <div className="ph-register-field">
          <label>Password</label>
          <input
            type="password"
            placeholder="Enter your password"
            value={form.password}
            onKeyDown={handleKeyDown}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            disabled={loading}
          />
          <small className="password-hint">
            Must be at least 8 characters long
          </small>
        </div>

        {/* Button */}
        <button 
          className={`ph-register-btn ${loading ? 'loading' : ''}`} 
          onClick={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              Registering...
            </>
          ) : (
            "Register"
          )}
        </button>

        {/* Login Link */}
        <div className="ph-register-footer">
          <p>
            Already have an account?{' '}
            <button 
              onClick={() => navigate("/login")}
              className="link-button"
              disabled={loading}
            >
              Login here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
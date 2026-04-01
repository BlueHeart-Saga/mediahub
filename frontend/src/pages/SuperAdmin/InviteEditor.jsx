import { useEffect, useState } from "react";
import { apiFetch } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import "../../styles/InviteEditor.css";

export default function InviteEditor() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const [companies, setCompanies] = useState([]);
  const [editors, setEditors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loadingEditors, setLoadingEditors] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionId, setActionId] = useState(null); // Track which editor is being acted upon

  const [form, setForm] = useState({
    email: "",
    name: "",
    company_id: "",
  });

  const [filters, setFilters] = useState({
    company_id: "",
    status: "",
    search: ""
  });

  // Load companies on mount
  useEffect(() => {
    if (isSuperAdmin) {
      loadCompanies();
    } else {
      setLoadingCompanies(false);
    }
  }, [isSuperAdmin]);

  // Load editors when filters change
  useEffect(() => {
    loadEditors();
  }, [filters.company_id, filters.status, filters.search]);

  const loadCompanies = async () => {
    try {
      const res = await apiFetch("/companies");
      if (res?.companies) {
        setCompanies(res.companies);
      }
    } catch (err) {
      console.error("Failed to load companies:", err);
      toast.error("Failed to load companies");
    } finally {
      setLoadingCompanies(false);
    }
  };

  const loadEditors = async () => {
    setLoadingEditors(true);
    try {
      // Build query params
      const params = new URLSearchParams();
      if (filters.company_id) params.append("company_id", filters.company_id);
      if (filters.status) params.append("status", filters.status);
      if (filters.search) params.append("search", filters.search);
      
      const res = await apiFetch(`/editors?${params.toString()}`);
      
      if (res?.editors) {
        setEditors(res.editors);
      } else if (res?.users) { // Fallback to old endpoint
        setEditors(res.users);
      }
    } catch (err) {
      console.error("Failed to load editors:", err);
      toast.error("Failed to load editors");
    } finally {
      setLoadingEditors(false);
    }
  };

  const handleInvite = async () => {
    // Validation
    if (!form.email.trim()) {
      toast.error("Email is required");
      return;
    }

    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (isSuperAdmin && !form.company_id) {
      toast.error("Please select a company");
      return;
    }

    setLoading(true);
    try {
      const payload = { 
        email: form.email,
        name: form.name 
      };
      if (isSuperAdmin) {
        payload.company_id = form.company_id;
      }

      const res = await apiFetch("/create-editor", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res?.detail) {
        if (res.detail.includes("already exists")) {
          toast.error("This email is already registered");
        } else {
          toast.error(res.detail);
        }
        return;
      }

      if (res?.success || res?.message) {
        toast.success(res.message || "Invitation sent successfully");
        setForm({ email: "", name: "", company_id: "" });
        loadEditors();
      }
    } catch (err) {
      console.error("Failed to send invitation:", err);
      toast.error("Failed to send invitation");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (editorId, action, successMessage) => {
    // Confirmation messages based on action
    let confirmMessage = "";
    switch(action) {
      case "delete":
        confirmMessage = "Are you sure you want to delete this editor? This action cannot be undone.";
        break;
      case "suspend":
        confirmMessage = "Are you sure you want to suspend this editor?";
        break;
      case "activate":
        confirmMessage = "Are you sure you want to activate this editor?";
        break;
      case "resend-invite":
        confirmMessage = "Are you sure you want to resend the invitation?";
        break;
      default:
        confirmMessage = `Are you sure you want to ${action} this editor?`;
    }

    if (!confirm(confirmMessage)) {
      return;
    }

    setActionLoading(true);
    setActionId(editorId);
    
    try {
      let endpoint;
      let method = "PATCH";
      
      // Map actions to correct endpoints
      switch(action) {
        case "delete":
          endpoint = `/editors/${editorId}`; // No /delete suffix
          method = "DELETE";
          break;
        case "resend-invite":
          endpoint = `/editors/${editorId}/resend-invite`;
          method = "POST";
          break;
        case "suspend":
          endpoint = `/editors/${editorId}/suspend`;
          break;
        case "activate":
          endpoint = `/editors/${editorId}/activate`;
          break;
        default:
          endpoint = `/editors/${editorId}/${action}`;
      }

      const res = await apiFetch(endpoint, { method });

      if (res?.detail) {
        toast.error(res.detail);
        return;
      }

      if (res?.success || res?.message) {
        toast.success(successMessage);
        loadEditors(); // Reload the list
      }
    } catch (err) {
      console.error(`Failed to ${action} editor:`, err);
      toast.error(`Failed to ${action} editor`);
    } finally {
      setActionLoading(false);
      setActionId(null);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'active': return 'ie-status-active';
      case 'pending': return 'ie-status-pending';
      case 'suspended': return 'ie-status-suspended';
      case 'deleted': return 'ie-status-deleted';
      default: return '';
    }
  };

  const getCompanyName = (companyId) => {
    const company = companies.find(c => c.company_id === companyId);
    return company ? company.name : companyId;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isActionDisabled = (editorId) => {
    return actionLoading && actionId === editorId;
  };

  return (
    <div className="ie-container">

      {/* Header */}
      <div className="ie-header">
        <h1 className="ie-title">Invite Editor</h1>
        <p className="ie-subtitle">
          {isSuperAdmin 
            ? "Invite editors to manage content across companies" 
            : "Invite editors to manage content for your company"}
        </p>
      </div>

      {/* Invite Form */}
      <div className="ie-card">
        <h3 className="ie-card-title">Send Invitation</h3>
        <div className="ie-form-grid">
          {loadingCompanies ? (
            <div className="ie-skeleton-input"></div>
          ) : (
            isSuperAdmin && (
              <select
                className="ie-select"
                value={form.company_id}
                onChange={(e) => setForm({ ...form, company_id: e.target.value })}
                disabled={loading || actionLoading}
              >
                <option value="">Select Company</option>
                {companies.map((company) => (
                  <option key={company.company_id} value={company.company_id}>
                    {company.name}
                  </option>
                ))}
              </select>
            )
          )}

          <input
            type="text"
            className="ie-input"
            placeholder="Full Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            disabled={loading || actionLoading}
          />

          <input
            type="email"
            className="ie-input"
            placeholder="Email Address"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            disabled={loading || actionLoading}
          />

          <button
            className="ie-btn ie-btn-primary"
            onClick={handleInvite}
            disabled={loading || actionLoading}
          >
            {loading ? "Sending..." : "Send Invitation"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="ie-card">
        <div className="ie-filters">
          {isSuperAdmin && (
            <select
              className="ie-select"
              value={filters.company_id}
              onChange={(e) => setFilters({ ...filters, company_id: e.target.value })}
            >
              <option value="">All Companies</option>
              {companies.map((company) => (
                <option key={company.company_id} value={company.company_id}>
                  {company.name}
                </option>
              ))}
            </select>
          )}

          <select
            className="ie-select"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>

          <input
            type="text"
            className="ie-input"
            placeholder="Search by name or email"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />

          <button 
            className="ie-btn ie-btn-secondary"
            onClick={() => setFilters({ company_id: "", status: "", search: "" })}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Editors List */}
      <div className="ie-card">
        <h3 className="ie-card-title">Editors</h3>
        
        {loadingEditors ? (
          <div className="ie-loading">
            <div className="ie-spinner"></div>
            <p>Loading editors...</p>
          </div>
        ) : editors.length === 0 ? (
          <div className="ie-empty">
            <p>No editors found</p>
            <p className="ie-empty-sub">Try adjusting your filters or invite a new editor</p>
          </div>
        ) : (
          <div className="ie-table-container">
            <table className="ie-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  {isSuperAdmin && <th>Company</th>}
                  <th>Status</th>
                  <th>Invited On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {editors.map((editor) => (
                  <tr key={editor._id}>
                    <td className="ie-name-cell">
                      <strong>{editor.name || "—"}</strong>
                    </td>
                    <td>{editor.email}</td>
                    {isSuperAdmin && (
                      <td>{editor.company_name || getCompanyName(editor.company_id)}</td>
                    )}
                    <td>
                      <span className={`ie-status-badge ${getStatusBadgeClass(editor.status)}`}>
                        {editor.status}
                      </span>
                    </td>
                    <td>{formatDate(editor.created_at)}</td>
                    <td className="ie-actions-cell">
                      {editor.status === 'pending' && (
                        <>
                          <button
                            className="ie-action-btn ie-action-resend"
                            onClick={() => handleAction(editor._id, 'resend-invite', 'Invitation resent')}
                            disabled={isActionDisabled(editor._id)}
                            title="Resend invitation"
                          >
                            {isActionDisabled(editor._id) ? '...' : 'Resend'}
                          </button>
                          <button
                            className="ie-action-btn ie-action-delete"
                            onClick={() => handleAction(editor._id, 'delete', 'Editor deleted')}
                            disabled={isActionDisabled(editor._id)}
                            title="Delete editor"
                          >
                            {isActionDisabled(editor._id) ? '...' : 'Delete'}
                          </button>
                        </>
                      )}
                      
                      {editor.status === 'active' && (
                        <>
                          <button
                            className="ie-action-btn ie-action-suspend"
                            onClick={() => handleAction(editor._id, 'suspend', 'Editor suspended')}
                            disabled={isActionDisabled(editor._id)}
                            title="Suspend editor"
                          >
                            {isActionDisabled(editor._id) ? '...' : 'Suspend'}
                          </button>
                          <button
                            className="ie-action-btn ie-action-delete"
                            onClick={() => handleAction(editor._id, 'delete', 'Editor deleted')}
                            disabled={isActionDisabled(editor._id)}
                            title="Delete editor"
                          >
                            {isActionDisabled(editor._id) ? '...' : 'Delete'}
                          </button>
                        </>
                      )}
                      
                      {editor.status === 'suspended' && (
                        <>
                          <button
                            className="ie-action-btn ie-action-activate"
                            onClick={() => handleAction(editor._id, 'activate', 'Editor activated')}
                            disabled={isActionDisabled(editor._id)}
                            title="Activate editor"
                          >
                            {isActionDisabled(editor._id) ? '...' : 'Activate'}
                          </button>
                          <button
                            className="ie-action-btn ie-action-delete"
                            onClick={() => handleAction(editor._id, 'delete', 'Editor deleted')}
                            disabled={isActionDisabled(editor._id)}
                            title="Delete editor"
                          >
                            {isActionDisabled(editor._id) ? '...' : 'Delete'}
                          </button>
                        </>
                      )}

                      {editor.status === 'deleted' && (
                        <span className="ie-text-muted">Deleted</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
import { useEffect, useState } from "react";
import { apiFetch } from "../../api/client";
import toast from "react-hot-toast";
import "../../styles/InviteAdmin.css";

export default function InviteAdmin() {
  const [companies, setCompanies] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionId, setActionId] = useState(null); // Track which admin is being acted upon
  const [filters, setFilters] = useState({
    company_id: "",
    status: "",
    search: ""
  });

  const [form, setForm] = useState({
    email: "",
    name: "",
    company_id: "",
  });

  // Load companies on mount
  useEffect(() => {
    loadCompanies();
  }, []);

  // Load admins when filters change
  useEffect(() => {
    loadAdmins();
  }, [filters.company_id, filters.status, filters.search]);

  const loadCompanies = async () => {
    try {
      const res = await apiFetch("/companies");
      if (res?.companies) {
        setCompanies(res.companies);
      }
    } catch (err) {
      toast.error("Failed to load companies");
    }
  };

  const loadAdmins = async () => {
    setLoading(true);
    try {
      // Build query params
      const params = new URLSearchParams();
      if (filters.company_id) params.append("company_id", filters.company_id);
      if (filters.status) params.append("status", filters.status);
      if (filters.search) params.append("search", filters.search);
      
      const res = await apiFetch(`/company-admins?${params.toString()}`);
      
      if (res?.admins) {
        setAdmins(res.admins);
      } else if (res?.users) { // Fallback to old endpoint
        setAdmins(res.users);
      }
    } catch (err) {
      console.error("Failed to load admins:", err);
      toast.error("Failed to load admins");
    } finally {
      setLoading(false);
    }
  };

  const inviteAdmin = async () => {
    // Validation
    if (!form.email.trim()) {
      toast.error("Email is required");
      return;
    }

    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }

    if (!form.company_id) {
      toast.error("Please select a company");
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setActionLoading(true);
    try {
      const res = await apiFetch("/create-company-admin", {
        method: "POST",
        body: JSON.stringify(form),
      });

      toast.success(res.message || "Invitation sent successfully");
      setForm({ email: "", name: "", company_id: "" });
      loadAdmins(); // Reload the list
    } catch (err) {
      console.error("Failed to send invitation:", err);
      const errorMessage = err.message || "Failed to send invitation";
      if (errorMessage.includes("already exists")) {
        toast.error("This email is already registered");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setActionLoading(false);
    }

  };

  const handleAction = async (adminId, action, successMessage) => {
    // Confirmation messages based on action
    let confirmMessage = "";
    switch(action) {
      case "delete":
        confirmMessage = "Are you sure you want to delete this admin? This action cannot be undone.";
        break;
      case "suspend":
        confirmMessage = "Are you sure you want to suspend this admin?";
        break;
      case "activate":
        confirmMessage = "Are you sure you want to activate this admin?";
        break;
      case "resend-invite":
        confirmMessage = "Are you sure you want to resend the invitation?";
        break;
      default:
        confirmMessage = `Are you sure you want to ${action} this admin?`;
    }

    if (!confirm(confirmMessage)) {
      return;
    }

    setActionLoading(true);
    setActionId(adminId);
    
    try {
      let endpoint;
      let method = "PATCH";
      
      // Map actions to correct endpoints
      switch(action) {
        case "delete":
          endpoint = `/company-admins/${adminId}`; // No /delete suffix
          method = "DELETE";
          break;
        case "resend-invite":
          endpoint = `/company-admins/${adminId}/resend-invite`;
          method = "POST";
          break;
        case "suspend":
          endpoint = `/company-admins/${adminId}/suspend`;
          break;
        case "activate":
          endpoint = `/company-admins/${adminId}/activate`;
          break;
        default:
          endpoint = `/company-admins/${adminId}/${action}`;
      }

      const res = await apiFetch(endpoint, { method });

      toast.success(successMessage);
      loadAdmins(); // Reload the list
    } catch (err) {
      console.error(`Failed to ${action} admin:`, err);
      toast.error(err.message || `Failed to ${action} admin`);
    } finally {
      setActionLoading(false);
      setActionId(null);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'active': return 'ia-status-active';
      case 'pending': return 'ia-status-pending';
      case 'suspended': return 'ia-status-suspended';
      case 'deleted': return 'ia-status-deleted';
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

  const isActionDisabled = (adminId) => {
    return actionLoading && actionId === adminId;
  };

  return (
    <div className="ia-container">
      {/* Header */}
      <div className="ia-header">
        <h1 className="ia-title">Invite Company Admin</h1>
        <p className="ia-subtitle">Invite new administrators to manage companies</p>
      </div>

      {/* Invite Form */}
      <div className="ia-card">
        <h3 className="ia-card-title">Send Invitation</h3>
        <div className="ia-form-grid">
          <select
            className="ia-select"
            value={form.company_id}
            onChange={(e) => setForm({ ...form, company_id: e.target.value })}
            disabled={actionLoading}
          >
            <option value="">Select Company</option>
            {companies.map((company) => (
              <option key={company.company_id} value={company.company_id}>
                {company.name}
              </option>
            ))}
          </select>

          <input
            type="text"
            className="ia-input"
            placeholder="Full Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            disabled={actionLoading}
          />

          <input
            type="email"
            className="ia-input"
            placeholder="Email Address"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            disabled={actionLoading}
          />

          <button 
            className="ia-btn ia-btn-primary"
            onClick={inviteAdmin}
            disabled={actionLoading}
          >
            {actionLoading ? "Sending..." : "Send Invitation"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="ia-card">
        <div className="ia-filters">
          <select
            className="ia-select"
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

          <select
            className="ia-select"
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
            className="ia-input"
            placeholder="Search by name or email"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />

          <button 
            className="ia-btn ia-btn-secondary"
            onClick={() => setFilters({ company_id: "", status: "", search: "" })}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Admins List */}
      <div className="ia-card">
        <h3 className="ia-card-title">Company Administrators</h3>
        
        {loading ? (
          <div className="ia-loading">
            <div className="ia-spinner"></div>
            <p>Loading admins...</p>
          </div>
        ) : admins.length === 0 ? (
          <div className="ia-empty">
            <p>No company admins found</p>
            <p className="ia-empty-sub">Try adjusting your filters or invite a new admin</p>
          </div>
        ) : (
          <div className="ia-table-container">
            <table className="ia-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Company</th>
                  <th>Status</th>
                  <th>Invited On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin._id}>
                    <td className="ia-name-cell">
                      <strong>{admin.name}</strong>
                    </td>
                    <td>{admin.email}</td>
                    <td>{admin.company_name || getCompanyName(admin.company_id)}</td>
                    <td>
                      <span className={`ia-status-badge ${getStatusBadgeClass(admin.status)}`}>
                        {admin.status}
                      </span>
                    </td>
                    <td>{formatDate(admin.created_at)}</td>
                    <td className="ia-actions-cell">
                      {admin.status === 'pending' && (
                        <>
                          <button
                            className="ia-action-btn ia-action-resend"
                            onClick={() => handleAction(admin._id, 'resend-invite', 'Invitation resent')}
                            disabled={isActionDisabled(admin._id)}
                            title="Resend invitation"
                          >
                            {isActionDisabled(admin._id) ? '...' : 'Resend'}
                          </button>
                          <button
                            className="ia-action-btn ia-action-delete"
                            onClick={() => handleAction(admin._id, 'delete', 'Admin deleted')}
                            disabled={isActionDisabled(admin._id)}
                            title="Delete admin"
                          >
                            {isActionDisabled(admin._id) ? '...' : 'Delete'}
                          </button>
                        </>
                      )}
                      
                      {admin.status === 'active' && (
                        <>
                          <button
                            className="ia-action-btn ia-action-suspend"
                            onClick={() => handleAction(admin._id, 'suspend', 'Admin suspended')}
                            disabled={isActionDisabled(admin._id)}
                            title="Suspend admin"
                          >
                            {isActionDisabled(admin._id) ? '...' : 'Suspend'}
                          </button>
                          <button
                            className="ia-action-btn ia-action-delete"
                            onClick={() => handleAction(admin._id, 'delete', 'Admin deleted')}
                            disabled={isActionDisabled(admin._id)}
                            title="Delete admin"
                          >
                            {isActionDisabled(admin._id) ? '...' : 'Delete'}
                          </button>
                        </>
                      )}
                      
                      {admin.status === 'suspended' && (
                        <>
                          <button
                            className="ia-action-btn ia-action-activate"
                            onClick={() => handleAction(admin._id, 'activate', 'Admin activated')}
                            disabled={isActionDisabled(admin._id)}
                            title="Activate admin"
                          >
                            {isActionDisabled(admin._id) ? '...' : 'Activate'}
                          </button>
                          <button
                            className="ia-action-btn ia-action-delete"
                            onClick={() => handleAction(admin._id, 'delete', 'Admin deleted')}
                            disabled={isActionDisabled(admin._id)}
                            title="Delete admin"
                          >
                            {isActionDisabled(admin._id) ? '...' : 'Delete'}
                          </button>
                        </>
                      )}

                      {admin.status === 'deleted' && (
                        <span className="ia-text-muted">Deleted</span>
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
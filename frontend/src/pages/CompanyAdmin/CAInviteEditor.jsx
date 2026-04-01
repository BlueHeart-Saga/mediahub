import { useEffect, useState } from "react";
import { apiFetch } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import "../../styles/CAInviteEditor.css";

export default function CAInviteEditor() {
  const { user } = useAuth();
  const companyId = user?.company_id;

  const [form, setForm] = useState({
    email: "",
    name: ""
  });
  const [editors, setEditors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: "",
    search: ""
  });
  const [pagination, setPagination] = useState({
    total: 0,
    skip: 0,
    limit: 50,
    hasMore: false
  });

  const loadEditors = async (resetSkip = true) => {
    setLoadingList(true);
    try {
      // Build query params
      const params = new URLSearchParams();
      params.append("role", "editor");
      if (filters.status) params.append("status", filters.status);
      if (filters.search) params.append("search", filters.search);
      params.append("skip", resetSkip ? "0" : pagination.skip.toString());
      params.append("limit", pagination.limit.toString());

      const res = await apiFetch(`/users?${params.toString()}`);
      
      if (res?.items) {
        if (resetSkip) {
          setEditors(res.items);
        } else {
          setEditors(prev => [...prev, ...res.items]);
        }
        setPagination({
          total: res.total,
          skip: res.skip + res.items.length,
          limit: res.limit,
          hasMore: res.has_more
        });
      } else if (res?.users) {
        // Filter editors for this company only (backend should already do this)
        const companyEditors = res.users.filter(
          editor => editor.company_id === companyId && editor.role === "editor"
        );
        setEditors(companyEditors);
        setPagination({
          total: companyEditors.length,
          skip: companyEditors.length,
          limit: 50,
          hasMore: false
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load editors");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadEditors();
  }, [filters.status, filters.search]);

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

    if (loading) return;
    setLoading(true);

    try {
      const payload = { 
        email: form.email,
        name: form.name 
      };

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
        setForm({ email: "", name: "" });
        loadEditors();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to send invitation");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (editorId, action, successMessage, method = "PATCH") => {
    if (action === "suspend" && !confirm("Are you sure you want to suspend this editor?")) {
      return;
    }

    if (action === "delete" && !confirm("Are you sure you want to delete this editor? This action cannot be undone.")) {
      return;
    }

    setActionLoading(true);
    try {
      const endpoint = action === "resend-invite" 
        ? `/users/${editorId}/resend-invite`
        : `/users/${editorId}/${action}`;

      const res = await apiFetch(endpoint, { method });

      if (res?.detail) {
        toast.error(res.detail);
        return;
      }

      toast.success(successMessage);
      loadEditors();
    } catch (err) {
      toast.error(`Failed to ${action} editor`);
    } finally {
      setActionLoading(false);
    }
  };

  const loadMore = () => {
    if (!loadingList && pagination.hasMore) {
      loadEditors(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'active': return 'caie-status-active';
      case 'pending': return 'caie-status-pending';
      case 'suspended': return 'caie-status-suspended';
      case 'deleted': return 'caie-status-deleted';
      default: return '';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="caie-container">
      {/* Header */}
      <div className="caie-header">
        <div className="caie-header-top">
          <h1 className="caie-title">Editor Management</h1>
          <div className="caie-stats">
            <span className="caie-stat">
              Total: <strong>{pagination.total}</strong>
            </span>
          </div>
        </div>
        <p className="caie-subtitle">Invite and manage editors for your company</p>
      </div>

      {/* Invite Form */}
      <div className="caie-card">
        <h3 className="caie-card-title">Invite New Editor</h3>
        <div className="caie-form-grid">
          <input
            type="text"
            className="caie-input"
            placeholder="Full Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            disabled={loading || actionLoading}
          />

          <input
            type="email"
            className="caie-input"
            placeholder="Email Address"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            disabled={loading || actionLoading}
          />

          <button
            className="caie-btn caie-btn-primary"
            onClick={handleInvite}
            disabled={loading || actionLoading}
          >
            {loading ? "Sending..." : "Send Invitation"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="caie-card">
        <div className="caie-filters">
          <select
            className="caie-select"
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
            className="caie-input"
            placeholder="Search by name or email..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />

          <button 
            className="caie-btn caie-btn-secondary"
            onClick={() => setFilters({ status: "", search: "" })}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Editors List */}
      <div className="caie-card">
        <h3 className="caie-card-title">Editors</h3>

        {loadingList && editors.length === 0 ? (
          <div className="caie-loading">
            <div className="caie-spinner"></div>
            <p>Loading editors...</p>
          </div>
        ) : editors.length > 0 ? (
          <>
            <div className="caie-table-container">
              <table className="caie-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Invited On</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {editors.map((editor) => (
                    <tr key={editor._id}>
                      <td className="caie-name-cell">
                        <div className="caie-avatar">
                          {editor.name ? editor.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                          <div className="caie-name">{editor.name || '—'}</div>
                        </div>
                      </td>
                      <td>{editor.email}</td>
                      <td>
                        <span className={`caie-status-badge ${getStatusBadgeClass(editor.status)}`}>
                          {editor.status}
                        </span>
                      </td>
                      <td>
                        <span className="caie-date">{formatDate(editor.created_at)}</span>
                      </td>
                      <td className="caie-actions-cell">
                        {editor.status === 'pending' && (
                          <>
                            <button
                              className="caie-action-btn caie-action-resend"
                              onClick={() => handleAction(editor._id, 'resend-invite', 'Invitation resent', 'POST')}
                              disabled={actionLoading}
                              title="Resend invitation"
                            >
                              Resend
                            </button>
                            <button
                              className="caie-action-btn caie-action-delete"
                              onClick={() => handleAction(editor._id, 'delete', 'Editor deleted', 'DELETE')}
                              disabled={actionLoading}
                              title="Delete editor"
                            >
                              Delete
                            </button>
                          </>
                        )}

                        {editor.status === 'active' && (
                          <>
                            <button
                              className="caie-action-btn caie-action-suspend"
                              onClick={() => handleAction(editor._id, 'suspend', 'Editor suspended')}
                              disabled={actionLoading}
                              title="Suspend editor"
                            >
                              Suspend
                            </button>
                            <button
                              className="caie-action-btn caie-action-delete"
                              onClick={() => handleAction(editor._id, 'delete', 'Editor deleted', 'DELETE')}
                              disabled={actionLoading}
                              title="Delete editor"
                            >
                              Delete
                            </button>
                          </>
                        )}

                        {editor.status === 'suspended' && (
                          <>
                            <button
                              className="caie-action-btn caie-action-activate"
                              onClick={() => handleAction(editor._id, 'activate', 'Editor activated')}
                              disabled={actionLoading}
                              title="Activate editor"
                            >
                              Activate
                            </button>
                            <button
                              className="caie-action-btn caie-action-delete"
                              onClick={() => handleAction(editor._id, 'delete', 'Editor deleted', 'DELETE')}
                              disabled={actionLoading}
                              title="Delete editor"
                            >
                              Delete
                            </button>
                          </>
                        )}

                        {editor.status === 'deleted' && (
                          <span className="caie-text-muted">Deleted</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Load More */}
            {pagination.hasMore && (
              <div className="caie-load-more">
                <button
                  className="caie-btn caie-btn-secondary"
                  onClick={loadMore}
                  disabled={loadingList}
                >
                  {loadingList ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="caie-empty">
            <div className="caie-empty-state">
              <p>No editors found</p>
              <p className="caie-empty-sub">Invite your first editor to get started</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
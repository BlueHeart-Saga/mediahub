import { useEffect, useState } from "react";
import { apiFetch } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import "../../styles/Users.css";

export default function CompanyUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [filters, setFilters] = useState({
    role: "",
    status: "",
    search: ""
  });
  const [pagination, setPagination] = useState({
    total: 0,
    skip: 0,
    limit: 50,
    hasMore: false
  });

  const loadUsers = async (resetSkip = true) => {
    setLoading(true);
    try {
      // Build query params
      const params = new URLSearchParams();
      if (filters.role) params.append("role", filters.role);
      if (filters.status) params.append("status", filters.status);
      if (filters.search) params.append("search", filters.search);
      params.append("skip", resetSkip ? "0" : pagination.skip.toString());
      params.append("limit", pagination.limit.toString());

      const res = await apiFetch(`/users?${params.toString()}`);
      
      if (res?.items) {
        if (resetSkip) {
          setUsers(res.items);
        } else {
          setUsers(prev => [...prev, ...res.items]);
        }
        setPagination({
          total: res.total,
          skip: res.skip + res.items.length,
          limit: res.limit,
          hasMore: res.has_more
        });
      } else if (res?.users) {
        // Filter users for company admin view
        const filteredUsers = res.users.filter(user => 
          user.role === "editor" || user.role === "company_admin"
        );
        setUsers(filteredUsers);
        setPagination({
          total: filteredUsers.length,
          skip: filteredUsers.length,
          limit: 50,
          hasMore: false
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [filters.role, filters.status, filters.search]);

  const handleAction = async (userId, action, successMessage, method = "PATCH") => {
    // Confirmation for destructive actions
    if (action === "delete" && !confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }

    if (action === "suspend" && !confirm("Are you sure you want to suspend this user?")) {
      return;
    }

    setActionLoading(true);
    try {
      const endpoint = action === "resend-invite" 
        ? `/users/${userId}/resend-invite`
        : `/users/${userId}/${action}`;

      const res = await apiFetch(endpoint, { method });

      if (res?.detail) {
        toast.error(res.detail);
        return;
      }

      toast.success(successMessage);
      loadUsers();
    } catch (err) {
      toast.error(`Failed to ${action} user`);
    } finally {
      setActionLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && pagination.hasMore) {
      loadUsers(false);
    }
  };

  const getRoleBadgeClass = (role) => {
    switch(role) {
      case 'company_admin': return 'users-role-admin';
      case 'editor': return 'users-role-editor';
      default: return '';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'active': return 'users-status-active';
      case 'pending': return 'users-status-pending';
      case 'suspended': return 'users-status-suspended';
      case 'deleted': return 'users-status-deleted';
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

  // Check if current user can modify target user
  const canModifyUser = (targetUser) => {
    // Can't modify self
    if (targetUser._id === currentUser?.id) return false;
    
    // Company admin can modify editors only
    return targetUser.role === "editor";
  };

  return (
    <div className="users-page">
      {/* Header */}
      <div className="users-header">
        <div className="users-header-top">
          <h1 className="users-title">Company Users</h1>
          <div className="users-stats">
            <span className="users-stat">
              Total: <strong>{pagination.total}</strong>
            </span>
          </div>
        </div>
        <p className="users-subtitle">Manage editors and company admins</p>
      </div>

      {/* Filters */}
      <div className="users-card">
        <div className="users-filters">
          <select
            className="users-select"
            value={filters.role}
            onChange={(e) => setFilters({ ...filters, role: e.target.value })}
          >
            <option value="">All Roles</option>
            <option value="company_admin">Company Admin</option>
            <option value="editor">Editor</option>
          </select>

          <select
            className="users-select"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
            <option value="deleted">Deleted</option>
          </select>

          <input
            type="text"
            className="users-input"
            placeholder="Search by name or email..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />

          <button 
            className="users-btn users-btn-secondary"
            onClick={() => setFilters({ role: "", status: "", search: "" })}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="users-card">
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading && users.length === 0 ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : users.length > 0 ? (
                users.map((user) => (
                  <tr key={user._id} className={user._id === currentUser?.id ? 'users-row-current' : ''}>
                    <td className="users-name-cell">
                      <div className="users-avatar">
                        {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div>
                        <div className="users-name">{user.name || '—'}</div>
                        {user._id === currentUser?.id && (
                          <span className="users-badge users-badge-current">You</span>
                        )}
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`users-role-badge ${getRoleBadgeClass(user.role)}`}>
                        {user.role?.replace('_', ' ') || '—'}
                      </span>
                    </td>
                    <td>
                      <span className={`users-status-badge ${getStatusBadgeClass(user.status)}`}>
                        {user.status}
                      </span>
                    </td>
                    <td>
                      <span className="users-date">{formatDate(user.created_at)}</span>
                    </td>
                    <td className="users-actions-cell">
                      {/* Pending Editor Actions */}
                      {user.status === "pending" && user.role === "editor" && canModifyUser(user) && (
                        <>
                          <button
                            className="users-action-btn users-action-resend"
                            onClick={() => handleAction(user._id, 'resend-invite', 'Invitation resent', 'POST')}
                            disabled={actionLoading}
                            title="Resend invitation"
                          >
                            Resend
                          </button>
                          <button
                            className="users-action-btn users-action-delete"
                            onClick={() => handleAction(user._id, 'delete', 'User deleted', 'DELETE')}
                            disabled={actionLoading}
                            title="Delete user"
                          >
                            Delete
                          </button>
                        </>
                      )}

                      {/* Active Editor Actions */}
                      {user.status === "active" && user.role === "editor" && canModifyUser(user) && (
                        <>
                          <button
                            className="users-action-btn users-action-suspend"
                            onClick={() => handleAction(user._id, 'suspend', 'User suspended')}
                            disabled={actionLoading}
                            title="Suspend user"
                          >
                            Suspend
                          </button>
                          <button
                            className="users-action-btn users-action-delete"
                            onClick={() => handleAction(user._id, 'delete', 'User deleted', 'DELETE')}
                            disabled={actionLoading}
                            title="Delete user"
                          >
                            Delete
                          </button>
                        </>
                      )}

                      {/* Suspended Editor Actions */}
                      {user.status === "suspended" && user.role === "editor" && canModifyUser(user) && (
                        <>
                          <button
                            className="users-action-btn users-action-activate"
                            onClick={() => handleAction(user._id, 'activate', 'User activated')}
                            disabled={actionLoading}
                            title="Activate user"
                          >
                            Activate
                          </button>
                          <button
                            className="users-action-btn users-action-delete"
                            onClick={() => handleAction(user._id, 'delete', 'User deleted', 'DELETE')}
                            disabled={actionLoading}
                            title="Delete user"
                          >
                            Delete
                          </button>
                        </>
                      )}

                      {/* Company Admin - No actions allowed (read-only) */}
                      {user.role === "company_admin" && user._id !== currentUser?.id && (
                        <span className="users-text-muted">No actions</span>
                      )}

                      {/* Current User */}
                      {user._id === currentUser?.id && (
                        <span className="users-text-muted">Current user</span>
                      )}

                      {/* Deleted Users */}
                      {user.status === "deleted" && (
                        <span className="users-text-muted">Deleted</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="users-empty">
                    <div className="users-empty-state">
                      <p>No users found</p>
                      <p className="users-empty-sub">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Load More */}
          {pagination.hasMore && (
            <div className="users-load-more">
              <button
                className="users-btn users-btn-secondary"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="users-skeleton-row">
      <td><div className="users-skeleton-avatar"></div></td>
      <td><div className="users-skeleton-line"></div></td>
      <td><div className="users-skeleton-line"></div></td>
      <td><div className="users-skeleton-line"></div></td>
      <td><div className="users-skeleton-line"></div></td>
      <td><div className="users-skeleton-line"></div></td>
    </tr>
  );
}
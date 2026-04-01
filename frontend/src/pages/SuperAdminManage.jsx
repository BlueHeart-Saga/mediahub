// pages/SuperAdminManage.jsx
import React, { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

// Simple Skeleton Components
const SkeletonRow = () => (
  <tr className="animate-pulse">
    <td className="px-6 py-4">
      <div className="flex items-center">
        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
        <div className="ml-4 space-y-2">
          <div className="w-32 h-4 bg-gray-200 rounded"></div>
          <div className="w-48 h-3 bg-gray-200 rounded"></div>
        </div>
      </div>
    </td>
    <td className="px-6 py-4">
      <div className="w-20 h-6 bg-gray-200 rounded-full"></div>
    </td>
    <td className="px-6 py-4">
      <div className="w-24 h-4 bg-gray-200 rounded"></div>
    </td>
    <td className="px-6 py-4">
      <div className="w-24 h-4 bg-gray-200 rounded"></div>
    </td>
    <td className="px-6 py-4">
      <div className="flex justify-end space-x-2">
        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
      </div>
    </td>
  </tr>
);

// Simple Toast
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-[300px]">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-800">{message}</p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
      </div>
    </div>
  );
};

// Status Badge
const StatusBadge = ({ status }) => {
  const styles = {
    active: 'bg-green-50 text-green-700 border-green-200',
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    suspended: 'bg-red-50 text-red-700 border-red-200',
    deleted: 'bg-gray-50 text-gray-700 border-gray-200'
  };

  return (
    <span className={`px-3 py-1 text-xs font-medium rounded-full border ${styles[status] || styles.pending}`}>
      {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Pending'}
    </span>
  );
};

const SuperAdminManage = () => {
  const [superAdmins, setSuperAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;
  
  const [filters, setFilters] = useState({ status: '', search: '' });
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '' });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(null);

  const addToast = (message) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Fetch super admins
  const fetchSuperAdmins = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        skip: (currentPage - 1) * itemsPerPage,
        limit: itemsPerPage,
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { search: filters.search })
      });

      const res = await fetch(`${API_BASE_URL}/api/super-admins?${params}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || 'Failed to fetch');
      
      setSuperAdmins(data.super_admins || []);
      setTotalItems(data.total || 0);
    } catch (err) {
      addToast(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuperAdmins();
  }, [currentPage, filters.status, filters.search]);

  // Handle invite
  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) {
      addToast('Name and email are required');
      return;
    }

    setInviteLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/create-super-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to invite');

      addToast('Super admin invited successfully!');
      setShowInviteModal(false);
      setInviteForm({ name: '', email: '' });
      fetchSuperAdmins();
    } catch (err) {
      addToast(err.message);
    } finally {
      setInviteLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this admin?')) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${id}`, {
        method: 'DELETE'
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to delete');
      
      addToast('Admin deleted successfully');
      fetchSuperAdmins();
    } catch (err) {
      addToast(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(t => (
          <Toast key={t.id} message={t.message} onClose={() => removeToast(t.id)} />
        ))}
      </div>

      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-gray-900">Super Admin Management</h1>
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 text-sm font-medium text-white rounded-md"
              style={{ backgroundColor: '#111827' }}
            >
              + Invite Super Admin
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={filters.search}
              onChange={(e) => {
                setFilters({ ...filters, search: e.target.value });
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-gray-500"
            />
            
            <select
              value={filters.status}
              onChange={(e) => {
                setFilters({ ...filters, status: e.target.value });
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-gray-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
            
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setFilters({ status: '', search: '' });
                  setCurrentPage(1);
                }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : superAdmins.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    No super admins found
                  </td>
                </tr>
              ) : (
                superAdmins.map((admin) => (
                  <tr key={admin._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-medium">
                          {admin.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{admin.name}</div>
                          <div className="text-sm text-gray-500">{admin.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={admin.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {admin.created_at ? new Date(admin.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {admin.last_login ? new Date(admin.last_login).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedAdmin(admin);
                            setShowViewModal(true);
                          }}
                          className="p-1 text-gray-600 hover:text-gray-900"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => handleDelete(admin._id)}
                          className="p-1 text-gray-600 hover:text-gray-900"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalItems > itemsPerPage && (
            <div className="bg-white px-4 py-3 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700">
                  Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} to{' '}
                  {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => p + 1)}
                    disabled={currentPage * itemsPerPage >= totalItems}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/80 bg-opacity-30 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Invite Super Admin</h3>
            <form onSubmit={handleInvite}>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="px-4 py-2 text-sm text-white rounded-md disabled:opacity-50"
                  style={{ backgroundColor: '#111827' }}
                >
                  {inviteLoading ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Admin Details</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">Name</label>
                <p className="text-sm text-gray-900">{selectedAdmin.name}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Email</label>
                <p className="text-sm text-gray-900">{selectedAdmin.email}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Status</label>
                <div className="mt-1">
                  <StatusBadge status={selectedAdmin.status} />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">Created</label>
                <p className="text-sm text-gray-900">
                  {selectedAdmin.created_at ? new Date(selectedAdmin.created_at).toLocaleString() : 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Last Login</label>
                <p className="text-sm text-gray-900">
                  {selectedAdmin.last_login ? new Date(selectedAdmin.last_login).toLocaleString() : 'Never'}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminManage;
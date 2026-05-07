// pages/SuperAdminManage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Mail, Calendar, MoreVertical, Trash2, Shield, Ban, 
  RefreshCw, Search, Filter, CheckCircle2, XCircle, Clock,
  Eye, UserPlus, Check, Copy, AlertTriangle, ShieldCheck, Users
} from 'lucide-react';
import { apiFetch } from "../../api/client";

// --- Components ---

const StatusBadge = ({ status }) => {
  const styles = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/10',
    pending: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/10',
    suspended: 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/10',
    deleted: 'bg-slate-50 text-slate-700 border-slate-200 ring-slate-500/10'
  };

  const icons = {
    active: <CheckCircle2 className="w-3 h-3 mr-1.5" />,
    pending: <Clock className="w-3 h-3 mr-1.5" />,
    suspended: <Ban className="w-3 h-3 mr-1.5" />,
    deleted: <XCircle className="w-3 h-3 mr-1.5" />
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-sm ring-1 ring-inset ${styles[status] || styles.pending}`}>
      {icons[status] || icons.pending}
      {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Pending'}
    </span>
  );
};

const ActionMenu = ({ admin, onAction, index, total }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const isLastItems = index >= total - 3 && total > 5;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
      >
        <MoreVertical className="w-5 h-5" />
      </button>
      
      {isOpen && (
        <div className={`absolute right-0 ${isLastItems ? 'bottom-full mb-2' : 'mt-2'} w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150 ${isLastItems ? 'origin-bottom-right' : 'origin-top-right'}`}>
          <button 
            onClick={() => { onAction('view', admin); setIsOpen(false); }}
            className="w-full flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Eye className="w-4 h-4 mr-3 text-slate-400" /> View Details
          </button>
          
          {admin.status === 'pending' && (
            <button 
              onClick={() => { onAction('resend', admin); setIsOpen(false); }}
              className="w-full flex items-center px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-3" /> Resend Invite
            </button>
          )}

          {admin.status === 'active' ? (
            <button 
              onClick={() => { onAction('suspend', admin); setIsOpen(false); }}
              className="w-full flex items-center px-4 py-2 text-sm text-amber-600 hover:bg-amber-50 transition-colors"
            >
              <Ban className="w-4 h-4 mr-3" /> Suspend Admin
            </button>
          ) : admin.status === 'suspended' ? (
            <button 
              onClick={() => { onAction('activate', admin); setIsOpen(false); }}
              className="w-full flex items-center px-4 py-2 text-sm text-emerald-600 hover:bg-emerald-50 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 mr-3" /> Activate Admin
            </button>
          ) : null}

          <div className="h-px bg-slate-100 my-1.5" />
          
          <button 
            onClick={() => { onAction('delete', admin); setIsOpen(false); }}
            className="w-full flex items-center px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <Trash2 className="w-4 h-4 mr-3" /> Delete Admin
          </button>
        </div>
      )}
    </div>
  );
};

// --- Main Component ---

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
  const navigate = useNavigate();

  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const fetchSuperAdmins = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        skip: (currentPage - 1) * itemsPerPage,
        limit: itemsPerPage,
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { search: filters.search })
      });

      const data = await apiFetch(`/super-admins?${params}`);
      setSuperAdmins(data.super_admins || []);
      setTotalItems(data.total || 0);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuperAdmins();
  }, [currentPage, filters.status, filters.search]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) {
      addToast('Name and email are required', 'error');
      return;
    }

    setInviteLoading(true);
    try {
      await apiFetch(`/create-super-admin`, {
        method: 'POST',
        body: JSON.stringify(inviteForm)
      });

      addToast('Super admin invited successfully!', 'success');
      setShowInviteModal(false);
      setInviteForm({ name: '', email: '' });
      fetchSuperAdmins();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleAction = async (type, admin) => {
    try {
      if (type === 'delete') {
        if (!window.confirm(`Are you sure you want to delete ${admin.name}? This action cannot be undone.`)) return;
        await apiFetch(`/admin/users/${admin._id}`, { method: 'DELETE' });
        addToast('Admin deleted successfully', 'success');
      } else if (type === 'suspend') {
        await apiFetch(`/admin/users/${admin._id}/suspend`, { method: 'PATCH' });
        addToast('Admin suspended successfully', 'warning');
      } else if (type === 'activate') {
        await apiFetch(`/admin/users/${admin._id}/activate`, { method: 'PATCH' });
        addToast('Admin activated successfully', 'success');
      } else if (type === 'resend') {
        await apiFetch(`/super-admins/${admin._id}/resend-invite`, { method: 'POST' });
        addToast('Invitation resent successfully', 'success');
      } else if (type === 'view') {
        setSelectedAdmin(admin);
        setShowViewModal(true);
        return;
      }
      fetchSuperAdmins();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Toasts */}
      <div className="fixed top-6 right-6 z-[100] space-y-3">
        {toasts.map(t => (
          <div key={t.id} className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 min-w-[320px] animate-in slide-in-from-right-8 flex items-center gap-3">
            <div className={`p-2 rounded-full ${t.type === 'error' ? 'bg-rose-50 text-rose-500' : t.type === 'success' ? 'bg-emerald-50 text-emerald-500' : 'bg-indigo-50 text-indigo-500'}`}>
              {t.type === 'error' ? <AlertTriangle size={18} /> : t.type === 'success' ? <CheckCircle2 size={18} /> : <Shield size={18} />}
            </div>
            <p className="text-sm font-semibold text-slate-700">{t.message}</p>
          </div>
        ))}
      </div>

      {/* Header Section */}
      <div className="bg-white border-b border-slate-200 sticky top-[-2px] z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-200">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">Console Management</h1>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1.5">Administrative Access Protocol</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/developer/superadmin/requests")}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all active:scale-[0.98]"
              >
                <Users className="w-3.5 h-3.5" /> Requests
              </button>
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-black transition-all shadow-lg shadow-slate-100 active:scale-[0.98]"
              >
                <UserPlus className="w-3.5 h-3.5" /> Invite Admin
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Stats Summary - Optional quick glance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold">
              <User className="w-6 h-6" />
            </div>
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Admins</p>
              <p className="text-2xl font-black text-slate-900">{totalItems}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Active</p>
              <p className="text-2xl font-black text-slate-900">{superAdmins.filter(a => a.status === 'active').length}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center font-bold">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Pending</p>
              <p className="text-2xl font-black text-slate-900">{superAdmins.filter(a => a.status === 'pending').length}</p>
            </div>
          </div>
        </div>

        {/* Filters Card */}
        <div className="bg-white border border-slate-200 rounded-[32px] p-2 shadow-sm mb-8">
          <div className="flex flex-col md:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={filters.search}
                onChange={(e) => {
                  setFilters({ ...filters, search: e.target.value });
                  setCurrentPage(1);
                }}
                className="w-full pl-11 pr-4 py-4 bg-transparent border-none focus:ring-0 text-sm font-semibold text-slate-700 placeholder-slate-300"
              />
            </div>
            
            <div className="h-10 w-px bg-slate-100 hidden md:block" />

            <div className="relative flex items-center w-full md:w-auto px-4 gap-3">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filters.status}
                onChange={(e) => {
                  setFilters({ ...filters, status: e.target.value });
                  setCurrentPage(1);
                }}
                className="bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-700 appearance-none pr-8 py-4"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            
            <button
              onClick={() => {
                setFilters({ status: '', search: '' });
                setCurrentPage(1);
              }}
              className="px-6 py-4 text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white border border-slate-200 rounded-[32px] shadow-sm">
          <div className="">
            <table className="min-w-full divide-y divide-slate-100">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.1em]">Admin Identity</th>
                  <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.1em]">Status</th>
                  <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.1em]">Registration Date</th>
                  <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.1em]">Activity</th>
                  <th className="px-8 py-5 text-right text-[11px] font-black text-slate-400 uppercase tracking-[0.1em]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan="5" className="px-8 py-6">
                        <div className="h-10 bg-slate-100 rounded-2xl w-full" />
                      </td>
                    </tr>
                  ))
                ) : superAdmins.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-8 py-16 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-slate-50 rounded-3xl">
                          <User className="w-10 h-10 text-slate-200" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-slate-900 font-black">No Administrators Found</p>
                          <p className="text-slate-400 text-sm">Your search didn't return any results.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  superAdmins.map((admin) => (
                    <tr key={admin._id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-black text-lg border border-slate-200 group-hover:border-indigo-200 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all duration-300">
                            {admin.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-black text-slate-900">{admin.name}</div>
                            <div className="text-xs font-medium text-slate-400 flex items-center gap-1 mt-0.5">
                              <Mail size={12} /> {admin.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <StatusBadge status={admin.status} />
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                          <Calendar size={14} className="text-slate-300" />
                          {admin.created_at ? new Date(admin.created_at).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="space-y-1">
                          <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Last Access</div>
                          <div className="text-xs font-bold text-slate-600">
                            {admin.last_login ? new Date(admin.last_login).toLocaleDateString() : 'Never'}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <ActionMenu admin={admin} onAction={handleAction} index={superAdmins.indexOf(admin)} total={superAdmins.length} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalItems > itemsPerPage && (
            <div className="px-8 py-6 bg-slate-50/30 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Page {currentPage} <span className="mx-2">/</span> {Math.ceil(totalItems / itemsPerPage)}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-5 py-2 text-xs font-black bg-white border border-slate-200 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-sm"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => p + 1)}
                    disabled={currentPage * itemsPerPage >= totalItems}
                    className="px-5 py-2 text-xs font-black bg-white border border-slate-200 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-sm"
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[100] p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10">
              {/* Header mimicking the image */}
              <div className="flex items-center justify-between mb-8">
                <div className="w-24 h-8 bg-slate-100 rounded-lg animate-pulse" />
                <button 
                  onClick={() => setShowInviteModal(false)}
                  className="w-10 h-10 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-all"
                >
                  <Users size={18} />
                </button>
              </div>

              <div className="mb-8">
                <h3 className="text-2xl font-black text-[#0F172A] leading-tight mb-1">Invite Admin</h3>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Platform Access Protocol</p>
              </div>
              
              <form onSubmit={handleInvite} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter full name"
                      value={inviteForm.name}
                      onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:bg-white focus:border-slate-900 transition-all outline-none"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="Enter email address"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:bg-white focus:border-slate-900 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={inviteLoading}
                    className="w-full py-4 bg-[#0F172A] text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-100 disabled:opacity-50 active:scale-[0.98]"
                  >
                    {inviteLoading ? "Processing..." : "Send Invitation"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="w-full mt-4 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-900 transition-colors"
                  >
                    Discard Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showViewModal && selectedAdmin && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[100] p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[32px] flex items-center justify-center text-3xl font-black border border-indigo-100 shadow-sm">
                  {selectedAdmin.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 leading-tight">{selectedAdmin.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={selectedAdmin.status} />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Role</p>
                      <p className="text-sm font-black text-slate-900">Super Admin</p>
                   </div>
                   <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Account ID</p>
                      <p className="text-[10px] font-mono font-bold text-slate-500 truncate">{selectedAdmin._id}</p>
                   </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <div className="text-sm font-bold text-slate-600">{selectedAdmin.email}</div>
                    </div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(selectedAdmin.email);
                        addToast('Email copied to clipboard', 'success');
                      }}
                      className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400 hover:text-indigo-600"
                    >
                      <Copy size={14} />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <div className="text-sm font-bold text-slate-600">Joined {new Date(selectedAdmin.created_at).toLocaleString()}</div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                    <RefreshCw className="w-4 h-4 text-slate-400" />
                    <div className="text-sm font-bold text-slate-600">Last Active {selectedAdmin.last_login ? new Date(selectedAdmin.last_login).toLocaleString() : 'Never'}</div>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-black transition-all shadow-xl shadow-slate-200"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminManage;
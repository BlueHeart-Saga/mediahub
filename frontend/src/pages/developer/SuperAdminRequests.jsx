import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Users, Mail, Calendar, MoreVertical, Trash2, CheckCircle2, 
  XCircle, Clock, Search, Filter, AlertTriangle, ShieldCheck,
  Eye, Building, MessageSquare, ChevronRight, ArrowUpRight,
  ChevronLeft
} from "lucide-react";
import { apiFetch } from "../../api/client";

// --- Components ---

const StatusBadge = ({ status }) => {
  const styles = {
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/10",
    pending: "bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/10",
    rejected: "bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/10",
  };

  const icons = {
    approved: <CheckCircle2 className="w-3 h-3 mr-1.5" />,
    pending: <Clock className="w-3 h-3 mr-1.5" />,
    rejected: <XCircle className="w-3 h-3 mr-1.5" />,
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-sm ring-1 ring-inset ${styles[status] || styles.pending}`}>
      {icons[status] || icons.pending}
      {status?.charAt(0).toUpperCase() + status?.slice(1) || "Pending"}
    </span>
  );
};

const ActionMenu = ({ request, onAction, index, total }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const isLastItems = index >= total - 3 && total > 5;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
        <div className={`absolute right-0 ${isLastItems ? "bottom-full mb-2" : "mt-2"} w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150 ${isLastItems ? "origin-bottom-right" : "origin-top-right"}`}>
          <button 
            onClick={() => { onAction("view", request); setIsOpen(false); }}
            className="w-full flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Eye className="w-4 h-4 mr-3 text-slate-400" /> View Message
          </button>
          
          {request.status === "pending" && (
            <>
              <div className="h-px bg-slate-100 my-1.5" />
              <button 
                onClick={() => { onAction("approve", request); setIsOpen(false); }}
                className="w-full flex items-center px-4 py-2 text-sm text-emerald-600 hover:bg-emerald-50 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4 mr-3" /> Approve Request
              </button>
              <button 
                onClick={() => { onAction("reject", request); setIsOpen(false); }}
                className="w-full flex items-center px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <XCircle className="w-4 h-4 mr-3" /> Reject Request
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// --- Main Component ---

const SuperAdminRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;
  
  const [filters, setFilters] = useState({ status: "", search: "" });
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const navigate = useNavigate();

  const addToast = (message, type = "info") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const [confirmConfig, setConfirmConfig] = useState({ show: false, type: "", request: null });

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        skip: (currentPage - 1) * itemsPerPage,
        limit: itemsPerPage,
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { search: filters.search })
      });

      const data = await apiFetch(`/registration-requests?${params}`);
      setRequests(data.requests || []);
      setTotalItems(data.total || 0);
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [currentPage, filters.status, filters.search]);

  const handleAction = async (type, request) => {
    if (type === "view") {
      setSelectedRequest(request);
      setShowViewModal(true);
      return;
    }
    
    // Show custom confirm modal instead of window.confirm
    setConfirmConfig({ show: true, type, request });
  };

  const executeAction = async () => {
    const { type, request } = confirmConfig;
    setConfirmConfig({ ...confirmConfig, show: false });
    
    try {
      if (type === "approve") {
        // 1. Update request status
        await apiFetch(`/registration-requests/${request._id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "approved" })
        });

        // 2. Trigger invitation
        await apiFetch(`/create-super-admin`, {
          method: "POST",
          body: JSON.stringify({
            name: request.name,
            email: request.email
          })
        });

        addToast("Request approved and invitation sent successfully!", "success");
      } else if (type === "reject") {
        await apiFetch(`/registration-requests/${request._id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "rejected" })
        });
        addToast("Request rejected", "warning");
      }
      fetchRequests();
    } catch (err) {
      addToast(err.message, "error");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Toasts */}
      <div className="fixed top-6 right-6 z-[100] space-y-3">
        {toasts.map(t => (
          <div key={t.id} className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 min-w-[320px] animate-in slide-in-from-right-8 flex items-center gap-3">
            <div className={`p-2 rounded-full ${t.type === "error" ? "bg-rose-50 text-rose-500" : t.type === "success" ? "bg-emerald-50 text-emerald-500" : "bg-indigo-50 text-indigo-500"}`}>
              {t.type === "error" ? <AlertTriangle size={18} /> : t.type === "success" ? <CheckCircle2 size={18} /> : <ShieldCheck size={18} />}
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
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">Registration Queue</h1>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1.5">Onboarding Approval Protocol</p>
              </div>
            </div>
            
            <button
              onClick={() => navigate("/developer/superadmin/manage")}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all active:scale-[0.98]"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back to Console
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center font-bold">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Requests</p>
              <p className="text-2xl font-black text-slate-900">{totalItems}</p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center font-bold">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Pending Approval</p>
              <p className="text-2xl font-black text-slate-900">
                {requests.filter(r => r.status === 'pending').length}
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Approved</p>
              <p className="text-2xl font-black text-slate-900">
                {requests.filter(r => r.status === 'approved').length}
              </p>
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
                placeholder="Search by name, email, or company..."
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
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            
            <button
              onClick={() => {
                setFilters({ status: "", search: "" });
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
                  <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.1em]">Identity</th>
                  <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.1em]">Organization</th>
                  <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.1em]">Status</th>
                  <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.1em]">Requested On</th>
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
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-8 py-16 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-slate-50 rounded-3xl">
                          <Users className="w-10 h-10 text-slate-200" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-slate-900 font-black">No Requests Found</p>
                          <p className="text-slate-400 text-sm">Everything is up to date.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  requests.map((request) => (
                    <tr key={request._id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-black text-lg border border-slate-200 group-hover:border-indigo-200 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all duration-300">
                            {request.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-black text-slate-900">{request.name}</div>
                            <div className="text-xs font-medium text-slate-400 flex items-center gap-1 mt-0.5">
                              <Mail size={12} /> {request.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2 text-sm font-black text-slate-700">
                          <Building size={14} className="text-slate-300" />
                          {request.company_name}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <StatusBadge status={request.status} />
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                          <Calendar size={14} className="text-slate-300" />
                          {new Date(request.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <ActionMenu request={request} onAction={handleAction} index={requests.indexOf(request)} total={requests.length} />
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

      {/* View Message Modal */}
      {showViewModal && selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[100] p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[32px] flex items-center justify-center text-3xl font-black border border-indigo-100 shadow-sm">
                  {selectedRequest.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 leading-tight">{selectedRequest.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={selectedRequest.status} />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 relative">
                  <MessageSquare className="absolute -top-3 -right-3 w-8 h-8 text-slate-100" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Applicant Message</p>
                  <p className="text-sm font-bold text-slate-700 leading-relaxed italic">
                    "{selectedRequest.message || "No additional information provided."}"
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <div className="text-sm font-bold text-slate-600">{selectedRequest.email}</div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                    <Building className="w-4 h-4 text-slate-400" />
                    <div className="text-sm font-bold text-slate-600">{selectedRequest.company_name}</div>
                  </div>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-3">
                {selectedRequest.status === "pending" && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleAction("approve", selectedRequest)}
                      className="py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction("reject", selectedRequest)}
                      className="py-4 bg-rose-600 text-white rounded-2xl font-black text-sm hover:bg-rose-700 transition-all shadow-xl shadow-rose-100"
                    >
                      Reject
                    </button>
                  </div>
                )}
                <button
                  onClick={() => setShowViewModal(false)}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-black transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Confirm Action Modal */}
      {confirmConfig.show && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[110] p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] shadow-2xl border border-slate-200 max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10 text-center">
              <div className={`w-20 h-20 rounded-[32px] flex items-center justify-center mx-auto mb-8 ${confirmConfig.type === 'approve' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {confirmConfig.type === 'approve' ? <CheckCircle2 size={40} /> : <AlertTriangle size={40} />}
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">
                {confirmConfig.type === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </h3>
              <p className="text-slate-500 text-sm font-semibold leading-relaxed mb-10">
                {confirmConfig.type === 'approve' 
                  ? `Are you sure you want to approve ${confirmConfig.request.name}'s request and send a super admin invitation?`
                  : `Are you sure you want to reject ${confirmConfig.request.name}'s application? This action cannot be undone.`
                }
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setConfirmConfig({ ...confirmConfig, show: false })}
                  className="py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  onClick={executeAction}
                  className={`py-4 text-white rounded-2xl font-bold text-sm shadow-xl transition-all active:scale-[0.98] ${confirmConfig.type === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-100'}`}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminRequests;

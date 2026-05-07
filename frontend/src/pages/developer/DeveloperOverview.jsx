import React, { useState, useEffect } from "react";
import { Users, Building, Mail, Shield, ShieldCheck, Search, Database, ChevronRight } from "lucide-react";
import { apiFetch } from "../../api/client";

const StatusBadge = ({ status }) => {
  const styles = {
    active: "bg-emerald-50 text-emerald-600 border-emerald-100",
    pending: "bg-amber-50 text-amber-600 border-amber-100",
    suspended: "bg-rose-50 text-rose-600 border-rose-100",
    deleted: "bg-slate-50 text-slate-400 border-slate-100",
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border shadow-sm ${styles[status] || styles.pending}`}>
      {status || "Pending"}
    </span>
  );
};

const RoleBadge = ({ role }) => {
  const roles = {
    super_admin: { label: "Protocol Admin", color: "bg-slate-900 text-white" },
    company_admin: { label: "Entity Admin", color: "bg-indigo-600 text-white" },
    editor: { label: "Content Editor", color: "bg-blue-500 text-white" },
  };

  const { label, color } = roles[role] || { label: role, color: "bg-slate-400 text-white" };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${color}`}>
      {label}
    </span>
  );
};

export default function DeveloperOverview() {
  const [activeTab, setActiveTab] = useState("users");
  const [data, setData] = useState({ users: [], companies: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await apiFetch("/developer/overview");
      setData(response);
    } catch (err) {
      console.error("Failed to fetch overview data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredUsers = data.users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.company_name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCompanies = data.companies.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.company_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-[-2px] z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center shadow-lg shadow-slate-200">
                <Database className="w-5 h-5 text-white" />
              </div>
            </div>

            <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-200">
              <button 
                onClick={() => setActiveTab("users")}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Users className="w-3 h-3" /> Users
              </button>
              <button 
                onClick={() => setActiveTab("companies")}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'companies' ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Building className="w-3 h-3" /> Entities
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group transition-all hover:border-indigo-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Global User Count</p>
                <p className="text-lg font-black text-slate-900">{data.users.length}</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-200 group-hover:text-indigo-300 transition-colors" />
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group transition-all hover:border-emerald-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Active Entities</p>
                <p className="text-lg font-black text-slate-900">{data.companies.length}</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-200 group-hover:text-emerald-300 transition-colors" />
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-1 shadow-sm mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
            <input 
              type="text"
              placeholder={`Query ${activeTab === 'users' ? 'user database...' : 'entity database...'}`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50/50 border-none rounded-lg text-xs font-bold text-slate-700 focus:bg-white transition-all outline-none"
            />
          </div>
        </div>

        {/* Content Table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
              <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest">Syncing Protocol...</p>
            </div>
          ) : activeTab === "users" ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-5 py-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Identity Profile</th>
                    <th className="px-5 py-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Organization</th>
                    <th className="px-5 py-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Permissions</th>
                    <th className="px-5 py-3 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <tr key={user._id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all uppercase">
                              {user.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-black text-slate-900 leading-none mb-1">{user.name}</div>
                              <div className="text-xs font-bold text-slate-400 leading-none">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1 text-xs font-bold text-slate-600">
                            <Building className="w-3 h-3 text-slate-300" />
                            {user.company_name}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <RoleBadge role={user.role} />
                        </td>
                        <td className="px-5 py-3 text-right">
                          <StatusBadge status={user.status} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-5 py-10 text-center text-slate-400 font-bold text-[9px] uppercase tracking-widest">No matching records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-5 py-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Entity Designation</th>
                    <th className="px-5 py-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Protocol ID</th>
                    <th className="px-5 py-3 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Operational Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredCompanies.length > 0 ? (
                    filteredCompanies.map((company) => (
                      <tr key={company.company_id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-md bg-slate-900 flex items-center justify-center text-[9px] font-black text-white uppercase">
                              {company.prefix || company.name.charAt(0)}
                            </div>
                            <div className="text-sm font-black text-slate-900 leading-none">{company.name}</div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="font-mono text-xs font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded tracking-tighter">
                            {company.company_id}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <StatusBadge status={company.status} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="px-5 py-10 text-center text-slate-400 font-bold text-[9px] uppercase tracking-widest">No matching entities found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

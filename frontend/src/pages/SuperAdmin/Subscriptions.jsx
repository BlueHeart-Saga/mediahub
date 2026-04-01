// pages/super-admin/Subscriptions.jsx
import { useState, useEffect } from "react";
import { 
  Mail, 
  Users, 
  Settings, 
  Bell, 
  Filter,
  Download,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Eye,
  BarChart3,
  Calendar
} from "lucide-react";
import { apiFetch } from "../../api/client";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function Subscriptions() {
  const [subscribers, setSubscribers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    verified: 0,
    unsubscribed: 0
  });
  const [filters, setFilters] = useState({
    status: "all",
    verified: "all",
    company: "all"
  });
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedSubscribers, setSelectedSubscribers] = useState([]);
  const [notificationSettings, setNotificationSettings] = useState({});
  const [expandedCompany, setExpandedCompany] = useState(null);
  const [dateRange, setDateRange] = useState("30d"); // 7d, 30d, 90d, all

  useEffect(() => {
    loadCompanies();
    loadSubscribers();
  }, []);

  useEffect(() => {
    loadStats();
  }, [selectedCompany, dateRange]);

  const loadCompanies = async () => {
    try {
      const res = await apiFetch("/companies");
      setCompanies(res?.companies || []);
    } catch (error) {
      console.error("Failed to load companies:", error);
    }
  };

  const loadSubscribers = async () => {
    try {
      setLoading(true);
      let url = "/subscriptions?limit=100";
      
      if (selectedCompany !== "all") {
        url += `&company_id=${selectedCompany}`;
      }
      
      if (filters.status !== "all") {
        url += `&status=${filters.status}`;
      }
      
      const res = await apiFetch(url);
      setSubscribers(res?.items || []);
    } catch (error) {
      console.error("Failed to load subscribers:", error);
      toast.error("Failed to load subscribers");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      let url = "/subscriptions/stats";
      const params = new URLSearchParams();
      
      if (selectedCompany !== "all") {
        params.append("company_id", selectedCompany);
      }
      
      if (dateRange !== "all") {
        params.append("period", dateRange);
      }
      
      const res = await apiFetch(`${url}?${params.toString()}`);
      setStats(res?.stats || {});
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const loadNotificationSettings = async (companyId) => {
    try {
      const res = await apiFetch(`/companies/${companyId}/notification-settings`);
      setNotificationSettings(prev => ({
        ...prev,
        [companyId]: res?.settings || {}
      }));
    } catch (error) {
      console.error("Failed to load notification settings:", error);
    }
  };

  const updateNotificationSettings = async (companyId, settings) => {
    try {
      await apiFetch(`/companies/${companyId}/notification-settings`, {
        method: "PUT",
        body: JSON.stringify(settings)
      });
      
      setNotificationSettings(prev => ({
        ...prev,
        [companyId]: settings
      }));
      
      toast.success("Notification settings updated");
    } catch (error) {
      console.error("Failed to update settings:", error);
      toast.error("Failed to update settings");
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedSubscribers.length === 0) return;

    const confirmMessage = {
      unsubscribe: `Unsubscribe ${selectedSubscribers.length} subscribers?`,
      delete: `Delete ${selectedSubscribers.length} subscribers? This cannot be undone.`,
      verify: `Mark ${selectedSubscribers.length} subscribers as verified?`,
      resend: `Resend verification emails to ${selectedSubscribers.length} subscribers?`
    };

    if (!window.confirm(confirmMessage[action])) return;

    try {
      await apiFetch("/subscriptions/bulk", {
        method: "POST",
        body: JSON.stringify({
          action,
          subscriber_ids: selectedSubscribers
        })
      });
      
      toast.success(`Bulk action completed: ${action}`);
      loadSubscribers();
      setSelectedSubscribers([]);
      setShowBulkActions(false);
    } catch (error) {
      console.error("Bulk action failed:", error);
      toast.error("Failed to perform bulk action");
    }
  };

  const exportSubscribers = () => {
    const csv = [
      ["Email", "Name", "Company", "Status", "Verified", "Subscribed Date", "Preferences"].join(","),
      ...subscribers.map(s => [
        s.email,
        s.name || "",
        s.company_name || "",
        s.status,
        s.verified ? "Yes" : "No",
        new Date(s.subscribed_at).toLocaleDateString(),
        JSON.stringify(s.preferences || {})
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscribers_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const toggleSubscriberSelection = (id) => {
    setSelectedSubscribers(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const selectAllSubscribers = () => {
    if (selectedSubscribers.length === subscribers.length) {
      setSelectedSubscribers([]);
    } else {
      setSelectedSubscribers(subscribers.map(s => s.id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
          <Mail className="w-8 h-8 mr-3 text-blue-600" />
          Subscription Management
        </h1>
        <p className="text-gray-600">
          Manage email subscribers and notification settings across all companies
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Subscribers</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Active</p>
              <p className="text-3xl font-bold text-green-600">{stats.active || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Verified</p>
              <p className="text-3xl font-bold text-blue-600">{stats.verified || 0}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Mail className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Unsubscribed</p>
              <p className="text-3xl font-bold text-red-600">{stats.unsubscribed || 0}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedCompany}
              onChange={(e) => {
                setSelectedCompany(e.target.value);
                loadSubscribers();
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Companies</option>
              {companies.map(c => (
                <option key={c.company_id} value={c.company_id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={filters.status}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, status: e.target.value }));
                loadSubscribers();
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="unsubscribed">Unsubscribed</option>
              <option value="bounced">Bounced</option>
            </select>

            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>

            <button
              onClick={loadSubscribers}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={exportSubscribers}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </button>

            <div className="relative">
              <button
                onClick={() => setShowBulkActions(!showBulkActions)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
              >
                Bulk Actions
                <ChevronDown className="w-4 h-4 ml-2" />
              </button>

              <AnimatePresence>
                {showBulkActions && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-10"
                  >
                    <div className="py-2">
                      <button
                        onClick={() => handleBulkAction("unsubscribe")}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                        disabled={selectedSubscribers.length === 0}
                      >
                        <XCircle className="w-4 h-4 mr-2 text-red-500" />
                        Unsubscribe
                      </button>
                      <button
                        onClick={() => handleBulkAction("verify")}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                        disabled={selectedSubscribers.length === 0}
                      >
                        <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                        Mark Verified
                      </button>
                      <button
                        onClick={() => handleBulkAction("resend")}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                        disabled={selectedSubscribers.length === 0}
                      >
                        <Mail className="w-4 h-4 mr-2 text-blue-500" />
                        Resend Verification
                      </button>
                      <div className="border-t border-gray-200 my-1"></div>
                      <button
                        onClick={() => handleBulkAction("delete")}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                        disabled={selectedSubscribers.length === 0}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Subscribers Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-12 px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedSubscribers.length === subscribers.length && subscribers.length > 0}
                    onChange={selectAllSubscribers}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subscriber
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Verified
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subscribed
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Preferences
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
                      <span className="ml-2 text-gray-500">Loading subscribers...</span>
                    </div>
                  </td>
                </tr>
              ) : subscribers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                    No subscribers found
                  </td>
                </tr>
              ) : (
                subscribers.map(subscriber => (
                  <tr key={subscriber.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedSubscribers.includes(subscriber.id)}
                        onChange={() => toggleSubscriberSelection(subscriber.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{subscriber.email}</p>
                        {subscriber.name && (
                          <p className="text-sm text-gray-500">{subscriber.name}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">
                        {subscriber.company_name || "All Companies"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        subscriber.status === "active" 
                          ? "bg-green-100 text-green-800"
                          : subscriber.status === "unsubscribed"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {subscriber.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {subscriber.verified ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-400" />
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(subscriber.subscribed_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {/* Show preferences modal */}}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        View
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {/* Show actions */}}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Company Notification Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Bell className="w-5 h-5 mr-2 text-blue-600" />
            Company Notification Settings
          </h2>
        </div>

        <div className="divide-y divide-gray-200">
          {companies.map(company => (
            <div key={company.company_id} className="p-6">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedCompany(
                  expandedCompany === company.company_id ? null : company.company_id
                )}
              >
                <div className="flex items-center">
                  <Building2 className="w-5 h-5 text-gray-400 mr-3" />
                  <h3 className="font-medium text-gray-900">{company.name}</h3>
                </div>
                {expandedCompany === company.company_id ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>

              <AnimatePresence>
                {expandedCompany === company.company_id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 overflow-hidden"
                  >
                    {notificationSettings[company.company_id] ? (
                      <div className="space-y-4 pl-8">
                        <div className="grid grid-cols-2 gap-4">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={notificationSettings[company.company_id].notify_on_publish}
                              onChange={(e) => updateNotificationSettings(
                                company.company_id,
                                {
                                  ...notificationSettings[company.company_id],
                                  notify_on_publish: e.target.checked
                                }
                              )}
                              className="rounded border-gray-300 text-blue-600 mr-2"
                            />
                            <span className="text-sm text-gray-700">
                              Notify on publish
                            </span>
                          </label>

                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={notificationSettings[company.company_id].daily_digest_enabled}
                              onChange={(e) => updateNotificationSettings(
                                company.company_id,
                                {
                                  ...notificationSettings[company.company_id],
                                  daily_digest_enabled: e.target.checked
                                }
                              )}
                              className="rounded border-gray-300 text-blue-600 mr-2"
                            />
                            <span className="text-sm text-gray-700">
                              Daily digest
                            </span>
                          </label>

                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={notificationSettings[company.company_id].weekly_digest_enabled}
                              onChange={(e) => updateNotificationSettings(
                                company.company_id,
                                {
                                  ...notificationSettings[company.company_id],
                                  weekly_digest_enabled: e.target.checked
                                }
                              )}
                              className="rounded border-gray-300 text-blue-600 mr-2"
                            />
                            <span className="text-sm text-gray-700">
                              Weekly digest
                            </span>
                          </label>
                        </div>

                        <div className="flex items-center gap-4">
                          <label className="text-sm text-gray-700">
                            Digest time:
                          </label>
                          <input
                            type="time"
                            value={notificationSettings[company.company_id].digest_time || "09:00"}
                            onChange={(e) => updateNotificationSettings(
                              company.company_id,
                              {
                                ...notificationSettings[company.company_id],
                                digest_time: e.target.value
                              }
                            )}
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                          />
                        </div>

                        <div>
                          <label className="text-sm text-gray-700 block mb-2">
                            Excluded Sections:
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {company.sections?.map(section => (
                              <label key={section.slug} className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={!notificationSettings[company.company_id].excluded_sections?.includes(section.slug)}
                                  onChange={(e) => {
                                    const excluded = notificationSettings[company.company_id].excluded_sections || [];
                                    const newExcluded = e.target.checked
                                      ? excluded.filter(s => s !== section.slug)
                                      : [...excluded, section.slug];
                                    
                                    updateNotificationSettings(
                                      company.company_id,
                                      {
                                        ...notificationSettings[company.company_id],
                                        excluded_sections: newExcluded
                                      }
                                    );
                                  }}
                                  className="rounded border-gray-300 text-blue-600 mr-1"
                                />
                                <span className="text-xs text-gray-600 mr-3">
                                  {section.name}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => loadNotificationSettings(company.company_id)}
                        className="ml-8 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        Load settings
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
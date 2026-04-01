import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import apiClient from "../../services/apiClient";
import * as XLSX from "xlsx";
import { Download } from "lucide-react";

const SubscribeManage = () => {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSubscribers, setTotalSubscribers] = useState(0);
  const ITEMS_PER_PAGE = 20;

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [exporting, setExporting] = useState(false);

  const fetchSubscribers = async (page = 1) => {
    setLoading(true);
    try {
      const skip = (page - 1) * ITEMS_PER_PAGE;
      const res = await apiClient.get("/api/admin/subscribers", {
        params: { skip, limit: ITEMS_PER_PAGE },
      });

      setSubscribers(res.data.items || []);
      setTotalPages(Math.ceil((res.data.total || 0) / ITEMS_PER_PAGE) || 1);
      setTotalSubscribers(res.data.total || 0);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    try {
      const newStatus =
        currentStatus === "active" ? "unsubscribed" : "active";

      await apiClient.put(`/api/admin/subscribers/${id}`, {
        status: newStatus,
      });

      // Show success toast-style sweety alert
      Swal.fire({
        toast: true,
        position: 'top-end',
        title: `Subscriber successfully ${newStatus}!`,
        icon: "success",
        timer: 2000,
        showConfirmButton: false
      });

      // Refresh current page
      fetchSubscribers(currentPage);
    } catch (err) {
      console.error("Status update error:", err);
      Swal.fire({
        toast: true,
        position: 'top-end',
        title: "Failed to update status",
        icon: "error",
        timer: 2500,
        showConfirmButton: false
      });
    }
  };

  useEffect(() => {
    fetchSubscribers(currentPage);
  }, [currentPage]);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  // Filter subscribers based on search term
  const filteredSubscribers = subscribers.filter(sub => 
    sub.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToExcel = async () => {
    setExporting(true);
    try {
      // Fetch all subscribers with a large limit to get the full list
      const res = await apiClient.get("/api/admin/subscribers", {
        params: { skip: 0, limit: 10000 },
      });

      const allData = res.data.items || [];
      
      if (allData.length === 0) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          title: "No data to export",
          icon: "info",
          timer: 2500,
          showConfirmButton: false
        });
        return;
      }

      // Format data for Excel
      const excelData = allData.map((sub, index) => ({
        "S.No": index + 1,
        "Email ID": sub.email,
        "Categories": (sub.categories || []).join(", "),
        "Sections": (sub.sections || []).join(", "),
        "Status": sub.status,
        "Subscribed Date": new Date(sub.created_at).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
      }));

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Subscribers");

      // Export file
      XLSX.writeFile(workbook, `Subscribers_List_${new Date().toISOString().split('T')[0]}.xlsx`);

      Swal.fire({
        toast: true,
        position: 'top-end',
        title: "Exported successfully!",
        icon: "success",
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err) {
      console.error("Export error:", err);
      Swal.fire({
        toast: true,
        position: 'top-end',
        title: "Failed to export data",
        icon: "error",
        timer: 2500,
        showConfirmButton: false
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="modern-subscribe-container">
      <style>
        {`
          .modern-subscribe-container {
            padding: 30px;
            background-color: #f8fafc;
            color: #213556ff;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            min-height: 100vh;
          }
          
          .header-section {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
            flex-wrap: wrap;
            gap: 16px;
          }
          
          .header-section h2 {
            font-size: 24px;
            font-weight: 700;
            color: #141415ff;
            margin: 0;
          }
          
          .table-card {
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
            overflow: hidden;
            border: 1px solid #e2e8f0;
          }

          .modern-table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
          }

          .modern-table th {
            background-color: #f1f5f9;
            color: #64748b;
            font-weight: 600;
            font-size: 13px;
            text-transform: uppercase;
            padding: 16px 20px;
            letter-spacing: 0.05em;
            border-bottom: 1px solid #e2e8f0;
          }

          .modern-table td {
            padding: 16px 20px;
            font-size: 14px;
            color: #334155;
            border-bottom: 1px solid #f1f5f9;
            vertical-align: middle;
          }

          .modern-table tbody tr {
            transition: background-color 0.15s ease;
          }

          .modern-table tbody tr:hover {
            background-color: #f8fafc;
          }

          .modern-table tbody tr:last-child td {
            border-bottom: none;
          }
          
          .category-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
          }
          
          .category-tag {
            background-color: #e0e7ff;
            color: #363086ff;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            text-transform: capitalize;
            white-space: nowrap;
            letter-spacing: 0.02em;
          }

          .badge {
            display: inline-flex;
            align-items: center;
            padding: 4px 12px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 600;
            text-transform: capitalize;
          }

          .badge-active {
            background-color: #dcfce7;
            color: #166534;
          }

          .badge-unsubscribed {
            background-color: #fee2e2;
            color: #991b1b;
          }

          .btn {
            border: none;
            border-radius: 6px;
            padding: 6px 12px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            margin-right: 8px;
            margin-bottom: 4px;
          }

          .btn-outline {
            background-color: transparent;
            border: 1px solid #cbd5e1;
            color: #475569;
          }
          .btn-outline:hover {
            background-color: #f1f5f9;
            color: #0f172a;
          }

          .btn-mail {
            background-color: transparent;
            border: 1px solid #bae6fd;
            color: #0284c7;
          }
          .btn-mail:hover {
            background-color: #f0f9ff;
          }

          .btn-export {
            background-color: #10b981;
            color: #ffffff;
            border: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            height: 38px;
          }
          .btn-export:hover:not(:disabled) {
            background-color: #059669;
            transform: translateY(-1px);
          }
          .btn-export:disabled {
            background-color: #a7f3d0;
            cursor: not-allowed;
          }

          .loading-state, .empty-state {
            padding: 60px 20px;
            text-align: center;
            color: #64748b;
            font-size: 15px;
          }

          .pagination-container {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 20px;
            background: #fff;
            border-top: 1px solid #e2e8f0;
            flex-wrap: wrap;
            gap: 16px;
          }

          .pagination-info {
            font-size: 14px;
            color: #64748b;
          }

          .pagination-controls {
            display: flex;
            gap: 8px;
          }

          .page-btn {
            padding: 6px 12px;
            border-radius: 6px;
            border: 1px solid #cbd5e1;
            background-color: #fff;
            color: #334155;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }

          .page-btn:hover:not(:disabled) {
            background-color: #f1f5f9;
            color: #0f172a;
          }

          .page-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            background-color: #f8fafc;
          }

          .search-input {
            padding: 8px 16px;
            border-radius: 8px;
            border: 1px solid #cbd5e1;
            font-size: 14px;
            outline: none;
            width: 280px;
            transition: border-color 0.2s;
          }
          
          .search-input:focus {
            border-color: #3b82f6;
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
          }
        `}
      </style>

      <div className="header-section">
        <div>
          <h2>Subscribers Management</h2>
          <p style={{ color: "#64748b", margin: "8px 0 0 0", fontSize: "14px" }}>
            Total Subscribers: <strong style={{ color: "#0f172a" }}>{totalSubscribers}</strong>
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button 
            className="btn btn-export" 
            onClick={exportToExcel}
            disabled={exporting}
          >
            <Download size={16} />
            {exporting ? "Exporting..." : "Export Excel"}
          </button>
          <input 
            type="text" 
            className="search-input"
            placeholder="Search email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="table-card">
        {loading ? (
          <div className="loading-state">Loading subscribers...</div>
        ) : filteredSubscribers.length > 0 ? (
          <>
            <table className="modern-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Email ID</th>
                  <th>Categories</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscribers.map((sub, index) => (
                  <tr key={sub.id}>
                    <td>
                      <span style={{ color: "#64748b", fontSize: "14px", fontWeight: "600", display: "inline-block" }}>
                        {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: "#0f172a" }}>{sub.email}</strong>
                    </td>
                    <td>
                      <div className="category-tags">
                        {(sub.categories || []).length > 0 ? (
                          (sub.categories || []).map((cat, idx) => (
                            <span key={idx} className="category-tag">
                              {cat.replace(/-/g, " ")}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: "12px" }}>
                            No categories
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          sub.status === "active"
                            ? "badge-active"
                            : "badge-unsubscribed"
                        }`}
                      >
                        {sub.status}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: "#64748b" }}>
                        {new Date(sub.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-mail"
                        onClick={() => window.location.href = `mailto:${sub.email}`}
                      >
                        Send Mail
                      </button>
                      <button
                        className="btn btn-outline"
                        onClick={() => toggleStatus(sub.id, sub.status)}
                      >
                        {sub.status === "active" ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="pagination-container">
              <div className="pagination-info">
                Page <span style={{fontWeight: 600, color: "#0f172a"}}>{currentPage}</span> of <span style={{fontWeight: 600, color: "#0f172a"}}>{totalPages}</span>
                {searchTerm && ` (filtered)`}
              </div>
              <div className="pagination-controls">
                <button 
                  className="page-btn" 
                  onClick={handlePrevPage} 
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <button 
                  className="page-btn" 
                  onClick={handleNextPage} 
                  disabled={currentPage >= totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <p>{searchTerm ? "No subscribers match your search" : "No subscribers found"}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscribeManage;
import { useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import DeveloperSidebar from "../components/DeveloperSidebar";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import "../styles/AdminLayout.css";

export default function DeveloperLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-slate-500 text-xs font-bold animate-pulse">Initializing Protocol...</p>
        </div>
      </div>
    );
  }

  // Ensure only super_admin role can access developer layout
  if (!user || user.role !== "super_admin") {
    return <Navigate to="/developer/login" replace />;
  }

  return (
    <div className="ph-layout">
      <DeveloperSidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <div className="ph-layout-main">
        <Navbar />
        <div className="ph-layout-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

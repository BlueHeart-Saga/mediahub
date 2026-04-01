import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import ForceNameModal from "../components/ForceNameModal";
import "../styles/AdminLayout.css";

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="ph-layout">
      <ForceNameModal />
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <div className="ph-layout-main">
        <Navbar />

        <div className="ph-layout-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Users,
  UserPlus,
  ShieldCheck,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Terminal,
  Activity,
  Database
} from "lucide-react";
import "../styles/Sidebar.css";

const DEVELOPER_MENU = [
  { label: "Admin Console", path: "/developer/superadmin/manage", icon: ShieldCheck },
  { label: "Join Requests", path: "/developer/superadmin/requests", icon: UserPlus },
  { label: "Data Overview", path: "/developer/superadmin/overview", icon: Database },
];

export default function DeveloperSidebar({ collapsed, setCollapsed }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <aside className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}>
      <div className="sidebar__header">
        <div className="sidebar__logo">
          <Terminal size={24} className="text-indigo-500" />
          {!collapsed && <h3 className="sidebar__title ml-2">Developer Hub</h3>}
        </div>
      </div>

      <nav className="sidebar__nav">
        <ul className="sidebar__menu">
          {DEVELOPER_MENU.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <li key={item.path} className="sidebar__menu-item">
                <Link
                  to={item.path}
                  className={`sidebar__link ${active ? "sidebar__link--active" : ""}`}
                >
                  <Icon size={18} className="sidebar__icon" />
                  {!collapsed && <span className="sidebar__label">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="sidebar__footer">
        {!collapsed && user && (
          <div className="sidebar__user">
            <div className="sidebar__user-avatar bg-indigo-600 text-white flex items-center justify-center font-black">
              {user.name?.charAt(0) || "D"}
            </div>
            <div className="sidebar__user-info">
              <p className="sidebar__user-name">{user.name || "Developer"}</p>
              <p className="sidebar__user-role text-indigo-400 font-black tracking-widest text-[8px] uppercase">Core Protocol</p>
            </div>
          </div>
        )}

        <button onClick={() => setCollapsed(!collapsed)} className="sidebar__toggle">
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!collapsed && <span>Collapse</span>}
        </button>

        <button onClick={logout} className="sidebar__logout">
          <LogOut size={18} />
          {!collapsed && <span>Exit Protocol</span>}
        </button>
      </div>
    </aside>
  );
}

// components/Sidebar/index.jsx
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  Building2,
  UserPlus,
  Users,
  FolderKanban,
  ListTree,
  FileText,
  Eye,
  Pencil,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
  Settings,
} from "lucide-react";
import "../styles/Sidebar.css";

// Menu configuration by role
const MENU_CONFIG = {
  super_admin: [
    { label: "Dashboard", path: "dashboard", icon: LayoutDashboard },
    { label: "Companies", path: "companies", icon: Building2 },
    { label: "Invite Admin", path: "invite-admin", icon: UserPlus },
    { label: "Invite Editor", path: "invite-editor", icon: UserPlus },
    { label: "Users", path: "users", icon: Users },
    { label: "Sections", path: "sections", icon: ListTree },
    { label: "Categories", path: "categories", icon: FolderKanban },
    { label: "Post Management", path: "content", icon: Pencil },
    { label: "View Posts", path: "posts", icon: Eye },
    { label: "Manage Subscribers", path: "subscribe", icon: Bell },
  ],
  company_admin: [
    { label: "Dashboard", path: "dashboard", icon: LayoutDashboard },
    { label: "Invite Editor", path: "invite-editor", icon: UserPlus },
    { label: "Users", path: "users", icon: Users },
    { label: "Sections", path: "sections", icon: ListTree },
    { label: "Categories", path: "categories", icon: FolderKanban },
    { label: "Create Post", path: "content", icon: FileText },
    { label: "View Posts", path: "posts", icon: Eye },
  ],
  editor: [
    { label: "Dashboard", path: "dashboard", icon: LayoutDashboard },
    { label: "Create Post", path: "content", icon: FileText },
    { label: "View Posts", path: "posts", icon: Eye },
  ],
};

// Common menu items for all authenticated users
const COMMON_MENU_ITEMS = [
  { label: "Settings", path: "settings", icon: Settings },
];

export default function Sidebar({ collapsed, setCollapsed }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Get menu items based on user role
  const getMenuItems = () => {
    if (!user) return [];

    const roleMenu = MENU_CONFIG[user.role] || [];
    return [...roleMenu, ...COMMON_MENU_ITEMS];
  };

  const menuItems = getMenuItems();

  // Check if a menu item is active
  const isActive = (path) => {
    return location.pathname.includes(path);
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <aside
      className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}
      aria-label="Main navigation"
    >
      {/* Header */}
      <div className="sidebar__header">
        <div className="sidebar__logo" aria-label="Logo">
          {!collapsed && <h3 className="sidebar__title">Admin Panel</h3>}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="sidebar__nav" aria-label="Menu">
        <ul className="sidebar__menu">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <li key={item.path} className="sidebar__menu-item">
                <Link
                  to={item.path}
                  className={`sidebar__link ${active ? "sidebar__link--active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon
                    size={18}
                    className="sidebar__icon"
                    aria-hidden="true"
                  />
                  {!collapsed && (
                    <span className="sidebar__label">{item.label}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer Actions */}
      <div className="sidebar__footer">
        {/* User Info */}
        {!collapsed && user && (
          <div className="sidebar__user">
            <div className="sidebar__user-avatar">
              {user?.profile_image ? (
                <img
                  src={`data:${user.profile_image.content_type};base64,${user.profile_image.data}`}
                  alt="Profile"
                />
              ) : (
                user?.name?.charAt(0)?.toUpperCase() || "U"
              )}
            </div>
            <div className="sidebar__user-info">
              <p className="sidebar__user-name">{user.name || "User"}</p>
              <p className="sidebar__user-role">{user.role?.replace("_", " ")}</p>
            </div>
          </div>
        )}

        {/* Toggle Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="sidebar__toggle"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? (
            <ChevronRight size={18} aria-hidden="true" />
          ) : (
            <ChevronLeft size={18} aria-hidden="true" />
          )}
          {!collapsed && <span>Collapse</span>}
        </button>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="sidebar__logout"
          aria-label="Logout"
          title="Logout"
        >
          <LogOut size={18} aria-hidden="true" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
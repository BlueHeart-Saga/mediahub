import { useAuth } from "../context/AuthContext";
import "../styles/Navbar.css";

export default function Navbar() {
  const { user, logout } = useAuth();

  const imageSrc = user?.profile_image
    ? `data:${user.profile_image.content_type};base64,${user.profile_image.data}`
    : null;

  return (
    <header className="ph-navbar">
      <div className="ph-navbar-left">
        <div className="ph-navbar-search"></div>
      </div>

      <div className="ph-navbar-right">
        <div className="ph-navbar-user">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt="Profile"
              className="ph-navbar-avatar"
            />
          ) : (
            <div className="ph-navbar-avatar ph-navbar-avatar--fallback">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
          )}

          {/* <span className="ph-navbar-username">
            {user?.name || "User"}
          </span> */}
        </div>

        <button className="ph-navbar-btn" onClick={logout}>
          Logout
        </button>
      </div>
    </header>
  );
}
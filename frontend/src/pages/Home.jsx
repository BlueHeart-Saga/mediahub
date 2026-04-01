import { Link } from "react-router-dom";
import "../styles/Home.css";

export default function Home() {
  return (
    <div className="ph-home-page">
      <div className="ph-home-card">

        <div className="ph-home-header">
          <div className="ph-home-logo"></div>

          {/* Real Title */}
          <h1 className="ph-home-heading">
            Podcast Management Platform
          </h1>

          <p className="ph-home-subheading">
            Centralized publishing & episode control system
          </p>
        </div>

        <div className="ph-home-description">
          <div></div>
          <div></div>
          <div></div>
        </div>

        <div className="ph-home-actions">
          <Link to="/login" className="ph-home-link">
            <button className="ph-home-btn ph-home-btn-secondary">
              Login
            </button>
          </Link>

          <Link to="/register" className="ph-home-link">
            <button className="ph-home-btn ph-home-btn-primary">
              Register
            </button>
          </Link>
          <Link to="/companies" className="ph-home-link">
    <button className="ph-home-btn ph-home-btn-outline">
      View Companies
    </button>
  </Link>
        </div>

      </div>
    </div>
  );
}
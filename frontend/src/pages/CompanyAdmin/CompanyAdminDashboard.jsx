import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../api/client";
import toast from "react-hot-toast";
import { 
  UsersIcon, 
  UserGroupIcon, 
  DocumentTextIcon,
  FolderIcon,
  TagIcon,
  EyeIcon,
  ChatBubbleLeftIcon,
  HeartIcon,
  CalendarIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import "../../styles/CompanyAdminDashboard.css";

export default function CompanyAdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('week');
  const [recentActivity, setRecentActivity] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [visibleCount, setVisibleCount] = useState(8);

  const loadStats = async () => {
    try {
      const res = await apiFetch("/company-admin-stats");
      if (res) {
        setStats(res);
      }
    } catch (err) {
      console.error("Failed to load stats:", err);
      toast.error("Failed to load dashboard statistics");
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivity = async () => {
    setLoadingActivity(true);
    try {
      const days = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 365;
      // Get recent content with days filter and enough limit for "view more"
      const contentRes = await apiFetch(`/content?limit=50&days=${days}&sort_by=created_at&sort_order=-1`);
      if (contentRes?.items) {
        setRecentActivity(contentRes.items);
        setVisibleCount(8); // Reset visible count on timeframe change
      }
    } catch (err) {
      console.error("Failed to load recent activity:", err);
    } finally {
      setLoadingActivity(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadRecentActivity();
  }, [timeframe]);

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'published': return 'cad-status-published';
      case 'draft': return 'cad-status-draft';
      case 'archived': return 'cad-status-archived';
      default: return '';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
  };

  return (
    <div className="cad-container">
      {/* Header */}
      <div className="cad-header">
        <div className="cad-header-left">
          <h1 className="cad-title">Company Dashboard</h1>
          <p className="cad-subtitle">
            Welcome back, {user?.name || 'Admin'}! Here's what's happening with your company.
          </p>
        </div>
        <div className="cad-header-right">
          <div className="cad-company-badge">
            <span className="cad-company-label">Company</span>
            <span className="cad-company-name">{stats?.company?.name || user?.company_id}</span>
          </div>
          <div className="cad-role-badge">
            <span className="cad-role-label">Role</span>
            <span className="cad-role-name">{user?.role?.replace('_', ' ') || 'Admin'}</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="cad-stats-grid">
        {/* Company Status Card */}
        <div className="cad-stat-card cad-company-card">
          <div className="cad-stat-header">
            <div className="cad-stat-icon">
              <BuildingOfficeIcon className="cad-icon" />
            </div>
            <div className="cad-stat-label">Company Status</div>
          </div>
          <div className="cad-stat-value">
            {stats?.company?.status || 'active'}
          </div>
          <div className="cad-stat-footer">
            <span className={`cad-status-badge ${stats?.company?.status === 'active' ? 'cad-status-active' : 'cad-status-inactive'}`}>
              {stats?.company?.status || 'Active'}
            </span>
          </div>
        </div>

        {/* Total Users Card */}
        <div className="cad-stat-card">
          <div className="cad-stat-header">
            <div className="cad-stat-icon cad-users-icon">
              <UsersIcon className="cad-icon" />
            </div>
            <div className="cad-stat-label">Total Users</div>
          </div>
          <div className="cad-stat-value">
            {loading ? <SkeletonStat /> : stats?.users?.total || 0}
          </div>
          <div className="cad-stat-footer">
            <span className="cad-stat-change">
              <UsersIcon className="cad-icon-small" />
              {stats?.users?.active || 0} active
            </span>
            <span className="cad-stat-change">
              {stats?.users?.pending || 0} pending
            </span>
          </div>
        </div>

        {/* Editors Card */}
        <div className="cad-stat-card">
          <div className="cad-stat-header">
            <div className="cad-stat-icon cad-editors-icon">
              <UserGroupIcon className="cad-icon" />
            </div>
            <div className="cad-stat-label">Editors</div>
          </div>
          <div className="cad-stat-value">
            {loading ? <SkeletonStat /> : stats?.users?.editors || 0}
          </div>
          <div className="cad-stat-footer">
            <span className="cad-stat-change">
              {((stats?.users?.editors / stats?.users?.total) * 100 || 0).toFixed(1)}% of users
            </span>
          </div>
        </div>

        {/* Sections Card */}
        <div className="cad-stat-card">
          <div className="cad-stat-header">
            <div className="cad-stat-icon cad-sections-icon">
              <FolderIcon className="cad-icon" />
            </div>
            <div className="cad-stat-label">Sections</div>
          </div>
          <div className="cad-stat-value">
            {loading ? <SkeletonStat /> : stats?.content?.sections || 0}
          </div>
          <div className="cad-stat-footer">
            <span className="cad-stat-change">
              Content organization
            </span>
          </div>
        </div>

        {/* Categories Card */}
        <div className="cad-stat-card">
          <div className="cad-stat-header">
            <div className="cad-stat-icon cad-categories-icon">
              <TagIcon className="cad-icon" />
            </div>
            <div className="cad-stat-label">Categories</div>
          </div>
          <div className="cad-stat-value">
            {loading ? <SkeletonStat /> : stats?.content?.categories || 0}
          </div>
          <div className="cad-stat-footer">
            <span className="cad-stat-change">
              Content classification
            </span>
          </div>
        </div>

        {/* Total Posts Card */}
        <div className="cad-stat-card">
          <div className="cad-stat-header">
            <div className="cad-stat-icon cad-posts-icon">
              <DocumentTextIcon className="cad-icon" />
            </div>
            <div className="cad-stat-label">Total Posts</div>
          </div>
          <div className="cad-stat-value">
            {loading ? <SkeletonStat /> : stats?.content?.total_posts || 0}
          </div>
          <div className="cad-stat-footer">
            <span className="cad-stat-change">
              All time
            </span>
          </div>
        </div>

        {/* Published Posts Card */}
        <div className="cad-stat-card">
          <div className="cad-stat-header">
            <div className="cad-stat-icon cad-published-icon">
              <ArrowTrendingUpIcon className="cad-icon" />
            </div>
            <div className="cad-stat-label">Published</div>
          </div>
          <div className="cad-stat-value">
            {loading ? <SkeletonStat /> : stats?.content?.published_posts || 0}
          </div>
          <div className="cad-stat-footer">
            <span className="cad-stat-change cad-positive">
              {((stats?.content?.published_posts / stats?.content?.total_posts) * 100 || 0).toFixed(1)}% of total
            </span>
          </div>
        </div>

        {/* Draft Posts Card */}
        <div className="cad-stat-card">
          <div className="cad-stat-header">
            <div className="cad-stat-icon cad-draft-icon">
              <DocumentTextIcon className="cad-icon" />
            </div>
            <div className="cad-stat-label">Drafts</div>
          </div>
          <div className="cad-stat-value">
            {loading ? <SkeletonStat /> : stats?.content?.draft_posts || 0}
          </div>
          <div className="cad-stat-footer">
            <span className="cad-stat-change">
              {((stats?.content?.draft_posts / stats?.content?.total_posts) * 100 || 0).toFixed(1)}% of total
            </span>
          </div>
        </div>

        {/* User Status Summary Card */}
        <div className="cad-stat-card cad-summary-card">
          <div className="cad-stat-header">
            <div className="cad-stat-label">User Status</div>
          </div>
          <div className="cad-summary-stats">
            <div className="cad-summary-item">
              <span className="cad-summary-label">Active</span>
              <span className="cad-summary-value cad-active-value">{stats?.users?.active || 0}</span>
            </div>
            <div className="cad-summary-item">
              <span className="cad-summary-label">Pending</span>
              <span className="cad-summary-value cad-pending-value">{stats?.users?.pending || 0}</span>
            </div>
          </div>
        </div>

        {/* Content Status Summary Card */}
        <div className="cad-stat-card cad-summary-card">
          <div className="cad-stat-header">
            <div className="cad-stat-label">Content Status</div>
          </div>
          <div className="cad-summary-stats">
            <div className="cad-summary-item">
              <span className="cad-summary-label">Published</span>
              <span className="cad-summary-value cad-published-value">{stats?.content?.published_posts || 0}</span>
            </div>
            <div className="cad-summary-item">
              <span className="cad-summary-label">Draft</span>
              <span className="cad-summary-value cad-draft-value">{stats?.content?.draft_posts || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Company Info Block */}
      {stats?.company && (
        <div className="cad-card cad-info-card-top">
          <div className="cad-card-header">
            <div className="cad-card-header-left">
              <BuildingOfficeIcon className="cad-card-icon" />
              <h3 className="cad-card-title">Company Profile</h3>
            </div>
          </div>
          <div className="cad-company-info-horizontal">
            <div className="cad-info-item">
              <span className="cad-info-label">Company ID</span>
              <span className="cad-info-value">{stats.company.id}</span>
            </div>
            <div className="cad-info-item">
              <span className="cad-info-label">Company Name</span>
              <span className="cad-info-value">{stats.company.name}</span>
            </div>
            <div className="cad-info-item">
              <span className="cad-info-label">Operational Status</span>
              <span className={`cad-status-badge ${stats.company.status === 'active' ? 'cad-status-active' : 'cad-status-inactive'}`}>
                {stats.company.status}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="cad-card">
        <div className="cad-card-header">
          <h3 className="cad-card-title">Quick Actions</h3>
        </div>
        <div className="cad-actions-grid">
          <button className="cad-action-btn cad-action-primary" onClick={() => window.location.href = '/company-admin/invite-editor'}>
            <UserGroupIcon className="cad-icon" />
            <span>Invite Editor</span>
          </button>
          <button className="cad-action-btn cad-action-success" onClick={() => window.location.href = '/company-admin/content'}>
            <DocumentTextIcon className="cad-icon" />
            <span>Create Content</span>
          </button>
          <button className="cad-action-btn cad-action-info" onClick={() => window.location.href = '/company-admin/sections'}>
            <FolderIcon className="cad-icon" />
            <span>Manage Sections</span>
          </button>
          <button className="cad-action-btn cad-action-warning" onClick={() => window.location.href = '/company-admin/categories'}>
            <TagIcon className="cad-icon" />
            <span>Manage Categories</span>
          </button>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="cad-card cad-activity-card-full">
        <div className="cad-card-header">
          <h2 className="cad-card-title">Recent Activity</h2>
          <div className="cad-timeframe-selector">
            <button 
              className={`cad-timeframe-btn ${timeframe === 'week' ? 'active' : ''}`}
              onClick={() => setTimeframe('week')}
            >
              Week
            </button>
            <button 
              className={`cad-timeframe-btn ${timeframe === 'month' ? 'active' : ''}`}
              onClick={() => setTimeframe('month')}
            >
              Month
            </button>
            <button 
              className={`cad-timeframe-btn ${timeframe === 'year' ? 'active' : ''}`}
              onClick={() => setTimeframe('year')}
            >
              Year
            </button>
          </div>
        </div>

        <div className="cad-activity-list">
          {loadingActivity ? (
            <>
              <SkeletonActivity />
              <SkeletonActivity />
              <SkeletonActivity />
            </>
          ) : recentActivity.length > 0 ? (
            <>
              {recentActivity.slice(0, visibleCount).map(item => (
                <div key={item.id} className="cad-activity-item">
                  <div className="cad-activity-item-content">
                    <div className="cad-activity-item-title">{item.title}</div>
                    <div className="cad-activity-item-meta">
                      <span className={`cad-status-badge-small ${getStatusBadgeClass(item.status)}`}>
                        {item.status}
                      </span>
                      <span className="cad-activity-item-date">
                        <CalendarIcon className="cad-icon-small" />
                        {formatDate(item.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="cad-activity-stats">
                    {item.stats && (
                      <>
                        <span className="cad-stat-badge" title="Views">
                          <EyeIcon className="cad-icon-small" />
                          {item.stats.views || 0}
                        </span>
                        <span className="cad-stat-badge" title="Comments">
                          <ChatBubbleLeftIcon className="cad-icon-small" />
                          {item.stats.comments || 0}
                        </span>
                        <span className="cad-stat-badge" title="Likes">
                          <HeartIcon className="cad-icon-small" />
                          {item.stats.likes || 0}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))}
              
              {recentActivity.length > visibleCount && (
                <button 
                  className="cad-view-more-btn"
                  onClick={() => setVisibleCount(prev => prev + 8)}
                >
                  View More
                </button>
              )}
            </>
          ) : (
            <div className="cad-empty-state">
              <p>No recent content</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper Components
function SkeletonStat() {
  return <div className="cad-skeleton-stat"></div>;
}

function SkeletonActivity() {
  return (
    <div className="cad-skeleton-activity">
      <div className="cad-skeleton-line"></div>
      <div className="cad-skeleton-line short"></div>
    </div>
  );
}

// Heroicons replacement (since you might not have them installed)
function BuildingOfficeIcon(props) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}
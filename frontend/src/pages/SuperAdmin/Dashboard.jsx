import { useEffect, useState } from "react";
import { apiFetch } from "../../api/client";
import { useNavigate } from "react-router-dom";
import {
  BuildingOfficeIcon,
  UsersIcon,
  UserGroupIcon,
  DocumentTextIcon,
  FolderIcon,
  TagIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  NewspaperIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilSquareIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import "../../styles/SuperAdminDashboard.css";

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [timeframe, setTimeframe] = useState('week');
  const [visibleCount, setVisibleCount] = useState(8);

  const loadStats = async () => {
    try {
      const res = await apiFetch("/super-admin-stats");
      if (res) {
        setStats(res);
      }
    } catch (err) {
      console.error("Failed to load stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivity = async (currentTimeframe) => {
    setLoadingActivity(true);
    try {
      // Map timeframe to days
      const daysMap = { 'week': 7, 'month': 30, 'year': 365 };
      const days = daysMap[currentTimeframe || timeframe];

      // Get recent content across all companies within the timeframe
      // We fetch a generous amount (e.g., 50) to allow "View More" without frequent re-fetching
      const contentRes = await apiFetch(`/content?limit=50&days=${days}&sort_by=created_at&sort_order=-1`);

      if (contentRes?.items) {
        setRecentActivity(contentRes.items);
      } else {
        setRecentActivity([]);
      }
    } catch (err) {
      console.error("Failed to load recent activity:", err);
      setRecentActivity([]);
    } finally {
      setLoadingActivity(false);
    }
  };

  useEffect(() => {
    loadStats();
    loadRecentActivity('week');
  }, []);

  // Handle timeframe change
  const handleTimeframeChange = (newTimeframe) => {
    setTimeframe(newTimeframe);
    setVisibleCount(8); // Reset visible count on timeframe change
    loadRecentActivity(newTimeframe);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'active': return 'sad-status-active';
      case 'pending': return 'sad-status-pending';
      case 'suspended': return 'sad-status-suspended';
      case 'deleted': return 'sad-status-deleted';
      case 'published': return 'sad-status-published';
      case 'draft': return 'sad-status-draft';
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
    <div className="sad-container">
      {/* Header */}
      <div className="sad-header">
        <div className="sad-header-left">
          <h1 className="sad-title">Super Admin Dashboard</h1>
          <p className="sad-subtitle">
            Platform-wide analytics & control center
          </p>
        </div>
        <div className="sad-header-right">
          <div className="sad-time-badge">
            <ClockIcon className="sad-icon-small" />
            <span>{new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</span>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="sad-stats-grid">
        {/* Companies Card */}
        <div className="sad-stat-card sad-company-card">
          <div className="sad-stat-header">
            <div className="sad-stat-icon">
              <BuildingOfficeIcon className="sad-icon" />
            </div>
            <div className="sad-stat-label">Total Companies</div>
          </div>
          <div className="sad-stat-value">
            {loading ? <SkeletonStat /> : stats?.companies?.total || 0}
          </div>
          <div className="sad-stat-footer">
            <span className="sad-stat-badge sad-active-badge">
              <CheckCircleIcon className="sad-icon-small" />
              {stats?.companies?.active || 0} Active
            </span>
            <span className="sad-stat-badge sad-inactive-badge">
              <XCircleIcon className="sad-icon-small" />
              {stats?.companies?.inactive || 0} Inactive
            </span>
          </div>
        </div>

        {/* Users Card */}
        <div className="sad-stat-card">
          <div className="sad-stat-header">
            <div className="sad-stat-icon sad-users-icon">
              <UsersIcon className="sad-icon" />
            </div>
            <div className="sad-stat-label">Total Users</div>
          </div>
          <div className="sad-stat-value">
            {loading ? <SkeletonStat /> : stats?.users?.total || 0}
          </div>
          <div className="sad-stat-footer">
            <span className="sad-stat-badge sad-active-badge">
              <CheckCircleIcon className="sad-icon-small" />
              {stats?.users?.active || 0} Active
            </span>
            <span className="sad-stat-badge sad-pending-badge">
              <ClockIcon className="sad-icon-small" />
              {stats?.users?.pending || 0} Pending
            </span>
            <span className="sad-stat-badge sad-suspended-badge">
              <XCircleIcon className="sad-icon-small" />
              {stats?.users?.suspended || 0} Suspended
            </span>
          </div>
        </div>

        {/* Admins Card */}
        <div className="sad-stat-card">
          <div className="sad-stat-header">
            <div className="sad-stat-icon sad-admins-icon">
              <UserGroupIcon className="sad-icon" />
            </div>
            <div className="sad-stat-label">Company Admins</div>
          </div>
          <div className="sad-stat-value">
            {loading ? <SkeletonStat /> : stats?.users?.admins || 0}
          </div>
          <div className="sad-stat-footer">
            <span className="sad-stat-change">
              {((stats?.users?.admins / stats?.users?.total) * 100 || 0).toFixed(1)}% of users
            </span>
          </div>
        </div>

        {/* Editors Card */}
        <div className="sad-stat-card">
          <div className="sad-stat-header">
            <div className="sad-stat-icon sad-editors-icon">
              <PencilSquareIcon className="sad-icon" />
            </div>
            <div className="sad-stat-label">Editors</div>
          </div>
          <div className="sad-stat-value">
            {loading ? <SkeletonStat /> : stats?.users?.editors || 0}
          </div>
          <div className="sad-stat-footer">
            <span className="sad-stat-change">
              {((stats?.users?.editors / stats?.users?.total) * 100 || 0).toFixed(1)}% of users
            </span>
          </div>
        </div>

        {/* Sections Card */}
        <div className="sad-stat-card">
          <div className="sad-stat-header">
            <div className="sad-stat-icon sad-sections-icon">
              <FolderIcon className="sad-icon" />
            </div>
            <div className="sad-stat-label">Sections</div>
          </div>
          <div className="sad-stat-value">
            {loading ? <SkeletonStat /> : stats?.content?.sections || 0}
          </div>
          <div className="sad-stat-footer">
            <span className="sad-stat-change">
              Content organization
            </span>
          </div>
        </div>

        {/* Categories Card */}
        <div className="sad-stat-card">
          <div className="sad-stat-header">
            <div className="sad-stat-icon sad-categories-icon">
              <TagIcon className="sad-icon" />
            </div>
            <div className="sad-stat-label">Categories</div>
          </div>
          <div className="sad-stat-value">
            {loading ? <SkeletonStat /> : stats?.content?.categories || 0}
          </div>
          <div className="sad-stat-footer">
            <span className="sad-stat-change">
              Content classification
            </span>
          </div>
        </div>

        {/* Total Posts Card */}
        <div className="sad-stat-card">
          <div className="sad-stat-header">
            <div className="sad-stat-icon sad-posts-icon">
              <DocumentTextIcon className="sad-icon" />
            </div>
            <div className="sad-stat-label">Total Posts</div>
          </div>
          <div className="sad-stat-value">
            {loading ? <SkeletonStat /> : stats?.content?.total_posts || 0}
          </div>
          <div className="sad-stat-footer">
            <span className="sad-stat-change">
              All time
            </span>
          </div>
        </div>

        {/* Published Posts Card */}
        <div className="sad-stat-card">
          <div className="sad-stat-header">
            <div className="sad-stat-icon sad-published-icon">
              <CheckCircleIcon className="sad-icon" />
            </div>
            <div className="sad-stat-label">Published</div>
          </div>
          <div className="sad-stat-value">
            {loading ? <SkeletonStat /> : stats?.content?.published_posts || 0}
          </div>
          <div className="sad-stat-footer">
            <span className="sad-stat-change sad-positive">
              {((stats?.content?.published_posts / stats?.content?.total_posts) * 100 || 0).toFixed(1)}% published
            </span>
          </div>
        </div>

        {/* Draft Posts Card */}
        <div className="sad-stat-card">
          <div className="sad-stat-header">
            <div className="sad-stat-icon sad-draft-icon">
              <PencilSquareIcon className="sad-icon" />
            </div>
            <div className="sad-stat-label">Drafts</div>
          </div>
          <div className="sad-stat-value">
            {loading ? <SkeletonStat /> : stats?.content?.draft_posts || 0}
          </div>
          <div className="sad-stat-footer">
            <span className="sad-stat-change">
              {((stats?.content?.draft_posts / stats?.content?.total_posts) * 100 || 0).toFixed(1)}% in progress
            </span>
          </div>
        </div>
      </div>

      {/* Second Row - Summary Cards */}
      <div className="sad-summary-grid">
        {/* User Status Summary */}
        <div className="sad-summary-card">
          <div className="sad-summary-header">
            <UsersIcon className="sad-summary-icon" />
            <h3 className="sad-summary-title">User Status Breakdown</h3>
          </div>
          <div className="sad-summary-content">
            <div className="sad-progress-item">
              <div className="sad-progress-label">
                <span>Active Users</span>
                <span className="sad-progress-value">{stats?.users?.active || 0}</span>
              </div>
              <div className="sad-progress-bar">
                <div
                  className="sad-progress-fill sad-progress-active"
                  style={{ width: `${((stats?.users?.active || 0) / (stats?.users?.total || 1)) * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="sad-progress-item">
              <div className="sad-progress-label">
                <span>Pending</span>
                <span className="sad-progress-value">{stats?.users?.pending || 0}</span>
              </div>
              <div className="sad-progress-bar">
                <div
                  className="sad-progress-fill sad-progress-pending"
                  style={{ width: `${((stats?.users?.pending || 0) / (stats?.users?.total || 1)) * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="sad-progress-item">
              <div className="sad-progress-label">
                <span>Suspended</span>
                <span className="sad-progress-value">{stats?.users?.suspended || 0}</span>
              </div>
              <div className="sad-progress-bar">
                <div
                  className="sad-progress-fill sad-progress-suspended"
                  style={{ width: `${((stats?.users?.suspended || 0) / (stats?.users?.total || 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Status Summary */}
        <div className="sad-summary-card">
          <div className="sad-summary-header">
            <NewspaperIcon className="sad-summary-icon" />
            <h3 className="sad-summary-title">Content Status Breakdown</h3>
          </div>
          <div className="sad-summary-content">
            <div className="sad-progress-item">
              <div className="sad-progress-label">
                <span>Published</span>
                <span className="sad-progress-value">{stats?.content?.published_posts || 0}</span>
              </div>
              <div className="sad-progress-bar">
                <div
                  className="sad-progress-fill sad-progress-published"
                  style={{ width: `${((stats?.content?.published_posts || 0) / (stats?.content?.total_posts || 1)) * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="sad-progress-item">
              <div className="sad-progress-label">
                <span>Drafts</span>
                <span className="sad-progress-value">{stats?.content?.draft_posts || 0}</span>
              </div>
              <div className="sad-progress-bar">
                <div
                  className="sad-progress-fill sad-progress-draft"
                  style={{ width: `${((stats?.content?.draft_posts || 0) / (stats?.content?.total_posts || 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Health */}
        <div className="sad-summary-card">
          <div className="sad-summary-header">
            <ChartBarIcon className="sad-summary-icon" />
            <h3 className="sad-summary-title">Platform Health</h3>
          </div>
          <div className="sad-health-grid">
            <div className="sad-health-item">
              <span className="sad-health-label">Companies Active</span>
              <span className="sad-health-value">
                {((stats?.companies?.active / stats?.companies?.total) * 100 || 0).toFixed(1)}%
              </span>
            </div>
            <div className="sad-health-item">
              <span className="sad-health-label">Users Active</span>
              <span className="sad-health-value">
                {((stats?.users?.active / stats?.users?.total) * 100 || 0).toFixed(1)}%
              </span>
            </div>
            <div className="sad-health-item">
              <span className="sad-health-label">Content Published</span>
              <span className="sad-health-value">
                {((stats?.content?.published_posts / stats?.content?.total_posts) * 100 || 0).toFixed(1)}%
              </span>
            </div>
            <div className="sad-health-item">
              <span className="sad-health-label">Admin to Editor Ratio</span>
              <span className="sad-health-value">
                1:{((stats?.users?.editors / stats?.users?.admins) || 0).toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="sad-card">
        <div className="sad-card-header">
          <h3 className="sad-card-title">Quick Actions</h3>
          <ArrowTrendingUpIcon className="sad-card-icon" />
        </div>

        {loading ? (
          <div className="sad-actions-skeleton">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
          </div>
        ) : (
          <div className="sad-actions-grid">
            <button
              className="sad-action-btn sad-action-primary"
              onClick={() => navigate("/super-admin/companies")}
            >
              <BuildingOfficeIcon className="sad-action-icon" />
              <span>Create Company</span>
            </button>

            <button
              className="sad-action-btn sad-action-success"
              onClick={() => navigate("/super-admin/invite-admin")}
            >
              <EnvelopeIcon className="sad-action-icon" />
              <span>Invite Admin</span>
            </button>

            <button
              className="sad-action-btn sad-action-success"
              onClick={() => navigate("/super-admin/invite-editor")}
            >
              <EnvelopeIcon className="sad-action-icon" />
              <span>Invite Editor</span>
            </button>

            <button
              className="sad-action-btn sad-action-info"
              onClick={() => navigate("/super-admin/sections")}
            >
              <FolderIcon className="sad-action-icon" />
              <span>Manage Sections</span>
            </button>

            <button
              className="sad-action-btn sad-action-warning"
              onClick={() => navigate("/super-admin/posts")}
            >
              <DocumentTextIcon className="sad-action-icon" />
              <span>View Posts</span>
            </button>

            <button
              className="sad-action-btn sad-action-secondary"
              onClick={() => navigate("/super-admin/users")}
            >
              <UsersIcon className="sad-action-icon" />
              <span>Manage Users</span>
            </button>

            <button
              className="sad-action-btn sad-action-secondary"
              onClick={() => navigate("/super-admin/categories")}
            >
              <TagIcon className="sad-action-icon" />
              <span>Manage Categories</span>
            </button>

            <button
              className="sad-action-btn sad-action-info"
              onClick={() => navigate("/super-admin/subscribe")}
            >
              <EnvelopeIcon className="sad-action-icon" />
              <span>Subscriptions</span>
            </button>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="sad-card">
        <div className="sad-card-header">
          <h3 className="sad-card-title">Recent Activity</h3>
          <div className="sad-timeframe-selector">
            <button
              className={`sad-timeframe-btn ${timeframe === 'week' ? 'active' : ''}`}
              onClick={() => handleTimeframeChange('week')}
            >
              Week
            </button>
            <button
              className={`sad-timeframe-btn ${timeframe === 'month' ? 'active' : ''}`}
              onClick={() => handleTimeframeChange('month')}
            >
              Month
            </button>
            <button
              className={`sad-timeframe-btn ${timeframe === 'year' ? 'active' : ''}`}
              onClick={() => handleTimeframeChange('year')}
            >
              Year
            </button>
          </div>
        </div>

        <div className="sad-activity-list">
          {loadingActivity ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="sad-skeleton-activity">
                <div className="sad-skeleton-line"></div>
                <div className="sad-skeleton-line short"></div>
              </div>
            ))
          ) : recentActivity.length > 0 ? (
            <>
              {recentActivity.slice(0, visibleCount).map((activity) => (
                <div key={activity.id} className="sad-activity-item">
                  <div className="sad-activity-item-content">
                    <div className="sad-activity-item-title">{activity.title}</div>
                    <div className="sad-activity-item-meta">
                      <div className="sad-company-badge">
                        <BuildingOfficeIcon className="sad-icon-small" />
                        {activity.company_id || 'System'}
                      </div>
                      <span className={`sad-status-badge-small ${getStatusBadgeClass(activity.status)}`}>
                        {activity.status}
                      </span>
                      <div className="sad-activity-item-date">
                        <ClockIcon className="sad-icon-small" />
                        {formatDate(activity.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="sad-activity-item-author">
                    <div className="sad-author-name">by {activity.author?.name || 'Unknown'}</div>
                  </div>
                </div>
              ))}

              {recentActivity.length > visibleCount && (
                <div className="sad-view-more-container">
                  <button
                    className="sad-view-more-btn"
                    onClick={() => setVisibleCount(prev => prev + 8)}
                  >
                    View More Activity
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="sad-empty-state">
              No activity found for this {timeframe}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// Helper Components
function SkeletonStat() {
  return <div className="sad-skeleton-stat"></div>;
}

function SkeletonActivity() {
  return (
    <div className="sad-skeleton-activity">
      <div className="sad-skeleton-line"></div>
      <div className="sad-skeleton-line short"></div>
    </div>
  );
}
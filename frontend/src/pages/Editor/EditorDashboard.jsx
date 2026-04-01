import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/api";
import { useNavigate } from "react-router-dom";
import {
  DocumentTextIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  ClockIcon,
  FolderIcon,
  TagIcon,
  EyeIcon,
  ChatBubbleLeftIcon,
  HeartIcon,
  ArrowTrendingUpIcon,
  UserIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import "../../styles/EditorDashboard.css";

export default function EditorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentPosts, setRecentPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [timeframe, setTimeframe] = useState('week');

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await api.getEditorStats();
        if (res) {
          setStats(res);
        }
      } catch (err) {
        console.error("Failed to load stats:", err);
      } finally {
        setLoading(false);
      }
    };

    const loadRecentPosts = async () => {
      setLoadingPosts(true);
      try {
        // Get recent posts by this editor
        const res = await api.getContent({ 
          limit: 5, 
          sort_by: 'created_at', 
          sort_order: -1 
        });
        if (res?.items) {
          setRecentPosts(res.items);
        }
      } catch (err) {
        console.error("Failed to load recent posts:", err);
      } finally {
        setLoadingPosts(false);
      }
    };

    loadStats();
    loadRecentPosts();
  }, []);

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'published': return 'ed-status-published';
      case 'draft': return 'ed-status-draft';
      case 'archived': return 'ed-status-archived';
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
    <div className="ed-container">
      {/* Header */}
      <div className="ed-header">
        <div className="ed-header-left">
          <h1 className="ed-title">Editor Dashboard</h1>
          <p className="ed-subtitle">
            Welcome back, {user?.name || "Editor"}! Here's your content overview.
          </p>
        </div>

        <div className="ed-header-right">
          <div className="ed-user-badge">
            <UserIcon className="ed-icon-small" />
            <div className="ed-user-info">
              <span className="ed-user-name">{user?.name || user?.email}</span>
              <span className="ed-user-role">{user?.role}</span>
            </div>
          </div>
          <div className="ed-company-badge">
            <span className="ed-company-label">Company</span>
            <span className="ed-company-name">{user?.company_id || "N/A"}</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="ed-stats-grid">
        {/* My Posts Card */}
        <div className="ed-stat-card">
          <div className="ed-stat-header">
            <div className="ed-stat-icon ed-my-posts-icon">
              <DocumentTextIcon className="ed-icon" />
            </div>
            <div className="ed-stat-label">My Posts</div>
          </div>
          <div className="ed-stat-value">
            {loading ? <SkeletonStat /> : stats?.my_content?.total_posts || 0}
          </div>
          <div className="ed-stat-footer">
            <span className="ed-stat-change">
              Total posts you've created
            </span>
          </div>
        </div>

        {/* My Published Card */}
        <div className="ed-stat-card">
          <div className="ed-stat-header">
            <div className="ed-stat-icon ed-published-icon">
              <CheckCircleIcon className="ed-icon" />
            </div>
            <div className="ed-stat-label">My Published</div>
          </div>
          <div className="ed-stat-value">
            {loading ? <SkeletonStat /> : stats?.my_content?.published_posts || 0}
          </div>
          <div className="ed-stat-footer">
            <span className="ed-stat-change ed-positive">
              {((stats?.my_content?.published_posts / stats?.my_content?.total_posts) * 100 || 0).toFixed(1)}% of your posts
            </span>
          </div>
        </div>

        {/* My Drafts Card */}
        <div className="ed-stat-card">
          <div className="ed-stat-header">
            <div className="ed-stat-icon ed-draft-icon">
              <PencilSquareIcon className="ed-icon" />
            </div>
            <div className="ed-stat-label">My Drafts</div>
          </div>
          <div className="ed-stat-value">
            {loading ? <SkeletonStat /> : stats?.my_content?.draft_posts || 0}
          </div>
          <div className="ed-stat-footer">
            <span className="ed-stat-change">
              {((stats?.my_content?.draft_posts / stats?.my_content?.total_posts) * 100 || 0).toFixed(1)}% in progress
            </span>
          </div>
        </div>

        {/* Company Total Card */}
        <div className="ed-stat-card">
          <div className="ed-stat-header">
            <div className="ed-stat-icon ed-company-icon">
              <FolderIcon className="ed-icon" />
            </div>
            <div className="ed-stat-label">Company Total</div>
          </div>
          <div className="ed-stat-value">
            {loading ? <SkeletonStat /> : stats?.content?.total_posts || 0}
          </div>
          <div className="ed-stat-footer">
            <span className="ed-stat-change">
              All posts in your company
            </span>
          </div>
        </div>

        {/* Company Published Card */}
        <div className="ed-stat-card">
          <div className="ed-stat-header">
            <div className="ed-stat-icon ed-company-published-icon">
              <CheckCircleIcon className="ed-icon" />
            </div>
            <div className="ed-stat-label">Company Published</div>
          </div>
          <div className="ed-stat-value">
            {loading ? <SkeletonStat /> : stats?.content?.published_posts || 0}
          </div>
          <div className="ed-stat-footer">
            <span className="ed-stat-change ed-positive">
              {((stats?.content?.published_posts / stats?.content?.total_posts) * 100 || 0).toFixed(1)}% of company content
            </span>
          </div>
        </div>

        {/* Company Drafts Card */}
        <div className="ed-stat-card">
          <div className="ed-stat-header">
            <div className="ed-stat-icon ed-company-draft-icon">
              <PencilSquareIcon className="ed-icon" />
            </div>
            <div className="ed-stat-label">Company Drafts</div>
          </div>
          <div className="ed-stat-value">
            {loading ? <SkeletonStat /> : stats?.content?.draft_posts || 0}
          </div>
          <div className="ed-stat-footer">
            <span className="ed-stat-change">
              {((stats?.content?.draft_posts / stats?.content?.total_posts) * 100 || 0).toFixed(1)}% in progress
            </span>
          </div>
        </div>

        {/* Sections Card */}
        <div className="ed-stat-card">
          <div className="ed-stat-header">
            <div className="ed-stat-icon ed-sections-icon">
              <FolderIcon className="ed-icon" />
            </div>
            <div className="ed-stat-label">Sections</div>
          </div>
          <div className="ed-stat-value">
            {loading ? <SkeletonStat /> : stats?.content?.sections || 0}
          </div>
          <div className="ed-stat-footer">
            <span className="ed-stat-change">
              Content organization
            </span>
          </div>
        </div>

        {/* Categories Card */}
        <div className="ed-stat-card">
          <div className="ed-stat-header">
            <div className="ed-stat-icon ed-categories-icon">
              <TagIcon className="ed-icon" />
            </div>
            <div className="ed-stat-label">Categories</div>
          </div>
          <div className="ed-stat-value">
            {loading ? <SkeletonStat /> : stats?.content?.categories || 0}
          </div>
          <div className="ed-stat-footer">
            <span className="ed-stat-change">
              Content classification
            </span>
          </div>
        </div>
      </div>

      {/* Second Row - Summary Cards */}
      <div className="ed-summary-grid">
        {/* My Content Progress */}
        <div className="ed-summary-card">
          <div className="ed-summary-header">
            <ArrowTrendingUpIcon className="ed-summary-icon" />
            <h3 className="ed-summary-title">My Content Progress</h3>
          </div>
          <div className="ed-summary-content">
            <div className="ed-progress-item">
              <div className="ed-progress-label">
                <span>Published</span>
                <span className="ed-progress-value">{stats?.my_content?.published_posts || 0}</span>
              </div>
              <div className="ed-progress-bar">
                <div 
                  className="ed-progress-fill ed-progress-published" 
                  style={{ width: `${((stats?.my_content?.published_posts || 0) / (stats?.my_content?.total_posts || 1)) * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="ed-progress-item">
              <div className="ed-progress-label">
                <span>Drafts</span>
                <span className="ed-progress-value">{stats?.my_content?.draft_posts || 0}</span>
              </div>
              <div className="ed-progress-bar">
                <div 
                  className="ed-progress-fill ed-progress-draft" 
                  style={{ width: `${((stats?.my_content?.draft_posts || 0) / (stats?.my_content?.total_posts || 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Company Content Overview */}
        <div className="ed-summary-card">
          <div className="ed-summary-header">
            <DocumentTextIcon className="ed-summary-icon" />
            <h3 className="ed-summary-title">Company Content</h3>
          </div>
          <div className="ed-company-stats">
            <div className="ed-company-stat-item">
              <span className="ed-company-stat-label">Your Contribution</span>
              <span className="ed-company-stat-value">
                {((stats?.my_content?.total_posts / stats?.content?.total_posts) * 100 || 0).toFixed(1)}%
              </span>
            </div>
            <div className="ed-company-stat-item">
              <span className="ed-company-stat-label">Published Rate</span>
              <span className="ed-company-stat-value">
                {((stats?.content?.published_posts / stats?.content?.total_posts) * 100 || 0).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="ed-summary-card">
          <div className="ed-summary-header">
            <PencilSquareIcon className="ed-summary-icon" />
            <h3 className="ed-summary-title">Quick Actions</h3>
          </div>
          <div className="ed-quick-actions">
            <button 
              className="ed-quick-action-btn"
              onClick={() => navigate("/content/create")}
            >
              <DocumentTextIcon className="ed-action-icon" />
              <span>Create New Post</span>
            </button>
            <button 
              className="ed-quick-action-btn"
              onClick={() => navigate("/content?status=draft")}
            >
              <PencilSquareIcon className="ed-action-icon" />
              <span>Continue Drafts</span>
            </button>
            <button 
              className="ed-quick-action-btn"
              onClick={() => navigate("/content")}
            >
              <EyeIcon className="ed-action-icon" />
              <span>View All Posts</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="ed-card">
        <div className="ed-card-header">
          <h3 className="ed-card-title">Recent Activity</h3>
          <div className="ed-timeframe-selector">
            <button 
              className={`ed-timeframe-btn ${timeframe === 'week' ? 'active' : ''}`}
              onClick={() => setTimeframe('week')}
            >
              Week
            </button>
            <button 
              className={`ed-timeframe-btn ${timeframe === 'month' ? 'active' : ''}`}
              onClick={() => setTimeframe('month')}
            >
              Month
            </button>
            <button 
              className={`ed-timeframe-btn ${timeframe === 'year' ? 'active' : ''}`}
              onClick={() => setTimeframe('year')}
            >
              Year
            </button>
          </div>
        </div>

        <div className="ed-activity-list">
          {loadingPosts ? (
            <>
              <SkeletonActivity />
              <SkeletonActivity />
              <SkeletonActivity />
            </>
          ) : recentPosts.length > 0 ? (
            recentPosts.map(post => (
              <div key={post.id} className="ed-activity-item">
                <div className="ed-activity-item-content">
                  <div className="ed-activity-item-title">{post.title}</div>
                  <div className="ed-activity-item-meta">
                    <span className={`ed-status-badge-small ${getStatusBadgeClass(post.status)}`}>
                      {post.status}
                    </span>
                    <span className="ed-activity-item-date">
                      <CalendarIcon className="ed-icon-small" />
                      {formatDate(post.created_at)}
                    </span>
                  </div>
                </div>
                <div className="ed-activity-stats">
                  {post.stats && (
                    <>
                      <span className="ed-stat-badge" title="Views">
                        <EyeIcon className="ed-icon-small" />
                        {post.stats.views || 0}
                      </span>
                      <span className="ed-stat-badge" title="Comments">
                        <ChatBubbleLeftIcon className="ed-icon-small" />
                        {post.stats.comments || 0}
                      </span>
                      <span className="ed-stat-badge" title="Likes">
                        <HeartIcon className="ed-icon-small" />
                        {post.stats.likes || 0}
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="ed-empty-state">
              <p>No recent activity</p>
              <p className="ed-empty-sub">Create your first post to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper Components
function SkeletonStat() {
  return <div className="ed-skeleton-stat"></div>;
}

function SkeletonActivity() {
  return (
    <div className="ed-skeleton-activity">
      <div className="ed-skeleton-line"></div>
      <div className="ed-skeleton-line short"></div>
    </div>
  );
}
// Posts.jsx - Optimized for Quick First Load with Unrestricted Actions
import React, { useEffect, useState, useCallback, useMemo, lazy, Suspense } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../api/client";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { 
  Eye, 
  Edit, 
  Trash2, 
  Send, 
  Archive, 
  RotateCcw, 
  Copy, 
  PauseCircle,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Calendar,
  Tag,
  FolderOpen,
  Building2,
  User,
  Clock,
  MessageCircle,
  BarChart3,
  PlusCircle,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  FileText,
  Loader2,
  Heart,
  Share2,
  RefreshCw
} from "lucide-react";

// Lazy load heavy components
const DeleteConfirmDialog = lazy(() => import("../../components/DeleteConfirmDialog"));
const PostViewModal = lazy(() => import("../../components/PostViewModal"));

// Helper function to get image URL with size optimization
const getImageUrl = (imageId, size = 'medium') => {
  if (!imageId) return null;
  const API_BASE = import.meta.env.VITE_API_BASE || "";
  return `${API_BASE}/api/images/${imageId}`;
};

// Format date helper
const formatDate = (dateString) => {
  if (!dateString) return 'Unknown date';
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

// Skeleton Loader Component
const PostCardSkeleton = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
    <div className="h-48 bg-gradient-to-r from-gray-200 to-gray-300"></div>
    <div className="p-5">
      <div className="h-5 bg-gray-200 rounded mb-3 w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded mb-4 w-full"></div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
          <div>
            <div className="h-3 bg-gray-200 rounded w-20 mb-1"></div>
            <div className="h-2 bg-gray-200 rounded w-16"></div>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-6 h-4 bg-gray-200 rounded"></div>
          <div className="w-6 h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
      <div className="flex gap-1">
        <div className="h-4 bg-gray-200 rounded w-12"></div>
        <div className="h-4 bg-gray-200 rounded w-12"></div>
      </div>
    </div>
  </div>
);

// Quick Stats Skeleton
const StatCardSkeleton = () => (
  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-gray-200 rounded-lg w-10 h-10"></div>
      <div>
        <div className="h-3 bg-gray-200 rounded w-16 mb-1"></div>
        <div className="h-5 bg-gray-200 rounded w-12"></div>
      </div>
    </div>
  </div>
);

// Extracted StatCard component for better performance
const StatCard = ({ icon: Icon, label, value, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    gray: 'bg-gray-50 text-gray-600',
    purple: 'bg-purple-50 text-purple-600',
    pink: 'bg-pink-50 text-pink-600',
    red: 'bg-red-50 text-red-600'
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-xl font-semibold text-[#111827]">{value}</p>
        </div>
      </div>
    </div>
  );
};

// Memoized PostCard component with all actions available to all users
const PostCard = React.memo(function PostCard({ 
  post, 
  onPostClick,
  onEdit,
  onDelete,
  onPublish,
  onUnpublish,
  onDuplicate,
  onArchive,
  onRestore,
  onViewLive,
  onToggleLike,
  basePath,
  isSuperAdmin
}) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [showActions, setShowActions] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const navigate = useNavigate();

  const imageUrl = post.cover_image_id ? getImageUrl(post.cover_image_id, 'thumbnail') : null;

  const statusConfig = {
    published: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
    draft: { color: 'bg-yellow-100 text-yellow-700', icon: Edit },
    archived: { color: 'bg-gray-100 text-gray-700', icon: Archive },
    deleted: { color: 'bg-red-100 text-red-700', icon: XCircle }
  };

  const StatusIcon = statusConfig[post.status]?.icon || Edit;

  const handleViewClick = useCallback((e) => {
    e.stopPropagation();
    const postId = post.id || post._id;
    navigate(`${basePath}/content/${postId}`);
  }, [navigate, basePath, post.id, post._id]);

  const handleEditClick = useCallback((e) => {
    e.stopPropagation();
    const postId = post.id || post._id;
    navigate(`${basePath}/content/${postId}`);
  }, [navigate, basePath, post.id, post._id]);

  const handleLikeClick = useCallback(async (e) => {
    e.stopPropagation();
    if (likeLoading) return;
    
    setLikeLoading(true);
    try {
      await onToggleLike(post.id || post._id);
    } catch (error) {
      console.error("Failed to toggle like:", error);
    } finally {
      setLikeLoading(false);
    }
  }, [post.id, post._id, onToggleLike, likeLoading]);

  // All actions available to all users - no role restrictions
  const actions = useMemo(() => {
    const actionsList = [];

    // View action - always available
    actionsList.push({
      icon: Eye,
      title: "View post",
      onClick: handleViewClick,
      color: "text-[#111827]",
      show: true
    });

    // Edit action - always available
    actionsList.push({
      icon: Edit,
      title: "Edit post",
      onClick: handleEditClick,
      color: "text-[#111827]",
      show: true
    });

    // Publish/Unpublish based on status
    if (post.status === "draft") {
      actionsList.push({
        icon: Send,
        title: "Publish post",
        onClick: onPublish,
        color: "text-green-600",
        show: true
      });
    } else if (post.status === "published") {
      actionsList.push({
        icon: PauseCircle,
        title: "Unpublish post",
        onClick: onUnpublish,
        color: "text-orange-600",
        show: true
      });
    }

    // Archive/Restore based on status
    if (post.status !== "archived") {
      actionsList.push({
        icon: Archive,
        title: "Archive post",
        onClick: onArchive,
        color: "text-gray-600",
        show: true
      });
    } else {
      actionsList.push({
        icon: RotateCcw,
        title: "Restore post",
        onClick: onRestore,
        color: "text-purple-600",
        show: true
      });
    }

    // Duplicate - always available
    actionsList.push({
      icon: Copy,
      title: "Duplicate post",
      onClick: onDuplicate,
      color: "text-blue-600",
      show: true
    });

    // Delete - always available
    actionsList.push({
      icon: Trash2,
      title: "Delete post",
      onClick: onDelete,
      color: "text-red-600",
      show: true
    });

    return actionsList;
  }, [post.status, handleViewClick, handleEditClick, onPublish, onUnpublish, onArchive, onRestore, onDuplicate, onDelete]);

  return (
    <motion.div 
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all cursor-pointer flex flex-col h-full"
      onClick={onPostClick}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      layout
    >
      {/* Image Section */}
      <div className="relative h-48 bg-gray-100 flex-shrink-0">
        {imageUrl && !imageError ? (
          <>
            {imageLoading && (
              <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse"></div>
            )}
            <img
              src={imageUrl}
              alt={post.title}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                imageLoading ? 'opacity-0' : 'opacity-100'
              }`}
              loading="lazy"
              onError={() => setImageError(true)}
              onLoad={() => setImageLoading(false)}
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <ImageIcon size={48} className="text-gray-400" />
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig[post.status]?.color || 'bg-gray-100 text-gray-700'}`}>
            <StatusIcon size={12} />
            {post.status?.charAt(0).toUpperCase() + post.status?.slice(1) || 'Draft'}
          </span>
        </div>

        {/* Category Badge */}
        {post.category?.name && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-700">
              <FolderOpen size={12} />
              {post.category.name}
            </span>
          </div>
        )}


        {/* Hover Actions Overlay */}
        <AnimatePresence>
          {showActions && (
            <motion.div 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {actions.map((action, index) => (
                action.show && (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      action.onClick(e);
                    }}
                    className={`w-10 h-10 bg-white rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center ${action.color}`}
                    title={action.title}
                  >
                    <action.icon size={18} />
                  </button>
                )
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Content Section */}
      <div className="p-5 flex flex-col flex-grow">
        {/* Company Tag - Super Admin Only */}
        {isSuperAdmin && post.company_name && (
          <div className="flex mb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold uppercase tracking-wider border border-indigo-100 shadow-sm">
              <Building2 size={13} className="text-indigo-600" />
              {post.company_name}
            </span>
          </div>
        )}

        <h3 className="text-lg font-semibold text-[#111827] mb-2 line-clamp-2 min-h-[3.5rem]">
          {post.title}
        </h3>
        
        {post.subtitle && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[2.5rem]">
            {post.subtitle}
          </p>
        )}

        <div className="flex-grow"></div>

        {/* Footer Section */}
        <div className="mt-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-black flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                {post.author?.name?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#111827] truncate max-w-[120px]">
                  {post.author?.name || 'Anonymous'}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDate(post.published_at || post.created_at)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500 flex-shrink-0">
              {post.stats?.read_time && (
                <span className="flex items-center gap-1" title="Read time">
                  <Clock size={14} />
                  <span>{post.stats.read_time}m</span>
                </span>
              )}
              <span className="flex items-center gap-1" title="Views">
                <Eye size={14} />
                <span>{post.stats?.views?.toLocaleString() || 0}</span>
              </span>
              <span className="flex items-center gap-1" title="Likes">
                <Heart size={14} className={post.liked_by_user ? 'fill-red-500 text-red-500' : ''} />
                <span>{post.stats?.likes || 0}</span>
              </span>
              <span className="flex items-center gap-1" title="Comments">
                <MessageCircle size={14} />
                <span>{post.stats?.comments || 0}</span>
              </span>
            </div>
          </div>

          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {post.tags.slice(0, 3).map(tag => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-xs"
                >
                  #{tag}
                </span>
              ))}
              {post.tags.length > 3 && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-xs">
                  +{post.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

export default function Posts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userRole = user?.role;

  const isSuperAdmin = userRole === "super_admin";
  const isCompanyAdmin = userRole === "company_admin";
  const isEditor = userRole === "editor";
  const isViewer = userRole === "viewer";

  // Data states
  const [companies, setCompanies] = useState([]);
  const [sections, setSections] = useState([]);
  const [categories, setCategories] = useState([]);
  const [posts, setPosts] = useState([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
    archived: 0,
    views: 0,
    likes: 0,
    comments: 0
  });
  const [filteredPosts, setFilteredPosts] = useState([]);
  
  // Loading states
  const [initialLoading, setInitialLoading] = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, postId: null, postTitle: '' });
  const [viewPost, setViewPost] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filter states
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [tagFilter, setTagFilter] = useState("");
  const [availableTags, setAvailableTags] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  
  const POSTS_PER_PAGE = 9;
  
  // Memoized company ID
  const companyId = useMemo(() => {
    if (isSuperAdmin) {
      return selectedCompany || null;
    }
    return user?.company_id || null;
  }, [isSuperAdmin, selectedCompany, user]);

  // Get role-specific base path for navigation
  const getBasePath = useCallback(() => {
    if (isSuperAdmin) return "/super-admin";
    if (isCompanyAdmin) return "/company-admin";
    if (isEditor) return "/editor";
    return "/viewer";
  }, [isSuperAdmin, isCompanyAdmin, isEditor]);

  // Single function to load all data at once
  const loadAllData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setInitialLoading(true);
    }

    try {
      // Create promises array
      const promises = [];
      
      // Create promises map
      const promiseTasks = {};
      
      // 1. Load companies if super admin
      if (isSuperAdmin) {
        promiseTasks.companies = apiFetch("/companies").then(res => {
          const data = res?.companies || [];
          setCompanies(data);
          return data;
        });
      }

      // 2. Load sections if company selected
      if (companyId) {
        promiseTasks.sections = apiFetch(`/sections?company_id=${companyId}`).then(res => {
          const data = res?.sections || [];
          setSections(data);
          return data;
        });
      }

      // 3. Build and load posts
      const postsParams = new URLSearchParams({
        limit: "50",
        ...(companyId && { company_id: companyId }),
        ...(selectedSection && { section: selectedSection }),
        ...(selectedCategory && { category: selectedCategory }),
        ...(filter !== "all" && { status: filter }),
        ...(searchTerm && { search: searchTerm }),
        ...(tagFilter && { tag: tagFilter }),
        ...(dateRange.start && { start_date: dateRange.start }),
        ...(dateRange.end && { end_date: dateRange.end })
      });

      promiseTasks.posts = apiFetch(`/content?${postsParams}`).then(res => {
        return res?.items || [];
      });

      promiseTasks.stats = apiFetch(`/content-stats?${postsParams}`).then(res => {
        if (res) {
          setStats({
            total: res.total || 0,
            published: res.published || 0,
            draft: res.draft || 0,
            archived: res.archived || 0,
            views: res.views || 0,
            likes: res.likes || 0,
            comments: res.comments || 0
          });
        }
        return res;
      });

      // Wait for all promises
      const taskKeys = Object.keys(promiseTasks);
      const taskValues = await Promise.all(Object.values(promiseTasks));
      const results = Object.fromEntries(taskKeys.map((key, i) => [key, taskValues[i]]));
      
      let postsData = results.posts || [];
      const currentCompanies = results.companies || companies;
      
      // Enrich posts with company names
      if (isSuperAdmin && currentCompanies.length > 0) {
        postsData = postsData.map(post => ({
          ...post,
          company_name: currentCompanies.find(c => c.company_id === post.company_id)?.name || "Unknown Company",
        }));
      }
      
      setPosts(postsData);
      
      // Extract tags
      const tags = new Set();
      postsData.forEach(post => {
        post.tags?.forEach(tag => tags.add(tag));
      });
      setAvailableTags(Array.from(tags));

    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setInitialLoading(false);
      setBackgroundLoading(false);
      setRefreshing(false);
    }
  }, [companyId, selectedSection, selectedCategory, filter, searchTerm, isSuperAdmin, selectedCompany]);

  // Load initial data once
  useEffect(() => {
    loadAllData();
  }, []); // Empty dependency array - only run once on mount

  // Load categories when section changes
  useEffect(() => {
    if (selectedSection && companyId) {
      apiFetch(`/categories?company_id=${companyId}&section_slug=${selectedSection}`)
        .then(res => setCategories(res?.categories || []))
        .catch(err => {
          console.error("Failed to load categories");
          setCategories([]);
        });
    } else {
      setCategories([]);
    }
  }, [selectedSection, companyId]);

  // Handle company change
  useEffect(() => {
    if (isSuperAdmin) {
      setSelectedSection('');
      setSelectedCategory('');
      loadAllData(true);
    }
  }, [selectedCompany]);

  // Handle filter changes - debounced
  useEffect(() => {
    const timer = setTimeout(() => {
      // Allow loading if it's super admin (can see all) OR if we have a specific company
      if (isSuperAdmin || companyId) {
        setBackgroundLoading(true);
        loadAllData(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [selectedCompany, selectedSection, selectedCategory, filter, searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedCompany, selectedSection, selectedCategory, filter, searchTerm, tagFilter, dateRange.start, dateRange.end]);

  // Manual refresh function
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadAllData(false);
  }, [loadAllData]);

  // Memoized filtered and sorted posts
  const processedPosts = useMemo(() => {
    let filtered = [...posts];
    
    // Tag filter
    if (tagFilter) {
      filtered = filtered.filter(post => 
        post.tags?.includes(tagFilter)
      );
    }
    
    // Date range filter
    if (dateRange.start) {
      const startDate = new Date(dateRange.start);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(post => {
        const postDate = new Date(post.published_at || post.created_at);
        return postDate >= startDate;
      });
    }
    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(post => {
        const postDate = new Date(post.published_at || post.created_at);
        return postDate <= endDate;
      });
    }
    
    // Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.published_at || a.created_at);
      const dateB = new Date(b.published_at || b.created_at);
      
      switch (sortBy) {
        case "newest":
          return dateB - dateA;
        case "oldest":
          return dateA - dateB;
        case "popular":
          return (b.stats?.views || 0) - (a.stats?.views || 0);
        case "title":
          return (a.title || "").localeCompare(b.title || "");
        case "most_commented":
          return (b.stats?.comments || 0) - (a.stats?.comments || 0);
        case "most_liked":
          return (b.stats?.likes || 0) - (a.stats?.likes || 0);
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [posts, tagFilter, dateRange, sortBy]);

  // Memoized paginated posts
  const paginatedPosts = useMemo(() => {
    const start = (page - 1) * POSTS_PER_PAGE;
    const end = start + POSTS_PER_PAGE;
    return processedPosts.slice(start, end);
  }, [processedPosts, page, POSTS_PER_PAGE]);

  // Memoized total pages
  const totalPages = useMemo(() => 
    Math.ceil(processedPosts.length / POSTS_PER_PAGE), 
    [processedPosts.length, POSTS_PER_PAGE]
  );

  // Toggle like handler
  const handleToggleLike = useCallback(async (postId) => {
    // Optimistic update
    const originalPosts = [...posts];
    setPosts(prev => prev.map(p => {
      if ((p.id || p._id) === postId) {
        const newLiked = !p.liked_by_user;
        return {
          ...p,
          liked_by_user: newLiked,
          stats: {
            ...p.stats,
            likes: (p.stats?.likes || 0) + (newLiked ? 1 : -1)
          }
        };
      }
      return p;
    }));

    try {
      const endpoint = isViewer || !user 
        ? `/public/content/${postId}/like`
        : `/content/${postId}/like`;
      
      const res = await apiFetch(endpoint, { method: "POST" });
      
      if (res.like_count !== undefined) {
        setPosts(prev => prev.map(p => {
          if ((p.id || p._id) === postId) {
            return {
              ...p,
              stats: {
                ...p.stats,
                likes: res.like_count
              }
            };
          }
          return p;
        }));
      }
    } catch (error) {
      setPosts(originalPosts);
      console.error("Failed to toggle like:", error);
      toast.error("Failed to like post");
    }
  }, [posts, isViewer, user]);

  // CRUD Operations
  const handleDelete = useCallback(async (deleteType) => {
    const postId = deleteDialog.postId;
    const originalPosts = [...posts];
    setPosts(prev => prev.filter(p => (p.id || p._id) !== postId));
    setDeleteDialog({ open: false, postId: null, postTitle: '' });

    try {
      await apiFetch(`/content/${postId}`, {
        method: "DELETE",
        params: { permanent: deleteType === 'permanent' }
      });
      
      toast.success(`Post ${deleteType === 'permanent' ? 'permanently deleted' : 'moved to trash'}`);
    } catch (error) {
      setPosts(originalPosts);
      console.error("Failed to delete post:", error);
      toast.error("Failed to delete post");
    }
  }, [deleteDialog.postId, posts]);

  const handlePublish = useCallback(async (postId) => {
    const originalPosts = [...posts];
    setPosts(prev => prev.map(p => 
      (p.id || p._id) === postId 
        ? { ...p, status: 'published', published_at: new Date().toISOString() } 
        : p
    ));

    try {
      await apiFetch(`/content/${postId}/publish`, { method: "PATCH" });
      toast.success("Post published successfully");
    } catch (error) {
      setPosts(originalPosts);
      console.error("Failed to publish post:", error);
      toast.error("Failed to publish post");
    }
  }, [posts]);

  const handleUnpublish = useCallback(async (postId) => {
    const originalPosts = [...posts];
    setPosts(prev => prev.map(p => 
      (p.id || p._id) === postId 
        ? { ...p, status: 'draft' } 
        : p
    ));

    try {
      await apiFetch(`/content/${postId}/unpublish`, { method: "PATCH" });
      toast.success("Post unpublished successfully");
    } catch (error) {
      setPosts(originalPosts);
      console.error("Failed to unpublish post:", error);
      toast.error("Failed to unpublish post");
    }
  }, [posts]);

  const handleDuplicate = useCallback(async (postId) => {
    try {
      await apiFetch(`/content/${postId}/duplicate`, { method: "POST" });
      toast.success("Post duplicated successfully");
      loadAllData(false);
    } catch (error) {
      console.error("Failed to duplicate post:", error);
      toast.error("Failed to duplicate post");
    }
  }, [loadAllData]);

  const handleArchive = useCallback(async (postId) => {
    const originalPosts = [...posts];
    setPosts(prev => prev.map(p => 
      (p.id || p._id) === postId 
        ? { ...p, status: 'archived' } 
        : p
    ));

    try {
      await apiFetch(`/content/${postId}/archive`, { method: "PATCH" });
      toast.success("Post archived successfully");
    } catch (error) {
      setPosts(originalPosts);
      console.error("Failed to archive post:", error);
      toast.error("Failed to archive post");
    }
  }, [posts]);

  const handleRestore = useCallback(async (postId) => {
    const originalPosts = [...posts];
    setPosts(prev => prev.map(p => 
      (p.id || p._id) === postId 
        ? { ...p, status: 'draft' } 
        : p
    ));

    try {
      await apiFetch(`/content/${postId}/restore`, { method: "PATCH" });
      toast.success("Post restored successfully");
    } catch (error) {
      setPosts(originalPosts);
      console.error("Failed to restore post:", error);
      toast.error("Failed to restore post");
    }
  }, [posts]);

  // Navigation handlers
  const handlePostClick = useCallback((postId) => {
    const post = posts.find(p => p.id === postId || p._id === postId);
    if (post) {
      setViewPost(post);
      setShowViewModal(true);
    }
  }, [posts]);

  const handleEditClick = useCallback((e, postId) => {
    e.stopPropagation();
    const basePath = getBasePath();
    navigate(`${basePath}/content/${postId}`);
  }, [getBasePath, navigate]);

  const handleViewLive = useCallback((post) => {
    navigate(`/${post.section?.slug || 'uncategorized'}/${post.category?.slug || 'general'}/${post.slug || post.id}`);
  }, [navigate]);

  // Clear filters
  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedSection('');
    setSelectedCategory('');
    setTagFilter('');
    setFilter('all');
    setDateRange({ start: '', end: '' });
    setSelectedCompany('');
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#111827]">Content Management</h1>
            <p className="text-gray-600 mt-1">
              {isSuperAdmin && "Manage all content across your platform"}
              {isCompanyAdmin && "Manage your company's content"}
              {isEditor && "Create and manage your stories"}
              {isViewer && "View and manage content"}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
            </button>
            
            <button 
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#111827] text-white rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
              onClick={() => navigate(`${getBasePath()}/content/new`)}
            >
              <PlusCircle size={20} />
              New Post
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-8">
          {initialLoading ? (
            [...Array(7)].map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <StatCard icon={BarChart3} label="Total" value={stats.total} color="blue" />
              <StatCard icon={CheckCircle} label="Published" value={stats.published} color="green" />
              <StatCard icon={Edit} label="Drafts" value={stats.draft} color="yellow" />
              <StatCard icon={Archive} label="Archived" value={stats.archived} color="gray" />
              <StatCard icon={Eye} label="Views" value={stats.views.toLocaleString()} color="purple" />
              <StatCard icon={Heart} label="Likes" value={stats.likes.toLocaleString()} color="red" />
              <StatCard icon={MessageCircle} label="Comments" value={stats.comments.toLocaleString()} color="pink" />
            </>
          )}
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-8">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[250px] relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search posts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#111827] focus:border-transparent"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter size={18} />
              Filters
              {(selectedSection || selectedCategory || tagFilter || filter !== 'all' || dateRange.start || dateRange.end) && (
                <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
              )}
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#111827] bg-white"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="popular">Most Viewed</option>
              <option value="most_liked">Most Liked</option>
              <option value="most_commented">Most Commented</option>
              <option value="title">Title A-Z</option>
            </select>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-3 pt-4 mt-4 border-t border-gray-100">
                  {/* Company filter - Super Admin only */}
                  {isSuperAdmin && (
                    <select
                      value={selectedCompany}
                      onChange={(e) => {
                        setSelectedCompany(e.target.value);
                        setSelectedSection('');
                        setSelectedCategory('');
                      }}
                      className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#111827] bg-white min-w-[180px]"
                    >
                      <option value="">All Companies</option>
                      {companies.map(c => (
                        <option key={c.company_id} value={c.company_id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Section filter */}
                  <select
                    disabled={isSuperAdmin && !companyId}
                    value={selectedSection}
                    onChange={(e) => {
                      setSelectedSection(e.target.value);
                      setSelectedCategory('');
                    }}
                    className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#111827] bg-white min-w-[150px]"
                  >
                    <option value="">All Sections</option>
                    {sections.map(section => (
                      <option key={section.slug} value={section.slug}>
                        {section.name}
                      </option>
                    ))}
                  </select>

                  {/* Category filter */}
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#111827] bg-white min-w-[150px]"
                  >
                    <option value="">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat.slug} value={cat.slug}>
                        {cat.name}
                      </option>
                    ))}
                  </select>

                  {/* Tag filter */}
                  {availableTags.length > 0 && (
                    <select
                      value={tagFilter}
                      onChange={(e) => setTagFilter(e.target.value)}
                      className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#111827] bg-white min-w-[150px]"
                    >
                      <option value="">All Tags</option>
                      {availableTags.map(tag => (
                        <option key={tag} value={tag}>
                          #{tag}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Status filter */}
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#111827] bg-white min-w-[140px]"
                  >
                    <option value="all">All Status</option>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>

                  {/* Date range filters */}
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                      className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#111827]"
                      placeholder="From"
                    />
                    <span className="text-gray-400">to</span>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                      className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#111827]"
                      placeholder="To"
                    />
                  </div>

                  {/* Clear filters button */}
                  {(searchTerm || selectedSection || selectedCategory || tagFilter || filter !== 'all' || dateRange.start || dateRange.end || selectedCompany) && (
                    <button
                      onClick={clearFilters}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-[#111827] hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Posts Grid */}
        {initialLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => <PostCardSkeleton key={i} />)}
          </div>
        ) : paginatedPosts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedPosts.map((post) => (
                <PostCard
                  key={post.id || post._id}
                  post={post}
                  onPostClick={() => handlePostClick(post.id || post._id)}
                  onEdit={(e) => handleEditClick(e, post.id || post._id)}
                  onDelete={() => setDeleteDialog({ 
                    open: true, 
                    postId: post.id || post._id,
                    postTitle: post.title 
                  })}
                  onPublish={() => handlePublish(post.id || post._id)}
                  onUnpublish={() => handleUnpublish(post.id || post._id)}
                  onDuplicate={() => handleDuplicate(post.id || post._id)}
                  onArchive={() => handleArchive(post.id || post._id)}
                  onRestore={() => handleRestore(post.id || post._id)}
                  onViewLive={() => handleViewLive(post)}
                  onToggleLike={handleToggleLike}
                  basePath={getBasePath()}
                  isSuperAdmin={isSuperAdmin}
                />
              ))}
            </div>

            {/* Background loading indicator */}
            {backgroundLoading && (
              <div className="flex justify-center mt-4">
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-sm">Updating...</span>
                </div>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>

                <div className="flex items-center gap-1">
                  {[...Array(totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    if (
                      totalPages > 7 &&
                      pageNum > 3 &&
                      pageNum < totalPages - 2 &&
                      pageNum !== page &&
                      pageNum !== page - 1 &&
                      pageNum !== page + 1
                    ) {
                      if (pageNum === 4 || pageNum === totalPages - 3) {
                        return <span key={i} className="px-2">...</span>;
                      }
                      return null;
                    }
                    
                    return (
                      <button
                        key={i}
                        onClick={() => setPage(pageNum)}
                        className={`w-10 h-10 rounded-lg transition-colors ${
                          pageNum === page 
                            ? 'bg-[#111827] text-white' 
                            : 'hover:bg-gray-50 border border-gray-200'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText size={32} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-[#111827] mb-2">No posts found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm 
                ? "Try adjusting your search or filters" 
                : "Get started by creating your first post"}
            </p>
            {!searchTerm && filter === "all" && !selectedSection && !selectedCategory && (
              <button 
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#111827] text-white rounded-lg hover:bg-gray-800 transition-colors"
                onClick={() => navigate(`${getBasePath()}/content/new`)}
              >
                <PlusCircle size={20} />
                Create Your First Post
              </button>
            )}
          </div>
        )}

        {/* Lazy loaded modals */}
        <Suspense fallback={null}>
          <DeleteConfirmDialog
            isOpen={deleteDialog.open}
            onClose={() => setDeleteDialog({ open: false, postId: null, postTitle: '' })}
            onConfirm={handleDelete}
            postTitle={deleteDialog.postTitle}
            canPermanentDelete={true} // Allow permanent delete for all users
          />
        </Suspense>

        <Suspense fallback={null}>
          <PostViewModal
            isOpen={showViewModal}
            onClose={() => setShowViewModal(false)}
            post={viewPost}
            userRole={userRole}
            onEdit={(postId) => {
              setShowViewModal(false);
              const rolePrefix = getRolePrefix();
              navigate(`/${rolePrefix}/content/${postId}`);
            }}
            onToggleLike={handleToggleLike}
          />
        </Suspense>
      </div>
    </div>
  );
}
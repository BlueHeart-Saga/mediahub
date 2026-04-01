// PostViewModal.jsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Eye, 
  Clock, 
  MessageCircle, 
  User,
  Calendar,
  FolderOpen,
  Tag,
  ThumbsUp,
  Send,
  Edit,
  Building2,
  ExternalLink,
  FileText,
  Play,
  Link2,
  Quote as QuoteIcon,
  Code,
  List,
  Hash,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  Heart,
  Share2
} from "lucide-react";
import { apiFetch } from "../api/client";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const getImageUrl = (imageId) => {
  if (!imageId) return null;
  const API_BASE = import.meta.env.VITE_API_BASE || "";
  return `${API_BASE}/api/images/${imageId}`;
};

const getDocumentUrl = (documentId) => {
  if (!documentId) return null;
  const API_BASE = import.meta.env.VITE_API_BASE || "";
  return `${API_BASE}/api/documents/${documentId}`;
};

export default function PostViewModal({ isOpen, onClose, post, userRole, onEdit, onToggleLike }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fullPost, setFullPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [liking, setLiking] = useState(false);

  const isViewer = userRole === "viewer";
  const isEditor = userRole === "editor";
  const isCompanyAdmin = userRole === "company_admin";
  const isSuperAdmin = userRole === "super_admin";

  // All users can comment except viewers (if you want viewers to comment, change this)
  const canComment = !isViewer;
  // All users can edit - no restrictions
  const canEdit = true;

  useEffect(() => {
    if (isOpen && post) {
      loadFullPost();
      loadComments();
    }
  }, [isOpen, post]);

  const loadFullPost = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/content/${post.id || post._id}`);
      setFullPost(res?.item || res);
    } catch (error) {
      console.error("Failed to load post details:", error);
      toast.error("Failed to load post details");
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const res = await apiFetch(`/content/${post.id || post._id}/comments?limit=20`);
      setComments(res?.items || []);
    } catch (error) {
      console.error("Failed to load comments:", error);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      setSubmittingComment(true);
      await apiFetch(`/content/${post.id || post._id}/comments`, {
        method: "POST",
        body: JSON.stringify({ text: commentText })
      });
      setCommentText("");
      loadComments();
      toast.success("Comment added successfully");
    } catch (error) {
      console.error("Failed to add comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleLikeComment = async (commentId) => {
    try {
      await apiFetch(`/comments/${commentId}/like`, {
        method: "POST"
      });
      loadComments();
    } catch (error) {
      console.error("Failed to like comment:", error);
      toast.error("Failed to like comment");
    }
  };

  const handlePostLike = async () => {
    if (liking) return;
    
    setLiking(true);
    try {
      await onToggleLike(fullPost.id || fullPost._id);
      // Update local state to reflect new like status
      setFullPost(prev => ({
        ...prev,
        liked_by_user: !prev.liked_by_user,
        stats: {
          ...prev.stats,
          likes: prev.liked_by_user ? (prev.stats?.likes || 0) - 1 : (prev.stats?.likes || 0) + 1
        }
      }));
    } catch (error) {
      console.error("Failed to like post:", error);
    } finally {
      setLiking(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.origin + `/content/${post.id || post._id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: fullPost?.title || 'Check out this post',
          text: fullPost?.subtitle || '',
          url: url
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      // Fallback to copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy:', err);
        toast.error('Failed to copy link');
      }
    }
  };

  const handleEditClick = () => {
    const contentId = post.id || post._id;

    // Convert role format
    const roleRoutes = {
      super_admin: "super-admin",
      company_admin: "company-admin",
      editor: "editor",
      viewer: "viewer"
    };

    onClose();
    navigate(`/${roleRoutes[userRole]}/content/${contentId}`);
  };

  const handleViewLive = () => {
  const contentId = fullPost?.id || fullPost?._id || post?.id || post?._id;

  if (!contentId) {
    toast.error("Invalid content ID");
    return;
  }

  window.open(`/content/${contentId}`, "_blank");
};

  const renderBlock = (block) => {
    switch (block.type) {
      case 'heading':
        return (
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-[#111827]">{block.data.value}</h1>
          </div>
        );

      case 'subheading':
        return (
          <div className="mb-3">
            <h2 className="text-2xl font-semibold text-[#111827]">{block.data.value}</h2>
          </div>
        );

      case 'text':
        return (
          <div className="mb-4">
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{block.data.value}</p>
          </div>
        );

      case 'image':
        return (
          <div className="my-6">
            <div className="rounded-lg overflow-hidden shadow-lg bg-gray-100">
              <img 
                src={block.data.file_id ? getImageUrl(block.data.file_id) : block.data.url}
                alt={block.data.alt || block.data.caption || 'Post image'}
                className="w-full h-auto"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://via.placeholder.com/800x400?text=Image+Not+Found';
                }}
              />
            </div>
            {block.data.caption && (
              <p className="text-sm text-gray-500 mt-2 text-center italic">{block.data.caption}</p>
            )}
            {block.data.alt && block.data.alt !== block.data.caption && (
              <p className="text-xs text-gray-400 mt-1 text-center">Alt: {block.data.alt}</p>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="my-6">
            <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-lg overflow-hidden">
              {block.data.embed_url ? (
                <iframe
                  src={block.data.embed_url}
                  title={block.data.caption || 'Video content'}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Play className="w-12 h-12 text-gray-400" />
                  <a 
                    href={block.data.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 hover:underline"
                  >
                    Watch Video
                  </a>
                </div>
              )}
            </div>
            {block.data.caption && (
              <p className="text-sm text-gray-500 mt-2 text-center">{block.data.caption}</p>
            )}
          </div>
        );

      case 'embed':
        return (
          <div className="my-6">
            <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-lg overflow-hidden">
              {block.data.embed_url ? (
                <iframe
                  src={block.data.embed_url}
                  title={block.data.caption || 'Embedded content'}
                  className="w-full h-full"
                  allowFullScreen
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Link2 className="w-12 h-12 text-gray-400" />
                  <a 
                    href={block.data.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 hover:underline"
                  >
                    View Content
                  </a>
                </div>
              )}
            </div>
            {block.data.caption && (
              <p className="text-sm text-gray-500 mt-2 text-center">{block.data.caption}</p>
            )}
          </div>
        );

      case 'document':
        return (
          <div className="my-6">
            <a
              href={block.data.file_id ? getDocumentUrl(block.data.file_id) : block.data.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg hover:from-blue-100 hover:to-indigo-100 transition-colors border border-blue-200"
            >
              <div className="flex items-center">
                <div className="bg-blue-500 rounded-lg p-3 mr-4">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-[#111827] mb-1">
                    {block.data.title || 'Document'}
                  </h3>
                  {block.data.description && (
                    <p className="text-sm text-gray-600 mb-2">{block.data.description}</p>
                  )}
                  <div className="flex items-center text-sm text-gray-500">
                    <span className="flex items-center mr-4">
                      <FileText className="w-4 h-4 mr-1" />
                      PDF Document
                    </span>
                    {block.data.size && (
                      <span>{(block.data.size / 1024 / 1024).toFixed(2)} MB</span>
                    )}
                  </div>
                </div>
                <ExternalLink className="w-5 h-5 text-blue-500 ml-4" />
              </div>
            </a>
          </div>
        );

      case 'quote':
        return (
          <div className="my-6">
            <blockquote className="relative pl-6 border-l-4 border-[#111827]">
              <QuoteIcon className="absolute -left-2 -top-2 w-6 h-6 text-gray-300" />
              <p className="text-gray-700 italic text-lg leading-relaxed">"{block.data.value}"</p>
              {block.data.author && (
                <cite className="text-sm text-gray-500 mt-2 block not-italic">— {block.data.author}</cite>
              )}
            </blockquote>
          </div>
        );

      case 'pull-quote':
        return (
          <div className="my-8">
            <aside className="bg-gray-50 p-8 rounded-lg text-center">
              <QuoteIcon className="w-8 h-8 text-gray-400 mx-auto mb-4" />
              <p className="text-xl font-medium text-[#111827] italic">"{block.data.value}"</p>
            </aside>
          </div>
        );

      case 'code':
        return (
          <div className="my-6">
            <div className="bg-gray-900 rounded-lg overflow-hidden">
              <div className="bg-gray-800 px-4 py-2 text-xs text-gray-400 font-mono border-b border-gray-700">
                {block.data.language || 'code'}
              </div>
              <pre className="p-4 overflow-x-auto">
                <code className={`language-${block.data.language || 'text'} text-sm text-gray-100 font-mono`}>
                  {block.data.value}
                </code>
              </pre>
            </div>
          </div>
        );

      case 'bullet-list':
        return (
          <div className="my-4">
            <ul className="space-y-2">
              {block.data.items?.map((item, i) => (
                <li key={i} className="flex items-start text-gray-600">
                  <span className="inline-block w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        );

      case 'numbered-list':
        return (
          <div className="my-4">
            <ol className="space-y-2 list-decimal list-inside">
              {block.data.items?.map((item, i) => (
                <li key={i} className="text-gray-600">
                  <span className="ml-1">{item}</span>
                </li>
              ))}
            </ol>
          </div>
        );

      case 'cta':
        return (
          <div className="my-8 text-center">
            <a 
              href={block.data.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 px-8 py-4 rounded-lg font-medium transition-all transform hover:scale-105 ${
                block.data.style === 'primary' 
                  ? 'bg-[#111827] text-white hover:bg-gray-800 shadow-lg' 
                  : block.data.style === 'secondary'
                  ? 'bg-gray-200 text-[#111827] hover:bg-gray-300'
                  : 'border-2 border-[#111827] text-[#111827] hover:bg-[#111827] hover:text-white'
              }`}
            >
              {block.data.label}
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        );

      case 'divider':
        return (
          <div className="my-8">
            <hr className="border-gray-200" />
          </div>
        );

      case 'callout':
        const calloutStyles = {
          info: 'bg-blue-50 border-blue-200 text-blue-800',
          warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
          success: 'bg-green-50 border-green-200 text-green-800',
          note: 'bg-gray-50 border-gray-200 text-gray-800'
        };
        
        const calloutIcons = {
          info: <Info className="w-5 h-5" />,
          warning: <AlertTriangle className="w-5 h-5" />,
          success: <CheckCircle className="w-5 h-5" />,
          note: <AlertCircle className="w-5 h-5" />
        };

        return (
          <div className={`my-6 p-4 rounded-lg border ${calloutStyles[block.data.type] || calloutStyles.note}`}>
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-3">
                {calloutIcons[block.data.type] || calloutIcons.note}
              </div>
              <div className="flex-1">
                <p className="leading-relaxed">{block.data.value}</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div 
          className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="text-2xl font-bold text-[#111827] line-clamp-1">{post?.title}</h2>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center flex-shrink-0"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-[#111827] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : fullPost ? (
              <div className="space-y-6">
                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-black flex items-center justify-center text-white text-sm font-medium">
                      {fullPost.author?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <span className="font-medium">{fullPost.author?.name || 'Anonymous'}</span>
                  </div>
                  
                  <span className="flex items-center gap-1">
                    <Calendar size={16} />
                    {new Date(fullPost.published_at || fullPost.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>

                  <span className="flex items-center gap-1">
                    <Eye size={16} />
                    {fullPost.stats?.views?.toLocaleString() || 0} views
                  </span>

                  <span className="flex items-center gap-1">
                    <Heart 
                      size={16} 
                      className={fullPost.liked_by_user ? 'fill-red-500 text-red-500' : ''} 
                    />
                    {fullPost.stats?.likes || 0} likes
                  </span>

                  <span className="flex items-center gap-1">
                    <MessageCircle size={16} />
                    {fullPost.stats?.comments || 0} comments
                  </span>

                  <span className="flex items-center gap-1">
                    <Clock size={16} />
                    {fullPost.stats?.read_time || 1} min read
                  </span>

                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    fullPost.status === 'published' 
                      ? 'bg-green-100 text-green-800' 
                      : fullPost.status === 'draft'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {fullPost.status}
                  </span>
                </div>

                {/* Company/Section/Category Info */}
                <div className="flex flex-wrap gap-2">
                  {fullPost.company_name && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#111827] text-white rounded-full text-xs">
                      <Building2 size={12} />
                      {fullPost.company_name}
                    </span>
                  )}
                  {fullPost.section?.name && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                      <FolderOpen size={12} />
                      {fullPost.section.name}
                    </span>
                  )}
                  {fullPost.category?.name && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                      <Tag size={12} />
                      {fullPost.category.name}
                    </span>
                  )}
                </div>

                {/* Tags */}
                {fullPost.tags && fullPost.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {fullPost.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Cover Image */}
                {fullPost.cover_image_id && (
                  <div className="rounded-lg overflow-hidden shadow-lg">
                    <img 
                      src={getImageUrl(fullPost.cover_image_id)} 
                      alt={fullPost.title}
                      className="w-full h-auto"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/1200x600?text=Cover+Image+Not+Found';
                      }}
                    />
                  </div>
                )}

                {/* Subtitle */}
                {fullPost.subtitle && (
                  <div className="text-xl text-gray-600 italic border-l-4 border-gray-200 pl-4">
                    {fullPost.subtitle}
                  </div>
                )}

                {/* Content Blocks */}
                <div className="space-y-4">
                  {fullPost.blocks?.map((block, index) => (
                    <div key={block.id || index}>
                      {renderBlock(block)}
                    </div>
                  ))}
                </div>

                {/* Like and Share Buttons */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={handlePostLike}
                    disabled={liking}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Heart 
                      size={18} 
                      className={fullPost.liked_by_user ? 'fill-red-500 text-red-500' : 'text-gray-600'} 
                    />
                    <span className="text-sm font-medium">
                      {fullPost.liked_by_user ? 'Liked' : 'Like'}
                    </span>
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Share2 size={18} />
                    <span className="text-sm font-medium">Share</span>
                  </button>
                </div>

                {/* Comments Section */}
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <h3 className="text-lg font-semibold text-[#111827] mb-4">
                    Comments ({comments.length})
                  </h3>

                  {canComment && (
                    <form onSubmit={handleAddComment} className="mb-6">
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Write a comment..."
                        rows="3"
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#111827] focus:border-transparent resize-none"
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          type="submit"
                          disabled={submittingComment || !commentText.trim()}
                          className="flex items-center gap-2 px-4 py-2 bg-[#111827] text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {submittingComment ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Posting...
                            </>
                          ) : (
                            <>
                              <Send size={16} />
                              Post Comment
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-4">
                    {comments.length > 0 ? (
                      comments.map(comment => (
                        <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-black flex items-center justify-center text-white text-xs font-medium">
                                {comment.author?.name?.charAt(0)?.toUpperCase() || 'U'}
                              </div>
                              <span className="text-sm font-medium text-[#111827]">
                                {comment.author?.name || 'Anonymous'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(comment.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          
                          <p className="text-gray-600 text-sm mb-3 whitespace-pre-wrap">{comment.text}</p>
                          
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleLikeComment(comment.id)}
                              className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#111827] transition-colors"
                            >
                              <ThumbsUp size={14} />
                              {comment.likes || 0}
                            </button>
                          </div>

                          {/* Replies */}
                          {comment.replies && comment.replies.length > 0 && (
                            <div className="mt-3 ml-6 space-y-3">
                              {comment.replies.map(reply => (
                                <div key={reply.id} className="bg-white rounded-lg p-3 border border-gray-200">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-black flex items-center justify-center text-white text-xs font-medium">
                                      {reply.author?.name?.charAt(0)?.toUpperCase() || 'U'}
                                    </div>
                                    <span className="text-xs font-medium text-[#111827]">
                                      {reply.author?.name || 'Anonymous'}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {new Date(reply.created_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600">{reply.text}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-gray-500 py-4">No comments yet. Be the first to comment!</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                Failed to load post
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-100">
            <div className="flex items-center gap-2">
              {/* Live View Button - Only for published posts */}
              {fullPost?.status === 'published' && (
                <button
                  onClick={handleViewLive}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Eye size={16} />
                  View Live
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {/* Edit Button - Available to all users */}
              <button
                onClick={handleEditClick}
                className="flex items-center gap-2 px-4 py-2 bg-[#111827] text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Edit size={16} />
                Edit Post
              </button>
              
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-[#111827] hover:bg-gray-100 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
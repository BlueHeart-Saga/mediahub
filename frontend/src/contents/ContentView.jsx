// ContentView.jsx - Fixed version
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { 
  Calendar, 
  Eye, 
  Clock, 
  User, 
  Tag, 
  FolderOpen,
  Share2,
  ThumbsUp,
  MessageCircle,
  ArrowLeft,
  Facebook,
  Twitter,
  Linkedin,
  Link2,
  Check,
  FileText,
  Quote as QuoteIcon,
  Play,
  Info,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Home,
  Menu,
  X,
  Building2,
  ChevronRight,
  Heart
} from "lucide-react";
import { publicFetch } from "../api/publicClient";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

// Helper functions
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

const formatDate = (dateString) => {
  if (!dateString) return '';
  const options = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

export default function ContentView() {
  const { contentId, companyId, sectionSlug, categorySlug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [relatedContent, setRelatedContent] = useState([]);

  // Log params for debugging
  useEffect(() => {
    console.log('URL Params:', { contentId, companyId, sectionSlug, categorySlug });
  }, [contentId, companyId, sectionSlug, categorySlug]);

  // Determine the API endpoint based on URL pattern
  const getApiEndpoint = () => {
    if (!contentId) {
      console.error('No contentId provided in URL');
      return null;
    }
    
    // If we have companyId in the URL, use company-scoped endpoint
    if (companyId) {
      return `/public/${companyId}/content/${contentId}`;
    }
    // Otherwise use direct content endpoint
    return `/public/content/${contentId}`;
  };

  const getCommentsEndpoint = () => {
    if (!contentId) return null;
    // Comments should use the public endpoint
    return `/public/content/${contentId}/comments`;
  };

  useEffect(() => {
    if (contentId) {
      loadContent();
      loadComments();
      window.scrollTo(0, 0);
    } else {
      console.error('No contentId provided in URL');
      setError('Invalid content URL');
      setLoading(false);
    }
  }, [contentId, companyId]); // Re-fetch if contentId or companyId changes

  useEffect(() => {
    if (content) {
      loadRelatedContent();
    }
  }, [content]);

  const loadContent = async () => {
    try {
      setLoading(true);
      const endpoint = getApiEndpoint();
      
      if (!endpoint) {
        throw new Error('Invalid content endpoint');
      }
      
      console.log('Fetching content from:', endpoint);
      
      const res = await publicFetch(endpoint);
      console.log('Content response:', res);
      
      const contentData = res?.item || res;
      setContent(contentData);
      setLikeCount(contentData?.stats?.likes || 0);
      
      // Check if user liked this content (if authenticated)
      if (contentData?.liked_by_user !== undefined) {
        setLiked(contentData.liked_by_user);
      }
    } catch (error) {
      console.error("Failed to load content:", error);
      setError("Content not found or unavailable");
      toast.error("Failed to load content");
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const endpoint = getCommentsEndpoint();
      if (!endpoint) return;
      
      console.log('Fetching comments from:', endpoint);
      const res = await publicFetch(endpoint);
      setComments(res?.items || []);
    } catch (error) {
      console.error("Failed to load comments:", error);
      // Don't show error toast for comments failure
    }
  };

  const loadRelatedContent = async () => {
    try {
      if (!content?.company_id) return;
      
      const endpoint = content.section?.slug 
        ? `/public/${content.company_id}/content?section_slug=${content.section.slug}&limit=3`
        : `/public/${content.company_id}/content?limit=3`;
      
      const res = await publicFetch(endpoint);
      const filtered = (res.items || []).filter(item => item.id !== contentId);
      setRelatedContent(filtered.slice(0, 3));
    } catch (error) {
      console.error("Failed to load related content:", error);
    }
  };

  const handleShare = async (platform) => {
    const url = window.location.href;
    const title = content?.title || "Check out this article";
    
    let shareUrl = "";
    switch(platform) {
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
        break;
      case "linkedin":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
      case "copy":
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          toast.success("Link copied to clipboard!");
        } catch (err) {
          toast.error("Failed to copy link");
        }
        return;
      default:
        return;
    }
    
    if (shareUrl) {
      window.open(shareUrl, "_blank", "width=600,height=400");
    }
    setShowShareMenu(false);
  };

  const handleLike = async () => {
    try {
      if (!contentId) return;
      
      const endpoint = companyId 
        ? `/public/${companyId}/content/${contentId}/like`
        : `/public/content/${contentId}/like`;
      
      await publicFetch(endpoint, { method: "POST" });
      setLiked(!liked);
      setLikeCount(prev => liked ? prev - 1 : prev + 1);
      toast.success(liked ? "Removed like" : "Added like");
    } catch (error) {
      console.error("Failed to like content:", error);
      toast.error("Failed to process like");
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !contentId) return;

    try {
      setSubmittingComment(true);
      const endpoint = getCommentsEndpoint();
      if (!endpoint) return;
      
      await publicFetch(endpoint, {
        method: "POST",
        body: JSON.stringify({ text: commentText })
      });
      setCommentText("");
      loadComments();
      toast.success("Comment added");
    } catch (error) {
      console.error("Failed to add comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleLikeComment = async (commentId) => {
    try {
      await publicFetch(`/public/comments/${commentId}/like`, { method: "POST" });
      loadComments();
    } catch (error) {
      console.error("Failed to like comment:", error);
    }
  };

 

 

  const renderBlock = (block, index) => {
    switch (block.type) {
      case 'heading':
        return (
          <motion.div
            key={block.id || index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="mb-6"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-[#111827] leading-tight">
              {block.data.value}
            </h1>
          </motion.div>
        );

      case 'subheading':
        return (
          <motion.div
            key={block.id || index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="mb-4"
          >
            <h2 className="text-2xl md:text-3xl font-semibold text-[#111827]">
              {block.data.value}
            </h2>
          </motion.div>
        );

      case 'text':
        return (
          <motion.div
            key={block.id || index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="mb-6"
          >
            <p className="text-gray-600 leading-relaxed text-lg whitespace-pre-wrap">
              {block.data.value}
            </p>
          </motion.div>
        );

      case 'image':
        return (
          <motion.div
            key={block.id || index}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="my-8"
          >
            <figure className="space-y-3">
              <div className="rounded-xl overflow-hidden shadow-lg bg-gray-100">
                <img 
                  src={block.data.file_id ? getImageUrl(block.data.file_id) : block.data.url}
                  alt={block.data.alt || block.data.caption || 'Content image'}
                  className="w-full h-auto hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/1200x800?text=Image+Not+Available';
                  }}
                />
              </div>
              {block.data.caption && (
                <figcaption className="text-center text-sm text-gray-500 italic">
                  {block.data.caption}
                </figcaption>
              )}
            </figure>
          </motion.div>
        );

      case 'video':
        return (
          <motion.div
            key={block.id || index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="my-8"
          >
            <div className="aspect-w-16 aspect-h-9 bg-gray-900 rounded-xl overflow-hidden shadow-xl">
              {block.data.embed_url ? (
                <iframe
                  src={block.data.embed_url}
                  title={block.data.caption || 'Video content'}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-900 to-[#111827]">
                  <div className="text-center">
                    <Play className="w-16 h-16 text-white/50 mx-auto mb-4" />
                    <a 
                      href={block.data.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-gray-300 transition-colors text-lg font-medium"
                    >
                      Click to watch video
                    </a>
                  </div>
                </div>
              )}
            </div>
            {block.data.caption && (
              <p className="text-center text-sm text-gray-500 mt-3 italic">{block.data.caption}</p>
            )}
          </motion.div>
        );

      case 'embed':
        return (
          <motion.div
            key={block.id || index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="my-8"
          >
            <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-xl overflow-hidden shadow-xl">
              {block.data.embed_url ? (
                <iframe
                  src={block.data.embed_url}
                  title={block.data.caption || 'Embedded content'}
                  className="w-full h-full"
                  allowFullScreen
                  loading="lazy"
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-50">
                  <a 
                    href={block.data.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#111827] hover:text-gray-600 flex items-center gap-2 text-lg"
                  >
                    <ExternalLink className="w-5 h-5" />
                    View External Content
                  </a>
                </div>
              )}
            </div>
            {block.data.caption && (
              <p className="text-center text-sm text-gray-500 mt-3 italic">{block.data.caption}</p>
            )}
          </motion.div>
        );

      case 'document':
        return (
          <motion.div
            key={block.id || index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="my-8"
          >
            <a
              href={block.data.file_id ? getDocumentUrl(block.data.file_id) : block.data.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block group"
            >
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border-2 border-gray-200 hover:border-[#111827] transition-all hover:shadow-xl">
                <div className="flex items-center">
                  <div className="bg-[#111827] rounded-xl p-4 mr-5 group-hover:scale-110 transition-transform">
                    <FileText className="w-10 h-10 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-[#111827] mb-2 group-hover:text-[#111827] transition-colors">
                      {block.data.title || 'Document'}
                    </h3>
                    {block.data.description && (
                      <p className="text-gray-600 mb-2">{block.data.description}</p>
                    )}
                    <div className="flex items-center text-sm text-gray-500">
                      <FileText className="w-4 h-4 mr-1" />
                      <span className="mr-4">PDF Document</span>
                      {block.data.size && (
                        <span>{(block.data.size / 1024 / 1024).toFixed(2)} MB</span>
                      )}
                    </div>
                  </div>
                  <ExternalLink className="w-6 h-6 text-[#111827] ml-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </a>
          </motion.div>
        );

      case 'quote':
        return (
          <motion.div
            key={block.id || index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="my-8"
          >
            <blockquote className="relative pl-8 border-l-4 border-[#111827]">
              <QuoteIcon className="absolute -left-2 -top-2 w-8 h-8 text-gray-200" />
              <p className="text-xl text-gray-700 italic leading-relaxed">"{block.data.value}"</p>
              {block.data.author && (
                <cite className="text-gray-500 mt-3 block not-italic">— {block.data.author}</cite>
              )}
            </blockquote>
          </motion.div>
        );

      case 'pull-quote':
        return (
          <motion.div
            key={block.id || index}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="my-12"
          >
            <div className="bg-gray-50 p-8 rounded-2xl text-center">
              <QuoteIcon className="w-10 h-10 text-gray-400 mx-auto mb-4" />
              <p className="text-2xl font-medium text-[#111827] italic">"{block.data.value}"</p>
            </div>
          </motion.div>
        );

      case 'code':
        return (
          <motion.div
            key={block.id || index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="my-8"
          >
            <div className="bg-[#111827] rounded-xl overflow-hidden shadow-xl">
              <div className="bg-gray-800 px-4 py-2 text-xs text-gray-400 font-mono border-b border-gray-700">
                {block.data.language || 'code'}
              </div>
              <pre className="p-5 overflow-x-auto">
                <code className={`language-${block.data.language || 'text'} text-sm text-gray-100 font-mono block`}>
                  {block.data.value}
                </code>
              </pre>
            </div>
          </motion.div>
        );

      case 'bullet-list':
        return (
          <motion.div
            key={block.id || index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="my-6"
          >
            <ul className="space-y-3">
              {block.data.items?.map((item, i) => (
                <li key={i} className="flex items-start text-gray-600 text-lg">
                  <span className="inline-block w-2 h-2 bg-[#111827] rounded-full mt-3 mr-3 flex-shrink-0"></span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        );

      case 'numbered-list':
        return (
          <motion.div
            key={block.id || index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="my-6"
          >
            <ol className="space-y-3 list-decimal list-inside">
              {block.data.items?.map((item, i) => (
                <li key={i} className="text-gray-600 text-lg">
                  <span className="ml-1">{item}</span>
                </li>
              ))}
            </ol>
          </motion.div>
        );

      case 'cta':
        return (
          <motion.div
            key={block.id || index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="my-10 text-center"
          >
            <a 
              href={block.data.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 hover:shadow-xl ${
                block.data.style === 'primary' 
                  ? 'bg-[#111827] text-white hover:bg-gray-900' 
                  : block.data.style === 'secondary'
                  ? 'bg-gray-200 text-[#111827] hover:bg-gray-300'
                  : 'border-2 border-[#111827] text-[#111827] hover:bg-[#111827] hover:text-white'
              }`}
            >
              {block.data.label}
              <ExternalLink className="w-5 h-5" />
            </a>
          </motion.div>
        );

      case 'divider':
        return (
          <motion.div
            key={block.id || index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.05 }}
            className="my-10"
          >
            <hr className="border-t-2 border-gray-200" />
          </motion.div>
        );

      case 'callout':
        const calloutStyles = {
          info: 'bg-blue-50 border-blue-200 text-blue-800',
          warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
          success: 'bg-green-50 border-green-200 text-green-800',
          note: 'bg-gray-50 border-gray-200 text-[#111827]'
        };
        
        const calloutIcons = {
          info: <Info className="w-6 h-6" />,
          warning: <AlertTriangle className="w-6 h-6" />,
          success: <CheckCircle className="w-6 h-6" />,
          note: <AlertCircle className="w-6 h-6" />
        };

        return (
          <motion.div
            key={block.id || index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`my-6 p-5 rounded-xl border-2 ${calloutStyles[block.data.type] || calloutStyles.note}`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-4">
                {calloutIcons[block.data.type] || calloutIcons.note}
              </div>
              <div className="flex-1">
                <p className="text-lg leading-relaxed">{block.data.value}</p>
              </div>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#111827] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading content...</p>
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-4">📄</div>
          <h1 className="text-2xl font-bold text-[#111827] mb-2">Content Not Found</h1>
          <p className="text-gray-600 mb-6">The content you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#111827] text-white rounded-xl hover:bg-gray-900 transition-colors"
          >
            <Home className="w-5 h-5" />
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Simple Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#111827] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">C</span>
              </div>
              <span className="font-semibold text-[#111827]">MediaHub</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              <Link to="/" className="text-gray-600 hover:text-[#111827] transition-colors">
                Home
              </Link>
              <Link to="/companies" className="text-gray-600 hover:text-[#111827] transition-colors">
                Companies
              </Link>
              <Link to="/" className="text-gray-600 hover:text-[#111827] transition-colors">
                About
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-3 space-y-2">
              <Link 
                to="/" 
                className="block px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                to="/companies" 
                className="block px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                Companies
              </Link>
              <Link 
                to="/about" 
                className="block px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                About
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Breadcrumb Navigation */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm py-3">
            <Link to="/" className="text-gray-500 hover:text-[#111827] transition-colors">
              <Home className="w-4 h-4" />
            </Link>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <Link to="/companies" className="text-gray-500 hover:text-[#111827] transition-colors">
              Companies
            </Link>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            {content.company_id && (
              <>
                <Link 
                  to={`/company/${content.company_id}`}
                  className="text-gray-500 hover:text-[#111827] transition-colors"
                >
                  {content.company_name || 'Company'}
                </Link>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </>
            )}
            {content.section?.slug && (
              <>
                <Link 
                  to={`/company/${content.company_id}/${content.section.slug}`}
                  className="text-gray-500 hover:text-[#111827] transition-colors capitalize"
                >
                  {content.section.name}
                </Link>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </>
            )}
            {content.category?.slug && (
              <>
                <Link 
                  to={`/company/${content.company_id}/${content.section.slug}/${content.category.slug}`}
                  className="text-gray-500 hover:text-[#111827] transition-colors capitalize"
                >
                  {content.category.name}
                </Link>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </>
            )}
            <span className="text-[#111827] font-medium truncate max-w-xs">
              {content.title}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center text-gray-600 hover:text-[#111827] transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back
        </button>

        {/* Article Header */}
        <article className="prose prose-lg max-w-none">
          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-[#111827] mb-4">
            {content.title}
          </h1>

          {/* Subtitle */}
          {content.subtitle && (
            <p className="text-xl text-gray-600 mb-6 border-l-4 border-[#111827] pl-4">
              {content.subtitle}
            </p>
          )}

          {/* Author and Meta Info */}
          <div className="flex flex-wrap items-center gap-4 mb-8 pb-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#111827] flex items-center justify-center text-white text-lg font-semibold">
                {content.author?.name?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div>
                <p className="font-semibold text-[#111827]">{content.author?.name || 'Anonymous'}</p>
                <p className="text-sm text-gray-500">{content.author?.role || 'Author'}</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3 text-sm text-gray-500 ml-auto">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(content.published_at || content.created_at)}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {content.stats?.views?.toLocaleString() || 0} views
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {content.stats?.read_time || 1} min read
              </span>
            </div>
          </div>

          {/* Tags and Categories */}
          <div className="flex flex-wrap gap-2 mb-6">
            {content.section?.name && (
              <Link
                to={`/company/${content.company_id}/${content.section.slug}`}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm flex items-center gap-1 hover:bg-[#111827] hover:text-white transition-colors"
              >
                <FolderOpen className="w-4 h-4" />
                {content.section.name}
              </Link>
            )}
            {content.category?.name && (
              <Link
                to={`/company/${content.company_id}/${content.section.slug}/${content.category.slug}`}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm flex items-center gap-1 hover:bg-[#111827] hover:text-white transition-colors"
              >
                <FolderOpen className="w-4 h-4" />
                {content.category.name}
              </Link>
            )}
            {content.tags?.map(tag => (
              <span
                key={tag}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm flex items-center gap-1"
              >
                <Tag className="w-4 h-4" />
                #{tag}
              </span>
            ))}
          </div>

          {/* Cover Image */}
          {content.cover_image_id && (
            <div className="mb-8 rounded-2xl overflow-hidden shadow-xl">
              <img 
                src={getImageUrl(content.cover_image_id)} 
                alt={content.title}
                className="w-full h-auto"
                loading="lazy"
              />
            </div>
          )}

          {/* Content Blocks */}
          <div className="space-y-4">
            {content.blocks?.map((block, index) => renderBlock(block, index))}
          </div>
        </article>

        {/* Engagement Bar */}
        <div className="mt-12 pt-6 border-t border-gray-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleLike}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  liked 
                    ? 'bg-[#111827] text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
                <span className="font-medium">{likeCount}</span>
              </button>
              
              <div className="relative">
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                  Share
                </button>
                
                {showShareMenu && (
                  <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 p-2 z-50 min-w-[200px]">
                    <button
                      onClick={() => handleShare("facebook")}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 rounded-lg w-full"
                    >
                      <Facebook className="w-5 h-5 text-blue-600" />
                      <span>Facebook</span>
                    </button>
                    <button
                      onClick={() => handleShare("twitter")}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 rounded-lg w-full"
                    >
                      <Twitter className="w-5 h-5 text-sky-500" />
                      <span>Twitter</span>
                    </button>
                    <button
                      onClick={() => handleShare("linkedin")}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 rounded-lg w-full"
                    >
                      <Linkedin className="w-5 h-5 text-blue-700" />
                      <span>LinkedIn</span>
                    </button>
                    <div className="border-t border-gray-200 my-2"></div>
                    <button
                      onClick={() => handleShare("copy")}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 rounded-lg w-full"
                    >
                      {copied ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <Link2 className="w-5 h-5 text-gray-600" />
                      )}
                      <span>{copied ? "Copied!" : "Copy Link"}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Related Content */}
        {relatedContent.length > 0 && (
          <div className="mt-12 pt-6 border-t border-gray-200">
            <h2 className="text-2xl font-bold text-[#111827] mb-6">Related Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedContent.map(item => (
                <Link
                  key={item.id}
                  to={`/content/${item.id}`}
                  className="group bg-white rounded-xl border border-gray-200 hover:border-[#111827] transition-all overflow-hidden"
                >
                  {item.cover_image_id && (
                    <div className="aspect-video overflow-hidden bg-gray-100">
                      <img
                        src={getImageUrl(item.cover_image_id)}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-[#111827] mb-2 line-clamp-2">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Eye className="w-3 h-3" />
                      {item.stats?.views || 0} views
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Comments Section */}
        <div className="mt-12 pt-6 border-t border-gray-200">
          <h2 className="text-2xl font-bold text-[#111827] mb-6 flex items-center gap-2">
            <MessageCircle className="w-6 h-6" />
            Comments ({comments.length})
          </h2>

          {/* Add Comment */}
          <form onSubmit={handleAddComment} className="mb-8">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Share your thoughts..."
              rows="4"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#111827] focus:border-transparent resize-none"
            />
            <div className="flex justify-end mt-3">
              <button
                type="submit"
                disabled={submittingComment || !commentText.trim()}
                className="px-6 py-2 bg-[#111827] text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submittingComment ? "Posting..." : "Post Comment"}
              </button>
            </div>
          </form>

          {/* Comments List */}
          <div className="space-y-6">
            {comments.length > 0 ? (
              comments.map(comment => (
                <div key={comment.id} className="bg-gray-50 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#111827] flex items-center justify-center text-white text-sm font-semibold">
                        {comment.author?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="font-medium text-[#111827]">{comment.author?.name || 'Anonymous'}</p>
                        <p className="text-xs text-gray-500">{formatDate(comment.created_at)}</p>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mb-3 whitespace-pre-wrap">{comment.text}</p>
                  
                  <button
                    onClick={() => handleLikeComment(comment.id)}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#111827] transition-colors"
                  >
                    <Heart className="w-4 h-4" />
                    {comment.likes || 0}
                  </button>

                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-4 ml-6 space-y-4">
                      {comment.replies.map(reply => (
                        <div key={reply.id} className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center text-white text-xs">
                              {reply.author?.name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <span className="text-sm font-medium text-[#111827]">
                              {reply.author?.name || 'Anonymous'}
                            </span>
                            <span className="text-xs text-gray-500">{formatDate(reply.created_at)}</span>
                          </div>
                          <p className="text-sm text-gray-700">{reply.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">No comments yet. Be the first to share your thoughts!</p>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold text-[#111827] mb-3">About</h3>
              <p className="text-sm text-gray-600">MediaHub - Your premier destination for quality content and insights.</p>
            </div>
            <div>
              <h3 className="font-semibold text-[#111827] mb-3">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/" className="text-gray-600 hover:text-[#111827]">Home</Link></li>
                <li><Link to="/companies" className="text-gray-600 hover:text-[#111827]">Companies</Link></li>
                <li><Link to="/" className="text-gray-600 hover:text-[#111827]">About Us</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-[#111827] mb-3">Connect</h3>
              <p className="text-sm text-gray-600 mb-2">Follow us on social media</p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-[#111827]">Twitter</a>
                <a href="#" className="text-gray-400 hover:text-[#111827]">LinkedIn</a>
                <a href="#" className="text-gray-400 hover:text-[#111827]">Facebook</a>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} MediaHub. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
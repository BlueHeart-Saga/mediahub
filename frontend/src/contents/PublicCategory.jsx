// PublicCategory.jsx
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { publicFetch } from "../api/publicClient";
import { 
  Calendar, 
  Eye, 
  Clock, 
  ChevronRight, 
  Home, 
  Building2,
  FileText,
  Grid,
  Loader2,
  ArrowLeft,
  Tag,
  ChevronLeft,
  Users,
  Share2,
  Bookmark,
  Heart
} from "lucide-react";

export default function PublicCategory() {
  const { companyId, sectionSlug, categorySlug } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState([]);
  const [categoryInfo, setCategoryInfo] = useState(null);
  const [sectionInfo, setSectionInfo] = useState(null);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const limit = 12;

  useEffect(() => {
    loadData();
  }, [companyId, sectionSlug, categorySlug]);

  useEffect(() => {
    if (categoryInfo) {
      loadContent(1);
    }
  }, [companyId, sectionSlug, categorySlug, categoryInfo]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load company info
      const companyRes = await publicFetch(`/public/company/${companyId}`);
      setCompanyInfo(companyRes);
      
      // Load sections and find current section
      const sectionsRes = await publicFetch(`/public/${companyId}/sections`);
      const section = sectionsRes.sections?.find(s => s.slug === sectionSlug);
      setSectionInfo(section);
      
      // Load categories for this section
      if (sectionSlug) {
        const categoriesRes = await publicFetch(
          `/public/${companyId}/categories?section_slug=${sectionSlug}`
        );
        setCategories(categoriesRes.categories || []);
        
        // Find current category info
        const currentCategory = categoriesRes.categories?.find(
          c => c.slug === categorySlug
        );
        setCategoryInfo(currentCategory);
      }
      
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadContent = async (pageNum = 1) => {
    try {
      setContentLoading(true);
      const url = `/public/${companyId}/content?section_slug=${sectionSlug}&category_slug=${categorySlug}&limit=${limit}&skip=${(pageNum - 1) * limit}`;
      
      const res = await publicFetch(url);
      
      if (pageNum === 1) {
        setContent(res.items || []);
      } else {
        setContent(prev => [...prev, ...(res.items || [])]);
      }
      
      setTotalCount(res.total || 0);
      setHasMore(res.has_more || false);
      setPage(pageNum);
      
    } catch (error) {
      console.error("Failed to load content:", error);
      setContent([]);
    } finally {
      setContentLoading(false);
    }
  };

  const loadMore = () => {
    if (hasMore && !contentLoading) {
      loadContent(page + 1);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCompanyLogo = () => {
    if (companyInfo?.logo) {
      if (companyInfo.logo.startsWith('data:image')) {
        return companyInfo.logo;
      }
      return companyInfo.logo;
    }
    if (companyInfo?.logo_id) {
      return `${import.meta.env.VITE_API_BASE || ''}/api/images/${companyInfo.logo_id}`;
    }
    return null;
  };

  const handleCategoryClick = (slug) => {
    navigate(`/company/${companyId}/${sectionSlug}/${slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#111827] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading category...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Company Header */}
      {companyInfo && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-4">
              {/* Company Logo */}
              <Link 
                to={`/company/${companyId}`}
                className="flex items-center gap-3 group"
              >
                <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden">
                  {getCompanyLogo() ? (
                    <img 
                      src={getCompanyLogo()} 
                      alt={companyInfo.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Building2 className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-[#111827] group-hover:text-[#111827]">
                    {companyInfo.name}
                  </h1>
                  {companyInfo.industry && (
                    <p className="text-sm text-gray-500">{companyInfo.industry}</p>
                  )}
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Breadcrumbs */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm py-3">
            <Link 
              to="/" 
              className="text-gray-500 hover:text-[#111827] transition-colors"
            >
              <Home className="w-4 h-4" />
            </Link>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <Link 
              to="/companies" 
              className="text-gray-500 hover:text-[#111827] transition-colors"
            >
              Companies
            </Link>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <Link 
              to={`/company/${companyId}`}
              className="text-gray-500 hover:text-[#111827] transition-colors"
            >
              {companyInfo?.name || 'Company'}
            </Link>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <Link 
              to={`/company/${companyId}/${sectionSlug}`}
              className="text-gray-500 hover:text-[#111827] transition-colors"
            >
              <span className="capitalize">
                {sectionInfo?.name || sectionSlug.replace(/-/g, ' ')}
              </span>
            </Link>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="text-[#111827] font-medium capitalize">
              {categoryInfo?.name || categorySlug.replace(/-/g, ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category Hero Section */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex-1">
                {/* Category Icon and Title */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-[#111827] rounded-xl">
                    <Tag className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-[#111827] capitalize">
                      {categoryInfo?.name || categorySlug.replace(/-/g, ' ')}
                    </h1>
                    {categoryInfo?.description && (
                      <p className="text-lg text-gray-600 mt-2">{categoryInfo.description}</p>
                    )}
                  </div>
                </div>

                {/* Category Stats */}
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-2xl font-bold text-[#111827]">{totalCount}</div>
                      <div className="text-xs text-gray-500">Total Articles</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-2xl font-bold text-[#111827]">
                        {content.reduce((acc, item) => acc + (item.author ? 1 : 0), 0)}
                      </div>
                      <div className="text-xs text-gray-500">Contributors</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-2xl font-bold text-[#111827]">
                        {content.reduce((acc, item) => acc + (item.stats?.likes || 0), 0)}
                      </div>
                      <div className="text-xs text-gray-500">Total Likes</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex flex-col gap-3">
                <Link
                  to={`/company/${companyId}/${sectionSlug}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-[#111827] rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to {sectionInfo?.name || 'Section'}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar - Other Categories */}
          {categories.length > 0 && (
            <div className="lg:w-80 flex-shrink-0">
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden sticky top-4">
                {/* Categories Header */}
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="font-semibold text-[#111827] flex items-center gap-2">
                    <Grid className="w-4 h-4" />
                    Other Categories
                  </h2>
                </div>

                {/* Categories List */}
                <div className="p-2">
                  {categories
                    .filter(cat => cat.slug !== categorySlug)
                    .map((category) => (
                      <button
                        key={category.slug}
                        onClick={() => handleCategoryClick(category.slug)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors mb-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Tag className="w-4 h-4" />
                            <span className="capitalize">{category.name}</span>
                          </span>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                        {category.description && (
                          <p className="text-xs mt-1 text-gray-500 line-clamp-1">
                            {category.description}
                          </p>
                        )}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Right Content - Articles Grid */}
          <div className="flex-1">
            {/* Section Info */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 text-sm">
                <Bookmark className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Section:</span>
                <Link 
                  to={`/company/${companyId}/${sectionSlug}`}
                  className="font-medium text-[#111827] hover:underline capitalize"
                >
                  {sectionInfo?.name || sectionSlug.replace(/-/g, ' ')}
                </Link>
              </div>
            </div>

            {/* Content Loading State */}
            {contentLoading && page === 1 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-[#111827] animate-spin" />
              </div>
            ) : content.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-[#111827] mb-2">
                  No content available
                </h3>
                <p className="text-gray-600">
                  This category doesn't have any published content yet.
                </p>
              </div>
            ) : (
              <>
                {/* Results Info */}
                <div className="mb-6 flex justify-between items-center">
                  <p className="text-sm text-gray-600">
                    Showing <span className="font-semibold text-[#111827]">{content.length}</span> of{' '}
                    <span className="font-semibold text-[#111827]">{totalCount}</span> articles
                  </p>
                  <p className="text-sm text-gray-500">
                    Sorted by latest
                  </p>
                </div>

                {/* Content Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {content.map((item) => (
                    <Link
                      key={item.id}
                      to={`/content/${item.id}`}
                      className="group bg-white rounded-xl border border-gray-200 hover:border-[#111827] transition-all duration-300 overflow-hidden"
                    >
                      {/* Cover Image */}
                      {item.cover_image_id && (
                        <div className="aspect-video overflow-hidden bg-gray-100">
                          <img
                            src={`${import.meta.env.VITE_API_BASE || ''}/api/images/${item.cover_image_id}`}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '';
                              e.target.parentElement.innerHTML = `
                                <div class="w-full h-full flex items-center justify-center">
                                  <FileText class="w-12 h-12 text-gray-400" />
                                </div>
                              `;
                            }}
                          />
                        </div>
                      )}

                      {/* Content Info */}
                      <div className="p-6">
                        {/* Section Tag */}
                        {item.section && (
                          <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded mb-3">
                            {item.section.name}
                          </span>
                        )}

                        {/* Title */}
                        <h3 className="text-lg font-semibold text-[#111827] mb-2 group-hover:text-[#111827] line-clamp-2">
                          {item.title}
                        </h3>

                        {/* Subtitle */}
                        {item.subtitle && (
                          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                            {item.subtitle}
                          </p>
                        )}

                        {/* Author Info */}
                        {item.author && (
                          <div className="flex items-center gap-2 mb-4">
                            {item.author.avatar_url ? (
                              <img 
                                src={item.author.avatar_url}
                                alt={item.author.name}
                                className="w-6 h-6 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-xs font-medium text-gray-600">
                                  {item.author.name?.charAt(0) || 'U'}
                                </span>
                              </div>
                            )}
                            <span className="text-sm text-gray-600">{item.author.name}</span>
                          </div>
                        )}

                        {/* Meta Info */}
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(item.published_at || item.created_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {item.stats?.views?.toLocaleString() || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {item.stats?.read_time || 1} min
                          </span>
                        </div>

                        {/* Like Count */}
                        {item.stats?.likes > 0 && (
                          <div className="mt-3 flex items-center gap-1 text-xs text-gray-500">
                            <Heart className="w-3 h-3" />
                            <span>{item.stats.likes} likes</span>
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                        <span className="text-sm font-medium text-[#111827]">
                          Read Article
                        </span>
                        <Share2 className="w-4 h-4 text-gray-400" />
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Load More Button */}
                {hasMore && (
                  <div className="mt-8 text-center">
                    <button
                      onClick={loadMore}
                      disabled={contentLoading}
                      className="px-6 py-3 bg-white border border-gray-300 text-[#111827] rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {contentLoading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading...
                        </span>
                      ) : (
                        'Load More Articles'
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
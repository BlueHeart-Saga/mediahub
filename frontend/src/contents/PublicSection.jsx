// PublicSection.jsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
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
  ArrowLeft
} from "lucide-react";

export default function PublicSection() {
  const { companyId, sectionSlug, categorySlug } = useParams();
  const [content, setContent] = useState([]);
  const [sectionInfo, setSectionInfo] = useState(null);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadData();
  }, [companyId, sectionSlug, categorySlug]);

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
      }
      
      // Load content
      await loadContent();
      
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadContent = async () => {
    try {
      let url = `/public/${companyId}/content?section_slug=${sectionSlug}&limit=50`;
      
      if (categorySlug) {
        url += `&category_slug=${categorySlug}`;
      }
      
      const res = await publicFetch(url);
      setContent(res.items || []);
      setTotalCount(res.total || 0);
    } catch (error) {
      console.error("Failed to load content:", error);
      setContent([]);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
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

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#111827] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading content...</p>
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
            <span className="text-[#111827] font-medium capitalize">
              {sectionInfo?.name || sectionSlug.replace(/-/g, ' ')}
            </span>
            {categorySlug && (
              <>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <span className="text-[#111827] font-medium capitalize">
                  {categorySlug.replace(/-/g, ' ')}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Section Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#111827] capitalize mb-2">
                {sectionInfo?.name || sectionSlug.replace(/-/g, ' ')}
              </h1>
              {sectionInfo?.description && (
                <p className="text-lg text-gray-600">{sectionInfo.description}</p>
              )}
              <div className="flex items-center gap-4 mt-4">
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <FileText className="w-4 h-4" />
                  {totalCount} {totalCount === 1 ? 'Article' : 'Articles'}
                </span>
                {categories.length > 0 && (
                  <span className="flex items-center gap-1 text-sm text-gray-500">
                    <Grid className="w-4 h-4" />
                    {categories.length} Categories
                  </span>
                )}
              </div>
            </div>
            
            {/* Back button */}
            <Link
              to={`/company/${companyId}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-[#111827] rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Company
            </Link>
          </div>

          {/* Category Navigation */}
          {categories.length > 0 && !categorySlug && (
            <div className="mt-8 border-t border-gray-200 pt-6">
              <h2 className="text-sm font-medium text-gray-500 mb-3">Categories</h2>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Link
                    key={category.slug}
                    to={`/company/${companyId}/${sectionSlug}/${category.slug}`}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-[#111827] hover:text-white transition-colors text-sm"
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Current Category Indicator */}
          {categorySlug && (
            <div className="mt-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#111827] text-white rounded-lg">
                <span className="text-sm font-medium">Category:</span>
                <span className="text-sm capitalize">{categorySlug.replace(/-/g, ' ')}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {content.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[#111827] mb-2">
              No content available
            </h3>
            <p className="text-gray-600">
              This section doesn't have any published content yet.
            </p>
            {categorySlug && (
              <Link
                to={`/company/${companyId}/${sectionSlug}`}
                className="inline-block mt-6 px-6 py-3 bg-[#111827] text-white rounded-lg hover:bg-gray-900 transition-colors"
              >
                View all in {sectionInfo?.name || sectionSlug.replace(/-/g, ' ')}
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Content Stats */}
            <div className="mb-6 flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Showing <span className="font-semibold text-[#111827]">{content.length}</span> articles
                {categorySlug && (
                  <> in <span className="font-semibold capitalize">{categorySlug.replace(/-/g, ' ')}</span></>
                )}
              </p>
            </div>

            {/* Content Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    {/* Category Tag */}
                    {item.category && (
                      <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded mb-3">
                        {item.category.name}
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
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                    <span className="text-sm font-medium text-[#111827] group-hover:text-[#111827]">
                      Read Article
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
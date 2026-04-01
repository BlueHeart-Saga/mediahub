// PublicCompany.jsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { publicFetch } from "../api/publicClient";
import { 
  FolderOpen, 
  ChevronRight, 
  Building2,
  Globe,
  MapPin,
  Mail,
  Phone,
  Calendar,
  FileText,
  Grid,
  Users,
  ChevronLeft,
  ExternalLink,
  Loader2,
  Twitter,
  Linkedin,
  Facebook,
  Instagram
} from "lucide-react";

export default function PublicCompany() {
  const { companyId } = useParams();
  const [sections, setSections] = useState([]);
  const [categories, setCategories] = useState({});
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalContent: 0,
    totalSections: 0,
    totalCategories: 0
  });

  useEffect(() => {
    loadCompanyData();
  }, [companyId]);

  const loadCompanyData = async () => {
    try {
      setLoading(true);
      
      // Load company info
      const companyRes = await publicFetch(`/public/company/${companyId}`);
      setCompany(companyRes);
      
      // Load sections for this company
      const sectionsRes = await publicFetch(`/public/${companyId}/sections`);
      const sectionsList = sectionsRes.sections || [];
      setSections(sectionsList);
      
      // Load categories for each section and content counts
      const categoriesMap = {};
      let totalContent = 0;
      
      for (const section of sectionsList) {
        try {
          // Get categories for this section
          const categoriesRes = await publicFetch(
            `/public/${companyId}/categories?section_slug=${section.slug}`
          );
          categoriesMap[section.slug] = categoriesRes.categories || [];
          
          // Get content count for this section
          const contentRes = await publicFetch(
            `/public/${companyId}/content?section_slug=${section.slug}&limit=1`
          );
          section.contentCount = contentRes.total || 0;
          totalContent += section.contentCount || 0;
          
        } catch (error) {
          console.error(`Failed to load data for section ${section.slug}:`, error);
          categoriesMap[section.slug] = [];
          section.contentCount = 0;
        }
      }
      
      setCategories(categoriesMap);
      
      // Calculate stats
      const totalCategories = Object.values(categoriesMap).reduce(
        (acc, cats) => acc + cats.length, 0
      );
      
      setStats({
        totalContent,
        totalSections: sectionsList.length,
        totalCategories
      });
      
    } catch (error) {
      console.error("Failed to load company data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCompanyLogo = () => {
    if (company?.logo) {
      if (company.logo.startsWith('data:image')) {
        return company.logo;
      }
      return company.logo;
    }
    if (company?.logo_id) {
      return `${import.meta.env.VITE_API_BASE || ''}/api/images/${company.logo_id}`;
    }
    return null;
  };

  const getSocialIcon = (platform) => {
    switch(platform.toLowerCase()) {
      case 'twitter': return <Twitter className="w-4 h-4" />;
      case 'linkedin': return <Linkedin className="w-4 h-4" />;
      case 'facebook': return <Facebook className="w-4 h-4" />;
      case 'instagram': return <Instagram className="w-4 h-4" />;
      default: return <ExternalLink className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#111827] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading company profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb Navigation */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm py-3">
            <Link 
              to="/" 
              className="text-gray-500 hover:text-[#111827] transition-colors"
            >
              Home
            </Link>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <Link 
              to="/companies" 
              className="text-gray-500 hover:text-[#111827] transition-colors"
            >
              Companies
            </Link>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="text-[#111827] font-medium">
              {company?.name || 'Company Profile'}
            </span>
          </div>
        </div>
      </div>

      {/* Company Hero Section - Clean White */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Company Logo and Basic Info */}
            <div className="flex-shrink-0">
              <div className="w-32 h-32 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden">
                {getCompanyLogo() ? (
                  <img 
                    src={getCompanyLogo()} 
                    alt={company?.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2 className="w-16 h-16 text-gray-400" />
                )}
              </div>
            </div>

            {/* Company Details */}
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-bold text-[#111827] mb-3">
                {company?.name}
              </h1>
              
              {company?.industry && (
                <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm mb-4">
                  {company.industry}
                </span>
              )}

              {company?.description && (
                <p className="text-lg text-gray-600 max-w-3xl mb-6">
                  {company.description}
                </p>
              )}

              {/* Company Stats */}
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <FileText className="w-4 h-4 text-[#111827]" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-[#111827]">
                      {stats.totalContent}
                    </div>
                    <div className="text-xs text-gray-500">Articles</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Grid className="w-4 h-4 text-[#111827]" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-[#111827]">
                      {stats.totalSections}
                    </div>
                    <div className="text-xs text-gray-500">Sections</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <FolderOpen className="w-4 h-4 text-[#111827]" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-[#111827]">
                      {stats.totalCategories}
                    </div>
                    <div className="text-xs text-gray-500">Categories</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Company Contact & Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-8 border-t border-gray-200">
            {company?.website && (
              <a 
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-gray-600 hover:text-[#111827] transition-colors"
              >
                <Globe className="w-4 h-4" />
                <span className="text-sm truncate">{company.website.replace(/^https?:\/\//, '')}</span>
              </a>
            )}
            
            {company?.email && (
              <a 
                href={`mailto:${company.email}`}
                className="flex items-center gap-3 text-gray-600 hover:text-[#111827] transition-colors"
              >
                <Mail className="w-4 h-4" />
                <span className="text-sm truncate">{company.email}</span>
              </a>
            )}
            
            {company?.phone && (
              <a 
                href={`tel:${company.phone}`}
                className="flex items-center gap-3 text-gray-600 hover:text-[#111827] transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span className="text-sm">{company.phone}</span>
              </a>
            )}
            
            {(company?.address?.city || company?.address?.country) && (
              <div className="flex items-center gap-3 text-gray-600">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">
                  {[company.address.city, company.address.country].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
          </div>

          {/* Social Media Links */}
          {company?.social_media && Object.keys(company.social_media).length > 0 && (
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-200">
              <span className="text-sm text-gray-500">Follow us:</span>
              <div className="flex items-center gap-2">
                {Object.entries(company.social_media).map(([platform, url]) => (
                  url && (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-500 hover:text-[#111827] hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      {getSocialIcon(platform)}
                    </a>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sections Overview */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-[#111827] flex items-center gap-2">
            <FolderOpen className="w-6 h-6" />
            Content Sections
          </h2>
          
          <Link
            to="/companies"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-[#111827] rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            All Companies
          </Link>
        </div>

        {sections.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[#111827] mb-2">
              No sections available
            </h3>
            <p className="text-gray-600">
              This company hasn't created any content sections yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {sections.map((section) => (
              <div
                key={section.id || section.slug}
                className="bg-white rounded-xl border border-gray-200 hover:border-[#111827] transition-all overflow-hidden"
              >
                {/* Section Header */}
                <Link
                  to={`/company/${companyId}/${section.slug}`}
                  className="block p-6 pb-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-semibold text-[#111827] group-hover:text-[#111827]">
                      {section.name}
                    </h3>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#111827] group-hover:translate-x-1 transition-all" />
                  </div>
                  
                  {section.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {section.description}
                    </p>
                  )}

                  {/* Section Stats */}
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-gray-500">
                      <FileText className="w-4 h-4" />
                      {section.contentCount || 0} articles
                    </span>
                    {categories[section.slug]?.length > 0 && (
                      <span className="flex items-center gap-1 text-gray-500">
                        <FolderOpen className="w-4 h-4" />
                        {categories[section.slug].length} categories
                      </span>
                    )}
                  </div>
                </Link>

                {/* Categories Preview */}
                {categories[section.slug]?.length > 0 && (
                  <div className="px-6 pb-6">
                    <div className="border-t border-gray-100 pt-4">
                      <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                        Categories
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {categories[section.slug].slice(0, 4).map((category) => (
                          <Link
                            key={category.slug}
                            to={`/company/${companyId}/${section.slug}/${category.slug}`}
                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-[#111827] hover:text-white transition-colors text-xs"
                          >
                            {category.name}
                          </Link>
                        ))}
                        {categories[section.slug].length > 4 && (
                          <span className="px-3 py-1 text-xs text-gray-500">
                            +{categories[section.slug].length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Section Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <Link
                    to={`/company/${companyId}/${section.slug}`}
                    className="text-sm font-medium text-[#111827] hover:text-[#111827] flex items-center justify-between group"
                  >
                    <span>Browse all content</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer - Company Info */}
      {company && (
        <div className="border-t border-gray-200 bg-gray-50 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                  {getCompanyLogo() ? (
                    <img 
                      src={getCompanyLogo()} 
                      alt={company.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <Building2 className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600">© {new Date().getFullYear()}</p>
                  <p className="text-sm font-medium text-[#111827]">{company.name}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <Link to="/privacy" className="text-sm text-gray-500 hover:text-[#111827]">
                  Privacy
                </Link>
                <Link to="/terms" className="text-sm text-gray-500 hover:text-[#111827]">
                  Terms
                </Link>
                <Link to="/contact" className="text-sm text-gray-500 hover:text-[#111827]">
                  Contact
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
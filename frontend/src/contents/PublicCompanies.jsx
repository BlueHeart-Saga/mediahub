// PublicCompanies.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { publicFetch } from "../api/publicClient";
import { 
  Building2, 
  ChevronRight, 
  Search, 
  Loader2,
  Globe,
  Calendar,
  FileText,
  MapPin,
  Mail,
  Phone,
  Twitter,
  Linkedin,
  Facebook
} from "lucide-react";

export default function PublicCompanies() {
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredCompanies(companies);
    } else {
      const filtered = companies.filter(company => 
        company.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.industry?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.address?.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.address?.country?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCompanies(filtered);
    }
  }, [searchTerm, companies]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await publicFetch("/public/companies");
      
      // Handle response format
      let companiesList = [];
      if (res?.companies) {
        companiesList = res.companies;
      } else if (Array.isArray(res)) {
        companiesList = res;
      }
      
      setCompanies(companiesList);
      setFilteredCompanies(companiesList);
    } catch (err) {
      console.error("Failed to load companies", err);
      setError("Unable to load companies. Please try again later.");
      setCompanies([]);
      setFilteredCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  const getCompanyLogo = (company) => {
    if (company.logo) {
      if (company.logo.startsWith('data:image')) {
        return company.logo;
      }
      return company.logo;
    }
    if (company.logo_id) {
      return `${import.meta.env.VITE_API_BASE || ''}/api/images/${company.logo_id}`;
    }
    return null;
  };

  const getSocialIcon = (platform) => {
    switch(platform.toLowerCase()) {
      case 'twitter': return <Twitter className="w-4 h-4" />;
      case 'linkedin': return <Linkedin className="w-4 h-4" />;
      case 'facebook': return <Facebook className="w-4 h-4" />;
      default: return null;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).getFullYear();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#111827] animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading companies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section - Clean White with subtle gradient */}
      <div className="bg-gradient-to-b from-gray-50 to-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold text-[#111827] mb-6">
              Discover Companies
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Explore content and insights from leading companies across industries.
            </p>
            
            {/* Search Bar */}
            <div className="relative max-w-2xl">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search companies by name, industry, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-12 pr-4 py-4 text-gray-900 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#111827] focus:border-transparent outline-none text-lg shadow-sm"
              />
            </div>
            
            {/* Stats */}
            <div className="flex items-center gap-6 mt-6 text-sm text-gray-600">
              <span className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                {companies.length} Companies
              </span>
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {companies.reduce((acc, company) => acc + (company.content_count || 0), 0)} Articles
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Companies Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Results count and filters */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <p className="text-gray-600">
            Showing <span className="font-semibold text-[#111827]">{filteredCompanies.length}</span> of <span className="font-semibold text-[#111827]">{companies.length}</span> companies
          </p>
          
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="px-4 py-2 text-sm bg-white border border-gray-300 text-[#111827] rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear Search
            </button>
          )}
        </div>

        {error ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[#111827] mb-2">Something went wrong</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={fetchCompanies}
              className="px-6 py-3 bg-[#111827] text-white rounded-xl hover:bg-gray-900 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[#111827] mb-2">No companies found</h3>
            <p className="text-gray-600 mb-6">Try adjusting your search criteria.</p>
            <button
              onClick={() => setSearchTerm("")}
              className="px-6 py-3 bg-[#111827] text-white rounded-xl hover:bg-gray-900 transition-colors"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCompanies.map((company) => (
              <Link
                key={company.company_id}
                to={`/company/${company.company_id}`}
                className="group bg-white rounded-xl border border-gray-200 hover:border-[#111827] transition-all duration-300 overflow-hidden"
              >
                {/* Company Header */}
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Logo */}
                    <div className="w-16 h-16 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 border border-gray-200 overflow-hidden">
                      {getCompanyLogo(company) ? (
                        <img 
                          src={getCompanyLogo(company)} 
                          alt={company.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '';
                            e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center"><Building2 class="w-8 h-8 text-gray-400" /></div>';
                          }}
                        />
                      ) : (
                        <Building2 className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    
                    {/* Company Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-[#111827] group-hover:text-[#111827] truncate">
                        {company.name}
                      </h3>
                      {company.industry && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                          {company.industry}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {company.description && (
                    <p className="mt-4 text-sm text-gray-600 line-clamp-2">
                      {company.description}
                    </p>
                  )}

                  {/* Location */}
                  {company.address && (company.address.city || company.address.country) && (
                    <div className="mt-3 flex items-center text-xs text-gray-500">
                      <MapPin className="w-3 h-3 mr-1" />
                      <span>
                        {[company.address.city, company.address.country]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    </div>
                  )}

                  {/* Stats Row */}
                  <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
                    {company.content_count > 0 && (
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {company.content_count} {company.content_count === 1 ? 'article' : 'articles'}
                      </span>
                    )}
                    {company.created_at && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(company.created_at)}
                      </span>
                    )}
                  </div>

                  {/* Contact Info - Optional */}
                  {(company.email || company.phone || company.website) && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      {company.email && (
                        <div className="flex items-center text-xs text-gray-500 mb-1">
                          <Mail className="w-3 h-3 mr-1" />
                          <span className="truncate">{company.email}</span>
                        </div>
                      )}
                      {company.phone && (
                        <div className="flex items-center text-xs text-gray-500 mb-1">
                          <Phone className="w-3 h-3 mr-1" />
                          <span>{company.phone}</span>
                        </div>
                      )}
                      {company.website && (
                        <div className="flex items-center text-xs text-gray-500">
                          <Globe className="w-3 h-3 mr-1" />
                          <span className="truncate">{company.website.replace(/^https?:\/\//, '')}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Social Media */}
                  {company.social_media && Object.keys(company.social_media).length > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      {Object.entries(company.social_media).map(([platform, url]) => (
                        url && (
                          <div
                            key={platform}
                            className="text-gray-400 hover:text-[#111827] transition-colors"
                            onClick={(e) => e.preventDefault()}
                          >
                            {getSocialIcon(platform)}
                          </div>
                        )
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                  <span className="text-sm font-medium text-[#111827]">
                    View Company
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#111827] group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer CTA - Using #111827 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-[#111827] rounded-xl p-8 md:p-12 text-white text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Want to feature your company?
          </h2>
          <p className="text-lg text-gray-300 mb-6 max-w-2xl mx-auto">
            Join our platform to share your content and connect with readers worldwide.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center px-6 py-3 bg-white text-[#111827] rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Contact Us
            <ChevronRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </div>
    </div>
  );
}
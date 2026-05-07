import { useEffect, useState } from "react";
import { apiFetch } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import "../../styles/Categories.css";
import { 
  Plus, 
  ShieldAlert, 
  ShieldCheck, 
  Trash2, 
  Layers, 
  Hash,
  AlertTriangle,
  Building,
  Layout
} from "lucide-react";

const generateSlug = (v) =>
  v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function Categories() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const [companies, setCompanies] = useState([]);
  const [sections, setSections] = useState([]);
  const [categories, setCategories] = useState([]);

  const [companyId, setCompanyId] = useState("");
  const [sectionSlug, setSectionSlug] = useState("");
  const [name, setName] = useState("");

  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [loadingSections, setLoadingSections] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);

  /* ---------------- LOADERS ---------------- */

  const loadCompanies = async () => {
    if (!isSuperAdmin) return;

    setLoadingCompanies(true);
    try {
      const res = await apiFetch("/companies");
      if (res?.companies) setCompanies(res.companies);
    } catch {
      toast.error("Failed to load companies");
    } finally {
      setLoadingCompanies(false);
    }
  };

  const loadSections = async (cid) => {
    if (!cid) return;

    setLoadingSections(true);
    try {
      const res = await apiFetch(`/sections?company_id=${cid}`);
      if (res?.sections) setSections(res.sections);
    } catch {
      toast.error("Failed to load sections");
    } finally {
      setLoadingSections(false);
    }
  };

  const loadCategories = async (cid, slug) => {
    if (!slug) return;

    setLoadingCategories(true);
    try {
      const res = await apiFetch(
        `/categories?section_slug=${slug}&company_id=${cid}`
      );

      if (res?.categories) setCategories(res.categories);
    } catch {
      toast.error("Failed to load categories");
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    loadCompanies();
    if (!isSuperAdmin) loadSections(""); // company_admin scope
  }, []);

  /* ---------------- ACTIONS ---------------- */

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Category name required");
      return;
    }

    if (!sectionSlug) {
      toast.error("Select a section");
      return;
    }

    try {
      const res = await apiFetch("/categories", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          section_slug: sectionSlug,
          company_id: companyId || undefined,
        }),
      });

      if (res?.detail) {
        toast.error(res.detail);
        return;
      }

      toast.success("Category created");
      setName("");
      loadCategories(companyId, sectionSlug);
    } catch {
      toast.error("Creation failed");
    }
  };

  const handleDelete = async (slug) => {
    try {
      await apiFetch(
        `/categories/${slug}?company_id=${companyId}&section_slug=${sectionSlug}`,
        { method: "DELETE" }
      );

      toast.success("Category removed");
      loadCategories(companyId, sectionSlug);
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleBan = async (slug) => {
    try {
      await apiFetch(
        `/categories/${slug}/ban?company_id=${companyId}&section_slug=${sectionSlug}`,
        { method: "PATCH" }
      );
      toast.success("Category banned");
      loadCategories(companyId, sectionSlug);
    } catch {
      toast.error("Failed to ban category");
    }
  };

  const handleActivate = async (slug) => {
    try {
      await apiFetch(
        `/categories/${slug}/activate?company_id=${companyId}&section_slug=${sectionSlug}`,
        { method: "PATCH" }
      );
      toast.success("Category activated");
      loadCategories(companyId, sectionSlug);
    } catch {
      toast.error("Failed to activate category");
    }
  };

  const previewSlug = generateSlug(name);

  /* ---------------- UI ---------------- */

  return (
    <div className="cat-page">
      <div className="cat-header">
        <h2>Categories Manager</h2>
        <div className="cat-skeleton-line"></div>
      </div>

      {/* COMPANY SELECTOR */}
      {isSuperAdmin && (
        <div className="cat-card">
          <div className="cat-card-title">Select Company</div>

          {loadingCompanies ? (
            <div className="cat-skeleton-input"></div>
          ) : (
            <select
              className="cat-select"
              value={companyId}
              onChange={(e) => {
                const cid = e.target.value;
                setCompanyId(cid);
                setSectionSlug("");
                setSections([]);
                setCategories([]);
                loadSections(cid);
              }}
            >
              <option value="">Choose Company</option>

              {companies.map((c) => (
                <option key={c.company_id} value={c.company_id}>
                  {c.name} ({c.company_id})
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* SECTION SELECTOR */}
      <div className="cat-card">
        <div className="cat-card-title">Select Section</div>

        {loadingSections ? (
          <div className="cat-skeleton-input"></div>
        ) : (
          <select
            className="cat-select"
            value={sectionSlug}
            onChange={(e) => {
              const slug = e.target.value;
              setSectionSlug(slug);
              loadCategories(companyId, slug);
            }}
          >
            <option value="">Choose Section</option>

            {sections.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* CREATE */}
      <div className="cat-card">
        <div className="cat-card-title">Create Category</div>

        <input
          className="cat-input"
          placeholder="Category Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {name && (
          <div className="cat-slug-preview">
            slug: <span>{previewSlug}</span>
          </div>
        )}

        <button className="cat-button" onClick={handleCreate}>
          Create Category
        </button>
      </div>

      <div className="cat-table-v2">
        <div className="cat-table-header">
          <span><Layers size={14} /> Name</span>
          <span><Hash size={14} /> Slug</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>

        {loadingCategories ? (
          <div className="cat-loading-state">Loading categories...</div>
        ) : categories.length ? (
          categories.map((c) => (
            <div key={c.slug} className={`cat-v2-row ${c.status}`}>
              <div className="cat-name-cell">
                <span className="font-bold">{c.name}</span>
                {c.is_system && <span className="sys-badge">System</span>}
              </div>
              
              <span className="cat-slug-text">{c.slug}</span>
              
              <div className="cat-status-cell">
                <span className={`status-pill ${c.status || 'active'}`}>
                  {c.status === 'banned' ? <AlertTriangle size={10} /> : <ShieldCheck size={10} />}
                  {c.status || 'active'}
                </span>
              </div>

              <div className="cat-actions-v2">
                {c.status === 'banned' ? (
                  <button 
                    onClick={() => handleActivate(c.slug)} 
                    className="cat-btn-v2 activate"
                    title="Reactivate"
                  >
                    <ShieldCheck size={16} />
                  </button>
                ) : (
                  <button 
                    onClick={() => handleBan(c.slug)} 
                    className="cat-btn-v2 ban"
                    title="Ban Category"
                  >
                    <ShieldAlert size={16} />
                  </button>
                )}

                {!c.is_system && (
                  <button 
                    onClick={() => handleDelete(c.slug)} 
                    className="cat-btn-v2 delete"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="cat-empty">
            {sectionSlug ? "No categories available in this section" : "Select a section to view categories"}
          </div>
        )}
      </div>
    </div>
  );
}
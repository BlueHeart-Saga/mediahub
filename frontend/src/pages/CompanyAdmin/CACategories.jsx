import { useEffect, useState } from "react";
import { apiFetch } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import "../../styles/CACategories.css";
import { 
  Plus, 
  ShieldAlert, 
  ShieldCheck, 
  Trash2, 
  Layers, 
  Hash,
  AlertTriangle,
  Layout
} from "lucide-react";

export default function CACategories() {
  const { user } = useAuth();

  const companyId = user?.company_id; // ✅ critical

  const [sections, setSections] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedSection, setSelectedSection] = useState("");
  const [name, setName] = useState("");

  /* ---------------- LOADERS ---------------- */

  const loadSections = async () => {
    try {
      const res = await apiFetch("/sections");
      if (res?.sections) setSections(res.sections);
    } catch {
      toast.error("Failed to load sections");
    }
  };

  const loadCategories = async (slug) => {
    if (!slug) {
      setCategories([]);
      return;
    }

    try {
      const res = await apiFetch(
        `/categories?section_slug=${slug}&company_id=${companyId}`
      );

      if (res?.categories) setCategories(res.categories);
    } catch {
      toast.error("Failed to load categories");
    }
  };

  useEffect(() => {
    loadSections();
  }, []);

  /* ---------------- ACTIONS ---------------- */

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Category name required");
      return;
    }

    if (!selectedSection) {
      toast.error("Select a section");
      return;
    }

    try {
      const res = await apiFetch("/categories", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          section_slug: selectedSection,
          company_id: companyId, // ✅ always include
        }),
      });

      if (res?.detail) {
        toast.error(res.detail);
        return;
      }

      toast.success("Category created");
      setName("");
      loadCategories(selectedSection);

    } catch {
      toast.error("Creation failed");
    }
  };

  const handleDelete = async (slug) => {
    try {
      await apiFetch(
        `/categories/${slug}?company_id=${companyId}&section_slug=${selectedSection}`,
        { method: "DELETE" }
      );

      toast.success("Category removed");
      loadCategories(selectedSection);

    } catch (err) {
      console.error(err);
      toast.error("Delete failed");
    }
  };

  const handleBan = async (slug) => {
    try {
      await apiFetch(
        `/categories/${slug}/ban?company_id=${companyId}&section_slug=${selectedSection}`,
        { method: "PATCH" }
      );
      toast.success("Category banned");
      loadCategories(selectedSection);
    } catch {
      toast.error("Failed to ban category");
    }
  };

  const handleActivate = async (slug) => {
    try {
      await apiFetch(
        `/categories/${slug}/activate?company_id=${companyId}&section_slug=${selectedSection}`,
        { method: "PATCH" }
      );
      toast.success("Category activated");
      loadCategories(selectedSection);
    } catch {
      toast.error("Failed to activate category");
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="cat-page">

      <div className="cat-header">
        <h2>Categories Manager</h2>
        <div className="cat-skeleton-line"></div>
      </div>

      <div className="cat-card">
        <div className="cat-card-title">Select Section</div>

        <select
          className="cat-select"
          value={selectedSection}
          onChange={(e) => {
            const slug = e.target.value;
            setSelectedSection(slug);
            loadCategories(slug);
          }}
        >
          <option value="">Choose Section</option>

          {sections.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="cat-card">
        <div className="cat-card-title">Create Category</div>

        <input
          className="cat-input"
          placeholder="Category Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

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

        {categories.length ? (
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
            {selectedSection ? "No categories available in this section" : "Select a section to view categories"}
          </div>
        )}
      </div>

    </div>
  );
}
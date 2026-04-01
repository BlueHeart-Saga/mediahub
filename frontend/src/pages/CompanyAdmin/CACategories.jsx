import { useEffect, useState } from "react";
import { apiFetch } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import "../../styles/CACategories.css";

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

      <div className="cat-card">
        <div className="cat-card-title">Existing Categories</div>

        <div className="cat-table">

          <div className="cat-table-head">
            <span>Name</span>
            <span>Slug</span>
            <span></span>
          </div>

          {categories.length ? (
            categories.map((c) => (
              <div className="cat-table-row" key={c.slug}>
                <span className="cat-name">{c.name}</span>
                <span className="cat-slug">{c.slug}</span>

                {/* ✅ Hide delete for system categories */}
                {!c.is_system && (
                  <button
                    className="cat-delete-btn"
                    onClick={() => handleDelete(c.slug)}
                  >
                    Delete
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="cat-empty">No categories available</div>
          )}

        </div>
      </div>

    </div>
  );
}
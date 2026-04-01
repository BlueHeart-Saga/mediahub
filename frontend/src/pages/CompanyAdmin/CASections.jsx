import { useEffect, useState } from "react";
import { apiFetch } from "../../api/client";
import toast from "react-hot-toast";
import "../../styles/CASections.css";

const generateSlug = (value) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");

export default function CASections() {
  const [sections, setSections] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  const loadSections = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/sections");
      if (res?.sections) setSections(res.sections);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load sections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSections();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Section name required");
      return;
    }

    try {
      const res = await apiFetch("/sections", {
        method: "POST",
        body: JSON.stringify({ name: name.trim() }),
      });

      if (res?.detail) {
        toast.error(res.detail);
        return;
      }

      toast.success("Section created");
      setName("");
      loadSections();
    } catch (err) {
      console.error(err);
      toast.error("Creation failed");
    }
  };

  const handleDelete = async (slug) => {
    try {
      const res = await apiFetch(`/sections/${slug}?company_id=`, {
        method: "DELETE",
      });

      if (res?.detail) {
        toast.error(res.detail);
        return;
      }

      toast.success("Section removed");
      loadSections();
    } catch (err) {
      console.error(err);
      toast.error("Delete failed");
    }
  };

  const previewSlug = generateSlug(name);

  return (
    <div className="casec-page">
      <div className="casec-header">
        <h2>Sections Manager</h2>
        <div className="casec-header-line"></div>
      </div>

      {/* CREATE */}
      <div className="casec-card">
        <div className="casec-card-title">Create Section</div>

        <input
          className="casec-input"
          placeholder="Section name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {name && (
          <div className="casec-slug-preview">
            slug: <span>{previewSlug}</span>
          </div>
        )}

        <button className="casec-primary-btn" onClick={handleCreate}>
          Create Section
        </button>
      </div>

      {/* LIST */}
      <div className="casec-card">
        <div className="casec-card-title">Existing Sections</div>

        {loading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : sections.length ? (
          <div className="casec-table">
            <div className="casec-table-head">
              <span>Name</span>
              <span>Slug</span>
              <span></span>
            </div>

            {sections.map((s) => (
              <div className="casec-table-row" key={s.slug}>
                <span className="casec-name">{s.name}</span>
                <span className="casec-slug">{s.slug}</span>

                {/* ✅ Critical Rule */}
                {!s.is_system && (
                  <button
                    className="casec-delete-btn"
                    onClick={() => handleDelete(s.slug)}
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="casec-empty">No sections created</div>
        )}
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="casec-skeleton-row">
      <div></div>
      <div></div>
      <div></div>
    </div>
  );
}
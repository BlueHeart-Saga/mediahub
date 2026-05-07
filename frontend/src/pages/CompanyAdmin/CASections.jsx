import { useEffect, useState } from "react";
import { apiFetch } from "../../api/client";
import toast from "react-hot-toast";
import "../../styles/CASections.css";
import { 
  Edit3, 
  ShieldAlert, 
  ShieldCheck, 
  Trash2, 
  Layout, 
  Hash,
  AlertTriangle,
  Plus
} from "lucide-react";

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
      const res = await apiFetch(`/sections/${slug}`, {
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

  const handleBan = async (slug) => {
    try {
      await apiFetch(`/sections/${slug}/ban`, {
        method: "PATCH",
      });
      toast.success("Section banned");
      loadSections();
    } catch (err) {
      console.error(err);
      toast.error("Failed to ban section");
    }
  };

  const handleActivate = async (slug) => {
    try {
      await apiFetch(`/sections/${slug}/activate`, {
        method: "PATCH",
      });
      toast.success("Section activated");
      loadSections();
    } catch (err) {
      console.error(err);
      toast.error("Failed to activate section");
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
          <div className="casec-loading">Loading sections...</div>
        ) : sections.length ? (
          <div className="casec-table-v2">
            <div className="casec-table-header">
              <span><Layout size={14} /> Name</span>
              <span><Hash size={14} /> Slug</span>
              <span>Status</span>
              <span className="text-right">Actions</span>
            </div>

            {sections.map((s) => (
              <div className={`casec-v2-row ${s.status}`} key={s.slug}>
                <div className="casec-name-cell">
                  <span className="font-bold">{s.name}</span>
                  {s.is_system && <span className="sys-badge">System</span>}
                </div>
                
                <span className="casec-slug-text">{s.slug}</span>
                
                <div className="casec-status-cell">
                  <span className={`status-pill ${s.status || 'active'}`}>
                    {s.status === 'banned' ? <AlertTriangle size={10} /> : <ShieldCheck size={10} />}
                    {s.status || 'active'}
                  </span>
                </div>

                <div className="casec-actions-v2">
                  {s.status === 'banned' ? (
                    <button 
                      onClick={() => handleActivate(s.slug)} 
                      className="casec-btn-v2 activate"
                      title="Reactivate"
                    >
                      <ShieldCheck size={16} />
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleBan(s.slug)} 
                      className="casec-btn-v2 ban"
                      title="Ban Section"
                    >
                      <ShieldAlert size={16} />
                    </button>
                  )}

                  {!s.is_system && (
                    <button 
                      onClick={() => handleDelete(s.slug)} 
                      className="casec-btn-v2 delete"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="casec-empty">No sections created for your company</div>
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
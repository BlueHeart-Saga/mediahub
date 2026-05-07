import { useEffect, useState } from "react";
import { apiFetch } from "../../api/client";
import toast from "react-hot-toast";
import "../../styles/Sections.css";
import { 
  Plus, 
  ShieldAlert, 
  ShieldCheck, 
  Trash2, 
  Layout, 
  Building,
  Hash,
  AlertTriangle
} from "lucide-react";

export default function Sections() {
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [sections, setSections] = useState([]);

  const [name, setName] = useState("");
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loadingSections, setLoadingSections] = useState(false);

  /* ---------------- LOAD COMPANIES ---------------- */

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const res = await apiFetch("/companies");
        if (res?.companies) {
          setCompanies(res.companies);
          if (res.companies.length) {
            setCompanyId(res.companies[0].company_id);
          }
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load companies");
      } finally {
        setLoadingCompanies(false);
      }
    };

    loadCompanies();
  }, []);

  /* ---------------- LOAD SECTIONS ---------------- */

  const loadSections = async (cid) => {
    if (!cid) return;

    setLoadingSections(true);

    try {
      const res = await apiFetch(`/sections?company_id=${cid}`);
      if (res?.sections) setSections(res.sections);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load sections");
    } finally {
      setLoadingSections(false);
    }
  };

  useEffect(() => {
    loadSections(companyId);
  }, [companyId]);

  /* ---------------- CREATE SECTION ---------------- */

  const handleCreate = async () => {
    if (!companyId) {
      toast.error("Select company first");
      return;
    }

    if (!name.trim()) {
      toast.error("Section name required");
      return;
    }

    try {
      const res = await apiFetch("/sections", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          company_id: companyId,
        }),
      });

      if (res?.detail) {
        toast.error(res.detail);
        return;
      }

      toast.success("Section created");
      setName("");
      loadSections(companyId);

    } catch (err) {
      console.error(err);
      toast.error("Creation failed");
    }
  };

  /* ---------------- DELETE SECTION ---------------- */

  const handleDelete = async (slug) => {
    try {
      await apiFetch(`/sections/${slug}?company_id=${companyId}`, {
        method: "DELETE",
      });

      toast.success("Section deleted");
      loadSections(companyId);

    } catch (err) {
      console.error(err);
      toast.error("Delete failed");
    }
  };

  const handleBan = async (slug) => {
    try {
      await apiFetch(`/sections/${slug}/ban?company_id=${companyId}`, {
        method: "PATCH",
      });
      toast.success("Section banned");
      loadSections(companyId);
    } catch (err) {
      console.error(err);
      toast.error("Failed to ban section");
    }
  };

  const handleActivate = async (slug) => {
    try {
      await apiFetch(`/sections/${slug}/activate?company_id=${companyId}`, {
        method: "PATCH",
      });
      toast.success("Section activated");
      loadSections(companyId);
    } catch (err) {
      console.error(err);
      toast.error("Failed to activate section");
    }
  };

  return (
    <div className="sec-page">

      <div className="sec-header">
        <h2>Sections Manager</h2>
      </div>

      {/* ---------- Controls Row ---------- */}

      <div className="sec-controls">

        {loadingCompanies ? (
          <div className="sec-skeleton-input"></div>
        ) : (
          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="sec-select"
          >
            {companies.map((c) => (
              <option key={c.company_id} value={c.company_id}>
                {c.name} ({c.company_id})
              </option>
            ))}
          </select>
        )}

        <input
          placeholder="New Section Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="sec-input"
        />

        <button onClick={handleCreate} className="sec-primary-btn">
          Create Section
        </button>

      </div>

      {/* ---------- Sections List ---------- */}

      <div className="sec-table-v2">
        <div className="sec-table-header">
          <span><Layout size={14} /> Name</span>
          <span><Hash size={14} /> Slug</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>

        {loadingSections ? (
          <div className="sec-loading-state">Loading sections...</div>
        ) : sections.length ? (
          sections.map((s) => (
            <div key={s.slug} className={`sec-v2-row ${s.status}`}>
              <div className="sec-name-cell">
                <span className="font-bold">{s.name}</span>
                {s.is_system && <span className="sys-badge">System</span>}
              </div>
              
              <span className="sec-slug-text">{s.slug}</span>
              
              <div className="sec-status-cell">
                <span className={`status-pill ${s.status || 'active'}`}>
                  {s.status === 'banned' ? <AlertTriangle size={10} /> : <ShieldCheck size={10} />}
                  {s.status || 'active'}
                </span>
              </div>

              <div className="sec-actions-v2">
                {s.status === 'banned' ? (
                  <button 
                    onClick={() => handleActivate(s.slug)} 
                    className="sec-btn-v2 activate"
                    title="Reactivate"
                  >
                    <ShieldCheck size={16} />
                  </button>
                ) : (
                  <button 
                    onClick={() => handleBan(s.slug)} 
                    className="sec-btn-v2 ban"
                    title="Ban Section"
                  >
                    <ShieldAlert size={16} />
                  </button>
                )}

                {!s.is_system && (
                  <button 
                    onClick={() => handleDelete(s.slug)} 
                    className="sec-btn-v2 delete"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="sec-empty">No sections found for this company</div>
        )}
      </div>

    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="sec-row skeleton">
      <div></div>
      <div></div>
      <div></div>
    </div>
  );
}
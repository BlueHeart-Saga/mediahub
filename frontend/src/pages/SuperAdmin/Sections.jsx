import { useEffect, useState } from "react";
import { apiFetch } from "../../api/client";
import toast from "react-hot-toast";
import "../../styles/Sections.css";

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

      <div className="sec-table">

        <div className="sec-table-head">
          <span>Name</span>
          <span>Slug</span>
          <span></span>
        </div>

        {loadingSections ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : sections.length ? (
          sections.map((s) => (
            <div key={s.slug} className="sec-row">

              <span>{s.name}</span>
              <span className="muted">{s.slug}</span>

              {s.is_system ? (
                <span className="sec-badge">System</span>
              ) : (
                <button
                  onClick={() => handleDelete(s.slug)}
                  className="sec-delete-btn"
                >
                  Delete
                </button>
              )}

            </div>
          ))
        ) : (
          <div className="sec-empty">No sections found</div>
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
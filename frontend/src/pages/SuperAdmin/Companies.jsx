import { useEffect, useState } from "react";
import { apiFetch } from "../../api/client";
import toast from "react-hot-toast";
import "../../styles/Companies.css";
import { 
  Edit3, 
  ShieldAlert, 
  ShieldCheck, 
  Trash2, 
  Archive,
  CheckCircle2,
  XCircle
} from "lucide-react";

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState({ name: "", number: "", prefix: "" });
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", number: "" });

  const loadCompanies = async () => {
    try {
      const res = await apiFetch("/companies");
      if (res?.companies) setCompanies(res.companies);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load companies");
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const handleCreate = async () => {
    setError("");

    if (!form.name || !form.number) {
      const msg = "Missing required fields";
      setError(msg);
      toast.error(msg);
      return;
    }

    try {
      const res = await apiFetch("/companies", {
        method: "POST",
        body: JSON.stringify(form),
      });

      if (res?.company_id) {
        toast.success("Company created");
        loadCompanies();
        setForm({ name: "", number: "", prefix: "" });
        return;
      }

      if (res?.detail) {
        setError(res.detail);
        toast.error(res.detail);
      }
    } catch (err) {
      console.error(err);
      toast.error("Creation failed");
    }
  };

  const startEdit = (company) => {
    setEditing(company.company_id);
    setEditForm({ name: company.name, number: company.number });
  };

  const saveEdit = async (company_id) => {
    try {
      const res = await apiFetch(`/companies/${company_id}`, {
        method: "PUT",
        body: JSON.stringify(editForm),
      });

      if (res?.detail) {
        setError(res.detail);
        toast.error(res.detail);
        return;
      }

      toast.success("Company updated");
      setEditing(null);
      loadCompanies();
    } catch (err) {
      console.error(err);
      toast.error("Update failed");
    }
  };

  const suspendCompany = async (company_id) => {
    await apiFetch(`/companies/${company_id}/suspend`, { method: "PATCH" });
    toast.success("Company suspended");
    loadCompanies();
  };

  const activateCompany = async (company_id) => {
    await apiFetch(`/companies/${company_id}/activate`, { method: "PATCH" });
    toast.success("Company activated");
    loadCompanies();
  };

  const softDeleteCompany = async (company_id) => {
    await apiFetch(`/companies/${company_id}`, { method: "DELETE" });
    toast.success("Company soft deleted");
    loadCompanies();
  };

  const permanentDeleteCompany = async (company_id) => {
    await apiFetch(`/companies/${company_id}/permanent`, {
      method: "DELETE",
    });

    toast.success("Company permanently deleted");
    loadCompanies();
  };

  return (
    <div className="cmp-page">

      <div className="cmp-header">
        <h2>Companies Management</h2>
        <div className="cmp-skeleton-line"></div>
      </div>

      {/* Create Panel */}
      <div className="cmp-card">
        <div className="cmp-card-title">Create Company</div>

        <div className="cmp-row">
          <input
            placeholder="Company Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <input
            placeholder="Company Number"
            value={form.number}
            maxLength={6}
            onChange={(e) => {
              const value = e.target.value;
              if (!/^\d*$/.test(value)) return;
              setForm({ ...form, number: value });
            }}
          />

          <input
            placeholder="Prefix"
            value={form.prefix}
            onChange={(e) => setForm({ ...form, prefix: e.target.value })}
          />
        </div>

        <button className="cmp-primary-btn" onClick={handleCreate}>
          Create
        </button>

        {error && <p className="cmp-error">{error}</p>}
      </div>

      {/* Companies Table */}
      <div className="cmp-card">
        <div className="cmp-card-title">All Companies</div>

        <table className="cmp-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Number</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {companies.map((c) => (
              <tr key={c.company_id}>
                <td>{c.company_id}</td>

                <td>
                  {editing === c.company_id ? (
                    <input
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                    />
                  ) : (
                    c.name
                  )}
                </td>

                <td>
                  {editing === c.company_id ? (
                    <input
                      value={editForm.number}
                      onChange={(e) =>
                        setEditForm({ ...editForm, number: e.target.value })
                      }
                    />
                  ) : (
                    c.number
                  )}
                </td>

                <td>{c.status}</td>

                <td className="cmp-actions-v2">
                  <div className="cmp-v2-flex-container">
                    {editing === c.company_id ? (
                      <>
                        <button 
                          className="cmp-v2-action-btn cmp-v2-confirm" 
                          onClick={() => saveEdit(c.company_id)}
                          title="Save Changes"
                        >
                          <CheckCircle2 size={16} />
                        </button>
                        <button 
                          className="cmp-v2-action-btn cmp-v2-cancel" 
                          onClick={() => setEditing(null)}
                          title="Cancel"
                        >
                          <XCircle size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          className="cmp-v2-action-btn cmp-v2-edit" 
                          onClick={() => startEdit(c)}
                          title="Edit Company"
                        >
                          <Edit3 size={16} />
                        </button>

                        {c.status === "active" ? (
                          <button 
                            className="cmp-v2-action-btn cmp-v2-suspend" 
                            onClick={() => suspendCompany(c.company_id)}
                            title="Suspend Company"
                          >
                            <ShieldAlert size={16} />
                          </button>
                        ) : (
                          <button 
                            className="cmp-v2-action-btn cmp-v2-activate" 
                            onClick={() => activateCompany(c.company_id)}
                            title="Activate Company"
                          >
                            <ShieldCheck size={16} />
                          </button>
                        )}

                        <button 
                          className="cmp-v2-action-btn cmp-v2-archive" 
                          onClick={() => softDeleteCompany(c.company_id)}
                          title="Soft Delete"
                        >
                          <Archive size={16} />
                        </button>

                        <button
                          className="cmp-v2-action-btn cmp-v2-danger"
                          onClick={() => permanentDeleteCompany(c.company_id)}
                          title="Permanent Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!companies.length && (
          <div className="cmp-empty">No companies created</div>
        )}
      </div>

    </div>
  );
}
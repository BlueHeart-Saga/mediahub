import { useEffect, useState } from "react";
import { apiFetch } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import "../../styles/Content.css";

export default function Content() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const [companies, setCompanies] = useState([]);
  const [sections, setSections] = useState([]);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);

  const [companyId, setCompanyId] = useState("");
  const [section, setSection] = useState("");
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  /* ---------------- LOADERS ---------------- */

  const loadCompanies = async () => {
    if (!isSuperAdmin) return;

    try {
      const res = await apiFetch("/companies");
      if (res?.companies) setCompanies(res.companies);
    } catch {
      toast.error("Failed to load companies");
    }
  };

  const loadSections = async (cid) => {
    try {
      const url = cid
        ? `/sections?company_id=${cid}`
        : "/sections";

      const res = await apiFetch(url);
      if (res?.sections) setSections(res.sections);
    } catch {
      toast.error("Failed to load sections");
    }
  };

  const loadCategories = async (cid, slug) => {
  if (!slug) {
    setCategories([]);
    return;
  }

  try {
    const url = cid
      ? `/categories?section_slug=${slug}&company_id=${cid}`
      : `/categories?section_slug=${slug}`;

    const res = await apiFetch(url);

    if (res?.categories) setCategories(res.categories);
    else setCategories([]);
  } catch {
    toast.error("Failed to load categories");
  }
};

  const loadContent = async (cid) => {
    try {
      const res = await apiFetch(
        cid ? `/content?company_id=${cid}` : "/content"
      );

      if (res?.items) setItems(res.items);
    } catch {
      toast.error("Failed to load content");
    }
  };

  useEffect(() => {
    loadCompanies();
    loadSections("");
    loadCategories("");
    loadContent("");
  }, []);

  const addImageBlock = () =>
  setBlocks([...blocks, { type: "image", file: null, preview: "", url: "" }]);

const addVideoBlock = () =>
  setBlocks([...blocks, { type: "video", file: null, preview: "", url: "" }]);

  const addTextBlock = () =>
    setBlocks([...blocks, { type: "text", value: "" }]);

const addHeadingBlock = () =>
  setBlocks([...blocks, { type: "heading", value: "" }]);

const addQuoteBlock = () =>
  setBlocks([...blocks, { type: "quote", value: "" }]);

const addDividerBlock = () =>
  setBlocks([...blocks, { type: "divider" }]);

const addMetaBlock = () =>
  setBlocks([...blocks, { type: "meta", data: {} }]);


  const updateBlock = (index, key, value) => {
    const copy = [...blocks];
    copy[index][key] = value;
    setBlocks(copy);
  };

const handleFileSelect = async (index, file) => {
    if (!file) return;

    const preview = URL.createObjectURL(file);

    const formData = new FormData();
    formData.append("file", file);

    const res = await apiFetch("/upload", {
      method: "POST",
      body: formData,
      isFormData: true,
    });

    if (!res?.url) {
      toast.error("Upload failed");
      return;
    }

    setBlocks((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], preview, url: res.url };
      return copy;
    });

    toast.success("Upload complete");
  };


  const loadIntoEditor = (item) => {
    setEditingId(item._id);
    setTitle(item.title);
    setSection(item.section_slug);
    setCategory(item.category_slug);
    setBlocks(item.blocks || []);

    if (isSuperAdmin) {
      setCompanyId(item.company_id);
      loadSections(item.company_id);
      loadCategories(item.company_id, item.section_slug);
    } else {
      loadCategories("", item.section_slug);
    }
  };

 /* ---------------- CREATE / UPDATE ---------------- */

  const handleSubmit = async (mode) => {
  setError("");

  if (!title || !section || !category) {
    const msg = "Missing required fields";
    setError(msg);
    toast.error(msg);
    return;
  }

  try {
    let res;

    if (editingId) {
      res = await apiFetch(`/content/${editingId}`, {
        method: "PUT",
        body: JSON.stringify({
          title,
          blocks,
          ...(mode === "publish" && { status: "published" }),
        }),
      });

      if (res?.detail) {
        setError(res.detail);
        toast.error(res.detail);
        return;
      }

      toast.success(
        mode === "publish"
          ? "Content updated & published"
          : "Draft updated"
      );

      setEditingId(null);

    } else {
      res = await apiFetch("/content", {
        method: "POST",
        body: JSON.stringify({
          title,
          section_slug: section,
          category_slug: category,
          blocks,
          status: mode === "publish" ? "published" : "draft",
          company_id: isSuperAdmin ? companyId : undefined,
        }),
      });

      if (res?.detail) {
        setError(res.detail);
        toast.error(res.detail);
        return;
      }

      toast.success(
        mode === "publish"
          ? "Content published"
          : "Draft created"
      );
    }

    setTitle("");
    setBlocks([]);
    loadContent(companyId);

  } catch {
    toast.error("Operation failed");
  }
};

  const publish = async (id) => {
    await apiFetch(`/content/${id}/publish`, { method: "PATCH" });
    toast.success("Content published");
    loadContent();
  };

  const remove = async (id) => {
    await apiFetch(`/content/${id}`, { method: "DELETE" });
    toast.success("Content removed");
    loadContent();
  };

  return (
    <div className="cb-page">

      <div className="cb-header">
        <h2>Content Builder</h2>
        <div className="cb-skeleton-line"></div>
      </div>

      {/* Composer Panel */}
      <div className="cb-card">
        <div className="cb-card-title">Create Draft</div>

        {isSuperAdmin && (
          <select
            className="cb-select"
            value={companyId}
            onChange={(e) => {
              const cid = e.target.value;
              setCompanyId(cid);
              setSection("");
              setCategory("");
              loadSections(cid);
              loadContent(cid);
            }}
          >
            <option value="">Select Company</option>
            {companies.map((c) => (
              <option key={c.company_id} value={c.company_id}>
                {c.name}
              </option>
            ))}
          </select>
        )}

        <input
          className="cb-title-input"
          placeholder="Article title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className="cb-row">
          <select
            className="cb-select"
            value={section}
            onChange={(e) => {
              const slug = e.target.value;
              setSection(slug);
              setCategory("");
              loadCategories(companyId, slug); 
            }}
          >
            <option value="">Select Section</option>
            {sections.map((s) => (
              <option key={s.slug} value={s.slug}>{s.name}</option>
            ))}
          </select>

          <select
            className="cb-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Select Category</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="cb-toolbar">
  <button onClick={addTextBlock}>Text</button>
  <button onClick={addHeadingBlock}>Heading</button>
  <button onClick={addImageBlock}>Image</button>
  <button onClick={addVideoBlock}>Video</button>
  <button onClick={addQuoteBlock}>Quote</button>
  <button onClick={addDividerBlock}>Divider</button>
</div>

        <div className="cb-blocks">
  {blocks.map((block, i) => (
    <div className="cb-block" key={i}>

      {/* TEXT */}
      {block.type === "text" && (
        <textarea
          placeholder="Write text..."
          value={block.value || ""}
          onChange={(e) => updateBlock(i, "value", e.target.value)}
        />
      )}

      {/* HEADING */}
      {block.type === "heading" && (
        <input
          className="cb-heading-input"
          placeholder="Heading..."
          value={block.value || ""}
          onChange={(e) => updateBlock(i, "value", e.target.value)}
        />
      )}

      {/* QUOTE */}
      {block.type === "quote" && (
        <textarea
          className="cb-quote-input"
          placeholder="Quote..."
          value={block.value || ""}
          onChange={(e) => updateBlock(i, "value", e.target.value)}
        />
      )}

      {/* IMAGE */}
      {block.type === "image" && (
        <>
          {block.preview && (
            <img className="cb-preview" src={block.preview} />
          )}

          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileSelect(i, e.target.files[0])}
          />
        </>
      )}

      {/* VIDEO */}
      {block.type === "video" && (
        <>
          {block.preview && (
            <video className="cb-preview" controls src={block.preview} />
          )}

          <input
            type="file"
            accept="video/*"
            onChange={(e) => handleFileSelect(i, e.target.files[0])}
          />
        </>
      )}

      {/* DIVIDER */}
      {block.type === "divider" && (
        <div className="cb-divider">────────────</div>
      )}

      {/* REMOVE BLOCK */}
      <button
        className="cb-remove"
        onClick={() => {
          const copy = [...blocks];
          copy.splice(i, 1);
          setBlocks(copy);
        }}
      >
        Remove
      </button>

    </div>
  ))}
</div>

        <div className="cb-actions-row">
  <button
    className="cb-secondary-btn"
    onClick={() => handleSubmit("draft")}
  >
    Create Draft
  </button>

  <button
    className="cb-primary-btn"
    onClick={() => {
      if (window.confirm("Publish immediately?")) {
        handleSubmit("publish");
      }
    }}
  >
    Direct Post
  </button>
</div>
     

        {error && <p className="cb-error">{error}</p>}
      </div>

      {/* Content Board */}
      <div className="cb-card">
        <div className="cb-card-title">All Content</div>

        <div className="cb-list">
          {items.map((item) => (
            <div className="cb-list-item" key={item._id}>

              <div className="cb-item-main">
                <div className="cb-item-title">{item.title}</div>
                <div className="cb-item-meta">
                  {item.section_slug} / {item.category_slug}
                </div>
                <div className="cb-item-status">
                  Status: {item.status}
                </div>
              </div>

              <div className="cb-item-actions">

                <button onClick={() => loadIntoEditor(item)}>
    Edit
  </button>
                {item.status !== "published" && (
                  <button onClick={() => publish(item._id)}>
                    Publish
                  </button>
                )}


                <button className="danger" onClick={() => remove(item._id)}>
                  Delete
                </button>
              </div>

            </div>
          ))}

          {!items.length && (
            <div className="cb-empty">No content created</div>
          )}
        </div>
      </div>

    </div>
  );
}
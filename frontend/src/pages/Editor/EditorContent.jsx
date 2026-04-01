import { useEffect, useState, useCallback, useRef } from "react";
import { apiFetch } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove
} from "@dnd-kit/sortable";
import {
  restrictToVerticalAxis,
  restrictToParentElement
} from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { v4 as uuid } from "uuid";
import toast from "react-hot-toast";
import "../../styles/EditorContent.css";

export default function EditorContent() {
  const { user } = useAuth();
  
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [coverImage, setCoverImage] = useState(null);
  const [coverImageFile, setCoverImageFile] = useState(null);

  const [sections, setSections] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sectionSlug, setSectionSlug] = useState("");
  const [categorySlug, setCategorySlug] = useState("");

  const [blocks, setBlocks] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingSections, setLoadingSections] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");

  // Get company ID from user context
  const companyId = user?.company_id;

  const canvasRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  /* ---------------- DATA LOADING ---------------- */

  // Load sections when component mounts or companyId changes
  useEffect(() => {
    if (companyId) {
      loadSections();
    } else {
      console.log("No company ID available for editor");
      toast.error("Company ID not found. Please check your user profile.");
    }
  }, [companyId]);

  // Load categories when section changes
  useEffect(() => {
    if (sectionSlug && companyId) {
      loadCategories(sectionSlug);
    } else {
      setCategories([]);
    }
  }, [sectionSlug, companyId]);

  // Load recent content
  useEffect(() => {
    if (companyId) {
      loadContent();
    }
  }, [companyId]);

  const loadSections = async () => {
    if (!companyId) {
      console.error("Cannot load sections: No company ID");
      return;
    }

    try {
      setLoadingSections(true);
      console.log("Loading sections for company:", companyId);
      
      // FIXED: Use the correct endpoint for sections
      // Based on your backend, sections might be under a different route
      // Try these options:
      
      // Option 1: If sections are part of content management
      const res = await apiFetch(`/sections?company_id=${companyId}`);
      
      // Option 2: If sections are under a different prefix
      // const res = await apiFetch(`/content/sections?company_id=${companyId}`);
      
      // Option 3: If you need to get sections from a public endpoint
      // const res = await apiFetch(`/public/${companyId}/sections`);
      
      console.log("Sections response:", res);
      
      // Handle different response structures
      if (res?.sections && Array.isArray(res.sections)) {
        setSections(res.sections);
      } else if (Array.isArray(res)) {
        setSections(res);
      } else {
        console.warn("Unexpected sections response format:", res);
        setSections([]);
      }
      
    } catch (error) {
      console.error("Failed to load sections:", error);
      
      // Check if it's a 403 error
      if (error.status === 403) {
        toast.error("You don't have permission to access sections. Please check your user role.");
      } else {
        toast.error("Failed to load sections");
      }
      
      setSections([]);
    } finally {
      setLoadingSections(false);
    }
  };

  const loadCategories = async (slug) => {
    if (!slug || !companyId) {
      setCategories([]);
      return;
    }

    try {
      setLoadingCategories(true);
      console.log(`Loading categories for section: ${slug}, company: ${companyId}`);
      
      // FIXED: Try different endpoint patterns for categories
      const res = await apiFetch(`/categories?section_slug=${slug}&company_id=${companyId}`);
      
      console.log("Categories response:", res);
      
      // Handle different response structures
      if (res?.categories && Array.isArray(res.categories)) {
        setCategories(res.categories);
      } else if (Array.isArray(res)) {
        setCategories(res);
      } else {
        console.warn("Unexpected categories response format:", res);
        setCategories([]);
      }
      
    } catch (error) {
      console.error("Failed to load categories:", error);
      
      if (error.status === 403) {
        toast.error("You don't have permission to access categories");
      } else {
        toast.error("Failed to load categories");
      }
      
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadContent = async () => {
    if (!companyId) return;
    
    try {
      // FIXED: Use the correct content endpoint
      const res = await apiFetch(`/content?limit=5&company_id=${companyId}`);
      if (res?.items) {
        setItems(res.items);
      } else if (Array.isArray(res)) {
        setItems(res);
      }
    } catch (error) {
      console.error("Failed to load recent content:", error);
    }
  };

  /* ---------------- BLOCK MANAGEMENT ---------------- */

  const addBlock = (type) => {
    const baseData = (() => {
      switch (type) {
        case "text":
        case "heading":
        case "subheading":
        case "quote":
        case "code":
          return { value: "" };
        case "pull-quote":
          return { value: "" };
        case "image":
        case "video":
        case "embed":
          return { url: "" };
        case "list":
          return { items: [], type: "bullet" };
        case "bullet-list":
        case "numbered-list":
          return { items: [""] };
        case "cta":
          return { label: "", url: "" };
        case "divider":
          return {};
        case "callout":
          return { value: "", type: "info" };
        default:
          return {};
      }
    })();

    setBlocks(prev => [...prev, { id: uuid(), type, data: baseData }]);
    
    // Scroll to new block
    setTimeout(() => {
      if (canvasRef.current) {
        canvasRef.current.scrollTop = canvasRef.current.scrollHeight;
      }
    }, 100);
  };

  const updateBlock = (id, patch) => {
    setBlocks(prev =>
      prev.map(b =>
        b.id === id ? { ...b, data: { ...b.data, ...patch } } : b
      )
    );
  };

  const removeBlock = (id) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
  };

  const duplicateBlock = (id) => {
    const block = blocks.find(b => b.id === id);
    if (block) {
      const newBlock = {
        ...block,
        id: uuid(),
        data: JSON.parse(JSON.stringify(block.data))
      };
      setBlocks(prev => [...prev, newBlock]);
    }
  };

  /* ---------------- LIST MANAGEMENT ---------------- */

  const addListItem = (blockId) => {
    setBlocks(prev =>
      prev.map(b => {
        if (b.id === blockId) {
          return {
            ...b,
            data: {
              ...b.data,
              items: [...(b.data.items || []), ""]
            }
          };
        }
        return b;
      })
    );
  };

  const updateListItem = (blockId, index, value) => {
    setBlocks(prev =>
      prev.map(b => {
        if (b.id === blockId) {
          const newItems = [...(b.data.items || [])];
          newItems[index] = value;
          return {
            ...b,
            data: {
              ...b.data,
              items: newItems
            }
          };
        }
        return b;
      })
    );
  };

  const removeListItem = (blockId, index) => {
    setBlocks(prev =>
      prev.map(b => {
        if (b.id === blockId) {
          const newItems = (b.data.items || []).filter((_, i) => i !== index);
          return {
            ...b,
            data: {
              ...b.data,
              items: newItems
            }
          };
        }
        return b;
      })
    );
  };

  /* ---------------- TAG MANAGEMENT ---------------- */

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleTagKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
  };

  /* ---------------- DRAG REORDER ---------------- */

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;

    setBlocks(prev => {
      const oldIndex = prev.findIndex(b => b.id === active.id);
      const newIndex = prev.findIndex(b => b.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  /* ---------------- FILE UPLOAD ---------------- */

  const uploadFile = async (file, type = "image") => {
    const form = new FormData();
    form.append("file", file);

    try {
      const res = await apiFetch("/upload", {
        method: "POST",
        body: form,
        isFormData: true
      });

      if (!res?.url) {
        toast.error("Upload failed");
        return null;
      }

      return res.url;
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Upload failed");
      return null;
    }
  };

  const handleCoverUpload = async (file) => {
    const url = await uploadFile(file);
    if (url) {
      setCoverImage(url);
      setCoverImageFile(file);
    }
  };

  /* ---------------- SMART PASTE ---------------- */

  const handlePaste = async (e) => {
    const items = e.clipboardData.items;

    for (let item of items) {
      if (item.type.startsWith("image")) {
        const file = item.getAsFile();
        const url = await uploadFile(file);
        if (url) {
          addBlockWithData("image", { url });
        }
        return;
      }

      if (item.type.startsWith("video")) {
        const file = item.getAsFile();
        const url = await uploadFile(file, "video");
        if (url) {
          addBlockWithData("video", { url });
        }
        return;
      }
    }

    const text = e.clipboardData.getData("text");
    if (text) {
      // Detect if it's a URL
      if (text.match(/^https?:\/\/.+/)) {
        // Check if it's an image URL
        if (text.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)) {
          addBlockWithData("image", { url: text });
        } else {
          addBlockWithData("embed", { url: text });
        }
      } else {
        addBlockWithData("text", { value: text });
      }
    }
  };

  const addBlockWithData = (type, data) => {
    setBlocks(prev => [...prev, { id: uuid(), type, data }]);
  };

  /* ---------------- SUBMIT ---------------- */

  const handleSubmit = async (status) => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    if (!coverImage) {
      toast.error("Cover image is required");
      return;
    }

    if (!sectionSlug || !categorySlug) {
      toast.error("Please select section and category");
      return;
    }

    if (!blocks.length) {
      toast.error("Add at least one content block");
      return;
    }

    if (!companyId) {
      toast.error("Company ID not found. Cannot save content.");
      return;
    }

    setLoading(true);

    const payload = {
      title: title.trim(),
      subtitle: subtitle.trim(),
      cover_image: coverImage,
      section_slug: sectionSlug,
      category_slug: categorySlug,
      blocks,
      tags,
      status,
      seo: {
        meta_title: title.trim(),
        meta_description: subtitle.trim() || title.trim()
      },
      settings: {
        allow_comments: true,
        is_featured: false
      },
      company_id: companyId
    };

    console.log("Submitting content with payload:", payload);

    try {
      const res = await apiFetch("/content", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (res?.detail) {
        toast.error(res.detail);
        setLoading(false);
        return;
      }

      toast.success(status === "published" ? "Content published!" : "Draft saved");
      
      resetEditor();
      loadContent();
    } catch (error) {
      console.error("Submit failed:", error);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const resetEditor = () => {
    setTitle("");
    setSubtitle("");
    setCoverImage(null);
    setCoverImageFile(null);
    setBlocks([]);
    setTags([]);
    setSectionSlug("");
    setCategorySlug("");
  };

  /* ---------------- RENDER ---------------- */

  // Show loading or company ID not found message
  if (!companyId) {
    return (
      <div className="li-page" style={{ padding: "40px", textAlign: "center" }}>
        <h2>Company ID Not Found</h2>
        <p>Your user account doesn't have a company assigned.</p>
        <p>Please contact an administrator to assign you to a company.</p>
      </div>
    );
  }

  return (
    <div className="li-page">

      {/* Hero Section */}
      <div className="li-hero">
        <CoverUploader
          cover={coverImage}
          coverFile={coverImageFile}
          onUpload={handleCoverUpload}
        />

        <textarea
          className="li-title-input"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          rows={1}
          autoFocus
        />

        <textarea
          className="li-subtitle-input"
          placeholder="Subtitle (optional)"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          rows={1}
        />

        <div className="li-meta-row">
          <select
            value={sectionSlug}
            onChange={(e) => {
              const slug = e.target.value;
              setSectionSlug(slug);
              setCategorySlug(""); // Reset category when section changes
            }}
            disabled={loadingSections}
          >
            <option value="">Select section</option>
            {sections.length > 0 ? (
              sections.map(s => (
                <option key={s.slug || s.id} value={s.slug}>{s.name}</option>
              ))
            ) : (
              <option value="" disabled>No sections available</option>
            )}
          </select>

          <select
            value={categorySlug}
            onChange={(e) => setCategorySlug(e.target.value)}
            disabled={!sectionSlug || loadingCategories || categories.length === 0}
          >
            <option value="">Select category</option>
            {categories.length > 0 ? (
              categories.map(c => (
                <option key={c.slug || c.id} value={c.slug}>{c.name}</option>
              ))
            ) : (
              sectionSlug && <option value="" disabled>No categories available</option>
            )}
          </select>
        </div>

        <TopToolbar onAdd={addBlock} />
      </div>

      {/* Tags */}
      <div className="li-tags">
        {tags.map(tag => (
          <span key={tag} className="li-tag">
            {tag}
            <button onClick={() => removeTag(tag)}>×</button>
          </span>
        ))}
        <input
          className="li-tag-input"
          placeholder="Add tags..."
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleTagKeyDown}
          onBlur={addTag}
        />
      </div>

      {/* Canvas */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      >
        <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
          <div
            ref={canvasRef}
            className="li-canvas"
            onPaste={handlePaste}
          >
            {blocks.length === 0 ? (
              <div className="li-empty">
                Start writing or paste content (⌘V)
              </div>
            ) : (
              blocks.map(block => (
                <SortableBlock
                  key={block.id}
                  block={block}
                  updateBlock={updateBlock}
                  removeBlock={removeBlock}
                  duplicateBlock={duplicateBlock}
                  addListItem={addListItem}
                  updateListItem={updateListItem}
                  removeListItem={removeListItem}
                />
              ))
            )}
          </div>
        </SortableContext>
      </DndContext>

      {/* Action Bar */}
      <div className="li-actionbar">
        <button
          onClick={() => handleSubmit("draft")}
          className="li-btn-secondary"
          disabled={loading}
        >
          Save Draft
        </button>
        <button
          onClick={() => handleSubmit("published")}
          className="li-btn-primary"
          disabled={loading}
        >
          {loading ? "Publishing..." : "Publish"}
        </button>
      </div>

      {/* Recent Items */}
      {items.length > 0 && (
        <div className="li-items-list">
          <h3 className="li-items-header">Recent</h3>
          {items.map(item => (
            <div key={item.id} className="li-item">
              <div className="li-item-info">
                <h4>{item.title}</h4>
                <p>{new Date(item.created_at).toLocaleDateString()}</p>
              </div>
              <span className={`li-item-status ${item.status}`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- BLOCK COMPONENT ---------------- */

function SortableBlock({ block, updateBlock, removeBlock, duplicateBlock, addListItem, updateListItem, removeListItem }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0
  };

  const renderBlockContent = () => {
    switch (block.type) {
      case "text":
      case "heading":
      case "subheading":
      case "quote":
      case "pull-quote":
        return (
          <textarea
            placeholder={`Write your ${block.type}...`}
            value={block.data.value || ""}
            onChange={(e) => updateBlock(block.id, { value: e.target.value })}
            rows={block.type === "heading" ? 1 : 3}
          />
        );

      case "code":
        return (
          <textarea
            placeholder="Code..."
            value={block.data.value || ""}
            onChange={(e) => updateBlock(block.id, { value: e.target.value })}
            rows={6}
            spellCheck={false}
          />
        );

      case "image":
        return (
          <>
            {block.data.url && (
              <img
                src={block.data.url}
                alt=""
                className="li-image-preview"
              />
            )}
            <input
              placeholder="Image URL"
              value={block.data.url || ""}
              onChange={(e) => updateBlock(block.id, { url: e.target.value })}
            />
          </>
        );

      case "video":
        return (
          <input
            placeholder="Video URL"
            value={block.data.url || ""}
            onChange={(e) => updateBlock(block.id, { url: e.target.value })}
          />
        );

      case "embed":
        return (
          <input
            placeholder="Embed URL (YouTube, Vimeo, Twitter...)"
            value={block.data.url || ""}
            onChange={(e) => updateBlock(block.id, { url: e.target.value })}
          />
        );

      case "bullet-list":
      case "numbered-list":
        return (
          <div className="li-list-items">
            {(block.data.items || []).map((item, index) => (
              <div key={index} className="li-list-item">
                <span>{block.type === "bullet-list" ? "•" : `${index + 1}.`}</span>
                <input
                  value={item}
                  onChange={(e) => updateListItem(block.id, index, e.target.value)}
                  placeholder="List item..."
                />
                <button onClick={() => removeListItem(block.id, index)}>×</button>
              </div>
            ))}
            <button onClick={() => addListItem(block.id)} className="li-btn-secondary">
              + Add item
            </button>
          </div>
        );

      case "cta":
        return (
          <>
            <input
              placeholder="Button label"
              value={block.data.label || ""}
              onChange={(e) => updateBlock(block.id, { label: e.target.value })}
            />
            <input
              placeholder="Button URL"
              value={block.data.url || ""}
              onChange={(e) => updateBlock(block.id, { url: e.target.value })}
            />
          </>
        );

      case "divider":
        return <hr />;

      case "callout":
        return (
          <div className="li-callout">
            <textarea
              placeholder="Callout text..."
              value={block.data.value || ""}
              onChange={(e) => updateBlock(block.id, { value: e.target.value })}
              rows={2}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="li-block"
      data-type={block.type}
    >
      <div className="li-drag-handle" {...attributes} {...listeners}>
        ⋮⋮
      </div>

      {renderBlockContent()}

      <div className="li-block-actions">
        <button
          className="li-duplicate"
          onClick={() => duplicateBlock(block.id)}
          title="Duplicate"
        >
          ⎘
        </button>
        <button
          className="li-remove"
          onClick={() => removeBlock(block.id)}
          title="Remove"
        >
          ×
        </button>
      </div>
    </div>
  );
}

/* ---------------- TOOLBAR ---------------- */

function TopToolbar({ onAdd }) {
  const [showMore, setShowMore] = useState(false);

  const basicBlocks = [
    { type: "text", label: "Text" },
    { type: "heading", label: "Heading" },
    { type: "image", label: "Image" }
  ];

  const moreBlocks = [
    { type: "subheading", label: "Subheading" },
    { type: "quote", label: "Quote" },
    { type: "pull-quote", label: "Pull quote" },
    { type: "bullet-list", label: "Bullet list" },
    { type: "numbered-list", label: "Numbered list" },
    { type: "code", label: "Code" },
    { type: "video", label: "Video" },
    { type: "embed", label: "Embed" },
    { type: "cta", label: "CTA" },
    { type: "divider", label: "Divider" },
    { type: "callout", label: "Callout" }
  ];

  return (
    <div className="li-toolbar">
      {basicBlocks.map(block => (
        <button key={block.type} onClick={() => onAdd(block.type)}>
          {block.label}
        </button>
      ))}

      <button onClick={() => setShowMore(!showMore)} className="li-toolbar-more">
        {showMore ? "Less" : "More"} ▼
      </button>

      {showMore && (
        <div className="li-toolbar-more-blocks">
          {moreBlocks.map(block => (
            <button key={block.type} onClick={() => onAdd(block.type)}>
              {block.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- COVER UPLOADER ---------------- */

function CoverUploader({ cover, coverFile, onUpload }) {
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) onUpload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onUpload(file);
  };

  return (
    <div
      className={`li-cover ${!cover ? "empty" : ""}`}
      onClick={() => fileInputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {cover ? (
        <img src={cover} alt="Cover" />
      ) : (
        <div className="li-cover-placeholder">
          <span style={{ fontSize: 12, marginTop: 8, color: "#999" }}>
            or drag and drop
          </span>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />
    </div>
  );
}
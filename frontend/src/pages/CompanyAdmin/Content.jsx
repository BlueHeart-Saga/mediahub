// EditorContent.jsx - Fixed version with proper image URL handling and edit functionality
import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../api/client";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { v4 as uuid } from "uuid";
import toast from "react-hot-toast";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Code,
  Image as ImageIcon,
  Video,
  Link2,
  Hash,
  Plus,
  GripVertical,
  X,
  Copy,
  ChevronDown,
  ChevronUp,
  Upload,
  FileText,
  Heading1,
  Heading2,
  AlignLeft,
  Camera,
  MoreHorizontal,
  Save,
  Send,
  Eye,
  Clock,
  Tag,
  Layers,
  FolderOpen,
  Image as ImageIcon2,
  Trash2,
  RefreshCw,
  ExternalLink,
  Pencil,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import PreviewDemo from "../../components/PreviewDemo";

// Helper function to get image URL
const getImageUrl = (imageId) => {
  if (!imageId) return null;
  const API_BASE = import.meta.env.VITE_API_BASE || "";
  return `${API_BASE}/api/images/${imageId}`;
};

export default function EditorContent() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isSuperAdmin = user?.role === "super_admin";
  const isCompanyAdmin = user?.role === "company_admin";
  const isEditor = user?.role === "editor";

  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [coverImageId, setCoverImageId] = useState(null);
  const [coverImagePreview, setCoverImagePreview] = useState(null);
  const [coverImageInfo, setCoverImageInfo] = useState(null);
  const [isDraggingCover, setIsDraggingCover] = useState(false);

  const [sections, setSections] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sectionSlug, setSectionSlug] = useState("");
  const [categorySlug, setCategorySlug] = useState("");

  const [blocks, setBlocks] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [activeId, setActiveId] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageLibrary, setImageLibrary] = useState([]);
  const [showImageLibrary, setShowImageLibrary] = useState(false);
  const [activeBlockForImage, setActiveBlockForImage] = useState(null);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPostId, setEditingPostId] = useState(null);

  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const [autoSaveTimer, setAutoSaveTimer] = useState(null);
  const [currentDraftId, setCurrentDraftId] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Get company ID from user context or localStorage
  const companyId = isSuperAdmin ? selectedCompany : user?.company_id;

  useEffect(() => {
    if (isSuperAdmin) {
      loadCompanies();
    }
  }, []);

  const loadCompanies = async () => {
    try {
      const res = await apiFetch("/companies");
      setCompanies(res?.companies || []);
    } catch (err) {
      console.error("Failed to load companies");
    }
  };

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const coverFileInputRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor),
  );

  /* ---------------- DATA LOADING ---------------- */

  useEffect(() => {
    loadSections();
  }, [companyId]);

  useEffect(() => {
    if (isSuperAdmin) {
      setSectionSlug("");
      setCategorySlug("");
      setBlocks([]);
      setTitle("");
      setSubtitle("");
      setTags([]);
    }
  }, [companyId]);

  useEffect(() => {
    if (sectionSlug) {
      loadCategories(sectionSlug);
    } else {
      setCategories([]);
    }
  }, [sectionSlug, companyId]);

  useEffect(() => {
    if (companyId || isSuperAdmin) {
      loadImageLibrary();
    } else {
      setImageLibrary([]);
    }
  }, [companyId]);

  // Load recent content
  const loadRecentContent = useCallback(async () => {
    try {
      let url = "/content?limit=5";

      if (companyId) {
        url += `&company_id=${companyId}`;
      }

      // Editor → only their posts
      if (isEditor) {
        url += `&author_id=${user?.id}`;
      }

      const res = await apiFetch(url);
      setItems(res?.items || []);
    } catch (error) {
      console.error("Failed to load content:", error);
    }
  }, [companyId, isEditor, user?.id]);

  // Load recent content when company changes
  useEffect(() => {
    if (companyId || isSuperAdmin) {
      loadRecentContent();
    }
  }, [companyId, loadRecentContent]);

  const loadSections = async () => {
    try {
      // If super admin and no company selected → don't load sections
      if (isSuperAdmin && !companyId) {
        setSections([]);
        return;
      }

      const params = new URLSearchParams();

      // Always pass company_id when available
      if (companyId) {
        params.append("company_id", companyId);
      } else if (isSuperAdmin) {
        // Super admin with no company selected - don't make API call
        setSections([]);
        return;
      }

      const url = `/sections${params.toString() ? `?${params.toString()}` : ""}`;
      console.log("Loading sections from:", url); // Debug log

      const res = await apiFetch(url);
      setSections(res?.sections || []);
    } catch (err) {
      console.error("Failed to load sections:", err);
      if (err.status === 400) {
        // Handle case where company_id is required
        setSections([]);
      }
    }
  };

  // Update the loadCategories function
  const loadCategories = async (sectionSlug) => {
    try {
      if (isSuperAdmin && !companyId) {
        setCategories([]);
        return;
      }

      const params = new URLSearchParams();

      if (companyId) {
        params.append("company_id", companyId);
      }

      if (sectionSlug) {
        params.append("section_slug", sectionSlug);
      }

      const url = `/categories?${params.toString()}`;

      const res = await apiFetch(url);
      setCategories(res?.categories || []);
    } catch (err) {
      console.error("Failed to load categories:", err);
      setCategories([]);
    }
  };

  // Update the loadImageLibrary function
  const loadImageLibrary = async () => {
    try {
      setLoading(true);

      // Build URL with company_id
      let url = "/images?limit=20";
      const params = new URLSearchParams();

      // Add company_id if available
      if (companyId) {
        params.append("company_id", companyId);
      }

      const queryString = params.toString();
      if (queryString) {
        url += `&${queryString}`;
      }

      console.log("Loading image library from:", url); // Debug log

      const res = await apiFetch(url);

      if (res?.items) {
        const images = res.items.map((img) => ({
          id: img.id,
          file_id: img.file_id || img.id,
          filename: img.filename,
          width: img.width,
          height: img.height,
          size: img.size,
          format: img.format,
          uploaded_at: img.created_at || img.upload_date,
        }));
        setImageLibrary(images);
      }
    } catch (error) {
      console.error("Failed to load image library:", error);
      // Only show error if it's not a 400 (which might mean no company selected)
      if (error.status !== 400) {
        toast.error("Failed to load images");
      }
    } finally {
      setLoading(false);
    }
  };

  // Check URL for content ID on component mount
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/content\/([^\/]+)/);
    if (match && match[1]) {
      const contentId = match[1];
      loadPostForEdit(contentId);
    }
  }, []);

  // Function to load post for editing
  const loadPostForEdit = async (contentId) => {
    try {
      setLoading(true);
      const res = await apiFetch(`/content/${contentId}`);
      const post = res?.item || res;

      if (post) {
        setIsEditMode(true);
        setEditingPostId(contentId);

        // Populate all fields
        setTitle(post.title || "");
        setSubtitle(post.subtitle || "");
        setCoverImageId(post.cover_image_id || null);

        // Load cover image info if available
        if (post.cover_image_id) {
          setCoverImagePreview(getImageUrl(post.cover_image_id));
          setCoverImageInfo(post.cover_image_info);
        }

        setSectionSlug(post.section?.slug || post.section_slug || "");
        setCategorySlug(post.category?.slug || post.category_slug || "");
        setBlocks(post.blocks || []);
        setTags(post.tags || []);

        // If super admin, set company
        if (isSuperAdmin && post.company_id) {
          setSelectedCompany(post.company_id);
        }

        toast.success("Post loaded for editing");
      }
    } catch (error) {
      console.error("Failed to load post for editing:", error);
      toast.error("Failed to load post");
    } finally {
      setLoading(false);
    }
  };

  const getUserFriendlyError = (error) => {
    // Handle different error formats
    const errorMessage =
      error?.detail ||
      error?.message ||
      error?.toString() ||
      "Something went wrong";

    // Map common error messages to user-friendly versions
    const errorMap = {
      // Document errors
      "Document block .* requires either file_id or url":
        "Please upload a PDF or provide a valid PDF URL before publishing",
      "Only PDF files are allowed":
        "Only PDF files are supported. Please upload a PDF document.",
      "File too large. Max size: 100MB":
        "The PDF file is too large. Maximum size is 100MB.",

      // Image errors
      "Image not found":
        "The selected image could not be found. Please choose another image.",
      "Cover image is required": "Please add a cover image to your post",
      "Invalid image type":
        "Please upload a valid image file (JPG, PNG, GIF, WEBP, or SVG)",
      "File too large. Max size: 50MB":
        "The image is too large. Maximum size is 50MB.",

      // Content errors
      "Title is required": "Please add a title to your post",
      "Content blocks are required":
        "Please add at least one content block to your post",
      "Please select section and category":
        "Please choose a section and category for your post",
      "Cover image belongs to another company":
        "This image cannot be used - it belongs to another company",

      // Video/embed errors
      "Invalid URL": "Please enter a valid URL (YouTube, Vimeo, etc.)",
      "URL is required": "Please enter a video or embed URL",

      // Authentication errors
      "Authentication failed": "Your session has expired. Please log in again.",
      "Not authorized": "You don't have permission to perform this action",
      "Insufficient permissions": "You don't have the required permissions",

      // Company errors
      "User has no company assigned":
        "Your account is not associated with any company",
      "company_id is required": "Please select a company",

      // Network errors
      "Failed to fetch":
        "Network error. Please check your internet connection.",
      NetworkError: "Unable to connect to the server. Please try again.",
    };

    // Check for pattern matches
    for (const [pattern, friendlyMessage] of Object.entries(errorMap)) {
      const regex = new RegExp(pattern, "i");
      if (regex.test(errorMessage)) {
        return friendlyMessage;
      }
    }

    // Return the original error if no mapping found, but make it look nicer
    return errorMessage.charAt(0).toUpperCase() + errorMessage.slice(1);
  };

  /* ---------------- BLOCK MANAGEMENT ---------------- */

  const addBlock = (type, position = "end") => {
    const baseData = {
      text: { value: "" },
      heading: { value: "" },
      subheading: { value: "" },
      quote: { value: "" },
      "pull-quote": { value: "" },
      code: { value: "", language: "javascript" },
      image: { file_id: null, alt: "", caption: "" },
      video: {
        url: "",
        caption: "",
        platform: "",
        embed_url: "",
        thumbnail_url: "",
      },
      embed: { url: "", caption: "", platform: "", embed_url: "" },
      document: {
        file_id: null,
        url: "",
        title: "",
        description: "",
        size: null,
        page_count: null,
        open_in_new_tab: true,
        show_preview: false,
      },
      "bullet-list": { items: [""] },
      "numbered-list": { items: [""] },
      cta: { label: "", url: "", style: "primary" },
      divider: {},
      callout: { value: "", type: "info" },
    };

    const newBlock = {
      id: uuid(),
      type,
      data: baseData[type] || {},
    };

    setBlocks((prev) =>
      position === "end" ? [...prev, newBlock] : [newBlock, ...prev],
    );

    setTimeout(() => {
      if (canvasRef.current && position === "end") {
        canvasRef.current.scrollTop = canvasRef.current.scrollHeight;
      }
    }, 100);
  };

  const updateBlock = (id, data) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, data: { ...b.data, ...data } } : b,
      ),
    );
  };

  const removeBlock = (id) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    toast.success("Block removed");
  };

  const duplicateBlock = (id) => {
    const block = blocks.find((b) => b.id === id);
    if (block) {
      const newBlock = {
        ...block,
        id: uuid(),
        data: JSON.parse(JSON.stringify(block.data)),
      };
      setBlocks((prev) => [...prev, newBlock]);
      toast.success("Block duplicated");
    }
  };

  const moveBlock = (id, direction) => {
    const index = blocks.findIndex((b) => b.id === id);
    if (direction === "up" && index > 0) {
      setBlocks(arrayMove(blocks, index, index - 1));
    } else if (direction === "down" && index < blocks.length - 1) {
      setBlocks(arrayMove(blocks, index, index + 1));
    }
  };

  const uploadDocument = async (file) => {
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error(
        "Only PDF files are supported. Please upload a PDF document.",
      );
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast.error("The PDF file is too large. Maximum size is 100MB.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const toastId = toast.loading("Uploading PDF...");
    setUploadingImage(true);

    try {
      let url = "/documents/upload";
      const params = new URLSearchParams();

      if (companyId) {
        params.append("company_id", companyId);
      }

      const fullUrl = `${url}${params.toString() ? `?${params.toString()}` : ""}`;

      const res = await apiFetch(fullUrl, {
        method: "POST",
        body: formData,
      });

      if (!res?.file_id) {
        throw new Error("Upload failed - please try again");
      }

      toast.success("PDF uploaded successfully!", { id: toastId });
      return res;
    } catch (error) {
      console.error("Document upload failed:", error);
      const friendlyError = getUserFriendlyError(error);
      toast.error(friendlyError, { id: toastId });
      return null;
    } finally {
      setUploadingImage(false);
    }
  };
  /* ---------------- LIST MANAGEMENT ---------------- */

  const addListItem = (blockId) => {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id === blockId) {
          return {
            ...b,
            data: {
              ...b.data,
              items: [...(b.data.items || []), ""],
            },
          };
        }
        return b;
      }),
    );
  };

  const updateListItem = (blockId, index, value) => {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id === blockId) {
          const newItems = [...(b.data.items || [])];
          newItems[index] = value;
          return {
            ...b,
            data: {
              ...b.data,
              items: newItems,
            },
          };
        }
        return b;
      }),
    );
  };

  const removeListItem = (blockId, index) => {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id === blockId) {
          const newItems = (b.data.items || []).filter((_, i) => i !== index);
          return {
            ...b,
            data: {
              ...b.data,
              items: newItems,
            },
          };
        }
        return b;
      }),
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
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleTagKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
  };

  /* ---------------- DRAG REORDER ---------------- */

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;

    setBlocks((prev) => {
      const oldIndex = prev.findIndex((b) => b.id === active.id);
      const newIndex = prev.findIndex((b) => b.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  /* ---------------- IMAGE UPLOAD (Binary Storage) ---------------- */

  const uploadImage = async (file, imageType = "content") => {
    const formData = new FormData();
    formData.append("file", file);

    setUploadingImage(true);

    try {
      // Build URL with query parameters
      let url = "/images/upload";
      const params = new URLSearchParams();

      params.append("image_type", imageType);

      // Add company_id if available
      if (companyId) {
        params.append("company_id", companyId);
      }

      // Append params to URL
      const fullUrl = `${url}${params.toString() ? `?${params.toString()}` : ""}`;

      console.log("Uploading to:", fullUrl); // Debug log
      console.log("Company ID:", companyId); // Debug log
      console.log("Image Type:", imageType); // Debug log

      const res = await apiFetch(fullUrl, {
        method: "POST",
        body: formData,
        // Don't set Content-Type, browser will set it with boundary
      });

      console.log("Upload response:", res); // Debug log

      if (!res?.file_id) {
        throw new Error("Upload failed - no file_id returned");
      }

      // Refresh image library
      await loadImageLibrary();

      toast.success("Image uploaded successfully");
      return res;
    } catch (error) {
      console.error("Upload failed:", error);

      // Handle specific error cases
      if (error.status === 400) {
        toast.error(
          error.detail || "Bad request - check company ID and image type",
        );
      } else if (error.status === 401) {
        toast.error("Authentication failed - please log in again");
      } else if (error.status === 403) {
        toast.error("You don't have permission to upload images");
      } else if (error.status === 413) {
        toast.error("File too large (max 50MB)");
      } else if (error.status === 415) {
        toast.error(
          "Invalid file type. Please upload an image (jpg, png, gif, webp)",
        );
      } else {
        toast.error(error.detail || error.message || "Upload failed");
      }

      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCoverUpload = async (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 50MB");
      return;
    }

    // Validate image type
    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid image type. Allowed: JPG, PNG, GIF, WEBP, SVG");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setCoverImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);

    // Upload to server
    const toastId = toast.loading("Uploading cover image...");

    try {
      const result = await uploadImage(file, "cover");

      if (result) {
        setCoverImageId(result.file_id);
        setCoverImageInfo({
          filename: result.filename,
          width: result.width,
          height: result.height,
          size: result.size,
          format: result.format,
        });

        toast.success("Cover image uploaded successfully", { id: toastId });
      } else {
        // Upload failed, remove preview
        setCoverImagePreview(null);
        toast.error("Failed to upload cover image", { id: toastId });
      }
    } catch (error) {
      console.error("Cover upload error:", error);
      setCoverImagePreview(null);
      toast.error("Failed to upload cover image", { id: toastId });
    }
  };

  const handleImageUpload = async (blockId, file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file (JPG, PNG, GIF, etc.)");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error("The image is too large. Maximum size is 50MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      updateBlock(blockId, { preview: e.target.result });
    };
    reader.readAsDataURL(file);

    const toastId = toast.loading("Uploading image...");

    try {
      const result = await uploadImage(file, "content");

      if (result) {
        updateBlock(blockId, {
          file_id: result.file_id,
          preview: null,
          width: result.width,
          height: result.height,
          format: result.format,
        });

        toast.success("Image uploaded successfully!", { id: toastId });
      } else {
        updateBlock(blockId, { preview: null });
        toast.error("Failed to upload image. Please try again.", {
          id: toastId,
        });
      }
    } catch (error) {
      console.error("Image upload error:", error);
      updateBlock(blockId, { preview: null });
      const friendlyError = getUserFriendlyError(error);
      toast.error(friendlyError, { id: toastId });
    }
  };

  const selectImageFromLibrary = (blockId, image) => {
    updateBlock(blockId, {
      file_id: image.id,
      width: image.width,
      height: image.height,
      alt: image.alt || "",
      caption: image.caption || "",
    });
    setShowImageLibrary(false);
    setActiveBlockForImage(null);
    toast.success("Image selected");
  };

  /* ---------------- SMART PASTE ---------------- */

  const handlePaste = async (e) => {
    const items = e.clipboardData.items;

    for (let item of items) {
      if (item.type.startsWith("image")) {
        e.preventDefault();
        const file = item.getAsFile();
        addBlock("image");
        // Update the last added block with the image
        setTimeout(async () => {
          const lastBlock = blocks[blocks.length - 1];
          if (lastBlock && lastBlock.type === "image") {
            await handleImageUpload(lastBlock.id, file);
          }
        }, 100);
        return;
      }

      const text = e.clipboardData.getData("text");
      if (text) {
        e.preventDefault();
        if (text.match(/^https?:\/\/.+/)) {
          if (text.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)) {
            addBlock("image");
            setBlocks((prev) => {
              const lastBlock = prev[prev.length - 1];
              if (lastBlock && lastBlock.type === "image") {
                return prev.map((b) =>
                  b.id === lastBlock.id
                    ? {
                        ...b,
                        data: {
                          ...b.data,
                          url: text,
                          external: true,
                        },
                      }
                    : b,
                );
              }
              return prev;
            });
          } else {
            addBlock("embed");
            setBlocks((prev) => {
              const lastBlock = prev[prev.length - 1];
              if (lastBlock && lastBlock.type === "embed") {
                return prev.map((b) =>
                  b.id === lastBlock.id
                    ? { ...b, data: { ...b.data, url: text } }
                    : b,
                );
              }
              return prev;
            });
          }
        } else {
          addBlock("text");
          setBlocks((prev) => {
            const lastBlock = prev[prev.length - 1];
            if (lastBlock && lastBlock.type === "text") {
              return prev.map((b) =>
                b.id === lastBlock.id
                  ? { ...b, data: { ...b.data, value: text } }
                  : b,
              );
            }
            return prev;
          });
        }
      }
    }
  };

  /* ---------------- AUTO SAVE ---------------- */

  const handleAutoSave = async () => {
    if (!title.trim() && blocks.length === 0) return;

    setSaving(true);
    const payload = {
      title: title.trim() || "Untitled Draft",
      subtitle: subtitle.trim(),
      cover_image_id: coverImageId,
      section_slug: sectionSlug || "uncategorized",
      category_slug: categorySlug || "general",
      blocks,
      tags,
      status: "draft",
      seo: {
        meta_title: title.trim() || "Untitled Draft",
        meta_description: subtitle.trim() || title.trim() || "Untitled Draft",
      },
    };

    if (companyId) {
      payload.company_id = companyId;
    }

    try {
      await apiFetch("/content", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      // Silent success for auto-save - no toast
    } catch (error) {
      console.error("Auto-save failed:", error);
      // Only show error toast if it's a critical error, not validation for drafts
      if (error.status === 500) {
        toast.error(
          "Auto-save failed. Please check your connection and try again.",
        );
      }
      // Don't show validation errors for auto-save
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- SUBMIT ---------------- */

  const handleSubmit = async (status) => {
    // Validate required fields with user-friendly messages
    if (!title.trim()) {
      toast.error("Please add a title to your post");
      return;
    }

    if (!coverImageId) {
      toast.error("Please add a cover image to your post");
      return;
    }

    if (isSuperAdmin && !companyId) {
      toast.error("Please select a company before publishing");
      return;
    }

    if (!sectionSlug || !categorySlug) {
      toast.error("Please choose a section and category for your post");
      return;
    }

    if (!blocks.length) {
      toast.error("Please add at least one content block to your post");
      return;
    }

    // For published content, validate all blocks are complete
    if (status === "published") {
      const incompleteBlocks = [];

      blocks.forEach((block, index) => {
        if (block.type === "document") {
          const hasFileId = block.data?.file_id;
          const hasUrl = block.data?.url?.trim();
          if (!hasFileId && !hasUrl) {
            incompleteBlocks.push(
              `Document block #${index + 1} is missing a PDF file or URL`,
            );
          }
        } else if (block.type === "video" || block.type === "embed") {
          if (!block.data?.url?.trim()) {
            incompleteBlocks.push(
              `${block.type} block #${index + 1} is missing a URL`,
            );
          }
        } else if (block.type === "image") {
          if (!block.data?.file_id && !block.data?.url) {
            incompleteBlocks.push(
              `Image block #${index + 1} is missing an image`,
            );
          }
        }
      });

      if (incompleteBlocks.length > 0) {
        toast.error(
          <div>
            <p className="font-semibold mb-1">Please complete the following:</p>
            <ul className="list-disc pl-4 text-sm">
              {incompleteBlocks.slice(0, 3).map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
              {incompleteBlocks.length > 3 && (
                <li>...and {incompleteBlocks.length - 3} more</li>
              )}
            </ul>
          </div>,
          { duration: 6000 },
        );
        return;
      }
    }

    setLoading(true);
    const submitToastId = toast.loading(
      status === "published" ? "Publishing..." : "Saving draft...",
    );

    const payload = {
      title: title.trim(),
      subtitle: subtitle.trim(),
      cover_image_id: coverImageId,
      section_slug: sectionSlug,
      category_slug: categorySlug,
      blocks,
      tags,
      status,
      seo: {
        meta_title: title.trim(),
        meta_description: subtitle.trim() || title.trim(),
      },
      settings: {
        allow_comments: true,
        is_featured: false,
      },
    };

    if (companyId) {
      payload.company_id = companyId;
    }

    try {
      let res;
      if (isEditMode && editingPostId) {
        // Update existing post
        res = await apiFetch(`/content/${editingPostId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        // Create new post
        res = await apiFetch("/content", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      if (res?.detail) {
        const friendlyError = getUserFriendlyError(res.detail);
        toast.error(friendlyError, { id: submitToastId });
        setLoading(false);
        return;
      }

      toast.success(
        status === "published"
          ? "🎉 Your post has been published successfully!"
          : "💾 Draft saved successfully",
        { id: submitToastId },
      );

      resetEditor();
      loadRecentContent();

      // Clear edit mode
      setIsEditMode(false);
      setEditingPostId(null);

      // Navigate back to content list if needed
      if (isEditMode) {
        window.history.pushState({}, "", `/${user?.role}/content`);
      }
    } catch (error) {
      console.error("Submit failed:", error);
      const friendlyError = getUserFriendlyError(error);
      toast.error(friendlyError, { id: submitToastId });
    } finally {
      setLoading(false);
    }
  };

  const resetEditor = () => {
    setTitle("");
    setSubtitle("");
    setCoverImageId(null);
    setCoverImagePreview(null);
    setCoverImageInfo(null);
    setBlocks([]);
    setTags([]);
    setSectionSlug("");
    setCategorySlug("");
  };

  const handleEditPost = (postId) => {
    loadPostForEdit(postId);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditingPostId(null);
    resetEditor();
    toast.success("Edit cancelled");
  };

  /* ---------------- RENDER ---------------- */

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Top Bar */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              {isEditMode && (
                <button
                  onClick={handleCancelEdit}
                  className="mr-2 p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Cancel edit"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <h1 className="text-xl font-semibold text-gray-900">
                {isEditMode ? "Editing Post" : "Create New Post"}
              </h1>
              {saving && (
                <span className="text-sm text-gray-500 flex items-center">
                  <Clock className="w-4 h-4 mr-1 animate-spin" />
                  Saving...
                </span>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowPreviewModal(true)}
                className="px-4 py-2 text-sm font-semibold text-blue-600 bg-white border border-blue-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 flex items-center shadow-sm active:scale-95"
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </button>
              <button
                onClick={() => handleSubmit("draft")}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 flex items-center shadow-sm active:scale-95 disabled:opacity-50"
                disabled={loading || uploadingImage}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </button>
              <button
                onClick={() => handleSubmit("published")}
                className="px-6 py-2 text-sm font-semibold text-white rounded-xl flex items-center shadow-lg transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:grayscale"
                style={{ 
                  background: 'linear-gradient(135deg, #4F46E5 0%, #3B82F6 100%)',
                  boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.39)'
                }}
                disabled={loading || uploadingImage}
              >
                <Send className="w-4 h-4 mr-2" />
                {loading ? "Publishing..." : "Publish"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Cover Image */}
          <div
            className={`relative h-64 bg-gray-100 border-b border-gray-200 overflow-hidden ${
              isDraggingCover ? "ring-2 ring-blue-500 ring-offset-2" : ""
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingCover(true);
            }}
            onDragLeave={() => setIsDraggingCover(false)}
            onDrop={async (e) => {
              e.preventDefault();
              setIsDraggingCover(false);
              const file = e.dataTransfer.files[0];
              if (file) await handleCoverUpload(file);
            }}
          >
            {coverImagePreview || coverImageId ? (
              <>
                <img
                  src={coverImagePreview || getImageUrl(coverImageId)}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center backdrop-blur-0 group-hover:backdrop-blur-[2px]">
                  <button
                    onClick={() => coverFileInputRef.current?.click()}
                    className="px-4 py-2 bg-white/90 hover:bg-white text-gray-900 rounded-full text-sm font-semibold flex items-center shadow-xl transform translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300"
                    disabled={uploadingImage}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Change Cover Image
                  </button>
                </div>
                {coverImageInfo && (
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                    {coverImageInfo.width} x {coverImageInfo.height}
                  </div>
                )}
              </>
            ) : (
              <div
                onClick={() => coverFileInputRef.current?.click()}
                className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
              >
                {uploadingImage ? (
                  <>
                    <RefreshCw className="w-12 h-12 text-gray-400 mb-3 animate-spin" />
                    <p className="text-gray-600 font-medium">Uploading...</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-gray-400 mb-3" />
                    <p className="text-gray-600 font-medium">
                      Click to upload cover image
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      or drag and drop
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      Recommended: 1200 x 600 pixels
                    </p>
                  </>
                )}
              </div>
            )}
            <input
              ref={coverFileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) handleCoverUpload(file);
              }}
              className="hidden"
            />
          </div>

          {/* Title & Metadata */}
          <div className="p-6 border-b border-gray-200">
            <input
              type="text"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-3xl font-bold text-gray-900 placeholder-gray-400 border-0 focus:ring-0 focus:outline-none p-0 mb-3"
            />

            <input
              type="text"
              placeholder="Subtitle (optional)"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full text-lg text-gray-600 placeholder-gray-400 border-0 focus:ring-0 focus:outline-none p-0"
            />

            <div className="flex flex-wrap gap-4 mt-4">
              {isSuperAdmin && (
                <select
                  value={selectedCompany}
                  onChange={(e) => {
                    setSelectedCompany(e.target.value);
                    setSectionSlug("");
                    setCategorySlug("");
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">Select Company</option>
                  {companies.map((c) => (
                    <option key={c.company_id} value={c.company_id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
              <select
                value={sectionSlug}
                onChange={(e) => {
                  setSectionSlug(e.target.value);
                  setCategorySlug("");
                }}
                disabled={isSuperAdmin && !companyId}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select section</option>
                {sections.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.name}
                  </option>
                ))}
              </select>

              <select
                value={categorySlug}
                onChange={(e) => setCategorySlug(e.target.value)}
                disabled={
                  !sectionSlug ||
                  categories.length === 0 ||
                  (isSuperAdmin && !companyId)
                }
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700"
                >
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-2 text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder="Add tags..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={addTag}
                className="flex-1 min-w-[200px] px-3 py-1 text-sm border-0 focus:ring-0 focus:outline-none placeholder-gray-400"
              />
            </div>
          </div>

          {/* Sticky Block Toolbar */}
          <div className="sticky top-16 z-40 bg-white border-b border-gray-200 px-6 py-3">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => addBlock("text")}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                title="Text"
              >
                <AlignLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => addBlock("heading")}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                title="Heading"
              >
                <Heading1 className="w-5 h-5" />
              </button>
              <button
                onClick={() => addBlock("subheading")}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                title="Subheading"
              >
                <Heading2 className="w-5 h-5" />
              </button>
              <div className="w-px h-6 bg-gray-300 mx-1" />
              <button
                onClick={() => addBlock("bullet-list")}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                title="Bullet List"
              >
                <List className="w-5 h-5" />
              </button>
              <button
                onClick={() => addBlock("numbered-list")}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                title="Numbered List"
              >
                <ListOrdered className="w-5 h-5" />
              </button>
              <div className="w-px h-6 bg-gray-300 mx-1" />
              <button
                onClick={() => {
                  addBlock("image");
                }}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                title="Image"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setShowImageLibrary(true);
                  setActiveBlockForImage("new");
                }}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                title="Image Library"
              >
                <ImageIcon2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => addBlock("video")}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                title="Video"
              >
                <Video className="w-5 h-5" />
              </button>
              <button
                onClick={() => addBlock("embed")}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                title="Embed"
              >
                <Link2 className="w-5 h-5" />
              </button>

              <button
                onClick={() => addBlock("document")}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                title="Document (PDF)"
              >
                <FileText className="w-5 h-5" />
              </button>

              <div className="w-px h-6 bg-gray-300 mx-1" />
              <button
                onClick={() => addBlock("quote")}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                title="Quote"
              >
                <Quote className="w-5 h-5" />
              </button>
              <button
                onClick={() => addBlock("code")}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                title="Code"
              >
                <Code className="w-5 h-5" />
              </button>
              <button
                onClick={() => addBlock("cta")}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                title="Call to Action"
              >
                <Hash className="w-5 h-5" />
              </button>
              <div className="w-px h-6 bg-gray-300 mx-1" />
              <button
                onClick={() => addBlock("divider")}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                title="Divider"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Canvas */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          >
            <SortableContext
              items={blocks.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <div
                ref={canvasRef}
                className="p-6 space-y-4 min-h-[400px] max-h-[800px] overflow-y-auto"
                // onPaste={handlePaste}
              >
                {blocks.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">
                      Start writing or paste content (⌘V)
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Click the toolbar above to add blocks
                    </p>
                  </div>
                ) : (
                  blocks.map((block) => (
                    // In the SortableBlock rendering section (around line 450-460)
                    <SortableBlock
                      key={block.id}
                      block={block}
                      updateBlock={updateBlock}
                      removeBlock={removeBlock}
                      duplicateBlock={duplicateBlock}
                      moveBlock={moveBlock}
                      addListItem={addListItem}
                      updateListItem={updateListItem}
                      removeListItem={removeListItem}
                      onImageUpload={handleImageUpload}
                      onDocumentUpload={uploadDocument} // Add this line
                      onSelectFromLibrary={() => {
                        setShowImageLibrary(true);
                        setActiveBlockForImage(block.id);
                      }}
                      isDragging={activeId === block.id}
                      uploadingImage={uploadingImage}
                    />
                  ))
                )}
              </div>
            </SortableContext>

            <DragOverlay>
              {activeId ? (
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 opacity-80">
                  <div className="flex items-center">
                    <GripVertical className="w-5 h-5 text-gray-400 mr-2" />
                    <span>Moving block...</span>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          {/* Add Block Button */}
          <div className="p-6 border-t border-gray-100 bg-gray-50/50">
            <button
              onClick={() => addBlock('text')}
              className="group w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300 flex items-center justify-center active:scale-[0.99]"
              disabled={uploadingImage}
            >
              <div className="bg-white group-hover:bg-blue-100 p-1.5 rounded-lg mr-3 transition-colors shadow-sm">
                <Plus className="w-5 h-5" />
              </div>
              <span className="font-semibold text-lg text-gray-600 group-hover:text-blue-600 transition-colors">Add New Content Block</span>
            </button>
          </div>
        </div>

        {/* Recent Items with Edit Buttons */}
        {items.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Layers className="w-5 h-5 mr-2 text-blue-600" />
              Recent Posts
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all duration-300 flex items-center justify-between group/item"
                >
                  <div className="flex items-center space-x-4">
                    {item.cover_image_id && (
                      <div className="relative w-12 h-12 overflow-hidden rounded-lg">
                        <img
                          src={getImageUrl(item.cover_image_id)}
                          alt={item.title}
                          className="w-full h-full object-cover transition-all duration-500 group-hover/item:blur-[2px] group-hover/item:scale-110"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://via.placeholder.com/48?text=Error";
                          }}
                        />
                      </div>
                    )}
                    <div>
                      <h4 className="font-semibold text-gray-900 line-clamp-1">{item.title}</h4>
                      <div className="flex items-center mt-1 space-x-3">
                        <p className="text-xs text-gray-500">
                          {new Date(item.created_at).toLocaleDateString()}
                        </p>
                        {item.author?.name && (
                          <span className="text-[10px] text-gray-400 flex items-center">
                            <span className="w-1 h-1 bg-gray-300 rounded-full mr-1.5" />
                            By {item.author.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                        item.status === "published"
                          ? "bg-green-100 text-green-700 border border-green-200"
                          : item.status === "draft"
                            ? "bg-amber-100 text-amber-700 border border-amber-200"
                            : "bg-gray-100 text-gray-700 border border-gray-200"
                      }`}
                    >
                      {item.status}
                    </span>
                    <button
                      onClick={() => handleEditPost(item.id)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all transform hover:scale-110"
                      title="Edit post"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Image Library Modal */}
      {showImageLibrary && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 py-12">
            <div 
              className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" 
              onClick={() => {
                setShowImageLibrary(false);
                setActiveBlockForImage(null);
              }}
            />
            
            <div className="relative bg-white rounded-3xl max-w-4xl w-full p-8 shadow-2xl overflow-hidden border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Image Library</h3>
                  <p className="text-sm text-gray-500 mt-1">Select an image from your previous uploads</p>
                </div>
                <button
                  onClick={() => {
                    setShowImageLibrary(false);
                    setActiveBlockForImage(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {imageLibrary.map((image) => (
                  <div
                    key={image.id}
                    className="relative group cursor-pointer aspect-square rounded-2xl overflow-hidden border border-transparent hover:border-blue-500 transition-all shadow-sm"
                    onClick={() => {
                      if (activeBlockForImage === "new") {
                        const blockId = uuid();
                        const newBlock = {
                          id: blockId,
                          type: "image",
                          data: {
                            file_id: image.id,
                            width: image.width,
                            height: image.height,
                            alt: "",
                            caption: "",
                          },
                        };
                        setBlocks((prev) => [...prev, newBlock]);
                        setShowImageLibrary(false);
                        setActiveBlockForImage(null);
                      } else if (activeBlockForImage) {
                        selectImageFromLibrary(activeBlockForImage, image);
                      }
                    }}
                  >
                    <img
                      src={getImageUrl(image.id)}
                      alt={image.filename || "Library Image"}
                      className="w-full h-full object-cover transition-all duration-500 group-hover:blur-[3px] group-hover:scale-110"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://via.placeholder.com/150?text=Error";
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center backdrop-blur-0 group-hover:backdrop-blur-[1px]">
                      <span className="bg-white/95 text-gray-900 px-4 py-2 rounded-full text-[10px] font-bold tracking-wider shadow-2xl opacity-0 group-hover:opacity-100 transform translate-y-3 group-hover:translate-y-0 transition-all duration-300 border border-white">
                        SELECT IMAGE
                      </span>
                    </div>
                    {image.width && image.height && (
                      <div className="absolute bottom-2 left-2 right-2 bg-black/50 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex justify-center whitespace-nowrap">
                        {image.width} × {image.height}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => {
                    setShowImageLibrary(false);
                    setActiveBlockForImage(null);
                  }}
                  className="px-6 py-2.5 text-sm font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 hover:text-gray-900 transition-all duration-200 active:scale-95"
                >
                  Close Library
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <PreviewDemo
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        postData={{
          title,
          subtitle,
          cover_image_id: coverImageId,
          section_slug: sectionSlug,
          category_slug: categorySlug,
          tags,
          blocks,
          status: "preview",
        }}
      />
    </div>
  );
}

/* ---------------- SORTABLE BLOCK COMPONENT ---------------- */

function SortableBlock({
  block,
  updateBlock,
  removeBlock,
  duplicateBlock,
  moveBlock,
  addListItem,
  updateListItem,
  removeListItem,
  onImageUpload,
  onDocumentUpload,
  onSelectFromLibrary,
  isDragging,
  uploadingImage,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: block.id });

  const fileInputRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  // Helper for image URLs inside SortableBlock
  const getImageUrl = (fileId) => {
    if (!fileId) return null;
    const API_BASE = import.meta.env.VITE_API_BASE || "";
    return `${API_BASE}/api/images/${fileId}`;
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const getBlockStyles = () => {
    switch (block.type) {
      case "heading":
        return "text-2xl font-bold text-gray-900";
      case "subheading":
        return "text-xl font-semibold text-gray-800";
      case "quote":
        return "pl-4 border-l-4 border-gray-300 italic text-gray-700";
      case "pull-quote":
        return "text-xl italic text-gray-700 text-center py-4";
      case "code":
        return "font-mono text-sm bg-gray-50 p-3 rounded";
      default:
        return "text-gray-700";
    }
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
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            rows={block.type === "heading" ? 1 : 3}
            className={`w-full border-0 focus:ring-0 focus:outline-none resize-none ${getBlockStyles()}`}
          />
        );

      case "code":
        return (
          <div className="bg-gray-900 rounded-lg p-4">
            <select
              value={block.data.language || "javascript"}
              onChange={(e) =>
                updateBlock(block.id, { language: e.target.value })
              }
              className="mb-2 px-2 py-1 text-xs bg-gray-800 text-gray-300 border border-gray-700 rounded"
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
              <option value="json">JSON</option>
              <option value="bash">Bash</option>
            </select>
            <textarea
              placeholder="Code..."
              value={block.data.value || ""}
              onChange={(e) => updateBlock(block.id, { value: e.target.value })}
              rows={6}
              spellCheck={false}
              className="w-full bg-gray-800 text-gray-100 font-mono text-sm border-0 focus:ring-0 focus:outline-none"
            />
          </div>
        );

      case "image":
        return (
          <div className="space-y-3">
            {block.data.preview ? (
              <div className="relative">
                <img
                  src={block.data.preview}
                  alt="Preview"
                  className="max-h-96 rounded-lg object-contain bg-gray-100 transition-all duration-500 group-hover:blur-[2px] group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-all duration-300 backdrop-blur-0 group-hover:backdrop-blur-[2px]">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-2 bg-white/95 hover:bg-white text-gray-900 rounded-full text-xs font-bold shadow-2xl opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 border border-white"
                    disabled={uploadingImage}
                  >
                    CHANGE IMAGE
                  </button>
                </div>
                {uploadingImage && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <RefreshCw className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
              </div>
            ) : block.data.file_id ? (
              <div className="relative">
                <img
                  src={getImageUrl(block.data.file_id)}
                  alt={block.data.alt || ""}
                  className="max-h-96 rounded-lg object-contain bg-gray-100 transition-all duration-500 group-hover:blur-[2px] group-hover:scale-105"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src =
                      "https://via.placeholder.com/800x400?text=Image+Not+Found";
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-all duration-300 backdrop-blur-0 group-hover:backdrop-blur-[2px]">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-white/95 hover:bg-white text-gray-900 rounded-full text-xs font-bold shadow-2xl opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 border border-white"
                    disabled={uploadingImage}
                  >
                    CHANGE IMAGE
                  </button>
                  <button
                    onClick={onSelectFromLibrary}
                    className="ml-2 px-4 py-2 bg-white/95 hover:bg-white text-gray-900 rounded-full text-xs font-bold shadow-2xl opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 border border-white"
                  >
                    LIBRARY
                  </button>
                </div>
                {block.data.width && block.data.height && (
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                    {block.data.width} x {block.data.height}
                  </div>
                )}
              </div>
            ) : block.data.url && block.data.external ? (
              <div className="relative">
                <img
                  src={block.data.url}
                  alt={block.data.alt || ""}
                  className="max-h-96 rounded-lg object-contain bg-gray-100"
                />
                <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded">
                  External Image
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-12 bg-gray-50/50 group-hover:bg-white transition-all duration-300">
                <div className="text-center mb-6">
                  <div className="bg-white w-16 h-16 rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 border border-gray-100 group-hover:scale-110 transition-transform duration-300">
                    <ImageIcon className="w-8 h-8 text-blue-500" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900">Add an image to your post</p>
                  <p className="text-xs text-gray-500 mt-1">Select from library or upload from your device</p>
                </div>
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center"
                    disabled={uploadingImage}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    UPLOAD
                  </button>
                  <button
                    onClick={onSelectFromLibrary}
                    className="px-6 py-2.5 bg-white text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 border border-gray-200 shadow-sm transition-all active:scale-95 flex items-center"
                  >
                    <ImageIcon2 className="w-4 h-4 mr-2" />
                    LIBRARY
                  </button>
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) onImageUpload(block.id, file);
              }}
              className="hidden"
            />
            <input
              type="text"
              placeholder="Alt text (for accessibility)"
              value={block.data.alt || ""}
              onChange={(e) => updateBlock(block.id, { alt: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Caption (optional)"
              value={block.data.caption || ""}
              onChange={(e) =>
                updateBlock(block.id, { caption: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        );

      case "document":
        return (
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start space-x-3">
              <FileText className="w-8 h-8 text-blue-500 flex-shrink-0" />
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Document title (required)"
                  value={block.data.title || ""}
                  onChange={(e) =>
                    updateBlock(block.id, { title: e.target.value })
                  }
                  className={`w-full px-3 py-2 border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2 ${
                    !block.data.title && isFocused
                      ? "border-amber-300 bg-amber-50"
                      : "border-gray-300"
                  }`}
                />
                {!block.data.title && (
                  <p className="text-xs text-amber-600 mb-2">
                    ⚠️ Title is required
                  </p>
                )}

                <div className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = ".pdf,application/pdf";
                        input.onchange = async (e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const result = await onDocumentUpload(file);
                            if (result) {
                              updateBlock(block.id, {
                                file_id: result.file_id,
                                url: null,
                                title:
                                  block.data.title ||
                                  file.name.replace(".pdf", ""),
                                size: result.size,
                              });
                            }
                          }
                        };
                        input.click();
                      }}
                      className="px-3 py-1.5 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-1" />
                          Upload PDF
                        </>
                      )}
                    </button>

                    <span className="text-gray-500 text-sm">or</span>

                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="Paste PDF URL..."
                        value={block.data.url || ""}
                        onChange={(e) =>
                          updateBlock(block.id, {
                            url: e.target.value,
                            file_id: null,
                          })
                        }
                        className={`w-full px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          block.data.url &&
                          !block.data.url.match(/^https?:\/\/.+/i)
                            ? "border-red-300 bg-red-50"
                            : "border-gray-300"
                        }`}
                      />
                      {block.data.url &&
                        !block.data.url.match(/^https?:\/\/.+/i) && (
                          <p className="text-xs text-red-600 mt-1">
                            Please enter a valid URL starting with http:// or
                            https://
                          </p>
                        )}
                    </div>
                  </div>

                  {/* Validation hints */}
                  {!block.data.file_id && !block.data.url && (
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-2">
                      <p className="text-xs text-amber-800">
                        <span className="font-semibold">⚠️ Almost done:</span>{" "}
                        Upload a PDF or provide a URL to complete this block
                      </p>
                    </div>
                  )}
                </div>

                {/* Document preview/info */}
                {(block.data.file_id || block.data.url) && (
                  <div className="mt-3 bg-green-50 border border-green-200 rounded-md p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-green-100 rounded-full p-1">
                          <FileText className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {block.data.title || "Untitled Document"}
                          </p>
                          {block.data.file_id ? (
                            <p className="text-xs text-green-600 flex items-center">
                              <span className="w-2 h-2 bg-green-600 rounded-full mr-1"></span>
                              Uploaded to server
                            </p>
                          ) : (
                            <p className="text-xs text-blue-600 flex items-center">
                              <span className="w-2 h-2 bg-blue-600 rounded-full mr-1"></span>
                              External PDF: {block.data.url?.substring(0, 30)}
                              ...
                            </p>
                          )}
                          {block.data.size && (
                            <p className="text-xs text-gray-500 mt-1">
                              Size: {(block.data.size / 1024 / 1024).toFixed(2)}{" "}
                              MB
                            </p>
                          )}
                        </div>
                      </div>
                      {block.data.url && (
                        <a
                          href={block.data.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm flex items-center bg-white px-2 py-1 rounded border border-blue-200"
                        >
                          Preview
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Optional fields */}
                <textarea
                  placeholder="Document description (optional)"
                  value={block.data.description || ""}
                  onChange={(e) =>
                    updateBlock(block.id, { description: e.target.value })
                  }
                  rows={2}
                  className="w-full mt-3 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        );

      case "video":
        return (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Video URL (YouTube, Vimeo, or direct video link)"
              value={block.data.url || ""}
              onChange={(e) => updateBlock(block.id, { url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {block.data.url && (
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <Video className="w-12 h-12 text-gray-400" />
                <p className="text-sm text-gray-500 ml-2">
                  Video preview not available
                </p>
              </div>
            )}
            <input
              type="text"
              placeholder="Caption (optional)"
              value={block.data.caption || ""}
              onChange={(e) =>
                updateBlock(block.id, { caption: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        );

      case "embed":
        return (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Embed URL (YouTube, Vimeo, Twitter, LinkedIn...)"
              value={block.data.url || ""}
              onChange={(e) => updateBlock(block.id, { url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {block.data.url && (
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <Link2 className="w-12 h-12 text-gray-400" />
                <p className="text-sm text-gray-500 ml-2">
                  Embed preview not available
                </p>
              </div>
            )}
            <input
              type="text"
              placeholder="Caption (optional)"
              value={block.data.caption || ""}
              onChange={(e) =>
                updateBlock(block.id, { caption: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        );

      case "bullet-list":
      case "numbered-list":
        return (
          <div className="space-y-2">
            {(block.data.items || []).map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <span className="text-gray-500 w-6">
                  {block.type === "bullet-list" ? "•" : `${index + 1}.`}
                </span>
                <input
                  value={item}
                  onChange={(e) =>
                    updateListItem(block.id, index, e.target.value)
                  }
                  placeholder="List item..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => removeListItem(block.id, index)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              onClick={() => addListItem(block.id)}
              className="mt-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 flex items-center"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add item
            </button>
          </div>
        );

      case "cta":
        return (
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <input
              type="text"
              placeholder="Button label"
              value={block.data.label || ""}
              onChange={(e) => updateBlock(block.id, { label: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Button URL"
              value={block.data.url || ""}
              onChange={(e) => updateBlock(block.id, { url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={block.data.style || "primary"}
              onChange={(e) => updateBlock(block.id, { style: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
              <option value="outline">Outline</option>
            </select>
          </div>
        );

      case "divider":
        return <hr className="my-4 border-t border-gray-300" />;

      case "callout":
        return (
          <div
            className={`p-4 rounded-lg ${
              block.data.type === "info"
                ? "bg-blue-50"
                : block.data.type === "warning"
                  ? "bg-yellow-50"
                  : block.data.type === "success"
                    ? "bg-green-50"
                    : "bg-gray-50"
            }`}
          >
            <select
              value={block.data.type || "info"}
              onChange={(e) => updateBlock(block.id, { type: e.target.value })}
              className="mb-2 px-2 py-1 text-xs bg-white border border-gray-300 rounded"
            >
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="success">Success</option>
              <option value="note">Note</option>
            </select>
            <textarea
              placeholder="Callout text..."
              value={block.data.value || ""}
              onChange={(e) => updateBlock(block.id, { value: e.target.value })}
              rows={2}
              className="w-full bg-transparent border-0 focus:ring-0 focus:outline-none"
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
      className={`group relative bg-white rounded-lg border ${
        isFocused ? "border-blue-500 ring-1 ring-blue-500" : "border-gray-200"
      } hover:border-gray-300 transition-colors`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 transition-opacity"
      >
        <GripVertical className="w-5 h-5" />
      </div>

      {/* Block Content */}
      <div className="pl-10 pr-12 py-3">{renderBlockContent()}</div>

      {/* Block Actions */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex items-center space-x-1 bg-white rounded-md shadow-sm border border-gray-200">
        <button
          onClick={() => moveBlock(block.id, "up")}
          className="p-1 text-gray-400 hover:text-gray-600 rounded-l-md hover:bg-gray-50"
          title="Move up"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <button
          onClick={() => moveBlock(block.id, "down")}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50"
          title="Move down"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-gray-200" />
        <button
          onClick={() => duplicateBlock(block.id)}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50"
          title="Duplicate"
        >
          <Copy className="w-4 h-4" />
        </button>
        <button
          onClick={() => removeBlock(block.id)}
          className="p-1 text-gray-400 hover:text-red-600 rounded-r-md hover:bg-red-50"
          title="Remove"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Block Type Indicator */}
      <div className="absolute -top-2 left-4 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
        {block.type}
      </div>
    </div>
  );
}

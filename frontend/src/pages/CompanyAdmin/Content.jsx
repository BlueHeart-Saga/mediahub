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
  PenLine,
  Wand2,
  CheckCircle2,
  Mic,
  Type
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
  const [showDrawMode, setShowDrawMode] = useState(false);
  const [drawText, setDrawText] = useState("");
  const [selectedBlockIds, setSelectedBlockIds] = useState([]);
  const [confirmConfig, setConfirmConfig] = useState({ 
    show: false, 
    title: "", 
    message: "", 
    onConfirm: null 
  });

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
      audio: { url: "", file_id: null, title: "", description: "" },
      special: { value: "" }
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

  const uploadAudio = async (file) => {
    if (!file) return;

    if (!file.type.startsWith("audio/")) {
      toast.error("Only audio files are supported.");
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast.error("The audio file is too large. Maximum size is 100MB.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const toastId = toast.loading("Uploading Audio...");
    setUploadingImage(true);

    try {
      let url = "/audio/upload";
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

      toast.success("Audio uploaded successfully!", { id: toastId });
      return res;
    } catch (error) {
      console.error("Audio upload failed:", error);
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

  const toggleSelectBlock = (id) => {
    setSelectedBlockIds(prev => 
      prev.includes(id) ? prev.filter(bid => bid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedBlockIds.length === blocks.length) {
      setSelectedBlockIds([]);
    } else {
      setSelectedBlockIds(blocks.map(it => it.id));
    }
  };

  const handleBulkDelete = () => {
    setConfirmConfig({
      show: true,
      title: "Delete Blocks",
      message: `Are you sure you want to delete ${selectedBlockIds.length} selected blocks? This action cannot be undone.`,
      onConfirm: () => {
        setBlocks(prev => prev.filter(it => !selectedBlockIds.includes(it.id)));
        setSelectedBlockIds([]);
        toast.success("Selected blocks removed");
      }
    });
  };

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
    <div className={`min-h-screen bg-gray-50 relative ${showDrawMode ? 'overflow-hidden' : ''}`}>


      {/* ── Tab Nav + Sticky Top Bar ── */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Left: back + title + tab switcher */}
            <div className="flex items-center gap-3">
              {isEditMode && (
                <button
                  onClick={handleCancelEdit}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Cancel edit"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <h1 className="text-base font-bold text-gray-900 hidden sm:block">
                {isEditMode ? "Editing Post" : "Content Editor"}
              </h1>
              {saving && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 animate-spin" /> Saving...
                </span>
              )}

              {/* Tab pills */}
              <div className="flex items-center bg-gray-100 rounded-xl p-0.5 ml-2">
                <button
                  onClick={() => setShowDrawMode(false)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                    !showDrawMode
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Create Post
                </button>
                <button
                  onClick={() => setShowDrawMode(true)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                    showDrawMode
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
                      : 'text-gray-500 hover:text-violet-600'
                  }`}
                >
                  <PenLine className="w-3.5 h-3.5" />
                  Draw Post
                </button>
              </div>
            </div>

            {/* Right: action buttons (shared across tabs) */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPreviewModal(true)}
                className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-white border border-blue-200 rounded-xl hover:bg-blue-50 transition-all flex items-center shadow-sm active:scale-95"
              >
                <Eye className="w-3.5 h-3.5 mr-1.5" /> Preview
              </button>
              <button
                onClick={() => handleSubmit("draft")}
                className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all flex items-center shadow-sm active:scale-95 disabled:opacity-50"
                disabled={loading || uploadingImage}
              >
                <Save className="w-3.5 h-3.5 mr-1.5" /> Save Draft
              </button>
              <button
                onClick={() => handleSubmit("published")}
                className="px-4 py-1.5 text-xs font-bold text-white rounded-xl flex items-center shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                style={{ background: 'linear-gradient(135deg,#4F46E5 0%,#3B82F6 100%)', boxShadow: '0 4px 14px 0 rgba(79,70,229,.35)' }}
                disabled={loading || uploadingImage}
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                {loading ? "Publishing..." : "Publish"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══ CREATE POST TAB ══ */}
      {!showDrawMode && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex gap-3 items-start">

            {/* Editor Card */}
            <div className="flex-1 min-w-0 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Cover Image */}
          <div
            className={`relative h-64 bg-gray-100 border-b border-gray-200 overflow-hidden ${isDraggingCover ? "ring-2 ring-blue-500 ring-offset-2" : ""
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
                      onDocumentUpload={uploadDocument}
                      onAudioUpload={uploadAudio}
                      onSelectFromLibrary={() => {
                        setShowImageLibrary(true);
                        setActiveBlockForImage(block.id);
                      }}
                      isDragging={activeId === block.id}
                      uploadingImage={uploadingImage}
                      isSelected={selectedBlockIds.includes(block.id)}
                      onToggleSelect={() => toggleSelectBlock(block.id)}
                    />
                  ))
                )}
              </div>
            </SortableContext>

            {/* Floating Bulk Actions Bar */}
            {selectedBlockIds.length > 0 && (
              <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[70] bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center gap-2 pr-6 border-r border-gray-700">
                  <button 
                    onClick={toggleSelectAll}
                    className="w-5 h-5 rounded border border-gray-600 flex items-center justify-center hover:bg-gray-800 transition-colors"
                  >
                    {selectedBlockIds.length === blocks.length && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </button>
                  <span className="text-sm font-bold">{selectedBlockIds.length} blocks selected</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl text-sm font-bold transition-all active:scale-95"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Selected
                  </button>
                  <button 
                    onClick={() => setSelectedBlockIds([])}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-bold transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

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
          </div>{/* End Editor Card */}

          {/* Compact Sticky Tool Sidebar */}
          <div className="sticky top-[74px] self-start flex flex-col items-center gap-0.5 bg-white border border-gray-200 rounded-xl shadow-sm py-2 px-1 w-10">
            <button onClick={() => addBlock("text")} title="Text" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-all duration-150">
              <AlignLeft className="w-4 h-4" />
            </button>
            <button onClick={() => addBlock("heading")} title="Heading 1" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-all duration-150">
              <Heading1 className="w-4 h-4" />
            </button>
            <button onClick={() => addBlock("subheading")} title="Heading 2" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-all duration-150">
              <Heading2 className="w-4 h-4" />
            </button>
            <div className="w-5 h-px bg-gray-100 my-0.5" />
            <button onClick={() => addBlock("bullet-list")} title="Bullet List" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-all duration-150">
              <List className="w-4 h-4" />
            </button>
            <button onClick={() => addBlock("numbered-list")} title="Numbered List" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-all duration-150">
              <ListOrdered className="w-4 h-4" />
            </button>
            <div className="w-5 h-px bg-gray-100 my-0.5" />
            <button onClick={() => addBlock("image")} title="Image Upload" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-purple-50 hover:text-purple-600 transition-all duration-150">
              <ImageIcon className="w-4 h-4" />
            </button>
            <button onClick={() => { setShowImageLibrary(true); setActiveBlockForImage("new"); }} title="Image Library" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-purple-50 hover:text-purple-600 transition-all duration-150">
              <ImageIcon2 className="w-4 h-4" />
            </button>
            <button onClick={() => addBlock("video")} title="Video" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-purple-50 hover:text-purple-600 transition-all duration-150">
              <Video className="w-4 h-4" />
            </button>
            <button onClick={() => addBlock("embed")} title="Embed" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-purple-50 hover:text-purple-600 transition-all duration-150">
              <Link2 className="w-4 h-4" />
            </button>
            <button onClick={() => addBlock("document")} title="PDF Document" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-purple-50 hover:text-purple-600 transition-all duration-150">
              <FileText className="w-4 h-4" />
            </button>
            {/* <button onClick={() => addBlock("audio")} title="Audio" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-purple-50 hover:text-purple-600 transition-all duration-150">
              <Mic className="w-4 h-4" />
            </button> */}
            <div className="w-5 h-px bg-gray-100 my-0.5" />
            <button onClick={() => addBlock("quote")} title="Quote" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-amber-50 hover:text-amber-600 transition-all duration-150">
              <Quote className="w-4 h-4" />
            </button>
            <button onClick={() => addBlock("code")} title="Code" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-amber-50 hover:text-amber-600 transition-all duration-150">
              <Code className="w-4 h-4" />
            </button>
            <button onClick={() => addBlock("cta")} title="Call to Action" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-amber-50 hover:text-amber-600 transition-all duration-150">
              <Hash className="w-4 h-4" />
            </button>
            <button onClick={() => addBlock("divider")} title="Divider" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-amber-50 hover:text-amber-600 transition-all duration-150">
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {/* <button onClick={() => addBlock("special")} title="Special Block (Rich Text)" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-amber-50 hover:text-amber-600 transition-all duration-150">
              <Type className="w-4 h-4" />
            </button> */}
          </div>
        </div>{/* End flex row */}

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
                      className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${item.status === "published"
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
    )}

      {/* Professional Confirmation Dialog */}
      {confirmConfig.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{confirmConfig.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{confirmConfig.message}</p>
            </div>
            <div className="bg-gray-50 p-4 flex gap-3">
              <button
                onClick={() => setConfirmConfig({ ...confirmConfig, show: false })}
                className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-100 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmConfig.onConfirm?.();
                  setConfirmConfig({ ...confirmConfig, show: false });
                }}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-all active:scale-95"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* ══ DRAW POST TAB ══ */}
      {showDrawMode && (
        <DrawPostModal
          blocks={blocks}
          setBlocks={setBlocks}
          title={title}
          setTitle={setTitle}
          subtitle={subtitle}
          setSubtitle={setSubtitle}
          tags={tags}
          setTags={setTags}
          coverImageId={coverImageId}
          setCoverImageId={setCoverImageId}
          coverImagePreview={coverImagePreview}
          setCoverImagePreview={setCoverImagePreview}
          uploadImage={uploadImage}
          onClose={() => setShowDrawMode(false)}
          onSaveDraft={() => handleSubmit("draft")}
          onPublish={() => handleSubmit("published")}
          onPreview={() => setShowPreviewModal(true)}
          sectionSlug={sectionSlug}
          setSectionSlug={setSectionSlug}
          categorySlug={categorySlug}
          setCategorySlug={setCategorySlug}
          sections={sections}
          categories={categories}
          selectedCompany={selectedCompany}
          setSelectedCompany={setSelectedCompany}
          companies={companies}
          isSuperAdmin={isSuperAdmin}
        />
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

/* ════════════════════════════════════════════════════════════════
   SMART PARSER — text / markdown → structured blocks
   ════════════════════════════════════════════════════════════════ */
function parseTextToBlocks(rawText) {
  const lines = rawText.split(/\r?\n/);
  const newBlocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();
    if (!t) { i++; continue; }
    // Heading 1: # text
    if (/^# [^#]/.test(t)) {
      newBlocks.push({ id: uuid(), type: "heading", data: { value: t.replace(/^# /, "") } });
    }
    // Heading 2: ## text
    else if (/^#{2} /.test(t)) {
      newBlocks.push({ id: uuid(), type: "subheading", data: { value: t.replace(/^#{2,} /, "") } });
    }
    // Heading 3+: ### text  
    else if (/^#{3,} /.test(t)) {
      newBlocks.push({ id: uuid(), type: "subheading", data: { value: t.replace(/^#{3,} /, "") } });
    }
    // Blockquote: > text
    else if (/^> /.test(t)) {
      newBlocks.push({ id: uuid(), type: "quote", data: { value: t.replace(/^> /, ""), attribution: "" } });
    }
    // Code fence: ```lang
    else if (/^```/.test(t)) {
      const lang = t.replace(/^```/, "").trim() || "javascript";
      const codeLines = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) { codeLines.push(lines[i]); i++; }
      newBlocks.push({ id: uuid(), type: "code", data: { value: codeLines.join("\n"), language: lang } });
    }
    // Bullet list: - item or * item
    else if (/^[-*+] /.test(t)) {
      const items = [];
      while (i < lines.length && /^[-*+] /.test(lines[i].trim())) {
        // Plain strings — the list renderer uses value={item} directly
        items.push(lines[i].trim().replace(/^[-*+] /, ""));
        i++;
      }
      newBlocks.push({ id: uuid(), type: "bullet-list", data: { items } });
      continue;
    }
    // Numbered list: 1. item
    else if (/^\d+\. /.test(t)) {
      const items = [];
      while (i < lines.length && /^\d+\. /.test(lines[i].trim())) {
        // Plain strings — the list renderer uses value={item} directly
        items.push(lines[i].trim().replace(/^\d+\. /, ""));
        i++;
      }
      newBlocks.push({ id: uuid(), type: "numbered-list", data: { items } });
      continue;
    }
    // Divider: --- or ***
    else if (/^---+$/.test(t) || /^\*\*\*+$/.test(t)) {
      newBlocks.push({ id: crypto.randomUUID(), type: "divider", data: {} });
    }
    // YouTube URL → video
    else if (/https?:\/\/(www\.)?(youtube\.com|youtu\.be)/.test(t)) {
      newBlocks.push({ id: crypto.randomUUID(), type: "video", data: { url: t } });
    }
    // Any URL → embed
    else if (/^https?:\/\/[^\s]+$/.test(t)) {
      newBlocks.push({ id: crypto.randomUUID(), type: "embed", data: { url: t } });
    }
    // Plain text paragraph → uses `value` to match block renderer
    else {
      newBlocks.push({ id: crypto.randomUUID(), type: "text", data: { value: t } });
    }
    i++;
  }
  return newBlocks;
}

function blocksToDrawText(blocks) {
  // We keep this for backward compatibility or when switching modes, 
  // but the new visual editor will focus on individual block editing.
  return (blocks || []).map((b) => {
    switch (b.type) {
      case "heading":       return `# ${b.data?.value || b.data?.text || ""}`;
      case "subheading":    return `## ${b.data?.value || b.data?.text || ""}`;
      case "text":          return b.data?.value || b.data?.text || "";
      case "quote":         return `> ${b.data?.value || b.data?.text || ""}`;
      case "pull-quote":    return `> ${b.data?.value || b.data?.text || ""}`;
      case "code":          return `\`\`\`${b.data?.language || ""}\n${b.data?.value || ""}\n\`\`\``;
      case "bullet-list":   return (b.data?.items || []).map(it => `- ${typeof it === 'string' ? it : it.text}`).join("\n");
      case "numbered-list": return (b.data?.items || []).map((it, idx) => `${idx + 1}. ${typeof it === 'string' ? it : it.text}`).join("\n");
      case "divider":       return "---";
      case "video":         return b.data?.url || "";
      case "embed":         return b.data?.url || "";
      case "image":         return `![${b.data?.alt || ""}](${b.data?.file_id || ""})`;
      // case "audio":         return b.data?.url || "";
      // case "special":       return b.data?.value || "";
      default:              return "";
    }
  }).filter(Boolean).join("\n\n");
}

function wc(text) { return text.trim().split(/\s+/).filter(Boolean).length; }
function rt(text) { const m = Math.ceil(wc(text) / 200); return m < 1 ? "< 1 min" : `${m} min read`; }

/* ════════════════════════════════════════════════════════════════
   DrawPostModal — LinkedIn / Word / Notion-style document editor
   ════════════════════════════════════════════════════════════════ */
function DrawPostModal({ 
  blocks, 
  setBlocks, 
  title, 
  setTitle, 
  subtitle, 
  setSubtitle, 
  tags, 
  setTags, 
  coverImageId, 
  setCoverImageId, 
  coverImagePreview, 
  setCoverImagePreview, 
  uploadImage,
  onClose, 
  onSaveDraft, 
  onPublish,
  onPreview, 
  sectionSlug,
  setSectionSlug,
  categorySlug,
  setCategorySlug,
  sections,
  categories,
  selectedCompany,
  setSelectedCompany,
  companies,
  isSuperAdmin
}) {
  const taRef = useRef(null);
  const imgInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const autoSaveRef = useRef(null);
  const [drawText, setDrawText] = useState(() => blocksToDrawText(blocks));
  const [synced, setSynced] = useState(false);
  const [slashCmd, setSlashCmd] = useState(null);
  const [isDraggingImg, setIsDraggingImg] = useState(false);
  const [isDraggingCover, setIsDraggingCover] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState(null); // null | 'saving' | 'saved'
  const [uploadingCover, setUploadingCover] = useState(false);
  const [showSetupPrompt, setShowSetupPrompt] = useState(false);
  
  const addNewBlock = (type) => {
    const baseData = {
      text: { value: "" },
      heading: { value: "" },
      subheading: { value: "" },
      quote: { value: "" },
      "pull-quote": { value: "" },
      code: { value: "", language: "javascript" },
      image: { file_id: null, alt: "", caption: "" },
      video: { url: "", caption: "" },
      embed: { url: "", caption: "" },
      document: { file_id: null, url: "", title: "" },
      "bullet-list": { items: [""] },
      "numbered-list": { items: [""] },
      cta: { label: "", url: "", style: "primary" },
      divider: {},
      callout: { value: "", type: "info" }
    };

    const newBlock = {
      id: uuid(),
      type,
      data: baseData[type] || {},
    };

    setBlocks((prev) => [...prev, newBlock]);
    setSynced(false);
  };
  
  // Selection and Drag State
  const [selectedBlockIds, setSelectedBlockIds] = useState([]);
  const [activeDragId, setActiveDragId] = useState(null);

  // Link Modal State (Hidden for now)
  /*
  const [linkModal, setLinkModal] = useState({ open: false, text: "", url: "", target: "draft" }); // target: 'draft' | blockId

  const openLinkModal = (target = "draft") => {
    let initialText = "";
    if (target === "draft") {
      const ta = taRef.current;
      if (ta) {
        initialText = drawText.slice(ta.selectionStart, ta.selectionEnd);
      }
    }
    setLinkModal({ open: true, text: initialText, url: "", target });
  };

  const applyLink = (text, url) => {
    const formattedLink = `[${text || "link"}](${url || "#"})`;
    if (linkModal.target === "draft") {
      const ta = taRef.current;
      if (ta) {
        const s = ta.selectionStart, e = ta.selectionEnd;
        const next = drawText.slice(0, s) + formattedLink + drawText.slice(e);
        setDrawText(next);
        setSynced(false);
        setTimeout(() => {
          ta.focus();
          ta.setSelectionRange(s + formattedLink.length, s + formattedLink.length);
        }, 50);
      }
    } else {
      // In a specific block
      setBlocks(prev => prev.map(b => {
        if (b.id === linkModal.target) {
          // This is a bit simplified; in a real scenario we'd want to wrap the selection in the block's textarea
          // For now, we'll append it or replace the whole value if it's simpler
          const currentVal = b.data?.value || "";
          return { ...b, data: { ...b.data, value: currentVal + " " + formattedLink } };
        }
        return b;
      }));
      setSynced(false);
    }
    setLinkModal({ open: false, text: "", url: "", target: "draft" });
  };
  */

  // Dnd-kit Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event) => {
    setActiveDragId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over || active.id === over.id) return;
    
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    
    setBlocks(arrayMove(blocks, oldIndex, newIndex));
    setSynced(false);
  };

  const toggleSelection = (id) => {
    setSelectedBlockIds(prev => 
      prev.includes(id) ? prev.filter(bId => bId !== id) : [...prev, id]
    );
  };

  const handleBatchDelete = () => {
    if (selectedBlockIds.length === 0) return;
    setBlocks(prev => prev.filter(b => !selectedBlockIds.includes(b.id)));
    setSelectedBlockIds([]);
    setSynced(false);
    toast.success(`${selectedBlockIds.length} blocks removed`);
  };

  const checkSetup = () => {
    if (isSuperAdmin && !selectedCompany) return false;
    if (!sectionSlug || !categorySlug) return false;
    return true;
  };

  /* ── Add an image block from a File object ── */
  const addImageBlockFromFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const previewUrl = ev.target.result;
      const imgBlock = {
        id: crypto.randomUUID(),
        type: "image",
        data: { preview: previewUrl, alt: "", caption: "", file_id: null },
      };
      // Append image block and close draw mode so user can upload properly
      setBlocks((prev) => [...prev, imgBlock]);
      setSynced(true);
    };
    reader.readAsDataURL(file);
  };

  /* ── Image drop handlers on the whole modal ── */
  const handleImgDragOver = (e) => { e.preventDefault(); setIsDraggingImg(true); };
  const handleImgDragLeave = (e) => { e.preventDefault(); setIsDraggingImg(false); };
  const handleImgDrop = (e) => {
    e.preventDefault();
    setIsDraggingImg(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setUploadingCover(true); 
      uploadImage(file, 'content').then(res => {
        if (res?.file_id) {
          const imgBlock = {
            id: uuid(),
            type: "image",
            data: { file_id: res.file_id, alt: "", caption: "" },
          };
          setBlocks((prev) => [...prev, imgBlock]);
          setSynced(false); 
          toast.success("Image added to post");
        }
        setUploadingCover(false);
      });
    }
  };

  /* ── ESC / Ctrl+S ── */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") { onClose(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSaveDraft(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  /* ── Cleanup auto-save timer on unmount ── */
  useEffect(() => () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); }, []);

  const applyToEditor = () => {
    const parsed = parseTextToBlocks(drawText);
    if (parsed.length > 0) { setBlocks(parsed); setSynced(true); }
    return parsed;
  };

  /* ── Apply + save as draft ── */
  const handleSaveDraft = () => {
    applyToEditor();
    setAutoSaveStatus('saving');
    setTimeout(() => {
      onSaveDraft?.();
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus(null), 2500);
    }, 300);
  };

  /* ── Add Link Modal JSX (Hidden) ── */
  /*
  const renderLinkModal = () => {
    if (!linkModal.open) return null;
    return (
      <div className="absolute inset-0 z-[210] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-[320px] overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="p-5">
            <h4 className="text-sm font-bold text-slate-900 mb-4">Add link</h4>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Text to display</label>
                <input 
                  type="text" 
                  value={linkModal.text} 
                  onChange={e => setLinkModal(prev => ({...prev, text: e.target.value}))}
                  placeholder="Intelligence"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Link*</label>
                <input 
                  type="text" 
                  value={linkModal.url} 
                  onChange={e => setLinkModal(prev => ({...prev, url: e.target.value}))}
                  placeholder="www.fb.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-6">
              <button 
                onClick={() => setLinkModal({ open: false, text: "", url: "", target: "draft" })}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => applyLink(linkModal.text, linkModal.url)}
                className="px-5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  */

  /* ── Apply + open preview ── */
  const handlePreview = () => {
    applyToEditor();
    // Small delay so blocks state updates before preview opens
    setTimeout(() => onPreview?.(), 150);
  };

  const handleChange = (e) => {
    if (!checkSetup()) {
      setShowSetupPrompt(true);
      return;
    }
    const val = e.target.value;
    setDrawText(val);
    setSynced(false);
  };

  const handleKeyDown = (e) => {
    if (!checkSetup() && e.key !== 'Escape') {
      e.preventDefault();
      setShowSetupPrompt(true);
      return;
    }
    // If Enter is pressed without Shift, create block immediately
    if (e.key === 'Enter' && !e.shiftKey) {
      if (drawText.trim()) {
        e.preventDefault();
        const parsed = parseTextToBlocks(drawText);
        if (parsed.length > 0) {
          setBlocks(prev => [...prev, ...parsed]);
          setDrawText("");
          setSynced(true);
          if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
          // No onSaveDraft call here either
        }
      }
    }
  };

  const updateBlockData = (id, field, value) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, data: { ...b.data, [field]: value } } : b));
    setSynced(false);
  };

  const removeBlockFromDraw = (id) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    setSynced(false);
    toast.success("Block removed");
  };

  const handlePaste = (e) => {
    const html = e.clipboardData.getData("text/html");
    if (!html) return;
    e.preventDefault();
    const stripped = html
      .replace(/<h1[^>]*>/gi, "\n# ").replace(/<h2[^>]*>/gi, "\n## ").replace(/<h[3-6][^>]*>/gi, "\n### ")
      .replace(/<\/h\d>/gi, "\n").replace(/<li[^>]*>/gi, "\n- ").replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
    const ta = taRef.current;
    const start = ta.selectionStart;
    const next = drawText.slice(0, start) + stripped.trim() + "\n" + drawText.slice(ta.selectionEnd);
    setDrawText(next);
    setSynced(false);
  };

  const ins = (pre, suf = "") => {
    const ta = taRef.current; if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd, sel = drawText.slice(s, e);
    const next = drawText.slice(0, s) + pre + (sel || "text") + suf + drawText.slice(e);
    setDrawText(next); setSynced(false);
    setTimeout(() => { ta.focus(); const p = s + pre.length + (sel || "text").length + suf.length; ta.setSelectionRange(p, p); }, 0);
  };

  const insLine = (line) => {
    const ta = taRef.current; if (!ta) return;
    const s = ta.selectionStart;
    const before = drawText.slice(0, s);
    const next = before + (before.length && !before.endsWith("\n") ? "\n" : "") + line + "\n" + drawText.slice(s);
    setDrawText(next); setSynced(false); setTimeout(() => ta.focus(), 0);
  };

  const SLASH = [
    { cmd: "h1",      label: "Heading 1",      act: () => insLine("# ") },
    { cmd: "h2",      label: "Heading 2",      act: () => insLine("## ") },
    { cmd: "h3",      label: "Heading 3",      act: () => insLine("### ") },
    { cmd: "quote",   label: "Quote",          act: () => insLine("> ") },
    { cmd: "code",    label: "Code Block",     act: () => insLine("```javascript\n\n```") },
    { cmd: "list",    label: "Bullet List",    act: () => insLine("- ") },
    { cmd: "num",     label: "Numbered List",  act: () => insLine("1. ") },
    { cmd: "divider", label: "Divider",        act: () => insLine("---") },
    { cmd: "video",   label: "Video URL",      act: () => insLine("https://youtube.com/watch?v=") },
  ];
  const matches = slashCmd !== null ? SLASH.filter(h => h.cmd.startsWith(slashCmd) || h.label.toLowerCase().startsWith(slashCmd)) : [];

  const words = wc(drawText);
  const rtime = rt(drawText);

  const getImageUrl = (fileId) => {
    if (!fileId) return null;
    const API_BASE = import.meta.env.VITE_API_BASE || "";
    return `${API_BASE}/api/images/${fileId}`;
  };

  return (
    <div className="absolute inset-0 z-[40] flex flex-col bg-[#F8FAFC] animate-in fade-in duration-300 font-sans">
      <style>{`
        .dp-ta:focus { outline:none; }
        .dp-ta::-webkit-scrollbar { display:none; }
        .prose-input::placeholder { color: #CBD5E1; font-weight: 400; }
        .glass-panel { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.5); }
      `}</style>

      {/* Link Modal (Hidden) */}
      {/* {renderLinkModal()} */}

      {/* ── Fixed Header ── */}
      <div className="flex h-16 items-center justify-between px-6 glass-panel z-50 sticky top-0 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200/50 text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div className="h-5 w-px bg-slate-200" />
          <div className="flex items-center gap-3">
             <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 bg-white/60 px-2.5 py-1 rounded-md border border-slate-200/50">
               {autoSaveStatus === 'saving' ? (
                 <>
                   <RefreshCw className="w-3 h-3 animate-spin text-indigo-500" /> Saving...
                 </>
               ) : autoSaveStatus === 'saved' ? (
                 <>
                   <CheckCircle2 className="w-3 h-3 text-green-500" /> Draft Saved
                 </>
               ) : synced ? (
                 <>
                   <Clock className="w-3 h-3 text-slate-400" /> All changes synced
                 </>
               ) : (
                 <>
                   <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> Editing...
                 </>
               )}
             </span>
             <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{words} words • {rtime} min read</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handlePreview} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-slate-200">
            <Eye size={15} /> Preview
          </button>
          <button onClick={handleSaveDraft} className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black bg-slate-900 text-white hover:bg-black transition-all shadow-lg shadow-slate-200 active:scale-95">
            <Save size={15} /> Save Draft
          </button>
          <div className="h-5 w-px bg-slate-200 mx-1" />
          <button onClick={onPublish} className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95">
            <Send size={15} /> Publish
          </button>
        </div>
      </div>

      {/* ── Scrollable Content Area ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth" id="dp-scroll-area">
        <div className="max-w-[1000px] mx-auto w-full px-4 sm:px-8 py-10">
          
          {/* Flex Container: Aligns Sidebar with Document */}
          <div className="flex items-start justify-center gap-8 relative">
            
            {/* ── Professional Sticky Sidebar ── */}
            <div className="hidden lg:flex w-12 flex-col sticky top-[100px] self-start z-10 animate-in slide-in-from-left-4 duration-500">
              <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] py-3 px-1.5 flex flex-col items-center gap-1">
                <button onClick={() => addNewBlock("text")} title="Text" className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                  <AlignLeft size={18} />
                </button>
                <button onClick={() => addNewBlock("heading")} title="Heading 1" className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors font-black text-sm">H1</button>
                <button onClick={() => addNewBlock("subheading")} title="Heading 2" className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors font-bold text-xs">H2</button>
                
                <div className="w-6 h-px bg-slate-100 my-1" />
                
                <button onClick={() => addNewBlock("bullet-list")} title="Bullet List" className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"><List size={18}/></button>
                <button onClick={() => addNewBlock("numbered-list")} title="Numbered List" className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"><ListOrdered size={18}/></button>
                
                <div className="w-6 h-px bg-slate-100 my-1" />
                
                <button onClick={() => addNewBlock("image")} title="Upload Image" className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:bg-purple-50 hover:text-purple-600 transition-colors"><ImageIcon size={18}/></button>
                <button onClick={() => addNewBlock("video")} title="Video" className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:bg-purple-50 hover:text-purple-600 transition-colors"><Video size={18}/></button>
                <button onClick={() => addNewBlock("embed")} title="Embed" className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:bg-purple-50 hover:text-purple-600 transition-colors"><Link2 size={18}/></button>
                <button onClick={() => addNewBlock("document")} title="PDF Document" className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:bg-purple-50 hover:text-purple-600 transition-colors"><FileText size={18}/></button>
                
                <div className="w-6 h-px bg-slate-100 my-1" />
                
                <button onClick={() => addNewBlock("quote")} title="Quote" className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"><Quote size={18}/></button>
                <button onClick={() => addNewBlock("code")} title="Code Block" className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors font-bold text-xs">&lt;/&gt;</button>
                <button onClick={() => addNewBlock("cta")} title="Call to Action" className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"><Hash size={18}/></button>
                <button onClick={() => addNewBlock("divider")} title="Divider" className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"><MoreHorizontal size={18}/></button>
              </div>
            </div>

            {/* ── Document Paper Card ── */}
            <div className="flex-1 max-w-[800px] bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 overflow-hidden flex flex-col min-h-[850px] relative transition-all duration-300">
              
              {/* Cover Image Area (Integrated) */}
              <div 
                className={`relative group w-full h-56 sm:h-72 bg-slate-50 transition-all duration-300 border-b border-slate-100 ${isDraggingCover ? 'ring-inset ring-4 ring-indigo-100 bg-indigo-50/30' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setIsDraggingCover(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDraggingCover(false); }}
                onDrop={async (e) => {
                  e.preventDefault(); setIsDraggingCover(false);
                  const file = e.dataTransfer.files[0];
                  if (file) {
                    setUploadingCover(true);
                    const res = await uploadImage(file, 'cover');
                    if (res?.file_id) {
                      setCoverImageId(res.file_id);
                      setCoverImagePreview(URL.createObjectURL(file));
                    }
                    setUploadingCover(false);
                  }
                }}
              >
                {coverImagePreview ? (
                  <>
                    <img src={coverImagePreview} alt="Cover" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                      <button onClick={() => coverInputRef.current?.click()} className="px-4 py-2 bg-white/90 hover:bg-white text-slate-800 text-sm font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2">
                        <Upload size={16} /> Change Cover
                      </button>
                      <button onClick={() => { setCoverImageId(null); setCoverImagePreview(null); }} className="p-2 bg-white/90 hover:bg-red-50 text-red-600 rounded-lg shadow-sm transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </>
                ) : (
                  <button onClick={() => coverInputRef.current?.click()} className="w-full h-full flex flex-col items-center justify-center gap-3 group/upload hover:bg-slate-50 transition-colors">
                    <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center group-hover/upload:scale-105 group-hover/upload:shadow-md transition-all duration-300 text-slate-300 group-hover/upload:text-indigo-500">
                      {uploadingCover ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-600">Add Cover Image</p>
                      <p className="text-xs text-slate-400 mt-1">Drag & drop or click to upload</p>
                    </div>
                  </button>
                )}
                <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={async (e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setUploadingCover(true);
                    const res = await uploadImage(file, 'cover');
                    if (res?.file_id) {
                      setCoverImageId(res.file_id);
                      setCoverImagePreview(URL.createObjectURL(file));
                    }
                    setUploadingCover(false);
                  }
                }} />
              </div>

              {/* Title & Metadata Area */}
              <div className="px-8 sm:px-14 pt-10 pb-6">
                <input
                  type="text"
                  placeholder="Article Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-4xl sm:text-5xl font-extrabold text-slate-900 placeholder-slate-200 border-none outline-none bg-transparent mb-4 tracking-tight leading-tight"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                />
                <input
                  type="text"
                  placeholder="Add a subtitle or brief description..."
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full text-xl font-medium text-slate-500 placeholder-slate-300 border-none outline-none bg-transparent mb-6 leading-relaxed"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                />
                
                {selectedBlockIds.length > 0 && (
                  <div className="absolute top-6 right-8 sm:right-14 z-20 flex items-center gap-3 bg-white shadow-lg border border-slate-200 rounded-xl px-4 py-2 animate-in fade-in slide-in-from-top-4">
                    <span className="text-xs font-bold text-slate-600">{selectedBlockIds.length} selected</span>
                    <div className="w-px h-4 bg-slate-200" />
                    <button 
                      onClick={handleBatchDelete}
                      className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                    <button 
                      onClick={() => setSelectedBlockIds([])}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-2 py-1.5 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2">
                    <Tag size={14} /> Tags
                  </div>
                  {tags.map((tag, idx) => (
                    <span key={idx} className="bg-slate-100 text-slate-600 text-xs font-medium px-3 py-1 rounded-md flex items-center gap-1.5 group/tag transition-colors hover:bg-slate-200">
                      {tag}
                      <button onClick={() => setTags(tags.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover/tag:opacity-100">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  <input 
                    type="text"
                    placeholder="Add tag..."
                    className="text-xs font-medium text-slate-600 bg-transparent outline-none border-none placeholder-slate-300 w-24 py-1 focus:w-32 transition-all"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        e.preventDefault();
                        const val = e.target.value.trim();
                        if (!tags.includes(val)) setTags([...tags, val]);
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
              </div>

              {/* Blocks Flow */}
              <div className="relative px-8 sm:px-14 pb-8 flex flex-col gap-5 flex-1">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                  <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                    {blocks.map((block) => (
                      <DrawSortableBlock 
                        key={block.id} 
                        block={block} 
                        updateBlockData={updateBlockData} 
                        removeBlockFromDraw={removeBlockFromDraw} 
                        getImageUrl={getImageUrl} 
                        isSelected={selectedBlockIds.includes(block.id)}
                        toggleSelection={() => toggleSelection(block.id)}
                        isAnySelected={selectedBlockIds.length > 0}
                      />
                    ))}
                  </SortableContext>
                </DndContext>

                {/* Drafting Zone */}
                <div 
                  className={`mt-4 pt-4 relative transition-all duration-300 ${blocks.length > 0 ? 'border-t border-slate-100' : ''} ${isDraggingImg ? 'bg-indigo-50/50 rounded-2xl -mx-4 px-4' : ''}`}
                  onDragOver={handleImgDragOver} onDragLeave={handleImgDragLeave} onDrop={handleImgDrop}
                >
                  <textarea
                    ref={taRef}
                    value={drawText}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    placeholder={blocks.length === 0 ? "Start writing your story here... (Markdown supported)" : "Continue writing..."}
                    className="dp-ta w-full bg-transparent border-none text-slate-700 leading-relaxed text-[17px] resize-none min-h-[400px] prose-input"
                    spellCheck
                  />

                  {isDraggingImg && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-white/90 backdrop-blur-md px-6 py-5 rounded-2xl shadow-xl border border-indigo-200 flex flex-col items-center gap-3 animate-in zoom-in duration-200">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                          <ImageIcon size={24} />
                        </div>
                        <p className="text-sm font-bold text-indigo-700">Drop Image to Add Inline</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-auto px-8 sm:px-14 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Blocks</span>
                    <span className="text-xs font-semibold text-slate-700">{blocks.length}</span>
                  </div>
                  <div className="w-px h-6 bg-slate-200" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reading Time</span>
                    <span className="text-xs font-semibold text-slate-700">{rtime}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400" title="Markdown Enabled">
                   <Hash size={14} />
                   <span className="text-xs font-medium">MD</span>
                </div>
              </div>
            </div>

          </div>
          
          {/* Cheat Sheet at bottom */}
          <div className="max-w-[800px] mx-auto mt-12 mb-8 bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Code size={14}/> Keyboard Shortcuts</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm font-medium text-slate-500">
              {[["# ","Heading 1"],["## ","Heading 2"],["- ","Bullet List"],["1. ","Number List"],["> ","Quote"],["```","Code Block"],["---","Divider"],["url","Embed Video"]].map(([s, r]) => (
                <div key={s} className="flex items-center gap-2.5">
                  <code className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 text-xs font-mono">{s}</code>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Placement Modal remains at bottom of component scope */}

      {/* Professional Post Placement Modal */}
      {showSetupPrompt && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-200/60 max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Minimal Header */}
            <div className="relative h-24 bg-slate-900 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_#ffffff_0%,_transparent_100%)] scale-150" />
              </div>
              <div className="relative bg-white/10 backdrop-blur-lg p-3 rounded-2xl border border-white/10 shadow-xl">
                <FolderOpen className="w-6 h-6 text-white" />
              </div>
              <button 
                onClick={() => setShowSetupPrompt(false)}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Compact Content Area */}
            <div className="p-7">
              <div className="text-center mb-7">
                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Post Placement</h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">Configure your post destination</p>
              </div>

              <div className="space-y-5">
                {isSuperAdmin && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-slate-400" /> Company
                    </label>
                    <div className="relative group">
                      <select
                        value={selectedCompany}
                        onChange={(e) => {
                          setSelectedCompany(e.target.value);
                          setSectionSlug("");
                          setCategorySlug("");
                        }}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 appearance-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                      >
                        <option value="">Choose Company</option>
                        {companies.map((c) => (
                          <option key={c.company_id} value={c.company_id}>{c.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-focus-within:text-indigo-500 transition-colors" />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400" /> Section
                  </label>
                  <div className="relative group">
                    <select
                      value={sectionSlug}
                      onChange={(e) => {
                        setSectionSlug(e.target.value);
                        setCategorySlug("");
                      }}
                      disabled={isSuperAdmin && !selectedCompany}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 appearance-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none disabled:opacity-50 disabled:bg-slate-100"
                    >
                      <option value="">Select Section</option>
                      {sections.map((s) => (
                        <option key={s.slug} value={s.slug}>{s.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-focus-within:text-indigo-500 transition-colors" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-slate-400" /> Category
                  </label>
                  <div className="relative group">
                    <select
                      value={categorySlug}
                      onChange={(e) => setCategorySlug(e.target.value)}
                      disabled={!sectionSlug || categories.length === 0}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 appearance-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none disabled:opacity-50 disabled:bg-slate-100"
                    >
                      <option value="">Select Category</option>
                      {categories.map((c) => (
                        <option key={c.slug} value={c.slug}>{c.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-focus-within:text-indigo-500 transition-colors" />
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  if (checkSetup()) {
                    setShowSetupPrompt(false);
                    setTimeout(() => taRef.current?.focus(), 200);
                  } else {
                    toast.error("Please complete all fields");
                  }
                }}
                className={`w-full mt-8 py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  checkSetup() 
                    ? "bg-slate-900 hover:bg-slate-800 text-white shadow-lg active:scale-[0.98]" 
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
              >
                <Wand2 className="w-4 h-4" />
                Start Drafting
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- DRAW SORTABLE BLOCK COMPONENT ---------------- */

function MarkdownRenderer({ text, className }) {
  if (!text) return null;
  // Simple regex to find [text](url) and replace with styled spans
  const parts = text.split(/(\[.*?\]\(.*?\))/);
  return (
    <div className={className}>
      {parts.map((part, i) => {
        const match = part.match(/\[(.*?)\]\((.*?)\)/);
        if (match) {
          return <span key={i} className="text-indigo-600 font-semibold underline decoration-indigo-200 underline-offset-4 cursor-pointer hover:text-indigo-800 transition-colors">{match[1]}</span>;
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}

function DrawSortableBlock({ block, updateBlockData, removeBlockFromDraw, getImageUrl, isSelected, toggleSelection, isAnySelected }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, position: 'relative', zIndex: isDragging ? 50 : 'auto' };

  const [isEditing, setIsEditing] = useState(false);

  return (
    <div ref={setNodeRef} style={style} className={`group/block relative rounded-xl p-2 -mx-2 transition-colors ${isSelected ? 'bg-indigo-50/60 ring-1 ring-indigo-200' : 'hover:bg-slate-50'}`}>
      
      {/* Side Controls (Grip, Checkbox, Delete) */}
      <div className={`absolute -left-12 top-2 ${isAnySelected || isSelected ? 'opacity-100' : 'opacity-0 group-hover/block:opacity-100'} transition-opacity flex items-center gap-1 bg-white shadow-sm border border-slate-200 rounded-lg p-1`}>
        <div {...attributes} {...listeners} className="p-1 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded cursor-grab active:cursor-grabbing" title="Drag to move">
          <GripVertical size={14} />
        </div>
        <button onClick={toggleSelection} className={`p-1 rounded transition-colors ${isSelected ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' : 'text-slate-300 hover:text-slate-600 hover:bg-slate-100'}`} title={isSelected ? "Deselect" : "Select"}>
          {isSelected ? <CheckCircle2 size={14} /> : <div className="w-3.5 h-3.5 rounded border border-slate-300" />}
        </button>
        <button onClick={() => removeBlockFromDraw(block.id)} className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Delete block">
          <Trash2 size={14} />
        </button>
      </div>

      {/* Block Content */}
      <div className="pl-1" onClick={() => setIsEditing(true)}>
        {block.type === 'heading' && (
          isEditing ? (
            <input 
              autoFocus
              onBlur={() => setIsEditing(false)}
              type="text" 
              value={block.data?.value || ""} 
              onChange={(e) => updateBlockData(block.id, 'value', e.target.value)} 
              placeholder="Heading 1" 
              className="w-full text-3xl font-bold text-slate-900 border-none outline-none bg-transparent prose-input tracking-tight" 
              style={{ fontFamily: "'Outfit', sans-serif" }}
            />
          ) : (
            <MarkdownRenderer text={block.data?.value || "Heading 1"} className="text-3xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }} />
          )
        )}
        {block.type === 'subheading' && (
          isEditing ? (
            <input 
              autoFocus
              onBlur={() => setIsEditing(false)}
              type="text" 
              value={block.data?.value || ""} 
              onChange={(e) => updateBlockData(block.id, 'value', e.target.value)} 
              placeholder="Heading 2" 
              className="w-full text-2xl font-bold text-slate-800 border-none outline-none bg-transparent prose-input tracking-tight mt-2" 
              style={{ fontFamily: "'Outfit', sans-serif" }}
            />
          ) : (
            <MarkdownRenderer text={block.data?.value || "Heading 2"} className="text-2xl font-bold text-slate-800 tracking-tight mt-2" style={{ fontFamily: "'Outfit', sans-serif" }} />
          )
        )}
        {(block.type === 'text' || block.type === 'paragraph') && (
          isEditing ? (
            <textarea
              autoFocus
              onBlur={() => setIsEditing(false)}
              value={block.data?.value || ""}
              onChange={(e) => updateBlockData(block.id, 'value', e.target.value)}
              placeholder="Type something..."
              className="w-full bg-transparent border-none text-slate-700 leading-relaxed text-[17px] resize-none outline-none h-auto min-h-[1.5em] prose-input"
              onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
            />
          ) : (
            <MarkdownRenderer text={block.data?.value || "Type something..."} className="text-slate-700 leading-relaxed text-[17px] min-h-[1.5em]" />
          )
        )}
        {block.type === 'quote' && (
          <div className="pl-5 border-l-4 border-indigo-500 py-1 my-2">
            {isEditing ? (
              <textarea 
                autoFocus
                onBlur={() => setIsEditing(false)}
                value={block.data?.value || ""} 
                onChange={(e) => updateBlockData(block.id, 'value', e.target.value)} 
                placeholder="Quote..." 
                className="w-full bg-transparent border-none italic text-slate-600 leading-relaxed text-lg resize-none outline-none h-auto prose-input" 
                onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }} 
              />
            ) : (
              <MarkdownRenderer text={block.data?.value || "Quote..."} className="italic text-slate-600 leading-relaxed text-lg" />
            )}
          </div>
        )}
        {block.type === 'image' && (
          <div className="my-4 rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-slate-50 group-hover/block:border-slate-200 transition-colors">
            <img src={block.data?.preview || getImageUrl(block.data?.file_id)} alt="Content" className="w-full h-auto max-h-[600px] object-cover" />
            <div className="p-2 bg-white border-t border-slate-100">
               <input type="text" value={block.data?.caption || ""} onChange={(e) => updateBlockData(block.id, 'caption', e.target.value)} placeholder="Write a caption..." className="w-full text-sm text-slate-500 text-center bg-transparent outline-none border-none prose-input" />
            </div>
          </div>
        )}
        {block.type === 'divider' && <div className="h-px bg-slate-200 my-6 w-full max-w-md mx-auto" />}
      </div>
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
  onAudioUpload,
  onSelectFromLibrary,
  isDragging,
  uploadingImage,
  isSelected,
  onToggleSelect,
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
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      onImageUpload(block.id, file);
    } else if (file) {
      toast.error("Please drop a valid image file");
    }
  };

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
          <div
            className={`space-y-3 rounded-xl transition-all ${isDraggingFile ? 'ring-2 ring-blue-400 ring-dashed bg-blue-50' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {block.data.preview ? (
              /* --- Uploading preview state --- */
              <div className="relative w-full overflow-hidden rounded-xl bg-gray-100" style={{ aspectRatio: '16/9' }}>
                <img
                  src={block.data.preview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3">
                  {uploadingImage ? (
                    <>
                      <RefreshCw className="w-8 h-8 text-white animate-spin" />
                      <p className="text-white text-sm font-semibold">Uploading...</p>
                    </>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-5 py-2 bg-white text-gray-900 rounded-full text-xs font-bold shadow-xl hover:bg-gray-100 transition-all active:scale-95 border border-white/50"
                    >
                      CHANGE IMAGE
                    </button>
                  )}
                </div>
              </div>
            ) : block.data.file_id ? (
              /* --- Saved image state --- */
              <div className="relative w-full group overflow-hidden rounded-xl bg-gray-100">
                <img
                  src={getImageUrl(block.data.file_id)}
                  alt={block.data.alt || ""}
                  className="w-full object-contain max-h-[480px] block mx-auto transition-all duration-500 group-hover:scale-[1.01]"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://via.placeholder.com/800x400?text=Image+Not+Found";
                  }}
                />
                {/* Centered hover overlay */}
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 group-hover:bg-black/40 transition-all duration-300 backdrop-blur-0 group-hover:backdrop-blur-[1px]">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-white/95 hover:bg-white text-gray-900 rounded-full text-xs font-bold shadow-2xl opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 border border-white active:scale-95"
                    disabled={uploadingImage}
                  >
                    CHANGE IMAGE
                  </button>
                  <button
                    onClick={onSelectFromLibrary}
                    className="px-4 py-2 bg-white/95 hover:bg-white text-gray-900 rounded-full text-xs font-bold shadow-2xl opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 border border-white active:scale-95"
                  >
                    LIBRARY
                  </button>
                </div>
                {/* Dimensions badge */}
                {block.data.width && block.data.height && (
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-mono px-2 py-0.5 rounded-md">
                    {block.data.width} × {block.data.height}
                  </div>
                )}
              </div>
            ) : block.data.url && block.data.external ? (
              /* --- External URL image state --- */
              <div className="relative w-full overflow-hidden rounded-xl bg-gray-100">
                <img
                  src={block.data.url}
                  alt={block.data.alt || ""}
                  className="w-full object-contain max-h-[480px] block mx-auto"
                />
                <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Link2 className="w-3 h-3" /> External
                </div>
              </div>
            ) : (
              /* --- Empty / drop zone state --- */
              <div
                className={`w-full border-2 border-dashed rounded-2xl transition-all duration-300 ${
                  isDraggingFile
                    ? "border-blue-500 bg-blue-50 scale-[1.01] shadow-lg shadow-blue-100"
                    : "border-gray-200 bg-gray-50/50 hover:bg-white hover:border-gray-300"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 ${isDraggingFile ? 'bg-blue-100 scale-110' : 'bg-white shadow-sm border border-gray-100'}`}>
                    <ImageIcon className={`w-8 h-8 ${isDraggingFile ? 'text-blue-600' : 'text-blue-400'}`} />
                  </div>
                  <p className="text-sm font-semibold text-gray-800 mb-1">
                    {isDraggingFile ? 'Drop image here' : 'Drag and drop to upload image'}
                  </p>
                  <p className="text-xs text-gray-400 mb-6">or select from library or your device</p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-lg shadow-blue-200/60 transition-all active:scale-95 flex items-center gap-1.5"
                      disabled={uploadingImage}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Upload
                    </button>
                    <button
                      onClick={onSelectFromLibrary}
                      className="px-5 py-2 bg-white text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-50 border border-gray-200 shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                    >
                      <ImageIcon2 className="w-3.5 h-3.5" />
                      Library
                    </button>
                  </div>
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
            <div className="space-y-2 px-1">
              <input
                type="text"
                placeholder="Alt text (for accessibility)"
                value={block.data.alt || ""}
                onChange={(e) => updateBlock(block.id, { alt: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400 bg-gray-50 focus:bg-white transition-all"
              />
              <input
                type="text"
                placeholder="Caption (optional)"
                value={block.data.caption || ""}
                onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400 bg-gray-50 focus:bg-white transition-all"
              />
            </div>
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
                  className={`w-full px-3 py-2 border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2 ${!block.data.title && isFocused
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
                        className={`w-full px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${block.data.url &&
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
            className={`p-4 rounded-lg ${block.data.type === "info"
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

      /*
      case "audio":
        return (
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start space-x-3">
              <Mic className="w-8 h-8 text-purple-500 flex-shrink-0" />
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Audio title"
                  value={block.data.title || ""}
                  onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 mb-2"
                />
                <input
                  type="text"
                  placeholder="Audio file URL (e.g. mp3)"
                  value={block.data.url || ""}
                  onChange={(e) => updateBlock(block.id, { url: e.target.value, file_id: null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />

                <div className="flex items-center space-x-2 mt-2 mb-3">
                    <button
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = "audio/*";
                        input.onchange = async (e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const result = await onAudioUpload(file);
                            if (result) {
                              updateBlock(block.id, {
                                file_id: result.file_id,
                                url: result.url,
                                title:
                                  block.data.title ||
                                  file.name.replace(/\.[^/.]+$/, ""),
                              });
                            }
                          }
                        };
                        input.click();
                      }}
                      className="px-3 py-1.5 bg-purple-500 text-white rounded-md text-sm hover:bg-purple-600 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
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
                          Upload Audio
                        </>
                      )}
                    </button>
                    <span className="text-gray-500 text-sm font-semibold">or paste URL above</span>
                </div>

                {block.data.url && (
                  <div className="mt-3">
                    <audio controls className="w-full h-10 rounded-md">
                      <source src={block.data.url} />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}
                <textarea
                  placeholder="Audio description (optional)"
                  value={block.data.description || ""}
                  onChange={(e) => updateBlock(block.id, { description: e.target.value })}
                  rows={2}
                  className="w-full mt-3 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>
        );

      case "special":
        return (
          <div className="space-y-2 border border-gray-200 rounded-lg overflow-hidden bg-white shadow-inner">
            <div className="flex items-center space-x-1 p-2 bg-gray-50 border-b border-gray-200">
              <button 
                onClick={(e) => { e.preventDefault(); document.execCommand('bold', false, null); }}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200 text-gray-700 font-bold"
                title="Bold"
              >B</button>
              <button 
                onClick={(e) => { e.preventDefault(); document.execCommand('italic', false, null); }}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200 text-gray-700 italic font-serif"
                title="Italic"
              >I</button>
              <button 
                onClick={(e) => { e.preventDefault(); document.execCommand('underline', false, null); }}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200 text-gray-700 underline"
                title="Underline"
              >U</button>
              <div className="w-px h-5 bg-gray-300 mx-1"></div>
              <button 
                onClick={(e) => { 
                  e.preventDefault(); 
                  const url = prompt("Enter link URL:");
                  if (url) document.execCommand('createLink', false, url);
                }}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200 text-gray-700"
                title="Add Link"
              ><Link2 className="w-4 h-4" /></button>
              <button 
                onClick={(e) => { e.preventDefault(); document.execCommand('unlink', false, null); }}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200 text-gray-700 text-xs font-semibold"
                title="Remove Link"
              ><s>Link</s></button>
            </div>
            <div
              contentEditable
              className="w-full min-h-[100px] p-4 text-gray-800 focus:outline-none focus:ring-0 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: block.data.value || "" }}
              onBlur={(e) => updateBlock(block.id, { value: e.currentTarget.innerHTML })}
              placeholder="Write your special formatted text here..."
              style={{
                outline: 'none',
              }}
            />
          </div>
        );
        */

      default:
        return null;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative bg-white rounded-lg border transition-all duration-200 ${
        isSelected 
          ? "border-violet-500 ring-2 ring-violet-500/20 bg-violet-50/10 shadow-lg" 
          : isFocused 
            ? "border-blue-500 ring-1 ring-blue-500" 
            : "border-gray-200"
      } hover:border-gray-300`}
    >
      {/* Selection Checkbox */}
      <div className={`absolute left-[-2rem] top-1/2 -translate-y-1/2 transition-all duration-200 ${isSelected || isFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
            isSelected 
              ? "bg-violet-600 border-violet-600 shadow-lg shadow-violet-200 text-white" 
              : "bg-white border-gray-300 hover:border-violet-400"
          }`}
        >
          {isSelected && <CheckCircle2 className="w-4 h-4" />}
        </button>
      </div>

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

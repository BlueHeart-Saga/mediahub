const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
const API_PREFIX = "/api";


export const apiFetch = async (url, options = {}) => {
  const token = localStorage.getItem("token");
  const isFormData = options.body instanceof FormData;

  // Ensure url starts with /
  const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
  
  // Construct full URL
  const fullUrl = `${API_BASE}${API_PREFIX}${normalizedUrl}`;
  
  console.log('Fetching:', fullUrl); // Debug log - check this in console

  try {
    const res = await fetch(fullUrl, {
      ...options,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(options.headers || {}),
      },
    });

    const text = await res.text();
    let data = {};

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        console.error("Invalid JSON response:", text);
      }
    }

    if (!res.ok) {
      // Handle expired token automatically
      if (res.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
        throw new Error("Session expired. Please login again.");
      }

      const error = new Error(data.detail || "Request failed");
      error.status = res.status;
      error.detail = data.detail;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    console.error("API request failed:", err);
    throw err;
  }
};
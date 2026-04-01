// src/api/publicClient.js
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export async function publicFetch(endpoint, options = {}) {
  const url = `${API_BASE}/api${endpoint}`;
  
  const defaultOptions = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  const fetchOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, fetchOptions);
    
    if (!response.ok) {
      const error = new Error(`HTTP error! status: ${response.status}`);
      error.status = response.status;
      
      try {
        const errorData = await response.json();
        error.detail = errorData.detail || errorData.message || JSON.stringify(errorData);
      } catch {
        error.detail = await response.text();
      }
      
      throw error;
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    }
    
    return await response.text();
    
  } catch (error) {
    console.error("Public API request failed:", error);
    throw error;
  }
}
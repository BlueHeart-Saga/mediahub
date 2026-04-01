const API_BASE_URL = import.meta.env.VITE_API_BASE || "http://localhost:5000";
const API_PREFIX = "/api";

class API {
  constructor() {
    this.baseUrl = `${API_BASE_URL}${API_PREFIX}`;
  }

  // -------------------------
  // 🔐 Helper: Get Auth Header
  // -------------------------
  getAuthHeaders(isFormData = false) {
    const token = localStorage.getItem("token");

    const headers = {
      Authorization: `Bearer ${token}`,
    };

    // Only set JSON header if not FormData
    if (!isFormData) {
      headers["Content-Type"] = "application/json";
    }

    return headers;
  }

  // -------------------------
  // 🔁 Generic Request Handler
  // -------------------------
  async request(endpoint, options = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "API request failed");
    }

    return response.json();
  }

  // =====================================================
  // 👤 USER PROFILE
  // =====================================================

// Get Logged In User Profile
async getProfile() {
  return this.request("/users/me", {
    method: "GET",
    headers: this.getAuthHeaders(),
  });
}

// Update Profile (Name + Profile Image)
async updateProfile(formData) {
  return this.request("/users/me/profile", {  // Changed from "/users/me" to "/users/me/profile"
    method: "PATCH",
    headers: this.getAuthHeaders(true), // true = FormData
    body: formData,
  });
}

async resetPassword(formData) {
  return this.request("/users/me/password", {
    method: "PATCH",
    headers: this.getAuthHeaders(true),
    body: formData,
  });
}

  // =====================================================
  // 👥 USERS
  // =====================================================

  async getUsers(role = null) {
    const query = role ? `?role=${role}` : "";

    return this.request(`/users${query}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async suspendUser(userId) {
    return this.request(`/users/${userId}/suspend`, {
      method: "PATCH",
      headers: this.getAuthHeaders(),
    });
  }

  async activateUser(userId) {
    return this.request(`/users/${userId}/activate`, {
      method: "PATCH",
      headers: this.getAuthHeaders(),
    });
  }

  async deleteUser(userId) {
    return this.request(`/users/${userId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
  }

  async resendInvite(userId) {
    return this.request(`/users/${userId}/resend-invite`, {
      method: "PATCH",
      headers: this.getAuthHeaders(),
    });
  }

  // =====================================================
  // 📊 STATS
  // =====================================================

  async getSuperAdminStats() {
    return this.request("/super-admin-stats", {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async getCompanyAdminStats() {
    return this.request("/company-admin-stats", {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }
  async getEditorStats() {
  return this.request("/editor-stats", {
    method: "GET",
    headers: this.getAuthHeaders(),
  });
}
}

export default new API();
import { useState, useEffect } from "react";
import api from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

export default function Settings() {
  const { user, setUser } = useAuth();

  const [name, setName] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Load user data on mount
  useEffect(() => {
    if (user) {
      setName(user.name || "");
    }
  }, [user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("name", name.trim());
    if (image) {
      formData.append("profile_image", image);
    }

    try {
      const response = await api.updateProfile(formData);
      
      // Check if response has success or message
      if (response?.success || response?.message) {
        const updatedUser = await api.getProfile();
        setUser(updatedUser);
        toast.success(response.message || "Profile updated successfully");
        
        // Clear preview after successful upload
        if (image) {
          setImage(null);
          // Keep preview to show new image
        }
      } else if (response?.detail) {
        toast.error(response.detail);
      }
    } catch (err) {
      console.error("Profile update failed:", err);
      toast.error(err.message || "Profile update failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();

    // Validation
    if (!currentPassword) {
      toast.error("Current password is required");
      return;
    }

    if (!newPassword) {
      toast.error("New password is required");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword === currentPassword) {
      toast.error("New password must be different from current password");
      return;
    }

    setPasswordLoading(true);
    const formData = new FormData();
    formData.append("current_password", currentPassword);
    formData.append("new_password", newPassword);

    try {
      const response = await api.resetPassword(formData);
      
      if (response?.success || response?.message) {
        toast.success(response.message || "Password updated successfully");
        
        // Clear form
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else if (response?.detail) {
        toast.error(response.detail);
      }
    } catch (err) {
      console.error("Password update failed:", err);
      toast.error(err.message || "Password update failed");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please select a valid image file");
        return;
      }

      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImage(null);
    setPreview(null);
    // Clear file input
    document.getElementById("profile-image-input").value = "";
  };

  return (
    <div className="p-7 max-w-xl space-y-10">
      <h2 className="text-2xl font-semibold">Settings</h2>

      {/* ===================== */}
      {/* Profile Section */}
      {/* ===================== */}
      <form onSubmit={handleProfileUpdate} className="space-y-4">
        <h3 className="text-lg font-semibold">Update Profile</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Your Name
          </label>
          <input
            type="text"
            placeholder="Enter your name"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Profile Picture (Optional)
          </label>
          <input
            id="profile-image-input"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full p-2 border rounded"
          />
          
        </div>

        {/* Image Preview */}
        {(preview || user?.avatar_url) && (
          <div className="relative inline-block">
            <img
              src={preview || user?.avatar_url}
              alt="Preview"
              className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
            />
            {image && (
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
              >
                ×
              </button>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`bg-black text-white px-4 py-2 rounded ${
            loading ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-800"
          }`}
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </form>

      {/* ===================== */}
      {/* Password Section */}
      {/* ===================== */}
      <form onSubmit={handlePasswordReset} className="space-y-4">
        <h3 className="text-lg font-semibold">Reset Password</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Password
          </label>
          <input
            type="password"
            placeholder="Enter current password"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            New Password
          </label>
          <input
            type="password"
            placeholder="Enter new password (min. 8 characters)"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirm New Password
          </label>
          <input
            type="password"
            placeholder="Confirm new password"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={passwordLoading}
          className={`bg-red-600 text-white px-4 py-2 rounded ${
            passwordLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-red-700"
          }`}
        >
          {passwordLoading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}
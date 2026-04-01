import { useState } from "react";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";
import "../styles/ForceNameModel.css";

export default function ForceNameModal() {
  const { forceNameUpdate, setForceNameUpdate, setUser } = useAuth();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  if (!forceNameUpdate) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSaving(true);

      const formData = new FormData();
      formData.append("name", name);

      await api.updateProfile(formData);
      const updated = await api.getProfile();

      setUser(updated);
      setForceNameUpdate(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="force-modal-overlay">
      <div className="force-modal">
        <h2>Complete Your Profile</h2>
        <p>You must enter your name before continuing.</p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save & Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
import { useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import "../styles/ContactUs.css";
import { Home } from "lucide-react";


export default function ContactUs() {
    const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    message: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.name || !form.email || !form.message) {
      toast.error("Please fill all fields");
      return;
    }

    // TODO → Connect FastAPI endpoint
    console.log("CONTACT FORM:", form);

    toast.success("Message sent successfully");

    setForm({ name: "", email: "", message: "" });
  };

  return (
    <div className="ph-login-page">
      <div className="ph-login-card">

        <div className="ph-login-header">
          <div className="ph-login-top-row">
            <div className="ph-login-logo"></div>
            <div
              className="ph-login-home"
              onClick={() => navigate("/")}
              title="Go to Home"
            >
              <Home size={18} />
            </div>
          </div>

          <h2>Contact Media Hub Team</h2>
          <p>Partnership inquiries, access requests, or support</p>
        </div>

        <form onSubmit={handleSubmit}>

          <div className="ph-login-field">
            <label>Name</label>
            <input
              placeholder="Your name"
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
            />
          </div>

          <div className="ph-login-field">
            <label>Email</label>
            <input
              placeholder="Your email"
              value={form.email}
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
            />
          </div>

          <div className="ph-login-field">
            <label>Message</label>
            <textarea
              className="ph-contact-textarea"
              placeholder="Write your message..."
              value={form.message}
              onChange={(e) =>
                setForm({ ...form, message: e.target.value })
              }
            />
          </div>

          <button className="ph-login-btn">
            Send Message
          </button>
        </form>

        {/* Skeleton UI Enhancer */}
        <div className="ph-login-footer">
          <div></div>
          <div></div>
        </div>

      </div>
    </div>
  );
}
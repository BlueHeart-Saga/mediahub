// components/Subscription/SubscribeForm.jsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, CheckCircle, AlertCircle, Bell, X, Loader } from "lucide-react";
import { apiFetch } from "../../api/client";
import toast from "react-hot-toast";

export default function SubscribeForm({ 
  companyId, 
  position = "bottom", // bottom, sidebar, modal
  buttonText = "Subscribe",
  showNameField = false,
  onSuccess 
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    sections: [],
    categories: [],
    frequency: "instant"
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      const response = await apiFetch("/subscriptions/subscribe", {
        method: "POST",
        body: JSON.stringify({
          email,
          name: name || undefined,
          company_id: companyId,
          preferences: showPreferences ? preferences : undefined
        })
      });

      if (response.success) {
        setSubscribed(true);
        setEmail("");
        setName("");
        toast.success("Successfully subscribed! Please check your email to verify.");
        onSuccess?.();
      }
    } catch (error) {
      console.error("Subscription failed:", error);
      if (error.status === 409) {
        toast.error("This email is already subscribed");
      } else {
        toast.error(error.detail || "Failed to subscribe. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (subscribed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-green-50 border border-green-200 rounded-lg p-6 text-center"
      >
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-green-800 mb-2">
          Subscription Confirmed!
        </h3>
        <p className="text-green-600 text-sm">
          Thank you for subscribing! You'll receive notifications about new posts.
        </p>
      </motion.div>
    );
  }

  const formClasses = {
    bottom: "mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100",
    sidebar: "p-4 bg-white rounded-lg shadow-md border border-gray-200",
    modal: "p-6 bg-white rounded-xl shadow-xl"
  };

  return (
    <div className={formClasses[position]}>
      <div className="flex items-center mb-4">
        <Bell className="w-5 h-5 text-blue-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">
          Get Post Notifications
        </h3>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">
        Subscribe to receive email notifications when new content is published.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        {showNameField && (
          <input
            type="text"
            placeholder="Your name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
        
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
          >
            {loading ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              buttonText
            )}
          </button>
        </div>

        {position !== "modal" && (
          <button
            type="button"
            onClick={() => setShowPreferences(!showPreferences)}
            className="text-xs text-blue-600 hover:text-blue-800 mt-2"
          >
            {showPreferences ? "Hide preferences" : "Set preferences (optional)"}
          </button>
        )}

        <AnimatePresence>
          {showPreferences && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Notification Preferences
                </h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">
                      Frequency
                    </label>
                    <select
                      value={preferences.frequency}
                      onChange={(e) => setPreferences(prev => ({
                        ...prev,
                        frequency: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="instant">Instant (as soon as published)</option>
                      <option value="daily">Daily digest</option>
                      <option value="weekly">Weekly digest</option>
                    </select>
                  </div>

                  <p className="text-xs text-gray-500">
                    You can customize your preferences later from your email.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      <p className="text-xs text-gray-500 mt-3">
        We'll never share your email. Unsubscribe at any time.
      </p>
    </div>
  );
}
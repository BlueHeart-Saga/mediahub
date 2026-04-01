import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext";   // ⭐ add this
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>      {/* ⭐ REQUIRED */}
      <App />
    </AuthProvider>
  </StrictMode>
);

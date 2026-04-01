import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  // ✅ WAIT until AuthContext finishes checking token
  if (loading) return null; // or spinner / skeleton

  if (!user) return <Navigate to="/login" replace />;

  return children;
}
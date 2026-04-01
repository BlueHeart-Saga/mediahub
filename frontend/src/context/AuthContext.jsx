import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/api";

const AuthContext = createContext();

const decodeToken = (token) => {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forceNameUpdate, setForceNameUpdate] = useState(false);

  // 🔥 SINGLE SOURCE OF TRUTH
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const profile = await api.getProfile();
        setUser(profile);

        if (!profile.name || profile.name.trim() === "") {
          setForceNameUpdate(true);
        }

      } catch (err) {
        localStorage.removeItem("token");
        setUser(null);
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (token) => {
    localStorage.setItem("token", token);

    const profile = await api.getProfile();
    setUser(profile);

    if (!profile.name || profile.name.trim() === "") {
      setForceNameUpdate(true);
    }

    return decodeToken(token);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
        setUser,
        forceNameUpdate,
        setForceNameUpdate,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
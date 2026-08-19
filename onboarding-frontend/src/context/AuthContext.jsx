import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { fetchMe, login as loginRequest } from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // initial /auth/me check
  const [token, setToken] = useState(() => localStorage.getItem("access_token"));

  const loadMe = useCallback(async () => {
    try {
      const { data } = await fetchMe();
      setUser(data);
      return data;
    } catch (err) {
      setUser(null);
      setToken(null);
      localStorage.removeItem("access_token");
      throw err;
    }
  }, []);

  useEffect(() => {
    const existing = localStorage.getItem("access_token");
    if (!existing) {
      setLoading(false);
      return;
    }
    loadMe().finally(() => setLoading(false));
  }, [loadMe]);

  useEffect(() => {
    const onUnauthorized = () => {
      localStorage.removeItem("access_token");
      setToken(null);
      setUser(null);
    };
    window.addEventListener("auth:unauthorized", onUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", onUnauthorized);
  }, []);

  const login = useCallback(
    async ({ email, password }) => {
      const { data } = await loginRequest({ email, password });
      localStorage.setItem("access_token", data.access_token);
      setToken(data.access_token);
      const me = await loadMe();
      return me;
    },
    [loadMe]
  );

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(() => loadMe(), [loadMe]);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    isAdmin: !!user?.is_admin,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

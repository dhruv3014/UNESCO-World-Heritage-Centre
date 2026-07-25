import { createContext, useContext, useEffect, useState } from "react";
import { api, setAccessToken, restoreSession } from "@/lib/api-client.js";

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On first load, try to restore a session from the refresh cookie.
  useEffect(() => {
    restoreSession()
      .then((result) => setUser(result?.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const data = await api("/api/auth/login", { method: "POST", body: { email, password } });
    setAccessToken(data.accessToken);
    setUser(data.user);
  };

  const register = async (email, password, name) => {
    const data = await api("/api/auth/register", { method: "POST", body: { email, password, name } });
    setAccessToken(data.accessToken);
    setUser(data.user);
  };

  const logout = async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}

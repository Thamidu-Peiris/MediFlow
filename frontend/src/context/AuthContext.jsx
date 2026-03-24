import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(false);

  const authHeaders = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );

  useEffect(() => {
    if (!token) {
      localStorage.removeItem("token");
      setUser(null);
      return;
    }
    localStorage.setItem("token", token);
    setLoadingUser(true);
    api
      .get("/auth/me", authHeaders)
      .then((res) => setUser(res.data.user))
      .catch(() => {
        setToken("");
        setUser(null);
      })
      .finally(() => setLoadingUser(false));
  }, [token, authHeaders]);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    setToken(res.data.token);
    return res.data.user;
  };

  const register = async ({ name, email, password, role }) => {
    const res = await api.post("/auth/register", { name, email, password, role });
    setToken(res.data.token);
    return res.data.user;
  };

  const logout = () => {
    setToken("");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ token, user, loadingUser, authHeaders, login, register, logout, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

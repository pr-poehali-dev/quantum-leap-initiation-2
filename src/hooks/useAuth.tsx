import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const AUTH_URL = "https://functions.poehali.dev/a26e0f6a-8677-48c6-9c05-ce89c5ca96ff";

interface AuthUser {
  email: string;
  plan: string;
  status: string;
  has_access: boolean;
  trial_ends_at: string | null;
  paid_until: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  register: (email: string, password: string) => Promise<{ error?: string }>;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => void;
  refreshStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("sf_token");
    if (saved) {
      setToken(saved);
      checkStatus(saved).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function checkStatus(t: string) {
    try {
      const res = await fetch(AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status", token: t }),
      });
      if (res.ok) {
        const data = JSON.parse(await res.json());
        setUser(data);
      } else {
        localStorage.removeItem("sf_token");
        setToken(null);
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }

  async function refreshStatus() {
    if (token) await checkStatus(token);
  }

  async function register(email: string, password: string) {
    const res = await fetch(AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "register", email, password }),
    });
    const raw = await res.json();
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!res.ok) return { error: data.error || "Ошибка регистрации" };
    localStorage.setItem("sf_token", data.token);
    setToken(data.token);
    setUser(data);
    return {};
  }

  async function login(email: string, password: string) {
    const res = await fetch(AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", email, password }),
    });
    const raw = await res.json();
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!res.ok) return { error: data.error || "Ошибка входа" };
    localStorage.setItem("sf_token", data.token);
    setToken(data.token);
    setUser(data);
    return {};
  }

  function logout() {
    localStorage.removeItem("sf_token");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, register, login, logout, refreshStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

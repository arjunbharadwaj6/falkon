import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Role = "admin" | "recruiter";

type Account = {
  id: string;
  companyName?: string;
  email: string;
  username?: string;
  role: Role;
  parentAccountId?: string | null;
};

type AuthContextType = {
  token: string | null;
  account: Account | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    companyName: string,
    email: string,
    username: string,
    password: string,
  ) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

async function authRequest(
  path: string,
  body: Record<string, unknown>,
): Promise<{ token: string; account: Account }> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }

  return res.json();
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem("auth_token");
    const storedAccount = localStorage.getItem("auth_account");
    if (storedToken) setToken(storedToken);
    if (storedAccount) {
      try {
        const acc = JSON.parse(storedAccount) as Account;
        setAccount({ ...acc, role: acc.role ?? "admin" });
      } catch {
        /* ignore */
      }
    }
    setIsInitialized(true);
  }, []);

  const persist = (t: string, acc: Account) => {
    setToken(t);
    setAccount(acc);
    localStorage.setItem("auth_token", t);
    localStorage.setItem("auth_account", JSON.stringify(acc));
  };

  const login = async (email: string, password: string) => {
    const data = await authRequest("/auth/login", { email, password });
    persist(data.token, data.account);
  };

  const signup = async (
    companyName: string,
    email: string,
    username: string,
    password: string,
  ) => {
    const data = await authRequest("/auth/signup", {
      companyName,
      email,
      username,
      password,
    });
    persist(data.token, data.account);
  };

  const logout = () => {
    setToken(null);
    setAccount(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_account");
  };

  const value = useMemo(
    () => ({ token, account, login, signup, logout }),
    [token, account],
  );

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        Loading...
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

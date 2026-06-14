import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Role = "doctor" | "patient" | null;

interface User {
  id: string;
  name?: string;
  phone?: string;
  blood_type?: string;
  disease_type?: string;
  [key: string]: any;
}

interface AuthCtx {
  session: any | null;
  user: User | null;
  role: Role;
  loading: boolean;
  refreshRole: () => Promise<void>;
  signOut: () => Promise<void>;
  login: (userData: any) => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("hemocare_user");
    if (storedUser) {
      const u = JSON.parse(storedUser);
      setUser({ id: u.user_id, ...u });
      setRole(u.role);
      
      // Monkey patch fetch to include Authorization header
      if (u.access_token) {
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
          let [resource, config] = args;
          let url = "";
          if (typeof resource === 'string') url = resource;
          else if (resource instanceof URL) url = resource.href;
          else if (typeof resource === 'object' && 'url' in resource) url = (resource as any).url;

          if (url.startsWith('http://127.0.0.1:8000') || url.startsWith('http://localhost:8000')) {
            config = config || {};
            config.headers = {
              ...(config.headers || {}),
              'Authorization': `Bearer ${u.access_token}`,
              'X-User-ID': (u.user_id || u.id || "").toString(),
              'X-User-Role': u.role || ""
            };
          }
          return originalFetch(resource, config);
        };
      }
    }
    setLoading(false);
  }, []);

  const login = (userData: any) => {
    localStorage.setItem("hemocare_user", JSON.stringify(userData));
    setUser({ id: userData.user_id, ...userData });
    setRole(userData.role);
    
    if (userData.access_token) {
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
          let [resource, config] = args;
          let url = "";
          if (typeof resource === 'string') url = resource;
          else if (resource instanceof URL) url = resource.href;
          else if (typeof resource === 'object' && 'url' in resource) url = (resource as any).url;

          if (url.startsWith('http://127.0.0.1:8000') || url.startsWith('http://localhost:8000')) {
            config = config || {};
            config.headers = {
              ...(config.headers || {}),
              'Authorization': `Bearer ${userData.access_token}`,
              'X-User-ID': (userData.user_id || userData.id || "").toString(),
              'X-User-Role': userData.role || ""
            };
          }
          return originalFetch(resource, config);
        };
    }
  };

  const refreshRole = async () => {};

  const signOut = async () => {
    localStorage.removeItem("hemocare_user");
    setUser(null);
    setRole(null);
    window.location.href = "/login"; // Force reload to clear monkey-patch
  };

  return (
    <Ctx.Provider value={{ session: user ? { user } : null, user, role, loading, refreshRole, signOut, login }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside provider");
  return c;
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  fetchCurrentSession,
  loginAccount,
  logoutAccount,
  refreshSessionToken,
  registerAccount,
} from "@/lib/auth-api";
import { getAccessToken, setAccessToken, type AuthShop, type AuthUser } from "@/lib/auth-store";
import { api } from "@/lib/api";

type AuthContextValue = {
  user: AuthUser | null;
  shop: AuthShop | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    shopName?: string;
    rememberMe?: boolean;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  
  isLocked: boolean;
  lockDashboard: () => void;
  unlockDashboard: (pin: string) => Promise<boolean>;
  updateUserFields: (fields: Partial<AuthUser>) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [shop, setShop] = useState<AuthShop | null>(null);
  const [loading, setLoading] = useState(true);

  const restoreSession = useCallback(async () => {
    try {
      let token = getAccessToken();
      if (!token) {
        try {
          const refreshed = await refreshSessionToken();
          token = refreshed.accessToken;
          if (refreshed.user) setUser(refreshed.user);
        } catch {
          setAccessToken(null);
          setUser(null);
          setShop(null);
          return;
        }
      }

      if (!token) return;
      const session = await fetchCurrentSession();
      setUser(session.user);
      setShop(session.shop);
      if (session.shop?.currency) {
        localStorage.setItem("sp_currency", session.shop.currency);
      }
    } catch {
      setAccessToken(null);
      setUser(null);
      setShop(null);
    }
  }, []);

  useEffect(() => {
    void restoreSession().finally(() => setLoading(false));
  }, [restoreSession]);

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    const session = await loginAccount({ email, password, rememberMe });
    setUser(session.user);
    setShop(session.shop);
    if (session.shop?.currency) {
      localStorage.setItem("sp_currency", session.shop.currency);
    }
    const startPage = localStorage.getItem("sp_start_page") || "/dashboard";
    void navigate({ to: startPage as any });
  }, []);

  const register = useCallback(
    async (payload: {
      name: string;
      email: string;
      password: string;
      shopName?: string;
      rememberMe?: boolean;
    }) => {
      const session = await registerAccount(payload);
      setUser(session.user);
      setShop(session.shop);
      if (session.shop?.currency) {
        localStorage.setItem("sp_currency", session.shop.currency);
      }
      const startPage = localStorage.getItem("sp_start_page") || "/dashboard";
      void navigate({ to: startPage as any });
    },
    [],
  );

  const logout = useCallback(async () => {
    await logoutAccount();
    setUser(null);
    setShop(null);
    sessionStorage.removeItem("sp_dashboard_unlocked");
    setIsLocked(false);
  }, []);

  const [isLocked, setIsLocked] = useState(false);

  const lockDashboard = useCallback(() => {
    sessionStorage.removeItem("sp_dashboard_unlocked");
    setIsLocked(true);
    void navigate({ to: "/shopilot-lock" as any });
  }, [navigate]);

  const unlockDashboard = useCallback(async (pin: string): Promise<boolean> => {
    try {
      const res = await api.post("/auth/lock/verify", { pin });
      if (res.data?.success) {
        sessionStorage.setItem("sp_dashboard_unlocked", "true");
        setIsLocked(false);
        const startPage = localStorage.getItem("sp_start_page") || "/dashboard";
        void navigate({ to: startPage as any });
        return true;
      }
    } catch (err: any) {
      throw new Error(err.response?.data?.message || "Incorrect PIN");
    }
    return false;
  }, [navigate]);

  const updateUserFields = useCallback((fields: Partial<AuthUser>) => {
    setUser((prev) => (prev ? { ...prev, ...fields } : null));
  }, []);

  useEffect(() => {
    if (user?.dashboardLockEnabled) {
      const unlocked = sessionStorage.getItem("sp_dashboard_unlocked") === "true";
      if (!unlocked) {
        setIsLocked(true);
      }
    } else {
      setIsLocked(false);
    }
  }, [user]);

  // Auto Lock timer
  useEffect(() => {
    if (!user?.dashboardLockEnabled || isLocked) return;
    
    const timeoutStr = user.autoLockTimeout || "never";
    if (timeoutStr === "never" || timeoutStr === "immediately") return;
    
    const minutes = parseInt(timeoutStr, 10);
    if (isNaN(minutes)) return;
    const timeoutMs = minutes * 60 * 1000;
    
    let timer: NodeJS.Timeout;
    
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        lockDashboard();
      }, timeoutMs);
    };
    
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    events.forEach(event => window.addEventListener(event, resetTimer));
    
    resetTimer();
    
    return () => {
      clearTimeout(timer);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [user, isLocked, lockDashboard]);

  const value = useMemo(
    () => ({
      user,
      shop,
      loading,
      isAuthenticated: Boolean(user && getAccessToken()),
      login,
      register,
      logout,
      refresh: restoreSession,
      isLocked,
      lockDashboard,
      unlockDashboard,
      updateUserFields,
    }),
    [user, shop, loading, login, register, logout, restoreSession, isLocked, lockDashboard, unlockDashboard, updateUserFields],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
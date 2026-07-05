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
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [shop, setShop] = useState<AuthShop | null>(null);
  const [accessToken, setAuthAccessToken] = useState<string | null>(() => getAccessToken());
  const [loading, setLoading] = useState(true);

  const updateAccessToken = useCallback((token: string | null) => {
    setAccessToken(token);
    setAuthAccessToken(token);
  }, []);

  const restoreSession = useCallback(async () => {
    try {
      let token = getAccessToken();
      if (!token) {
        try {
          const refreshed = await refreshSessionToken();
          token = refreshed.accessToken;
          setAuthAccessToken(token);
          if (refreshed.user) setUser(refreshed.user);
        } catch {
          updateAccessToken(null);
          setUser(null);
          setShop(null);
          return;
        }
      }

      if (!token) return;
      const session = await fetchCurrentSession();
      setUser(session.user);
      setShop(session.shop);
    } catch {
      updateAccessToken(null);
      setUser(null);
      setShop(null);
    }
  }, [updateAccessToken]);

  useEffect(() => {
    void restoreSession().finally(() => setLoading(false));
  }, [restoreSession]);

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    const session = await loginAccount({ email, password, rememberMe });
    updateAccessToken(session.accessToken);
    setUser(session.user);
    setShop(session.shop);
    void navigate({ to: "/dashboard" });
  }, [navigate, updateAccessToken]);

  const register = useCallback(
    async (payload: {
      name: string;
      email: string;
      password: string;
      shopName?: string;
      rememberMe?: boolean;
    }) => {
      const session = await registerAccount(payload);
      updateAccessToken(session.accessToken);
      setUser(session.user);
      setShop(session.shop);
      void navigate({ to: "/dashboard" });
    },
    [navigate, updateAccessToken],
  );

  const logout = useCallback(async () => {
    await logoutAccount();
    updateAccessToken(null);
    setUser(null);
    setShop(null);
  }, [updateAccessToken]);

  const value = useMemo(
    () => ({
      user,
      shop,
      loading,
      isAuthenticated: Boolean(user && accessToken),
      login,
      register,
      logout,
      refresh: restoreSession,
    }),
    [user, shop, loading, accessToken, login, register, logout, restoreSession],
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
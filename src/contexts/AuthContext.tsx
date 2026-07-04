import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  fetchCurrentSession,
  googleLoginAccount,
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
  googleLogin: (idToken: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
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
    },
    [],
  );

  const googleLogin = useCallback(async (idToken: string, rememberMe = false) => {
    const session = await googleLoginAccount({ idToken, rememberMe });
    setUser(session.user);
    setShop(session.shop);
  }, []);

  const logout = useCallback(async () => {
    await logoutAccount();
    setUser(null);
    setShop(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      shop,
      loading,
      isAuthenticated: Boolean(user && getAccessToken()),
      login,
      register,
      googleLogin,
      logout,
      refresh: restoreSession,
    }),
    [user, shop, loading, login, register, googleLogin, logout, restoreSession],
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

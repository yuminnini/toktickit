import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import {
  SafeUser,
  LoginCredentials,
  loginApi,
  getCurrentUserApi,
  logoutApi,
  changePasswordApi,
  fetchCsrfToken,
  setCachedCsrfToken,
} from "../api";

export interface AuthContextValue {
  user: SafeUser | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<SafeUser>;
  logout: () => Promise<void>;
  changePassword: (input: { currentPassword: string; newPassword: string; confirmPassword: string }) => Promise<SafeUser>;
  refreshUser: () => Promise<SafeUser | null>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Clear legacy development requester selection from sessionStorage
  useEffect(() => {
    try {
      sessionStorage.removeItem("lab2-selected-requester");
    } catch {
      // ignore
    }
  }, []);

  const refreshUser = useCallback(async (): Promise<SafeUser | null> => {
    try {
      const currentUser = await getCurrentUserApi();
      setUser(currentUser);
      if (currentUser) {
        await fetchCsrfToken().catch(() => {});
      } else {
        setCachedCsrfToken(null);
      }
      return currentUser;
    } catch {
      setUser(null);
      setCachedCsrfToken(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const currentUser = await getCurrentUserApi();
        if (isMounted) {
          setUser(currentUser);
          if (currentUser) {
            await fetchCsrfToken().catch(() => {});
          }
        }
      } catch {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials): Promise<SafeUser> => {
    setIsLoading(true);
    try {
      const res = await loginApi(credentials);
      setUser(res.user);
      try {
        sessionStorage.removeItem("lab2-selected-requester");
      } catch {}
      await fetchCsrfToken().catch(() => {});
      return res.user;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await logoutApi();
    } finally {
      setUser(null);
      setCachedCsrfToken(null);
      try {
        sessionStorage.removeItem("lab2-selected-requester");
      } catch {}
    }
  }, []);

  const changePassword = useCallback(async (input: { currentPassword: string; newPassword: string; confirmPassword: string }): Promise<SafeUser> => {
    const res = await changePasswordApi(input);
    setUser(res.user);
    return res.user;
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, changePassword, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      isLoading: false,
      login: async () => { throw new Error("AuthProvider missing"); },
      logout: async () => {},
      changePassword: async () => { throw new Error("AuthProvider missing"); },
      refreshUser: async () => null,
    };
  }
  return ctx;
}

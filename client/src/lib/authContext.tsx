import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  token: string | null;
  signOut: () => Promise<void>;
  clearError: () => void;
  loginWithDemo: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Browser-safe Base64URL encoder helper (no Node.js Buffer dependency)
function base64UrlEncode(obj: object): string {
  const json = JSON.stringify(obj);
  const base64 = btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_match, p1) =>
    String.fromCharCode(parseInt(p1, 16))
  ));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Fetch initial active session from Supabase
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("[AgroPulso Auth] Error getting initial session:", error.message);
        setError(error.message);
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 2. Listen to real-time auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setLoading(true);
    try {
      if (typeof window !== "undefined") {
        delete (window as any).__AGROPULSO_DEMO_TOKEN__;
      }
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setSession(null);
      setUser(null);
    } catch (err: any) {
      setError(err.message || "Error al cerrar sesión");
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  // Demo fast login gated explicitly by VITE_ENABLE_DEMO_AUTH flag
  const loginWithDemo = async (): Promise<boolean> => {
    const enableDemo = import.meta.env.VITE_ENABLE_DEMO_AUTH === "true";
    if (!enableDemo) {
      setError("El acceso Admin Demo está desactivado en este entorno.");
      return false;
    }

    setLoading(true);
    try {
      // Create valid base64url JSON payload for test/demo mode using browser helper
      const header = base64UrlEncode({ alg: "HS256", typ: "JWT" });
      const payload = base64UrlEncode({
        sub: "demo-tenant-admin-id",
        email: "demo@agropulso.com",
        role: "authenticated",
        app_metadata: { tenant_id: "tenant-demo-001", role: "admin" },
        user_metadata: { name: "Administrador Demo AgroPulso" },
        exp: Math.floor(Date.now() / 1000) + 86400 * 7,
      });
      const mockJwtToken = `${header}.${payload}.mock-signature`;

      if (typeof window !== "undefined") {
        (window as any).__AGROPULSO_DEMO_TOKEN__ = mockJwtToken;
      }

      const demoUser = {
        id: "demo-tenant-admin-id",
        email: "demo@agropulso.com",
        user_metadata: { name: "Administrador Demo AgroPulso" },
        app_metadata: { tenant_id: "tenant-demo-001", role: "admin" },
        aud: "authenticated",
        created_at: new Date().toISOString(),
      } as unknown as User;

      const demoSession = {
        access_token: mockJwtToken,
        token_type: "bearer",
        user: demoUser,
        expires_in: 86400,
        refresh_token: "mock-demo-refresh-token",
      } as Session;

      setUser(demoUser);
      setSession(demoSession);
      setError(null);
      return true;
    } catch (err: any) {
      setError(err.message || "Error en inicio de sesión demo");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const isAuthenticated = !!session && !!user;
  const token = session?.access_token ?? null;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAuthenticated,
        error,
        token,
        signOut,
        clearError,
        loginWithDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe ser utilizado dentro de un AuthProvider");
  }
  return context;
};

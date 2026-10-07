import { supabase } from "./supabaseClient";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

export interface ApiEnvelope<T = any> {
  data: T | null;
  error: string | null;
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiEnvelope<T>> {
  try {
    // 1. Check active Supabase session token first
    const { data: { session } } = await supabase.auth.getSession();
    let token = session?.access_token;

    // 2. Fallback check for demo mode session token if Supabase Auth has no active session
    if (!token && typeof window !== "undefined") {
      const demoToken = (window as any).__AGROPULSO_DEMO_TOKEN__;
      if (demoToken) {
        token = demoToken;
      }
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = body.error || body.message || `Error HTTP ${response.status}: ${response.statusText}`;
      return { data: null, error: errorMessage };
    }

    return { data: body.data ?? body, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || "Error de red al conectar con la API" };
  }
}

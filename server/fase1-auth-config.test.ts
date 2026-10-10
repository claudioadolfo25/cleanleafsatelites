import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (file: string) => readFileSync(resolve(root, file), "utf8");

describe("Fase 1: configuración de autenticación", () => {
  it("no contiene un proyecto Supabase o anon key ficticios", () => {
    const source = read("client/src/lib/supabaseClient.ts");
    expect(source).not.toContain("demo.supabase.co");
    expect(source).not.toContain("demo-anon-key");
  });

  it("bloquea la autenticación cuando faltan variables reales", () => {
    const client = read("client/src/lib/supabaseClient.ts");
    const auth = read("client/src/pages/AuthPage.tsx");
    const guard = read("client/src/components/ProtectedRoute.tsx");
    expect(client).toContain("isSupabaseConfigured");
    expect(auth).toContain("VITE_SUPABASE_URL");
    expect(auth).toContain("VITE_SUPABASE_ANON_KEY");
    expect(guard).toContain("!isSupabaseConfigured || !supabase");
  });
});

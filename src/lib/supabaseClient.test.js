import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// A supabaseClient a modul betöltésekor olvassa az env-et, ezért minden
// esethez resetModules + stubEnv szükséges, majd dinamikus import.
describe("supabaseClient – konfiguráció", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("hiányzó env esetén isSupabaseConfigured=false és supabase=null (nem dob hibát)", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");

    const mod = await import("./supabaseClient");
    expect(mod.isSupabaseConfigured).toBe(false);
    expect(mod.supabase).toBeNull();
  });

  it("csak az egyik változó megléte esetén sem tekinti konfiguráltnak", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");

    const mod = await import("./supabaseClient");
    expect(mod.isSupabaseConfigured).toBe(false);
    expect(mod.supabase).toBeNull();
  });

  it("mindkét publikus változó megléte esetén konfiguráltnak számít és klienst ad", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-public-key");

    const mod = await import("./supabaseClient");
    expect(mod.isSupabaseConfigured).toBe(true);
    expect(mod.supabase).not.toBeNull();
    expect(typeof mod.supabase.auth?.signInWithPassword).toBe("function");
  });
});

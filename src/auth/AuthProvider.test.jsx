import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthProvider";

// Mutálható állapot a supabase kliens mockolásához (vi.hoisted a hoisting miatt).
const h = vi.hoisted(() => ({
  state: {
    session: null,
    profile: null,
    profileError: null,
    signOut: null,
  },
}));

vi.mock("../lib/supabaseClient", () => {
  const auth = {
    getSession: async () => ({ data: { session: h.state.session }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signOut: (...args) => h.state.signOut(...args),
  };
  const from = () => ({
    select: () => ({
      eq: () => ({
        single: async () => ({ data: h.state.profile, error: h.state.profileError }),
      }),
    }),
  });
  return { isSupabaseConfigured: true, supabase: { auth, from } };
});

function Probe() {
  const { loading, session, profile, role, error } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="hasSession">{String(!!session)}</span>
      <span data-testid="hasProfile">{String(!!profile)}</span>
      <span data-testid="role">{role || "none"}</span>
      <span data-testid="error">{error || "none"}</span>
    </div>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    h.state.session = null;
    h.state.profile = null;
    h.state.profileError = null;
    h.state.signOut = vi.fn(async () => {});
  });

  it("kezdetben loading állapotban van", () => {
    renderProvider();
    // Az első szinkron render még a session feloldása előtt történik.
    expect(screen.getByTestId("loading").textContent).toBe("true");
  });

  it("session nélkül: nincs user/profil, loading befejeződik", async () => {
    h.state.session = null;
    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false")
    );
    expect(screen.getByTestId("hasSession").textContent).toBe("false");
    expect(screen.getByTestId("hasProfile").textContent).toBe("false");
    expect(screen.getByTestId("role").textContent).toBe("none");
  });

  it("aktív profil esetén betölti a szerepkört a profiles táblából", async () => {
    h.state.session = { user: { id: "u-1", email: "a@b.hu" } };
    h.state.profile = { id: "u-1", full_name: "Teszt", role: "iroda", active: true };
    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId("role").textContent).toBe("iroda")
    );
    expect(screen.getByTestId("hasProfile").textContent).toBe("true");
  });

  it("INAKTÍV profil: nem enged be és kijelentkeztet", async () => {
    h.state.session = { user: { id: "u-2", email: "x@y.hu" } };
    h.state.profile = { id: "u-2", full_name: "Inaktív", role: "telepito", active: false };
    renderProvider();

    await waitFor(() => expect(h.state.signOut).toHaveBeenCalled());
    expect(screen.getByTestId("hasProfile").textContent).toBe("false");
    expect(screen.getByTestId("error").textContent).toMatch(/inaktív/i);
  });
});

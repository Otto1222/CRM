import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({
  configured: true,
  authError: null,
  signIn: null,
}));

vi.mock("../lib/supabaseClient", () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: { signInWithPassword: (...args) => h.signIn(...args) },
  },
}));

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => ({ configured: h.configured, error: h.authError }),
}));

import Login from "./Login";

describe("Login – statikus ellenőrzés", () => {
  it("NEM használja a régi checkLogin függvényt és nem importál a crmUsers-ből", () => {
    const src = readFileSync(resolve(process.cwd(), "src/pages/Login.jsx"), "utf8");
    expect(src).not.toContain("checkLogin");
    expect(src).not.toContain("crmUsers");
    // A Supabase Auth belépést használja:
    expect(src).toContain("signInWithPassword");
  });
});

describe("Login – viselkedés", () => {
  beforeEach(() => {
    h.configured = true;
    h.authError = null;
    h.signIn = vi.fn(async () => ({ data: {}, error: null }));
  });

  it("konfiguráció hiányában adminisztrátori üzenetet mutat és letiltja a gombot", () => {
    h.configured = false;
    render(<Login />);
    expect(screen.getByText(/nincs beállítva/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Bejelentkezés/i })).toBeDisabled();
  });

  it("hibás belépésnél egységes hibaüzenetet mutat (nem szivárogtat)", async () => {
    h.signIn = vi.fn(async () => ({ data: {}, error: { message: "Invalid login credentials" } }));
    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText(/nev@ceg.hu/i), { target: { value: "valaki@ceg.hu" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "rosszjelszo" } });
    fireEvent.click(screen.getByRole("button", { name: /Bejelentkezés/i }));

    await waitFor(() => {
      expect(screen.getByText("Hibás email-cím vagy jelszó.")).toBeInTheDocument();
    });
    expect(h.signIn).toHaveBeenCalledWith({ email: "valaki@ceg.hu", password: "rosszjelszo" });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// Spec: SPEC/2026-11-18-login-real-admin.md

const verificarSessaoAdmin = vi.fn();
const entrarComoAdmin = vi.fn();
const sairAdmin = vi.fn();
let aoMudarSessao: (() => void) | undefined;
const cancelarAssinatura = vi.fn();

vi.mock("@/lib/supabase/adminAuthService", () => ({
  verificarSessaoAdmin: () => verificarSessaoAdmin(),
  entrarComoAdmin: (email: string, senha: string) => entrarComoAdmin(email, senha),
  sairAdmin: () => sairAdmin(),
  assinarSessaoAdmin: (cb: () => void) => {
    aoMudarSessao = cb;
    return cancelarAssinatura;
  },
}));

import { useAdminAuth } from "@/hooks/useAdminAuth";

describe("useAdminAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    aoMudarSessao = undefined;
    localStorage.clear();
    sairAdmin.mockResolvedValue(undefined);
  });

  it("começa carregando (null) e reflete a sessão existente", async () => {
    verificarSessaoAdmin.mockResolvedValue(true);
    const { result } = renderHook(() => useAdminAuth());
    expect(result.current.autenticado).toBeNull();
    await waitFor(() => expect(result.current.autenticado).toBe(true));
  });

  it("remove a flag antiga de sessão falsa do localStorage", async () => {
    localStorage.setItem("reservei_admin_auth", "true");
    verificarSessaoAdmin.mockResolvedValue(false);
    const { result } = renderHook(() => useAdminAuth());
    await waitFor(() => expect(result.current.autenticado).toBe(false));
    expect(localStorage.getItem("reservei_admin_auth")).toBeNull();
  });

  it("login com sucesso autentica", async () => {
    verificarSessaoAdmin.mockResolvedValue(false);
    entrarComoAdmin.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useAdminAuth());
    await waitFor(() => expect(result.current.autenticado).toBe(false));

    let resposta: { ok: boolean; erro?: string } | undefined;
    await act(async () => {
      resposta = await result.current.login("admin@complexo.com", "Senha1!");
    });
    expect(resposta).toEqual({ ok: true });
    expect(entrarComoAdmin).toHaveBeenCalledWith("admin@complexo.com", "Senha1!");
    expect(result.current.autenticado).toBe(true);
  });

  it("login com falha devolve o erro e continua deslogado", async () => {
    verificarSessaoAdmin.mockResolvedValue(false);
    entrarComoAdmin.mockResolvedValue({ ok: false, erro: "E-mail ou senha incorretos." });
    const { result } = renderHook(() => useAdminAuth());
    await waitFor(() => expect(result.current.autenticado).toBe(false));

    let resposta: { ok: boolean; erro?: string } | undefined;
    await act(async () => {
      resposta = await result.current.login("admin@complexo.com", "errada");
    });
    expect(resposta).toEqual({ ok: false, erro: "E-mail ou senha incorretos." });
    expect(result.current.autenticado).toBe(false);
  });

  it("logout encerra a sessão", async () => {
    verificarSessaoAdmin.mockResolvedValue(true);
    const { result } = renderHook(() => useAdminAuth());
    await waitFor(() => expect(result.current.autenticado).toBe(true));

    await act(async () => {
      await result.current.logout();
    });
    expect(sairAdmin).toHaveBeenCalled();
    expect(result.current.autenticado).toBe(false);
  });

  it("revalida quando a sessão muda (ex.: logout em outra aba)", async () => {
    verificarSessaoAdmin.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const { result } = renderHook(() => useAdminAuth());
    await waitFor(() => expect(result.current.autenticado).toBe(true));

    await act(async () => {
      aoMudarSessao?.();
    });
    await waitFor(() => expect(result.current.autenticado).toBe(false));
  });

  it("cancela a assinatura ao desmontar", async () => {
    verificarSessaoAdmin.mockResolvedValue(false);
    const { unmount } = renderHook(() => useAdminAuth());
    unmount();
    expect(cancelarAssinatura).toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { MENSAGENS_LOGIN_ADMIN } from "@/lib/adminAuth/regras";

// Spec: SPEC/2026-11-18-login-real-admin.md

const { auth, rpc, estado } = vi.hoisted(() => ({
  auth: {
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
  rpc: vi.fn(),
  estado: { configurado: true },
}));

vi.mock("@/lib/supabase/client", () => ({
  supabase: { auth, rpc },
  isSupabaseConfigured: () => estado.configurado,
}));

import {
  assinarSessaoAdmin,
  entrarComoAdmin,
  sairAdmin,
  verificarSessaoAdmin,
} from "@/lib/supabase/adminAuthService";

const sessao = { access_token: "jwt", user: { id: "uid-1" } };

describe("adminAuthService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    estado.configurado = true;
    auth.signOut.mockResolvedValue({ error: null });
  });

  describe("entrarComoAdmin", () => {
    it("entra quando a senha confere e o usuário é administrador", async () => {
      auth.signInWithPassword.mockResolvedValue({ data: { session: sessao }, error: null });
      rpc.mockResolvedValue({ data: true, error: null });

      await expect(entrarComoAdmin(" admin@complexo.com ", "Senha1!")).resolves.toEqual({ ok: true });
      expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: "admin@complexo.com", password: "Senha1!" });
      expect(rpc).toHaveBeenCalledWith("is_admin");
      expect(auth.signOut).not.toHaveBeenCalled();
    });

    it("encerra a sessão de quem não é administrador", async () => {
      auth.signInWithPassword.mockResolvedValue({ data: { session: sessao }, error: null });
      rpc.mockResolvedValue({ data: false, error: null });

      await expect(entrarComoAdmin("cliente@x.com", "Senha1!")).resolves.toEqual({
        ok: false,
        erro: MENSAGENS_LOGIN_ADMIN.semPermissao,
      });
      expect(auth.signOut).toHaveBeenCalled();
    });

    it("nega o acesso se a verificação de administrador falhar (falha fechada)", async () => {
      auth.signInWithPassword.mockResolvedValue({ data: { session: sessao }, error: null });
      rpc.mockResolvedValue({ data: null, error: { message: "Failed to fetch" } });

      const resultado = await entrarComoAdmin("admin@complexo.com", "Senha1!");
      expect(resultado.ok).toBe(false);
      expect(auth.signOut).toHaveBeenCalled();
    });

    it("traduz credenciais inválidas", async () => {
      auth.signInWithPassword.mockResolvedValue({
        data: { session: null },
        error: { message: "Invalid login credentials", status: 400, code: "invalid_credentials" },
      });

      await expect(entrarComoAdmin("admin@complexo.com", "errada")).resolves.toEqual({
        ok: false,
        erro: MENSAGENS_LOGIN_ADMIN.credenciaisInvalidas,
      });
      expect(rpc).not.toHaveBeenCalled();
    });

    it("valida os campos antes de chamar o Supabase", async () => {
      await expect(entrarComoAdmin("invalido", "x")).resolves.toEqual({
        ok: false,
        erro: MENSAGENS_LOGIN_ADMIN.emailInvalido,
      });
      expect(auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it("informa quando o Supabase não está configurado", async () => {
      estado.configurado = false;
      await expect(entrarComoAdmin("admin@complexo.com", "Senha1!")).resolves.toEqual({
        ok: false,
        erro: MENSAGENS_LOGIN_ADMIN.naoConfigurado,
      });
      expect(auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it("trata exceção de rede", async () => {
      auth.signInWithPassword.mockRejectedValue(new TypeError("Failed to fetch"));
      await expect(entrarComoAdmin("admin@complexo.com", "Senha1!")).resolves.toEqual({
        ok: false,
        erro: MENSAGENS_LOGIN_ADMIN.falhaConexao,
      });
    });
  });

  describe("verificarSessaoAdmin", () => {
    it("é falso sem sessão, sem consultar a função", async () => {
      auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
      await expect(verificarSessaoAdmin()).resolves.toBe(false);
      expect(rpc).not.toHaveBeenCalled();
    });

    it("é verdadeiro com sessão de administrador", async () => {
      auth.getSession.mockResolvedValue({ data: { session: sessao }, error: null });
      rpc.mockResolvedValue({ data: true, error: null });
      await expect(verificarSessaoAdmin()).resolves.toBe(true);
    });

    it("é falso com sessão de usuário comum ou erro na função", async () => {
      auth.getSession.mockResolvedValue({ data: { session: sessao }, error: null });
      rpc.mockResolvedValueOnce({ data: false, error: null });
      await expect(verificarSessaoAdmin()).resolves.toBe(false);
      rpc.mockResolvedValueOnce({ data: null, error: { message: "erro" } });
      await expect(verificarSessaoAdmin()).resolves.toBe(false);
    });

    it("é falso quando o Supabase não está configurado ou lança exceção", async () => {
      estado.configurado = false;
      await expect(verificarSessaoAdmin()).resolves.toBe(false);
      estado.configurado = true;
      auth.getSession.mockRejectedValue(new Error("boom"));
      await expect(verificarSessaoAdmin()).resolves.toBe(false);
    });
  });

  it("sairAdmin encerra a sessão e não lança em caso de erro", async () => {
    auth.signOut.mockRejectedValue(new Error("rede"));
    await expect(sairAdmin()).resolves.toBeUndefined();
    expect(auth.signOut).toHaveBeenCalled();
  });

  it("assinarSessaoAdmin repassa mudanças e devolve função de cancelamento", () => {
    const unsubscribe = vi.fn();
    let callback: (() => void) | undefined;
    auth.onAuthStateChange.mockImplementation((cb: () => void) => {
      callback = cb;
      return { data: { subscription: { unsubscribe } } };
    });
    const aoMudar = vi.fn();

    const cancelar = assinarSessaoAdmin(aoMudar);
    callback?.();
    expect(aoMudar).toHaveBeenCalledTimes(1);
    cancelar();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("assinarSessaoAdmin sem Supabase configurado não assina nada", () => {
    estado.configurado = false;
    const cancelar = assinarSessaoAdmin(vi.fn());
    expect(auth.onAuthStateChange).not.toHaveBeenCalled();
    expect(() => cancelar()).not.toThrow();
  });
});

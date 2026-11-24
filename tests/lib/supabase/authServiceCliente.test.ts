import { describe, it, expect, vi, beforeEach } from "vitest";
import { MENSAGENS_AUTH_CLIENTE } from "@/lib/clienteAuth/regras";

// Spec: SPEC/2026-11-24-login-cliente-supabase-auth.md

const { auth, rpc, perfil, estado } = vi.hoisted(() => ({
  auth: {
    getSession: vi.fn(),
    signUp: vi.fn(),
    updateUser: vi.fn(),
    signInWithPassword: vi.fn(),
    signInAnonymously: vi.fn(),
    signOut: vi.fn(),
  },
  rpc: vi.fn(),
  perfil: { maybeSingle: vi.fn() },
  estado: { configurado: true },
}));

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth,
    rpc,
    from: () => ({ select: () => ({ eq: () => perfil }) }),
  },
  isSupabaseConfigured: () => estado.configurado,
}));

import {
  cadastrarUsuarioSupabase,
  excluirContaSupabase,
  garantirSessaoVisitante,
  loginUsuarioSupabase,
  logoutUsuarioSupabase,
  obterUsuarioAtual,
} from "@/lib/supabase/authService";

const CACHE = "reservei_current_user";
const linhaAna = {
  id: "uid-ana",
  nome: "Ana",
  telefone: "91999998888",
  data_nascimento: "2000-05-10",
  criado_em: "2026-11-24T10:00:00Z",
  bloqueado: false,
  motivo_bloqueio: null,
};
const sessao = (id: string, anonima = false) => ({ data: { session: { user: { id, is_anonymous: anonima } } } });

describe("authService do cliente com Supabase Auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    estado.configurado = true;
    localStorage.clear();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    auth.signOut.mockResolvedValue({ error: null });
    perfil.maybeSingle.mockResolvedValue({ data: linhaAna, error: null });
  });

  describe("cadastro", () => {
    it("cria a conta com o e-mail interno do WhatsApp, sem gravar senha em tabela", async () => {
      auth.getSession.mockResolvedValue({ data: { session: null } });
      auth.signUp.mockResolvedValue({ data: { session: { user: { id: "uid-ana" } }, user: { id: "uid-ana" } }, error: null });

      const res = await cadastrarUsuarioSupabase("Ana", "(91) 99999-8888", "Senha@123", "2000-05-10");

      expect(auth.signUp).toHaveBeenCalledWith({
        email: "91999998888@clientes.reservei.app",
        password: "Senha@123",
        options: { data: { nome: "Ana", data_nascimento: "2000-05-10" } },
      });
      expect(res.user).toMatchObject({ id: "uid-ana", nome: "Ana", telefone: "(91) 99999-8888" });
      expect(JSON.parse(localStorage.getItem(CACHE)!).id).toBe("uid-ana");
    });

    it("visitante anônimo vira conta mantendo o mesmo id", async () => {
      auth.getSession.mockResolvedValue(sessao("uid-ana", true));
      auth.updateUser.mockResolvedValue({ data: { user: { id: "uid-ana" } }, error: null });

      const res = await cadastrarUsuarioSupabase("Ana", "91999998888", "Senha@123");

      expect(auth.signUp).not.toHaveBeenCalled();
      expect(auth.updateUser).toHaveBeenNthCalledWith(1, {
        email: "91999998888@clientes.reservei.app",
        data: { nome: "Ana", data_nascimento: null },
      });
      expect(auth.updateUser).toHaveBeenNthCalledWith(2, { password: "Senha@123" });
      expect(res.user?.id).toBe("uid-ana");
    });

    it("WhatsApp já cadastrado", async () => {
      auth.getSession.mockResolvedValue({ data: { session: null } });
      auth.signUp.mockResolvedValue({ data: { session: null, user: null }, error: { code: "user_already_exists", message: "User already registered" } });

      const res = await cadastrarUsuarioSupabase("Ana", "91999998888", "Senha@123");
      expect(res).toEqual({ user: null, error: MENSAGENS_AUTH_CLIENTE.whatsappCadastrado });
    });

    it("telefone curto é recusado sem chamar o Supabase", async () => {
      const res = await cadastrarUsuarioSupabase("Ana", "9999-8888", "Senha@123");
      expect(res.error).toBe(MENSAGENS_AUTH_CLIENTE.telefoneInvalido);
      expect(auth.signUp).not.toHaveBeenCalled();
    });

    it("sem Supabase configurado não cria conta local", async () => {
      estado.configurado = false;
      const res = await cadastrarUsuarioSupabase("Ana", "91999998888", "Senha@123");
      expect(res.error).toBe(MENSAGENS_AUTH_CLIENTE.naoConfigurado);
      expect(localStorage.getItem("reservei_users_db")).toBeNull();
    });
  });

  describe("login", () => {
    it("entra pelo Supabase Auth e carrega o perfil", async () => {
      auth.signInWithPassword.mockResolvedValue({ data: { user: { id: "uid-ana" } }, error: null });

      const res = await loginUsuarioSupabase("(91) 99999-8888", "Senha@123");

      expect(auth.signInWithPassword).toHaveBeenCalledWith({
        email: "91999998888@clientes.reservei.app",
        password: "Senha@123",
      });
      expect(res.user?.id).toBe("uid-ana");
    });

    it("senha errada não revela se o número tem conta", async () => {
      auth.signInWithPassword.mockResolvedValue({ data: { user: null }, error: { code: "invalid_credentials", message: "Invalid login credentials" } });
      const res = await loginUsuarioSupabase("91999998888", "errada");
      expect(res).toEqual({ user: null, error: MENSAGENS_AUTH_CLIENTE.credenciaisInvalidas });
    });

    it("conta do Auth sem perfil de cliente (ex.: admin) é desconectada", async () => {
      auth.signInWithPassword.mockResolvedValue({ data: { user: { id: "uid-admin" } }, error: null });
      perfil.maybeSingle.mockResolvedValue({ data: null, error: null });

      const res = await loginUsuarioSupabase("91999998888", "Senha@123");

      expect(res.error).toBe(MENSAGENS_AUTH_CLIENTE.credenciaisInvalidas);
      expect(auth.signOut).toHaveBeenCalled();
    });
  });

  describe("sessão atual", () => {
    it("perfil falsificado no localStorage não dá acesso sem sessão", async () => {
      localStorage.setItem(CACHE, JSON.stringify({ id: "uid-de-outra-pessoa", nome: "Falso", telefone: "" }));
      auth.getSession.mockResolvedValue({ data: { session: null } });

      await expect(obterUsuarioAtual()).resolves.toBeNull();
      expect(localStorage.getItem(CACHE)).toBeNull();
    });

    it("sessão anônima de visitante não é cliente logado", async () => {
      auth.getSession.mockResolvedValue(sessao("uid-anon", true));
      await expect(obterUsuarioAtual()).resolves.toBeNull();
    });

    it("sessão válida devolve o perfil do banco, não o do cache", async () => {
      localStorage.setItem(CACHE, JSON.stringify({ id: "uid-ana", nome: "Nome antigo", telefone: "" }));
      auth.getSession.mockResolvedValue(sessao("uid-ana"));

      const user = await obterUsuarioAtual();
      expect(user?.nome).toBe("Ana");
    });

    it("falha de rede ao ler o perfil mantém o cache só se for da mesma sessão", async () => {
      localStorage.setItem(CACHE, JSON.stringify({ id: "uid-ana", nome: "Ana", telefone: "(91) 99999-8888" }));
      auth.getSession.mockResolvedValue(sessao("uid-ana"));
      perfil.maybeSingle.mockRejectedValue(new Error("Failed to fetch"));
      expect((await obterUsuarioAtual())?.id).toBe("uid-ana");

      auth.getSession.mockResolvedValue(sessao("uid-outro"));
      await expect(obterUsuarioAtual()).resolves.toBeNull();
    });
  });

  it("logout encerra a sessão e limpa o cache", async () => {
    localStorage.setItem(CACHE, "{}");
    await logoutUsuarioSupabase();
    expect(auth.signOut).toHaveBeenCalled();
    expect(localStorage.getItem(CACHE)).toBeNull();
  });

  describe("excluir conta", () => {
    it("usa a função do banco que apaga perfil e usuário do Auth", async () => {
      rpc.mockResolvedValue({ error: null });
      await expect(excluirContaSupabase("uid-ana")).resolves.toBe(true);
      expect(rpc).toHaveBeenCalledWith("excluir_minha_conta");
      expect(auth.signOut).toHaveBeenCalled();
    });

    it("falha no banco devolve false", async () => {
      rpc.mockResolvedValue({ error: { message: "sem_sessao" } });
      await expect(excluirContaSupabase("uid-ana")).resolves.toBe(false);
    });
  });

  describe("sessão de visitante", () => {
    it("cria sessão anônima quando não há nenhuma", async () => {
      auth.getSession.mockResolvedValue({ data: { session: null } });
      auth.signInAnonymously.mockResolvedValue({ data: {}, error: null });
      await expect(garantirSessaoVisitante()).resolves.toBe(true);
      expect(auth.signInAnonymously).toHaveBeenCalled();
    });

    it("não troca a sessão de quem já está logado", async () => {
      auth.getSession.mockResolvedValue(sessao("uid-ana"));
      await garantirSessaoVisitante();
      expect(auth.signInAnonymously).not.toHaveBeenCalled();
    });

    it("login anônimo desligado no painel não quebra a reserva", async () => {
      auth.getSession.mockResolvedValue({ data: { session: null } });
      auth.signInAnonymously.mockResolvedValue({ data: {}, error: { message: "Anonymous sign-ins are disabled" } });
      await expect(garantirSessaoVisitante()).resolves.toBe(false);
    });
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import {
  cadastrarUsuarioSupabase,
  toggleBloqueioUsuario,
  isTelefoneBloqueado,
  listarUsuariosCadastrados,
  obterUsuarioAtual,
} from "@/lib/supabase/authService";

describe("Gestão de Bloqueio de Usuários", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("deve cadastrar um usuário com status de bloqueio inicial desativado", async () => {
    const res = await cadastrarUsuarioSupabase(
      "Roberto Teste",
      "11988881234",
      "123456"
    );

    expect(res.user).not.toBeNull();
    expect(res.user?.bloqueado).toBeFalsy();
    expect(res.user?.motivo_bloqueio).toBeFalsy();
  });

  it("deve permitir ao administrador bloquear um usuário com motivo registrado", async () => {
    const res = await cadastrarUsuarioSupabase(
      "Lucas Andrade",
      "11977776666",
      "senha123"
    );
    expect(res.user).not.toBeNull();
    const userId = res.user!.id;

    const ok = await toggleBloqueioUsuario(
      userId,
      true,
      "Não comparecimento recorrente sem aviso prévio"
    );
    expect(ok).toBe(true);

    const usuarios = await listarUsuariosCadastrados();
    const usuarioAtualizado = usuarios.find((u) => u.id === userId);

    expect(usuarioAtualizado).toBeDefined();
    expect(usuarioAtualizado?.bloqueado).toBe(true);
    expect(usuarioAtualizado?.motivo_bloqueio).toBe(
      "Não comparecimento recorrente sem aviso prévio"
    );
  });

  it("deve identificar telefone bloqueado via isTelefoneBloqueado", async () => {
    const res = await cadastrarUsuarioSupabase(
      "Mariana Santos",
      "11999998888",
      "segredo"
    );
    const userId = res.user!.id;

    // Antes do bloqueio
    expect(await isTelefoneBloqueado("11999998888")).toBe(false);
    expect(await isTelefoneBloqueado("(11) 99999-8888")).toBe(false);

    // Aplica bloqueio
    await toggleBloqueioUsuario(userId, true, "Pendência financeira");

    // Após bloqueio
    expect(await isTelefoneBloqueado("11999998888")).toBe(true);
    expect(await isTelefoneBloqueado("(11) 99999-8888")).toBe(true);
  });

  it("deve permitir desbloquear um usuário previamente bloqueado", async () => {
    const res = await cadastrarUsuarioSupabase(
      "Felipe Costa",
      "21988885555",
      "chave12"
    );
    const userId = res.user!.id;

    // Bloqueia
    await toggleBloqueioUsuario(userId, true, "Suspeita de no-show");
    expect(await isTelefoneBloqueado("21988885555")).toBe(true);

    // Desbloqueia
    await toggleBloqueioUsuario(userId, false);
    expect(await isTelefoneBloqueado("21988885555")).toBe(false);

    const usuarios = await listarUsuariosCadastrados();
    const felipe = usuarios.find((u) => u.id === userId);
    expect(felipe?.bloqueado).toBe(false);
  });

  it("deve atualizar o usuário na sessão ativa do navegador ao alterar status de bloqueio", async () => {
    const res = await cadastrarUsuarioSupabase(
      "Aline Duarte",
      "11912345678",
      "pass123"
    );
    const userId = res.user!.id;

    const sessaoInicial = await obterUsuarioAtual();
    expect(sessaoInicial?.bloqueado).toBeFalsy();

    // Bloqueia usuário
    await toggleBloqueioUsuario(userId, true, "Regra de conduta");

    const sessaoAtualizada = await obterUsuarioAtual();
    expect(sessaoAtualizada?.bloqueado).toBe(true);
    expect(sessaoAtualizada?.motivo_bloqueio).toBe("Regra de conduta");
  });

  it("deve preservar rigorosamente o nome e telefone originais e não duplicar IDs ao bloquear", async () => {
    const res = await cadastrarUsuarioSupabase(
      "Guilherme Peçanha",
      "11987654321",
      "senhaForte@1"
    );
    const userId = res.user!.id;

    // Bloqueia informando dados atuais
    const ok = await toggleBloqueioUsuario(userId, true, "Advertência", {
      nome: res.user!.nome,
      telefone: res.user!.telefone,
    });
    expect(ok).toBe(true);

    const usuarios = await listarUsuariosCadastrados();
    const encontrados = usuarios.filter((u) => u.id === userId);

    // Garante que não há duplicação de chave
    expect(encontrados).toHaveLength(1);

    const usuario = encontrados[0];
    expect(usuario.nome).toBe("Guilherme Peçanha");
    expect(usuario.telefone).toBe("(11) 98765-4321");
    expect(usuario.bloqueado).toBe(true);
  });
});

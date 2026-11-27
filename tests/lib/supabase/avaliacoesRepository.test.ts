import { describe, it, expect, vi, beforeEach } from "vitest";
import { MENSAGENS_AVALIACOES } from "@/lib/avaliacoes/regras";

// Spec: SPEC/2026-11-27-avaliacoes-de-clientes.md

const { chamadas, respostas } = vi.hoisted(() => ({
  chamadas: [] as Array<{ tabela: string; op: string; args: unknown[] }>,
  respostas: {} as Record<string, { data?: unknown[] | null; error: { message: string } | null }>,
}));

vi.mock("@/lib/supabase/client", () => {
  const builder = (tabela: string) => {
    const b: Record<string, unknown> = {};
    for (const op of ["select", "order", "eq", "insert", "update"]) {
      b[op] = (...args: unknown[]) => {
        chamadas.push({ tabela, op, args });
        return b;
      };
    }
    b.then = (ok: (v: unknown) => unknown, erro: (e: unknown) => unknown) =>
      Promise.resolve(respostas[tabela] ?? { data: [], error: null }).then(ok, erro);
    return b;
  };
  return { supabase: { from: builder }, isSupabaseConfigured: () => true };
});

import {
  editarAvaliacao,
  enviarAvaliacao,
  listarAvaliacoes,
  listarAvaliacoesPublicas,
  moderarAvaliacao,
} from "@/lib/supabase/avaliacoesRepository";

const chamada = (tabela: string, op: string) => chamadas.find((c) => c.tabela === tabela && c.op === op);

describe("avaliacoesRepository", () => {
  beforeEach(() => {
    chamadas.length = 0;
    for (const k of Object.keys(respostas)) delete respostas[k];
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("lista as públicas pela visão, das mais recentes para as antigas", async () => {
    respostas.avaliacoes_publicas = {
      data: [{ id: "a1", nota: 5, comentario: "Top", nome_exibicao: "Ana S.", criada_em: "2026-11-20T10:00:00Z" }],
      error: null,
    };
    expect(await listarAvaliacoesPublicas()).toEqual([
      { id: "a1", nota: 5, comentario: "Top", nomeExibicao: "Ana S.", criadaEm: "2026-11-20T10:00:00Z" },
    ]);
    expect(chamada("avaliacoes_publicas", "order")?.args).toEqual(["criada_em", { ascending: false }]);
  });

  it("lista as avaliações da tabela (a RLS filtra por dono ou admin)", async () => {
    respostas.avaliacoes = {
      data: [{ id: "a1", reserva_id: "r1", usuario_id: "u1", nota: 4, comentario: null, status: "pendente", criada_em: "2026-11-20T10:00:00Z" }],
      error: null,
    };
    expect(await listarAvaliacoes()).toEqual([
      { id: "a1", reservaId: "r1", usuarioId: "u1", nota: 4, comentario: null, status: "pendente", criadaEm: "2026-11-20T10:00:00Z" },
    ]);
  });

  it("envia a avaliação com o comentário aparado (vazio vira nulo)", async () => {
    const r = await enviarAvaliacao({ id: "a1", reservaId: "r1", usuarioId: "u1", nota: 5, comentario: "   " });
    expect(r.ok).toBe(true);
    expect(chamada("avaliacoes", "insert")?.args[0]).toEqual({
      id: "a1", reserva_id: "r1", usuario_id: "u1", nota: 5, comentario: null,
    });
  });

  it("erro do banco vira mensagem para o cliente", async () => {
    respostas.avaliacoes = { error: { message: 'duplicate key value violates unique constraint "uq_avaliacoes_reserva"' } };
    expect(await enviarAvaliacao({ id: "a1", reservaId: "r1", usuarioId: "u1", nota: 5, comentario: "" }))
      .toEqual({ ok: false, erro: MENSAGENS_AVALIACOES.avaliacao_ja_enviada });
  });

  it("edita nota e comentário da própria avaliação", async () => {
    await editarAvaliacao("a1", { nota: 3, comentario: " Ok " });
    expect(chamada("avaliacoes", "update")?.args[0]).toEqual({ nota: 3, comentario: "Ok" });
    expect(chamada("avaliacoes", "eq")?.args).toEqual(["id", "a1"]);
  });

  it("admin modera mudando só a situação", async () => {
    await moderarAvaliacao("a1", "oculta");
    expect(chamada("avaliacoes", "update")?.args[0]).toEqual({ status: "oculta" });
    expect(chamada("avaliacoes", "eq")?.args).toEqual(["id", "a1"]);
  });
});

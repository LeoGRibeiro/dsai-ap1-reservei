import { describe, it, expect, vi, beforeEach } from "vitest";
import { MENSAGENS_EVENTOS } from "@/lib/eventos/regras";
import type { Evento, PartidaEvento } from "@/lib/eventos/types";

// Spec: SPEC/2026-11-27-eventos-e-torneios.md

const { chamadas, respostas, estado } = vi.hoisted(() => ({
  chamadas: [] as Array<{ tabela: string; op: string; args: unknown[] }>,
  respostas: {} as Record<string, { data?: unknown[] | null; error: { message: string } | null }>,
  estado: { configurado: true },
}));

vi.mock("@/lib/supabase/client", () => {
  const builder = (tabela: string) => {
    const resultado = () => Promise.resolve(respostas[tabela] ?? { data: [], error: null });
    const b: Record<string, unknown> = {};
    for (const op of ["select", "order", "eq", "insert", "upsert", "update", "delete"]) {
      b[op] = (...args: unknown[]) => {
        chamadas.push({ tabela, op, args });
        return b;
      };
    }
    b.then = (ok: (v: unknown) => unknown, erro: (e: unknown) => unknown) => resultado().then(ok, erro);
    return b;
  };
  return { supabase: { from: builder }, isSupabaseConfigured: () => estado.configurado };
});

import {
  eventoParaLinha,
  inscreverTime,
  linhaParaEvento,
  listarEventos,
  listarTimesPublicos,
  salvarPartidas,
} from "@/lib/supabase/eventosRepository";

const evento: Evento = {
  id: "ev1",
  tipo: "social",
  nome: "  Festa de fim de ano ",
  data: "2026-12-20",
  horaInicio: "18:00",
  horaFim: "22:00",
  valorInscricao: 0,
  maxTimes: 8,
  inscricoesAte: "2026-12-10",
  status: "rascunho",
  reservasBloqueio: [],
};

describe("eventosRepository", () => {
  beforeEach(() => {
    chamadas.length = 0;
    for (const k of Object.keys(respostas)) delete respostas[k];
    estado.configurado = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("evento social não grava times máximos nem prazo de inscrição", () => {
    const linha = eventoParaLinha(evento);
    expect(linha).toMatchObject({ nome: "Festa de fim de ano", max_times: null, inscricoes_ate: null });
    expect(linhaParaEvento({ ...linha, valor_inscricao: "120.50", data: "2026-12-20T00:00:00" }).valorInscricao).toBe(120.5);
  });

  it("lista eventos convertendo do banco", async () => {
    respostas.eventos = { data: [eventoParaLinha({ ...evento, status: "publicado" })], error: null };
    const lista = await listarEventos();
    expect(lista[0]).toMatchObject({ id: "ev1", status: "publicado", horaInicio: "18:00" });
  });

  it("falha ao listar devolve lista vazia, sem quebrar a tela", async () => {
    respostas.eventos = { data: null, error: { message: "boom" } };
    await expect(listarEventos()).resolves.toEqual([]);
  });

  it("times públicos vêm da visão sem dados de contato", async () => {
    respostas.eventos_times_publicos = { data: [{ id: "i1", evento_id: "ev1", nome_time: "Leões" }], error: null };
    const times = await listarTimesPublicos("ev1");
    expect(chamadas[0].tabela).toBe("eventos_times_publicos");
    expect(times).toEqual([expect.objectContaining({ nomeTime: "Leões", confirmada: true })]);
  });

  it("inscrição recusada pelo banco vira mensagem clara", async () => {
    respostas.eventos_inscricoes = {
      error: { message: 'duplicate key value violates unique constraint "uq_eventos_inscricoes_nome_time"' },
    };
    const resultado = await inscreverTime({ id: "i9", eventoId: "ev1", usuarioId: "u1", nomeTime: " Leões " });
    expect(resultado).toEqual({ ok: false, erro: MENSAGENS_EVENTOS.nome_time_em_uso });
    expect(chamadas[0].args[0]).toMatchObject({ nome_time: "Leões", evento_id: "ev1" });
  });

  it("sem Supabase configurado não grava", async () => {
    estado.configurado = false;
    const resultado = await inscreverTime({ id: "i9", eventoId: "ev1", usuarioId: "u1", nomeTime: "Leões" });
    expect(resultado.ok).toBe(false);
    expect(chamadas).toHaveLength(0);
  });

  it("salvar partidas envia em lote, em snake_case; lista vazia não chama o banco", async () => {
    const partida: PartidaEvento = {
      id: "ev1_r1_p0", eventoId: "ev1", rodada: 1, posicao: 0,
      inscricaoA: "i1", inscricaoB: "i2", golsA: 2, golsB: 1, vencedor: "i1", resultado: "placar",
    };
    await expect(salvarPartidas([partida])).resolves.toEqual({ ok: true, dado: undefined });
    expect(chamadas[0]).toMatchObject({ tabela: "eventos_partidas", op: "upsert" });
    expect((chamadas[0].args[0] as unknown[])[0]).toMatchObject({ inscricao_a: "i1", gols_a: 2, resultado: "placar" });

    chamadas.length = 0;
    await salvarPartidas([]);
    expect(chamadas).toHaveLength(0);
  });
});

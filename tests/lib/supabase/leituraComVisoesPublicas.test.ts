import { describe, it, expect, vi, beforeEach } from "vitest";

// Spec: SPEC/2026-11-24-rls-por-usuario-e-admin.md

const { respostas, canal, estado } = vi.hoisted(() => {
  const handlers: Array<{ tabela: string; evento: string; cb: (p: unknown) => void }> = [];
  const canal = {
    handlers,
    on: vi.fn((_tipo: string, filtro: { table: string; event: string }, cb: (p: unknown) => void) => {
      handlers.push({ tabela: filtro.table, evento: filtro.event, cb });
      return canal;
    }),
    subscribe: vi.fn(() => canal),
  };
  return {
    respostas: {} as Record<string, { data: unknown[] | null; error: { message: string } | null }>,
    canal,
    estado: { configurado: true },
  };
});

vi.mock("@/lib/supabase/client", () => {
  const consulta = (tabela: string) => {
    const resultado = () => Promise.resolve(respostas[tabela] ?? { data: [], error: null });
    const builder = {
      select: () => builder,
      order: () => resultado(),
      then: (ok: (v: unknown) => unknown, erro: (e: unknown) => unknown) => resultado().then(ok, erro),
    };
    return builder;
  };
  return {
    supabase: {
      from: consulta,
      getChannels: () => [],
      removeChannel: vi.fn(),
      channel: () => canal,
    },
    isSupabaseConfigured: () => estado.configurado,
  };
});

import { fetchReservasSupabase, subscreverReservasSupabase } from "@/lib/supabase/reservasService";
import { fetchContratosSupabase } from "@/lib/supabase/contratosService";

const linhaReserva = (id: string, nome: string) => ({
  id,
  quadra_id: "q1",
  data: "2026-12-01",
  horarios: ["18:00"],
  hora_inicio: "18:00",
  hora_fim: "19:00",
  status: "confirmada",
  nome_cliente: nome,
  whatsapp_cliente: nome ? "91900000001" : "",
  criada_em: "2026-11-24T10:00:00Z",
});

describe("leitura com as visões públicas", () => {
  beforeEach(() => {
    for (const k of Object.keys(respostas)) delete respostas[k];
    canal.handlers.length = 0;
    estado.configurado = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("junta as reservas próprias completas com as públicas sem dados pessoais", async () => {
    respostas.reservas = { data: [linhaReserva("r_minha", "Ana")], error: null };
    respostas.reservas_publicas = {
      data: [linhaReserva("r_minha", ""), linhaReserva("r_outra", "")],
      error: null,
    };

    const reservas = await fetchReservasSupabase();

    expect(reservas?.map((r) => [r.id, r.nomeCliente])).toEqual([
      ["r_minha", "Ana"],
      ["r_outra", ""],
    ]);
  });

  it("se a tabela falhar, a grade ainda recebe as públicas", async () => {
    respostas.reservas = { data: null, error: { message: "permission denied" } };
    respostas.reservas_publicas = { data: [linhaReserva("r_outra", "")], error: null };

    expect((await fetchReservasSupabase())?.map((r) => r.id)).toEqual(["r_outra"]);
  });

  it("se as duas falharem, devolve null", async () => {
    respostas.reservas = { data: null, error: { message: "x" } };
    respostas.reservas_publicas = { data: null, error: { message: "x" } };

    await expect(fetchReservasSupabase()).resolves.toBeNull();
  });

  it("contratos: completos para o admin, públicos para os demais", async () => {
    respostas.contratos_recorrentes = { data: [], error: null };
    respostas.contratos_publicos = {
      data: [{ id: "c1", tipo: "escolinha", nome: "Escolinha X", quadra_id: "q3", dias_semana: [1], hora_inicio: "08:00", hora_fim: "09:00", data_inicio: "2026-11-01", meses: 6, ativo: true, contato_whatsapp: "91955550000", responsavel_nome: "Rui" }],
      error: null,
    };

    const contratos = await fetchContratosSupabase();
    expect(contratos?.map((c) => c.nome)).toEqual(["Escolinha X"]);
  });

  it("mudança em horários ocupados avisa a grade (Realtime sem dados pessoais)", () => {
    const aoMudarOcupacao = vi.fn();
    subscreverReservasSupabase(vi.fn(), vi.fn(), vi.fn(), aoMudarOcupacao);

    const ouvinte = canal.handlers.find((h) => h.tabela === "reservas_horarios");
    expect(ouvinte?.evento).toBe("*");
    ouvinte!.cb({});
    expect(aoMudarOcupacao).toHaveBeenCalledTimes(1);
  });
});

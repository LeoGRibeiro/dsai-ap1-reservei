import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { Evento, InscricaoEvento } from "@/lib/eventos/types";

// Spec: SPEC/2026-11-27-eventos-e-torneios.md

const { repo, reservas, auth } = vi.hoisted(() => ({
  repo: {
    listarEventos: vi.fn(),
    salvarEvento: vi.fn(),
    listarInscricoes: vi.fn(),
    listarTimesPublicos: vi.fn(),
    inscreverTime: vi.fn(),
    removerInscricao: vi.fn(),
    confirmarInscricao: vi.fn(),
    listarPartidas: vi.fn(),
    salvarPartidas: vi.fn(),
  },
  reservas: { criarBloqueio: vi.fn(), removerBloqueio: vi.fn() },
  auth: { user: null as null | { id: string; nome: string; telefone: string } },
}));

vi.mock("@/lib/supabase/eventosRepository", () => repo);
vi.mock("@/hooks/useReservasService", () => ({ useReservasService: () => reservas }));
vi.mock("@/hooks/useUserAuth", () => ({ useUserAuth: () => ({ user: auth.user }) }));

import { useEventoPublico, useEventosAdmin, useEventosLanding } from "@/hooks/useEventosService";
import { MENSAGENS_EVENTOS } from "@/lib/eventos/regras";

const evento: Evento = {
  id: "ev1",
  tipo: "torneio",
  nome: "Copa Reservei",
  data: "2026-12-05",
  horaInicio: "18:00",
  horaFim: "20:00",
  quadraId: "q2",
  valorInscricao: 100,
  maxTimes: 4,
  inscricoesAte: "2026-12-03",
  status: "rascunho",
  reservasBloqueio: [],
};

const inscricao = (id: string, confirmada = true): InscricaoEvento => ({
  id, eventoId: "ev1", nomeTime: `Time ${id}`, confirmada,
});

describe("useEventosAdmin", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 27, 10, 0));
    vi.clearAllMocks();
    repo.listarEventos.mockResolvedValue([]);
    repo.salvarEvento.mockResolvedValue({ ok: true });
    repo.salvarPartidas.mockResolvedValue({ ok: true });
    reservas.removerBloqueio.mockResolvedValue(true);
  });
  afterEach(() => vi.useRealTimers());

  async function montar() {
    const hook = renderHook(() => useEventosAdmin());
    await waitFor(() => expect(hook.result.current.carregando).toBe(false));
    return hook;
  }

  it("publicar bloqueia a quadra nos horários do evento e guarda o bloqueio", async () => {
    reservas.criarBloqueio.mockResolvedValue({ ok: true, reserva: { id: "blq1" } });
    const { result } = await montar();

    await act(async () => {
      expect(await result.current.publicar(evento)).toEqual({ ok: true });
    });

    expect(reservas.criarBloqueio).toHaveBeenCalledWith(
      expect.objectContaining({ quadraId: "q2", data: "2026-12-05", horarios: ["18:00", "19:00"] })
    );
    expect(repo.salvarEvento).toHaveBeenCalledWith(expect.objectContaining({ status: "publicado", reservasBloqueio: ["blq1"] }));
  });

  it("horário ocupado impede a publicação e o evento continua rascunho", async () => {
    reservas.criarBloqueio.mockResolvedValue({ ok: false, motivo: "O horário já está ocupado" });
    const { result } = await montar();

    let resposta: unknown;
    await act(async () => {
      resposta = await result.current.publicar(evento);
    });

    expect(resposta).toEqual({ ok: false, erro: "O horário já está ocupado" });
    expect(repo.salvarEvento).not.toHaveBeenCalled();
  });

  it("se salvar o evento falhar, o bloqueio criado é desfeito", async () => {
    reservas.criarBloqueio.mockResolvedValue({ ok: true, reserva: { id: "blq1" } });
    repo.salvarEvento.mockResolvedValue({ ok: false, erro: "falhou" });
    const { result } = await montar();

    await act(async () => {
      await result.current.publicar(evento);
    });
    expect(reservas.removerBloqueio).toHaveBeenCalledWith("blq1");
  });

  it("cancelar libera os bloqueios da quadra", async () => {
    const { result } = await montar();
    await act(async () => {
      await result.current.cancelar({ ...evento, status: "publicado", reservasBloqueio: ["blq1", "blq2"] });
    });
    expect(repo.salvarEvento).toHaveBeenCalledWith(expect.objectContaining({ status: "cancelado", reservasBloqueio: [] }));
    expect(reservas.removerBloqueio.mock.calls.map((c) => c[0])).toEqual(["blq1", "blq2"]);
  });

  it("rascunho inválido não é salvo", async () => {
    const { result } = await montar();
    let resposta: { ok: boolean } | undefined;
    await act(async () => {
      resposta = await result.current.salvarRascunho({ ...evento, nome: "A" });
    });
    expect(resposta?.ok).toBe(false);
    expect(repo.salvarEvento).not.toHaveBeenCalled();
  });

  it("sorteio usa só os confirmados, grava a chave e fecha as inscrições", async () => {
    const { result } = await montar();
    await act(async () => {
      await result.current.sortearChave(
        { ...evento, status: "publicado" },
        [inscricao("a"), inscricao("b"), inscricao("c", false), inscricao("d")],
        () => 0
      );
    });
    const partidas = repo.salvarPartidas.mock.calls[0][0];
    const times = partidas.filter((p: { rodada: number }) => p.rodada === 1).flatMap((p: { inscricaoA: string; inscricaoB: string }) => [p.inscricaoA, p.inscricaoB]);
    expect(times.filter(Boolean).sort()).toEqual(["a", "b", "d"]);
    expect(repo.salvarEvento).toHaveBeenCalledWith(expect.objectContaining({ status: "chave_sorteada" }));
  });

  it("sorteio com menos de 2 confirmados é recusado", async () => {
    const { result } = await montar();
    let resposta: unknown;
    await act(async () => {
      resposta = await result.current.sortearChave(evento, [inscricao("a"), inscricao("b", false)]);
    });
    expect(resposta).toEqual({ ok: false, erro: MENSAGENS_EVENTOS.minimo_2_times });
  });

  it("resultado da final encerra o evento; empate sem pênaltis é recusado", async () => {
    const { result } = await montar();
    const final = [{
      id: "ev1_r1_p0", eventoId: "ev1", rodada: 1, posicao: 0, inscricaoA: "a", inscricaoB: "b",
      golsA: null, golsB: null, vencedor: null, resultado: null,
    }];
    const sorteado = { ...evento, status: "chave_sorteada" as const };

    let empate: unknown;
    await act(async () => {
      empate = await result.current.alterarResultado(sorteado, final, "ev1_r1_p0", { golsA: 1, golsB: 1 });
    });
    expect(empate).toEqual({ ok: false, erro: MENSAGENS_EVENTOS.empate_exige_penaltis });

    await act(async () => {
      await result.current.alterarResultado(sorteado, final, "ev1_r1_p0", { golsA: 3, golsB: 1 });
    });
    expect(repo.salvarPartidas).toHaveBeenCalledWith([expect.objectContaining({ vencedor: "a" })]);
    expect(repo.salvarEvento).toHaveBeenCalledWith(expect.objectContaining({ status: "encerrado" }));
  });
});

describe("useEventoPublico", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 27, 10, 0));
    vi.clearAllMocks();
    auth.user = null;
    repo.listarEventos.mockResolvedValue([{ ...evento, status: "publicado" }]);
    repo.listarTimesPublicos.mockResolvedValue([]);
    repo.listarInscricoes.mockResolvedValue([]);
    repo.listarPartidas.mockResolvedValue([]);
  });
  afterEach(() => vi.useRealTimers());

  it("visitante sem conta recebe o pedido para entrar", async () => {
    const { result } = renderHook(() => useEventoPublico("ev1"));
    await waitFor(() => expect(result.current.carregando).toBe(false));
    let r: unknown;
    await act(async () => {
      r = await result.current.inscrever("Leões");
    });
    expect(r).toEqual({ ok: false, erro: MENSAGENS_EVENTOS.conta_necessaria });
    expect(repo.inscreverTime).not.toHaveBeenCalled();
  });

  it("cliente inscreve o time com nome e WhatsApp do perfil", async () => {
    auth.user = { id: "u1", nome: "Ana", telefone: "(91) 99999-8888" };
    repo.inscreverTime.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useEventoPublico("ev1"));
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      await result.current.inscrever("Leões");
    });
    expect(repo.inscreverTime).toHaveBeenCalledWith(
      expect.objectContaining({ eventoId: "ev1", usuarioId: "u1", nomeTime: "Leões", responsavelWhatsapp: "91999998888" })
    );
    expect(result.current.situacao).toMatchObject({ aberta: true });
  });
});

describe("useEventosLanding", () => {
  it("mostra o campeão do último torneio encerrado", async () => {
    vi.clearAllMocks();
    repo.listarEventos.mockResolvedValue([{ ...evento, data: "2026-11-01", status: "encerrado" }]);
    repo.listarPartidas.mockResolvedValue([{
      id: "ev1_r1_p0", eventoId: "ev1", rodada: 1, posicao: 0, inscricaoA: "a", inscricaoB: "b",
      golsA: 2, golsB: 0, vencedor: "a", resultado: "placar",
    }]);
    repo.listarTimesPublicos.mockResolvedValue([inscricao("a"), inscricao("b")]);

    const { result } = renderHook(() => useEventosLanding());
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.nomeCampeao).toBe("Time a");
    expect(result.current.ultimoEncerrado?.id).toBe("ev1");
  });
});

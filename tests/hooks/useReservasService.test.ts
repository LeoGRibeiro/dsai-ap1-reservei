import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { Reserva } from "@/store/useReservasStore";

// Spec: SPEC/2026-11-24-reserva-atomica.md

const { servico, estado, garantirSessaoVisitante } = vi.hoisted(() => ({
  servico: {
    inserirReservaComResultado: vi.fn(),
    atualizarReservaComResultado: vi.fn(),
  },
  garantirSessaoVisitante: vi.fn(),
  estado: { configurado: true },
}));

vi.mock("@/lib/supabase/client", () => ({
  supabase: {},
  isSupabaseConfigured: () => estado.configurado,
}));

vi.mock("@/lib/supabase/reservasService", () => ({
  fetchReservasSupabase: vi.fn().mockResolvedValue(null),
  fetchReservasPorMesSupabase: vi.fn().mockResolvedValue(null),
  inserirReservaSupabase: vi.fn().mockResolvedValue(true),
  atualizarReservaSupabase: vi.fn().mockResolvedValue(true),
  removerReservaSupabase: vi.fn().mockResolvedValue(true),
  subscreverReservasSupabase: vi.fn(() => () => {}),
  inserirReservaComResultado: servico.inserirReservaComResultado,
  atualizarReservaComResultado: servico.atualizarReservaComResultado,
}));

vi.mock("@/lib/supabase/authService", () => ({
  listarUsuariosCadastrados: vi.fn().mockResolvedValue([]),
  getTelefonesCadastradosLocal: () => new Map<string, string>(),
  garantirSessaoVisitante,
}));

import { useReservasService } from "@/hooks/useReservasService";
import { fetchReservasSupabase, subscreverReservasSupabase } from "@/lib/supabase/reservasService";
import { useReservasStore } from "@/store/useReservasStore";
import { MENSAGENS_GRAVACAO_RESERVA } from "@/lib/reservas/garantiaHorario";

const AGORA = new Date("2026-11-24T15:00:00.000Z");

function provisoria(parcial: Partial<Reserva> = {}): Reserva {
  return {
    id: "rsv_prov",
    quadraId: "q1",
    data: "2026-12-01",
    horarios: ["18:00"],
    horaInicio: "18:00",
    horaFim: "19:00",
    nomeCliente: "Ana",
    whatsappCliente: "",
    cpfCliente: "",
    valorTotal: 110,
    valorSinal: 44,
    valorPendente: 66,
    status: "em_processamento",
    statusWhatsApp: "nao_enviado",
    criadaEm: AGORA.toISOString(),
    ...parcial,
  };
}

const dadosCriacao = { quadraId: "q1", data: "2026-12-01", horarios: ["19:00", "18:00"] };

describe("useReservasService: garantia de horário", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(AGORA);
    vi.clearAllMocks();
    estado.configurado = true;
    useReservasStore.setState({ reservas: [], isLoadedFromDb: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("criarReservaEmProcessamento", () => {
    it("só adiciona a reserva na tela depois que o banco aceita", async () => {
      servico.inserirReservaComResultado.mockResolvedValue({ ok: true });
      const { result } = renderHook(() => useReservasService());

      let resposta: Awaited<ReturnType<typeof result.current.criarReservaEmProcessamento>>;
      await act(async () => {
        resposta = await result.current.criarReservaEmProcessamento(dadosCriacao);
      });

      expect(resposta!.ok).toBe(true);
      const salvas = useReservasStore.getState().reservas;
      expect(salvas).toHaveLength(1);
      expect(salvas[0].horarios).toEqual(["18:00", "19:00"]);
      expect(salvas[0].status).toBe("em_processamento");
    });

    it("horário ocupado no banco: não adiciona e devolve a mensagem", async () => {
      servico.inserirReservaComResultado.mockResolvedValue({ ok: false, motivo: "horario_ocupado" });
      const { result } = renderHook(() => useReservasService());

      let resposta: Awaited<ReturnType<typeof result.current.criarReservaEmProcessamento>>;
      await act(async () => {
        resposta = await result.current.criarReservaEmProcessamento(dadosCriacao);
      });

      expect(resposta!).toEqual({ ok: false, erro: MENSAGENS_GRAVACAO_RESERVA.horario_ocupado });
      expect(useReservasStore.getState().reservas).toHaveLength(0);
    });

    it("cria a sessão de visitante antes de gravar a reserva", async () => {
      const ordem: string[] = [];
      garantirSessaoVisitante.mockImplementation(async () => {
        ordem.push("sessao");
        return true;
      });
      servico.inserirReservaComResultado.mockImplementation(async () => {
        ordem.push("insert");
        return { ok: true };
      });
      const { result } = renderHook(() => useReservasService());

      await act(async () => {
        await result.current.criarReservaEmProcessamento(dadosCriacao);
      });

      expect(ordem).toEqual(["sessao", "insert"]);
    });

    it("sem Supabase configurado, cria localmente", async () => {
      estado.configurado = false;
      const { result } = renderHook(() => useReservasService());

      await act(async () => {
        await result.current.criarReservaEmProcessamento(dadosCriacao);
      });

      expect(servico.inserirReservaComResultado).not.toHaveBeenCalled();
      expect(useReservasStore.getState().reservas).toHaveLength(1);
    });
  });

  describe("confirmarPagamento", () => {
    it("confirma o sinal sem marcar WhatsApp como enviado", async () => {
      useReservasStore.setState({ reservas: [provisoria()] });
      servico.atualizarReservaComResultado.mockResolvedValue({ ok: true });
      const { result } = renderHook(() => useReservasService());

      let resposta: Awaited<ReturnType<typeof result.current.confirmarPagamento>>;
      await act(async () => {
        resposta = await result.current.confirmarPagamento("rsv_prov", "sinal");
      });

      expect(resposta!.ok).toBe(true);
      const enviado = servico.atualizarReservaComResultado.mock.calls[0][1];
      expect(enviado).toEqual({ status: "pendente" });
      const salva = useReservasStore.getState().reservas[0];
      expect(salva.status).toBe("pendente");
      expect(salva.statusWhatsApp).toBe("nao_enviado");
    });

    it("recusa a provisória vencida sem chamar o banco", async () => {
      useReservasStore.setState({ reservas: [provisoria()] });
      vi.setSystemTime(new Date(AGORA.getTime() + 11 * 60_000));
      const { result } = renderHook(() => useReservasService());

      let resposta: Awaited<ReturnType<typeof result.current.confirmarPagamento>>;
      await act(async () => {
        resposta = await result.current.confirmarPagamento("rsv_prov", "integral");
      });

      expect(resposta!).toEqual({ ok: false, erro: MENSAGENS_GRAVACAO_RESERVA.reserva_expirada });
      expect(servico.atualizarReservaComResultado).not.toHaveBeenCalled();
      expect(useReservasStore.getState().reservas[0].status).toBe("em_processamento");
    });

    it("banco recusa por prazo: estado local não muda", async () => {
      useReservasStore.setState({ reservas: [provisoria()] });
      servico.atualizarReservaComResultado.mockResolvedValue({ ok: false, motivo: "reserva_expirada" });
      const { result } = renderHook(() => useReservasService());

      let resposta: Awaited<ReturnType<typeof result.current.confirmarPagamento>>;
      await act(async () => {
        resposta = await result.current.confirmarPagamento("rsv_prov", "sinal");
      });

      expect(resposta!.ok).toBe(false);
      expect(useReservasStore.getState().reservas[0].status).toBe("em_processamento");
    });

    it("pagamento integral zera o pendente", async () => {
      useReservasStore.setState({ reservas: [provisoria()] });
      servico.atualizarReservaComResultado.mockResolvedValue({ ok: true });
      const { result } = renderHook(() => useReservasService());

      await act(async () => {
        await result.current.confirmarPagamento("rsv_prov", "integral");
      });

      expect(servico.atualizarReservaComResultado.mock.calls[0][1]).toEqual({
        status: "confirmada",
        valorSinal: 110,
        valorPendente: 0,
      });
    });
  });

  describe("grade de horários", () => {
    it("provisória vencida libera o horário; no prazo, ocupa", () => {
      useReservasStore.setState({
        reservas: [
          provisoria({ id: "vencida", horarios: ["10:00"], criadaEm: new Date(AGORA.getTime() - 11 * 60_000).toISOString() }),
          provisoria({ id: "no_prazo", horarios: ["11:00"] }),
          provisoria({ id: "cancelada", horarios: ["12:00"], status: "cancelada" }),
        ],
      });
      const { result } = renderHook(() => useReservasService());

      expect(result.current.getHorariosOcupados("2026-12-01", "q1")).toEqual(["11:00"]);
      expect(result.current.getHorariosOcupadosDia("2026-12-01")).toEqual([{ quadraId: "q1", horario: "11:00" }]);
    });
  });

  describe("grade ao vivo com RLS", () => {
    it("mudança nos horários ocupados recarrega a grade pela visão pública", async () => {
      renderHook(() => useReservasService());
      const aoMudarOcupacao = vi.mocked(subscreverReservasSupabase).mock.calls.at(-1)?.[3];
      expect(aoMudarOcupacao).toBeTypeOf("function");

      vi.mocked(fetchReservasSupabase).mockResolvedValueOnce([provisoria({ id: "de_outra_pessoa", nomeCliente: "" })]);
      await act(async () => {
        aoMudarOcupacao!();
      });

      expect(useReservasStore.getState().reservas.map((r) => r.id)).toEqual(["de_outra_pessoa"]);
    });
  });

  describe("reserva manual e bloqueio do admin", () => {
    it("bloqueio recusado pelo banco é removido da tela", async () => {
      servico.inserirReservaComResultado.mockResolvedValue({ ok: false, motivo: "horario_ocupado" });
      const { result } = renderHook(() => useReservasService());

      let resposta: Awaited<ReturnType<typeof result.current.criarBloqueio>>;
      await act(async () => {
        resposta = await result.current.criarBloqueio({
          quadraId: "q2",
          data: "2026-12-01",
          horarios: ["08:00"],
          motivo: "Manutenção",
        });
      });

      expect(resposta!.ok).toBe(false);
      expect(useReservasStore.getState().reservas).toHaveLength(0);
    });

    it("reserva manual recusada pelo banco devolve a mensagem e não aparece na agenda", async () => {
      servico.inserirReservaComResultado.mockResolvedValue({ ok: false, motivo: "horario_ocupado" });
      const { result } = renderHook(() => useReservasService());

      let resposta: Awaited<ReturnType<typeof result.current.criarReservaManual>>;
      await act(async () => {
        resposta = await result.current.criarReservaManual({
          quadraId: "q3",
          data: "2026-12-01",
          horarios: ["20:00"],
          nomeCliente: "Bruno",
          whatsappCliente: "91988887777",
          pago: false,
        } as Parameters<typeof result.current.criarReservaManual>[0]);
      });

      expect(resposta!).toEqual({ ok: false, motivo: MENSAGENS_GRAVACAO_RESERVA.horario_ocupado });
      expect(useReservasStore.getState().reservas).toHaveLength(0);
    });
  });
});

/**
 * Camada de abstração entre a UI e o estado global (Zustand).
 * Nenhum componente de UI deve importar o Zustand diretamente.
 * Este hook é o único ponto de acesso ao estado de reservas.
 */

"use client";

import { useCallback, useMemo } from "react";
import { useReservasStore, type Reserva, type StatusReserva } from "@/store/useReservasStore";
import {
  calcularValorSinal,
  calcularValorPendente,
  calcularValorTotal,
} from "@/lib/constants";
import type { Esporte } from "@/lib/quadras";

// ─── Tipos de entrada para criação ───────────────────────────────────────────

export interface DadosCriacaoReserva {
  quadraId: string;
  data: string;
  horarios: string[];
  nomeCliente?: string;
  whatsappCliente?: string;
  cpfCliente?: string;
  esporte?: Esporte;
  observacoes?: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useReservasService() {
  const { reservas, adicionarReserva, atualizarReserva, removerReserva, getReservaById } =
    useReservasStore();

  // ── Queries ────────────────────────────────────────────────────────────────

  /** Reservas ativas para uma data e quadra específicas (exclui canceladas) */
  const getHorariosOcupados = useCallback(
    (data: string, quadraId: string): string[] => {
      return reservas
        .filter(
          (r) =>
            r.data === data &&
            r.quadraId === quadraId &&
            r.status !== "cancelada"
        )
        .flatMap((r) => r.horarios);
    },
    [reservas]
  );

  /** Verifica se um horário específico está ocupado numa quadra/data */
  const isHorarioOcupado = useCallback(
    (data: string, quadraId: string, horario: string): boolean => {
      return getHorariosOcupados(data, quadraId).includes(horario);
    },
    [getHorariosOcupados]
  );

  /** Retorna todos os horários ocupados em qualquer quadra para um dia */
  const getHorariosOcupadosDia = useCallback(
    (data: string): { quadraId: string; horario: string }[] => {
      return reservas
        .filter((r) => r.data === data && r.status !== "cancelada")
        .flatMap((r) => r.horarios.map((h) => ({ quadraId: r.quadraId, horario: h })));
    },
    [reservas]
  );

  /** Reservas para o Dashboard Admin */
  const getTodasReservas = useCallback((): Reserva[] => reservas, [reservas]);

  /** Totais financeiros */
  const financeiro = useMemo(() => {
    const confirmadas = reservas.filter((r) => r.status === "confirmada");
    const naoCaneladas = reservas.filter((r) => r.status !== "cancelada");
    return {
      totalConfirmado: confirmadas.reduce((acc, r) => acc + r.valorSinal, 0),
      totalPrevisto: naoCaneladas.reduce((acc, r) => acc + r.valorTotal, 0),
      pendenteSinalConfirmado: confirmadas.reduce(
        (acc, r) => acc + r.valorPendente,
        0
      ),
    };
  }, [reservas]);

  // ── Mutations ──────────────────────────────────────────────────────────────

  /**
   * Cria uma reserva com status "em_processamento" (lock temporário).
   * Retorna o ID gerado para controle do fluxo de checkout.
   */
  const criarReservaEmProcessamento = useCallback(
    (dados: DadosCriacaoReserva): string => {
      const horarios = [...dados.horarios].sort();
      const valorTotal = calcularValorTotal(horarios);
      const id = `rsv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const reserva: Reserva = {
        id,
        quadraId: dados.quadraId,
        data: dados.data,
        horarios,
        horaInicio: horarios[0],
        horaFim: `${String(parseInt(horarios[horarios.length - 1]) + 1).padStart(2, "0")}:00`,
        nomeCliente: dados.nomeCliente ?? "",
        whatsappCliente: dados.whatsappCliente ?? "",
        cpfCliente: dados.cpfCliente ?? "",
        valorTotal,
        valorSinal: calcularValorSinal(valorTotal),
        valorPendente: calcularValorPendente(valorTotal),
        status: "em_processamento",
        statusWhatsApp: "nao_enviado",
        criadaEm: new Date().toISOString(),
        esporte: dados.esporte,
        observacoes: dados.observacoes,
      };

      adicionarReserva(reserva);
      return id;
    },
    [adicionarReserva]
  );

  /**
   * Atualiza os dados de identificação de uma reserva em processamento
   * e mantém o status "em_processamento".
   */
  const atualizarIdentificacao = useCallback(
    (
      id: string,
      dados: Pick<Reserva, "nomeCliente" | "whatsappCliente" | "cpfCliente"> & {
        esporte?: Esporte;
        observacoes?: string;
      }
    ) => {
      atualizarReserva(id, dados);
    },
    [atualizarReserva]
  );

  /**
   * Confirma o pagamento — atualiza status e recálculo se integral.
   */
  const confirmarPagamento = useCallback(
    (id: string, tipoPagamento: "sinal" | "integral") => {
      const reserva = getReservaById(id);
      if (!reserva) return;

      const atualizacao: Partial<Reserva> = {
        // sinal: ainda precisa comparecer para pagar o restante → "pendente"
        // integral: pagamento completo, sem pendência no local → "confirmada"
        status: tipoPagamento === "integral" ? "confirmada" : "pendente",
        statusWhatsApp: "enviado",
      };

      if (tipoPagamento === "integral") {
        atualizacao.valorSinal = reserva.valorTotal;
        atualizacao.valorPendente = 0;
      }

      atualizarReserva(id, atualizacao);
    },
    [atualizarReserva, getReservaById]
  );

  /** Cancela e libera o lock de uma reserva em processamento */
  const liberarLock = useCallback(
    (id: string) => {
      removerReserva(id);
    },
    [removerReserva]
  );

  /** Admin: cancela uma reserva confirmada */
  const cancelarReserva = useCallback(
    (id: string) => {
      atualizarReserva(id, { status: "cancelada" });
    },
    [atualizarReserva]
  );

  /** Admin: atualiza qualquer campo de uma reserva */
  const atualizarStatus = useCallback(
    (id: string, status: StatusReserva) => {
      atualizarReserva(id, { status });
    },
    [atualizarReserva]
  );

  return {
    // Queries
    reservas,
    getHorariosOcupados,
    isHorarioOcupado,
    getHorariosOcupadosDia,
    getTodasReservas,
    financeiro,

    // Mutations
    criarReservaEmProcessamento,
    atualizarIdentificacao,
    confirmarPagamento,
    liberarLock,
    cancelarReserva,
    atualizarStatus,
  };
}

/**
 * Camada de abstração entre a UI e o banco de dados Supabase (com sincronização em tempo real).
 * Nenhum componente de UI deve importar o Zustand ou Supabase diretamente.
 * Este hook é o único ponto de acesso ao estado de reservas.
 */

"use client";

import { useEffect, useCallback, useMemo } from "react";
import {
  useReservasStore,
  type Reserva,
  type StatusReserva,
} from "@/store/useReservasStore";
import {
  calcularValorSinal,
  calcularValorPendente,
  calcularValorTotal,
} from "@/lib/constants";
import type { Esporte } from "@/lib/quadras";
import {
  fetchReservasSupabase,
  inserirReservaSupabase,
  atualizarReservaSupabase,
  removerReservaSupabase,
  subscreverReservasSupabase,
} from "@/lib/supabase/reservasService";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  listarUsuariosCadastrados,
  getTelefonesCadastradosLocal,
} from "@/lib/supabase/authService";

// ─── Tipos de entrada para criação ───────────────────────────────────────────

export interface DadosCriacaoReserva {
  quadraId: string;
  data: string;
  horarios: string[];
  userId?: string;
  nomeCliente?: string;
  whatsappCliente?: string;
  cpfCliente?: string;
  esporte?: Esporte;
  observacoes?: string;
}

// ─── Helper de enriquecimento com usuários cadastrados ───────────────────────

async function enriquecerReservasComUsuarios(lista: Reserva[]): Promise<Reserva[]> {
  try {
    const usuarios = await listarUsuariosCadastrados();
    const telMap = new Map(usuarios.map((u) => [u.telefone.replace(/\D/g, ""), u.id]));

    return lista.map((r) => {
      if (!r.userId && r.whatsappCliente) {
        const digits = r.whatsappCliente.replace(/\D/g, "");
        if (telMap.has(digits)) {
          const resolvedId = telMap.get(digits)!;
          void atualizarReservaSupabase(r.id, { userId: resolvedId });
          return { ...r, userId: resolvedId };
        }
      }
      return r;
    });
  } catch {
    return lista;
  }
}

// ─── Gerenciamento singleton de canal Realtime ────────────────────────────────

let activeRealtimeCleanup: (() => void) | null = null;
let realtimeListenersCount = 0;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useReservasService() {
  const {
    reservas,
    isLoadedFromDb,
    setReservas,
    adicionarReserva,
    atualizarReserva,
    removerReserva,
    getReservaById,
  } = useReservasStore();

  // ── Sincronização inicial com o Supabase e Realtime ─────────────────────────
  useEffect(() => {
    let isMounted = true;

    // Busca dados do Supabase na inicialização
    if (isSupabaseConfigured()) {
      fetchReservasSupabase().then(async (dados) => {
        if (isMounted && dados) {
          const enriquecidos = await enriquecerReservasComUsuarios(dados);
          if (isMounted) {
            setReservas(enriquecidos);
          }
        }
      });
    }

    // Configura canal Realtime compartilhado
    realtimeListenersCount++;
    if (realtimeListenersCount === 1 && isSupabaseConfigured()) {
      activeRealtimeCleanup = subscreverReservasSupabase(
        (nova) => {
          void enriquecerReservasComUsuarios([nova]).then(([enriquecida]) => {
            useReservasStore.getState().adicionarReserva(enriquecida || nova);
          });
        },
        (atualizada) => {
          void enriquecerReservasComUsuarios([atualizada]).then(([enriquecida]) => {
            const finalReserva = enriquecida || atualizada;
            useReservasStore.getState().atualizarReserva(finalReserva.id, finalReserva);
          });
        },
        (idDeletado) => {
          useReservasStore.getState().removerReserva(idDeletado);
        }
      );
    }

    return () => {
      isMounted = false;
      realtimeListenersCount--;
      if (realtimeListenersCount <= 0) {
        realtimeListenersCount = 0;
        if (activeRealtimeCleanup) {
          activeRealtimeCleanup();
          activeRealtimeCleanup = null;
        }
      }
    };
  }, [isLoadedFromDb, setReservas]);

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

  // ── Mutations Assíncronas (Sync com Supabase) ───────────────────────────────

  /**
   * Cria uma reserva com status "em_processamento" (lock temporário).
   * Grava diretamente no Supabase e atualiza o estado local imediatamente.
   */
  const criarReservaEmProcessamento = useCallback(
    (dados: DadosCriacaoReserva): string => {
      const horarios = [...dados.horarios].sort();
      const valorTotal = calcularValorTotal(horarios);
      const id = `rsv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      // Se userId não foi passado explicitamente mas o cliente tem conta cadastrada com esse telefone
      let finalUserId = dados.userId;
      if (!finalUserId && dados.whatsappCliente) {
        const digits = dados.whatsappCliente.replace(/\D/g, "");
        finalUserId = getTelefonesCadastradosLocal().get(digits);
      }

      const reserva: Reserva = {
        id,
        userId: finalUserId,
        quadraId: dados.quadraId,
        data: dados.data,
        horarios,
        horaInicio: horarios[0],
        horaFim: `${String(parseInt(horarios[horarios.length - 1], 10) + 1).padStart(2, "0")}:00`,
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

      // Atualização otimista no estado local
      adicionarReserva(reserva);

      // Persistência assíncrona no Supabase
      void inserirReservaSupabase(reserva);

      return id;
    },
    [adicionarReserva]
  );

  /**
   * Atualiza os dados de identificação de uma reserva em processamento no Supabase.
   */
  const atualizarIdentificacao = useCallback(
    (
      id: string,
      dados: Pick<Reserva, "nomeCliente" | "whatsappCliente" | "cpfCliente"> & {
        esporte?: Esporte;
        observacoes?: string;
        userId?: string;
      }
    ) => {
      const reservaAtual = getReservaById(id);
      let userIdFinal = dados.userId || reservaAtual?.userId;
      if (!userIdFinal && dados.whatsappCliente) {
        const digits = dados.whatsappCliente.replace(/\D/g, "");
        userIdFinal = getTelefonesCadastradosLocal().get(digits);
      }

      const atualizacao = {
        ...dados,
        ...(userIdFinal ? { userId: userIdFinal } : {}),
      };

      atualizarReserva(id, atualizacao);
      void atualizarReservaSupabase(id, atualizacao);
    },
    [atualizarReserva, getReservaById]
  );

  /**
   * Confirma o pagamento — atualiza status e valores no Supabase (UPDATE).
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
      void atualizarReservaSupabase(id, atualizacao);
    },
    [atualizarReserva, getReservaById]
  );

  /**
   * Admin: Confirma o pagamento restante no local (quitação integral).
   * Dispara UPDATE no banco Supabase.
   */
  const confirmarPagamentoRestante = useCallback(
    (id: string) => {
      const reserva = getReservaById(id);
      if (!reserva) return;

      const atualizacao: Partial<Reserva> = {
        status: "confirmada",
        valorSinal: reserva.valorTotal,
        valorPendente: 0,
      };

      atualizarReserva(id, atualizacao);
      void atualizarReservaSupabase(id, atualizacao);
    },
    [atualizarReserva, getReservaById]
  );

  /** Cancela e libera o lock de uma reserva em processamento */
  const liberarLock = useCallback(
    (id: string) => {
      removerReserva(id);
      void removerReservaSupabase(id);
    },
    [removerReserva]
  );

  /** Admin: cancela uma reserva confirmada (UPDATE status = 'cancelada') */
  const cancelarReserva = useCallback(
    (id: string) => {
      atualizarReserva(id, { status: "cancelada" });
      void atualizarReservaSupabase(id, { status: "cancelada" });
    },
    [atualizarReserva]
  );

  /** Admin: atualiza qualquer status de uma reserva (UPDATE status no Supabase) */
  const atualizarStatus = useCallback(
    (id: string, status: StatusReserva) => {
      atualizarReserva(id, { status });
      void atualizarReservaSupabase(id, { status });
    },
    [atualizarReserva]
  );

  /** Força recarregamento das reservas do Supabase com enriquecimento de usuários */
  const recarregarReservas = useCallback(async () => {
    const dados = await fetchReservasSupabase();
    if (dados) {
      const enriquecidos = await enriquecerReservasComUsuarios(dados);
      setReservas(enriquecidos);
    }
  }, [setReservas]);

  /** Vincula uma reserva existente a um usuário recém-cadastrado */
  const vincularReservaAoUsuario = useCallback(
    (reservaId: string, userId: string) => {
      atualizarReserva(reservaId, { userId });
      void atualizarReservaSupabase(reservaId, { userId });
    },
    [atualizarReserva]
  );

  /** Retorna todas as reservas de um usuário específico */
  const getReservasDoUsuario = useCallback(
    (userId: string): Reserva[] => {
      return reservas.filter((r) => r.userId === userId);
    },
    [reservas]
  );

  /** Verifica se a reserva pertence a um cliente cadastrado (membro) */
  const isReservaDeMembro = useCallback(
    (reserva: Reserva): boolean => {
      if (reserva.userId) return true;
      if (!reserva.whatsappCliente) return false;
      const digits = reserva.whatsappCliente.replace(/\D/g, "");
      return getTelefonesCadastradosLocal().has(digits);
    },
    []
  );

  return {
    // Queries
    reservas,
    getHorariosOcupados,
    isHorarioOcupado,
    getHorariosOcupadosDia,
    getTodasReservas,
    financeiro,
    isSupabaseConfigured: isSupabaseConfigured(),
    isReservaDeMembro,

    // Mutations
    criarReservaEmProcessamento,
    atualizarIdentificacao,
    confirmarPagamento,
    confirmarPagamentoRestante,
    liberarLock,
    cancelarReserva,
    atualizarStatus,
    recarregarReservas,
    vincularReservaAoUsuario,
    getReservasDoUsuario,
  };
}

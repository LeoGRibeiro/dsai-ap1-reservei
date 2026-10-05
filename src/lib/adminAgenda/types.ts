/**
 * Tipos de domínio e DTOs da Agenda Completa do Administrador.
 * Fornece interfaces para Calendário Mensal, Grade Diária, Reservas Manuais e Bloqueios.
 */

import type { Esporte } from "@/lib/quadras";
import type { Reserva } from "@/store/useReservasStore";

/**
 * Classificação detalhada da ocupação de um determinado horário (slot) na visão do admin.
 */
export type TipoOcupacaoSlot =
  | "disponivel"
  | "cliente_online"
  | "admin_manual"
  | "manutencao_bloqueio"
  | "escolinha"
  | "grupo";

/**
 * Representação de um slot de horário na grade diária de uma quadra para o administrador.
 */
export interface SlotAgendaAdmin {
  horario: string;
  horaFim: string;
  quadraId: string;
  data: string;
  tipo: TipoOcupacaoSlot;
  reserva?: Reserva;
  nomeExibicao?: string;
  pago?: boolean;
  motivoBloqueio?: string;
}

/**
 * Dados informados pelo administrador para criar uma reserva manual.
 */
export interface DadosCriacaoReservaManual {
  quadraId: string;
  data: string;
  horarios: string[];
  nomeCliente: string;
  whatsappCliente?: string;
  esporte?: Esporte;
  /** Indica se o cliente já realizou o pagamento integral no balcão/Pix */
  pago: boolean;
  /** Valor cobrado pela reserva (se omitido, calcula com base na tabela da quadra) */
  valorTotal?: number;
  observacoes?: string;
}

/**
 * Dados informados pelo administrador para bloquear um ou mais horários de uma quadra.
 */
export interface DadosCriacaoBloqueio {
  quadraId: string;
  data: string;
  horarios: string[];
  motivo: string;
  observacoes?: string;
}

/**
 * Informações resumidas de um dia específico exibido no grid do calendário mensal.
 */
export interface DiaCalendarioMensal {
  data: string;
  diaNumero: number;
  diaSemana: number; // 0 = Domingo, 6 = Sábado
  mesAtual: boolean;
  isHoje: boolean;
  totalReservas: number;
  totalBloqueios: number;
  totalHorariosOcupados: number;
}

/**
 * Resumo dos totais de ocupação do mês visualizado.
 */
export interface ResumoMesAdmin {
  ano: number;
  mes: number;
  totalReservas: number;
  totalBloqueios: number;
  totalHorariosOcupados: number;
  diasComReservas: number;
}

/**
 * Resultado da validação ou execução de uma operação na agenda.
 */
export interface ResultadoOperacaoAgenda {
  ok: boolean;
  motivo?: string;
  reserva?: Reserva;
  conflitoCom?: Reserva;
}

/**
 * Motivos pré-definidos sugeridos para bloqueio de horários.
 */
export const MOTIVOS_BLOQUEIO_SUGERIDOS = [
  "Manutenção preventiva de piso",
  "Troca de rede e iluminação",
  "Pintura e demarcação",
  "Chuva / Infiltração na cobertura",
  "Evento fechado da diretoria",
  "Limpeza profunda e higienização",
  "Outro motivo administrativo",
] as const;

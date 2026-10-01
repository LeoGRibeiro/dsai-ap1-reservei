/**
 * Store global — Zustand com sincronização com Supabase (PostgreSQL)
 * e fallback em LocalStorage.
 * ATENÇÃO: Componentes de UI não devem importar este arquivo diretamente.
 * Use o hook de abstração: @/hooks/useReservasService
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Esporte } from "@/lib/quadras";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type StatusReserva =
  | "em_processamento" // lock temporário durante o checkout
  | "pendente"         // sinal pago, restante a pagar no dia
  | "confirmada"       // pagamento do sinal confirmado
  | "cancelada";       // reserva cancelada

export type StatusWhatsApp = "nao_enviado" | "enviado" | "falhou";

export interface Reserva {
  id: string;
  quadraId: string;

  // Identificação do cliente
  userId?: string;
  nomeCliente: string;
  whatsappCliente: string;
  cpfCliente: string;

  // Agendamento
  data: string;        // "YYYY-MM-DD"
  horarios: string[];  // ex: ["13:00", "14:00", "15:00"]
  horaInicio: string;  // primeiro slot
  horaFim: string;     // última hora + 1h (ex: "16:00")

  // Financeiro
  valorTotal: number;
  valorSinal: number;    // 40% do total
  valorPendente: number; // 60% do total

  // Estado
  status: StatusReserva;
  statusWhatsApp: StatusWhatsApp;
  criadaEm: string; // ISO datetime

  // Opcionais
  esporte?: Esporte;
  observacoes?: string;
}

// ─── State & Actions ──────────────────────────────────────────────────────────

interface ReservasState {
  reservas: Reserva[];
  isLoadedFromDb: boolean;

  // Mutations
  setReservas: (reservas: Reserva[]) => void;
  adicionarReserva: (reserva: Reserva) => void;
  atualizarReserva: (id: string, dados: Partial<Reserva>) => void;
  removerReserva: (id: string) => void;

  // Computed helpers (usados pelo service)
  getReservaById: (id: string) => Reserva | undefined;
  getReservasPorData: (data: string) => Reserva[];
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useReservasStore = create<ReservasState>()(
  persist(
    (set, get) => ({
      reservas: [],
      isLoadedFromDb: false,

      setReservas: (reservas) =>
        set({ reservas, isLoadedFromDb: true }),

      adicionarReserva: (reserva) =>
        set((state) => {
          const existe = state.reservas.some((r) => r.id === reserva.id);
          if (existe) {
            return {
              reservas: state.reservas.map((r) =>
                r.id === reserva.id ? reserva : r
              ),
            };
          }
          return { reservas: [reserva, ...state.reservas] };
        }),

      atualizarReserva: (id, dados) =>
        set((state) => ({
          reservas: state.reservas.map((r) =>
            r.id === id ? { ...r, ...dados } : r
          ),
        })),

      removerReserva: (id) =>
        set((state) => ({
          reservas: state.reservas.filter((r) => r.id !== id),
        })),

      getReservaById: (id) => get().reservas.find((r) => r.id === id),

      getReservasPorData: (data) =>
        get().reservas.filter((r) => r.data === data),
    }),
    {
      name: "reservei-v2", // versão da chave no LocalStorage (usada como cache/fallback)
      partialize: (state) => ({ reservas: state.reservas }),
    }
  )
);

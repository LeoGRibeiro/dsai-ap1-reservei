/**
 * Store global de reservas e caixa — Zustand com persistência em LocalStorage.
 * Este é o "banco de dados" simulado da aplicação.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Esporte } from "@/lib/quadras";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type StatusReserva = "pendente" | "confirmada" | "cancelada";

export interface Reserva {
  id: string;
  quadraId: string;
  nomeCliente: string;
  telefoneCliente: string;
  data: string;        // ISO date string "YYYY-MM-DD"
  horaInicio: string;  // "HH:MM"
  horaFim: string;     // "HH:MM"
  valorTotal: number;  // em reais
  status: StatusReserva;
  criadaEm: string;    // ISO datetime string
  /**
   * Esporte que será praticado (opcional).
   * Quando informado, a administração prepara a quadra antes do horário
   * (ex.: montar rede de vôlei, posicionar traves de futsal).
   */
  esporte?: Esporte;
  /**
   * Observações livres do cliente para a administração (opcional).
   */
  observacoes?: string;
}

// ─── State & Actions ─────────────────────────────────────────────────────────

interface ReservasState {
  reservas: Reserva[];
  adicionarReserva: (reserva: Reserva) => void;
  confirmarReserva: (id: string) => void;
  cancelarReserva: (id: string) => void;
  // Financeiro
  totalConfirmado: () => number;
  totalPrevisto: () => number;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useReservasStore = create<ReservasState>()(
  persist(
    (set, get) => ({
      reservas: [],

      adicionarReserva: (reserva) =>
        set((state) => ({ reservas: [...state.reservas, reserva] })),

      confirmarReserva: (id) =>
        set((state) => ({
          reservas: state.reservas.map((r) =>
            r.id === id ? { ...r, status: "confirmada" } : r
          ),
        })),

      cancelarReserva: (id) =>
        set((state) => ({
          reservas: state.reservas.map((r) =>
            r.id === id ? { ...r, status: "cancelada" } : r
          ),
        })),

      totalConfirmado: () =>
        get()
          .reservas.filter((r) => r.status === "confirmada")
          .reduce((acc, r) => acc + r.valorTotal, 0),

      totalPrevisto: () =>
        get()
          .reservas.filter((r) => r.status !== "cancelada")
          .reduce((acc, r) => acc + r.valorTotal, 0),
    }),
    {
      name: "reservei-reservas", // chave no LocalStorage
    }
  )
);

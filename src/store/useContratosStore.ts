/**
 * Store global dos contratos recorrentes (escolinhas e grupos).
 * Cache em LocalStorage; fonte de verdade é o Supabase.
 * Componentes de UI devem usar o hook @/hooks/useContratosService.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ContratoRecorrente } from "@/lib/recorrencia/types";
import { CONTRATOS_ESCOLINHAS_INICIAIS } from "@/lib/institucional/dadosIniciais";

interface ContratosState {
  contratos: ContratoRecorrente[];
  isLoadedFromDb: boolean;

  setContratos: (contratos: ContratoRecorrente[]) => void;
  adicionarContrato: (contrato: ContratoRecorrente) => void;
  atualizarContrato: (id: string, dados: Partial<ContratoRecorrente>) => void;
  getContratoById: (id: string) => ContratoRecorrente | undefined;
}

export const useContratosStore = create<ContratosState>()(
  persist(
    (set, get) => ({
      contratos: [...CONTRATOS_ESCOLINHAS_INICIAIS],
      isLoadedFromDb: false,

      setContratos: (contratos) => set({ contratos, isLoadedFromDb: true }),

      adicionarContrato: (contrato) =>
        set((state) => {
          const existe = state.contratos.some((c) => c.id === contrato.id);
          if (existe) {
            return {
              contratos: state.contratos.map((c) => (c.id === contrato.id ? contrato : c)),
            };
          }
          return { contratos: [contrato, ...state.contratos] };
        }),

      atualizarContrato: (id, dados) =>
        set((state) => ({
          contratos: state.contratos.map((c) => (c.id === id ? { ...c, ...dados } : c)),
        })),

      getContratoById: (id) => get().contratos.find((c) => c.id === id),
    }),
    {
      name: "reservei-contratos-v1",
      partialize: (state) => ({ contratos: state.contratos }),
    }
  )
);

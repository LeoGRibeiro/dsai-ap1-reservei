/**
 * Tipos de avaliações de clientes.
 *
 * Spec: SPEC/2026-11-27-avaliacoes-de-clientes.md
 */

export type StatusAvaliacao = "pendente" | "aprovada" | "oculta";

export interface Avaliacao {
  id: string;
  reservaId: string;
  usuarioId: string;
  nota: number;
  comentario: string | null;
  status: StatusAvaliacao;
  criadaEm: string;
}

/** Avaliação aprovada, como aparece na landing (sem dados pessoais). */
export interface AvaliacaoPublica {
  id: string;
  nota: number;
  comentario: string | null;
  nomeExibicao: string;
  criadaEm: string;
}

export interface EntradaAvaliacao {
  nota: number;
  comentario: string;
}

export interface ResumoAvaliacoes {
  media: number | null;
  total: number;
  recentes: AvaliacaoPublica[];
}

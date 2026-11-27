/**
 * Tipos de eventos e torneios.
 * Spec: SPEC/2026-11-27-eventos-e-torneios.md
 */

export type TipoEvento = "torneio" | "social";

export type StatusEvento = "rascunho" | "publicado" | "chave_sorteada" | "encerrado" | "cancelado";

export interface Evento {
  id: string;
  tipo: TipoEvento;
  nome: string;
  esporte?: string;
  descricao?: string;
  regras?: string;
  data: string; // AAAA-MM-DD
  horaInicio: string; // HH:00
  horaFim: string; // HH:00
  quadraId?: string;
  valorInscricao: number;
  maxTimes?: 4 | 8 | 16;
  inscricoesAte?: string; // AAAA-MM-DD
  bannerUrl?: string;
  status: StatusEvento;
  reservasBloqueio: string[];
  criadoEm?: string;
}

export interface InscricaoEvento {
  id: string;
  eventoId: string;
  usuarioId?: string;
  nomeTime: string;
  responsavelNome?: string;
  responsavelWhatsapp?: string;
  confirmada: boolean;
}

export type ResultadoPartida = "placar" | "penaltis" | "wo" | "bye";

export interface PartidaEvento {
  id: string;
  eventoId: string;
  rodada: number;
  posicao: number;
  inscricaoA: string | null;
  inscricaoB: string | null;
  golsA: number | null;
  golsB: number | null;
  vencedor: string | null;
  resultado: ResultadoPartida | null;
}

/** Resultado informado pelo admin: placar (com pênaltis em caso de empate) ou W.O. */
export type EntradaResultado =
  | { golsA: number; golsB: number; vencedorPenaltis?: "a" | "b"; woDe?: undefined }
  | { woDe: "a" | "b" };

/**
 * Regras de avaliações de clientes. O banco confere as mesmas regras
 * (trigger `avaliacoes_validar`); aqui elas servem para a tela.
 *
 * Spec: SPEC/2026-11-27-avaliacoes-de-clientes.md
 */

import type { Reserva } from "@/store/useReservasStore";
import type { AvaliacaoPublica, EntradaAvaliacao, ResumoAvaliacoes } from "./types";

export const PRAZO_AVALIACAO_DIAS = 30;
export const MAX_COMENTARIO = 500;
export const AVALIACOES_NA_LANDING = 6;

export const MENSAGENS_AVALIACOES = {
  notaInvalida: "Escolha uma nota de 1 a 5 estrelas.",
  comentarioLongo: `O comentário pode ter no máximo ${MAX_COMENTARIO} caracteres.`,
  avaliacao_nao_permitida: "Esta reserva não pode ser avaliada.",
  prazo_avaliacao_encerrado: `O prazo para avaliar esta reserva (${PRAZO_AVALIACAO_DIAS} dias) terminou.`,
  avaliacao_travada: "Esta avaliação já foi analisada pelo complexo e não pode mais ser alterada.",
  avaliacao_ja_enviada: "Você já avaliou esta reserva.",
  usuario_bloqueado: "Sua conta está bloqueada. Fale com o complexo pelo WhatsApp.",
  erroGenerico: "Não foi possível concluir agora. Tente novamente em instantes.",
} as const;

const CODIGOS: ReadonlyArray<[string, keyof typeof MENSAGENS_AVALIACOES]> = [
  ["avaliacao_nao_permitida", "avaliacao_nao_permitida"],
  ["prazo_avaliacao_encerrado", "prazo_avaliacao_encerrado"],
  ["avaliacao_travada", "avaliacao_travada"],
  ["uq_avaliacoes_reserva", "avaliacao_ja_enviada"],
  ["usuario_bloqueado", "usuario_bloqueado"],
];

const STATUS_AVALIAVEIS: ReadonlyArray<Reserva["status"]> = ["pendente", "confirmada"];
const TIPOS_AVALIAVEIS = ["avulsa", "grupo", "admin_manual"];
const DIA_MS = 24 * 60 * 60 * 1000;

/** Fim do jogo no fuso do complexo (Belém, UTC-3 sem horário de verão). */
export function fimDoJogo(reserva: Pick<Reserva, "data" | "horaFim">): Date {
  const [h, m] = reserva.horaFim.split(":").map(Number);
  const meiaNoite = new Date(`${reserva.data}T00:00:00-03:00`);
  return new Date(meiaNoite.getTime() + (h * 60 + (m || 0)) * 60 * 1000);
}

/** Reserva jogada, válida e dentro do prazo de avaliação. A posse é conferida por quem chama. */
export function reservaAvaliavel(reserva: Reserva, agora: Date): boolean {
  if (!STATUS_AVALIAVEIS.includes(reserva.status)) return false;
  if (!TIPOS_AVALIAVEIS.includes(reserva.tipoReserva ?? "avulsa")) return false;
  const fim = fimDoJogo(reserva).getTime();
  return agora.getTime() >= fim && agora.getTime() <= fim + PRAZO_AVALIACAO_DIAS * DIA_MS;
}

export function validarAvaliacao(entrada: EntradaAvaliacao): string | null {
  if (!Number.isInteger(entrada.nota) || entrada.nota < 1 || entrada.nota > 5) return MENSAGENS_AVALIACOES.notaInvalida;
  if (entrada.comentario.trim().length > MAX_COMENTARIO) return MENSAGENS_AVALIACOES.comentarioLongo;
  return null;
}

export function resumoAvaliacoes(lista: AvaliacaoPublica[]): ResumoAvaliacoes {
  if (lista.length === 0) return { media: null, total: 0, recentes: [] };
  const soma = lista.reduce((total, a) => total + a.nota, 0);
  const recentes = [...lista].sort((a, b) => b.criadaEm.localeCompare(a.criadaEm)).slice(0, AVALIACOES_NA_LANDING);
  return { media: Math.round((soma / lista.length) * 10) / 10, total: lista.length, recentes };
}

/** Link do botão "Avalie-nos no Google"; só aceita https para não virar link perigoso. */
export function urlAvaliacaoGoogle(valor: string | undefined): string | null {
  const url = valor?.trim() ?? "";
  return url.startsWith("https://") ? url : null;
}

export function traduzirErroAvaliacao(erro: unknown): string {
  const texto = erro && typeof erro === "object" && "message" in erro ? String((erro as { message: unknown }).message) : "";
  const achado = CODIGOS.find(([codigo]) => texto.includes(codigo));
  return achado ? MENSAGENS_AVALIACOES[achado[1]] : MENSAGENS_AVALIACOES.erroGenerico;
}

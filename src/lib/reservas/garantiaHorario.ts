/**
 * Regras da garantia de horário: prazo da reserva provisória e tradução dos
 * erros que o banco devolve quando recusa uma reserva.
 *
 * A garantia de verdade está no banco (tabela `reservas_horarios` e triggers);
 * estas regras só espelham o comportamento para a tela.
 *
 * Spec: SPEC/2026-11-24-reserva-atomica.md
 */

import type { Reserva } from "@/store/useReservasStore";

export const PRAZO_RESERVA_PROVISORIA_MINUTOS = 10;

export type MotivoFalhaGravacao = "horario_ocupado" | "reserva_expirada" | "falha";

export type ResultadoGravacaoReserva = { ok: true } | { ok: false; motivo: MotivoFalhaGravacao };

export const MENSAGENS_GRAVACAO_RESERVA: Record<MotivoFalhaGravacao, string> = {
  horario_ocupado: "Esse horário acabou de ser reservado por outra pessoa. Escolha outro horário.",
  reserva_expirada: "O tempo para concluir a reserva expirou. Escolha o horário novamente.",
  falha: "Não foi possível salvar a reserva agora. Verifique sua conexão e tente novamente.",
};

/**
 * Indica se a reserva provisória (`em_processamento`) passou do prazo.
 * Usa o `expiraEm` gravado pelo banco; sem ele (modo local ou dado antigo),
 * conta o prazo a partir de `criadaEm`.
 */
export function reservaProvisoriaExpirada(reserva: Reserva, agora: Date): boolean {
  if (reserva.status !== "em_processamento") return false;

  const limite = reserva.expiraEm
    ? Date.parse(reserva.expiraEm)
    : Date.parse(reserva.criadaEm) + PRAZO_RESERVA_PROVISORIA_MINUTOS * 60_000;

  if (Number.isNaN(limite)) return false;
  return agora.getTime() >= limite;
}

/** Indica se a reserva ainda segura os seus horários na grade. */
export function reservaOcupaHorario(reserva: Reserva, agora: Date): boolean {
  if (reserva.status === "cancelada") return false;
  return !reservaProvisoriaExpirada(reserva, agora);
}

interface ErroBanco {
  code?: string;
  message?: string;
}

/** Converte o erro devolvido pelo Supabase no motivo da recusa. */
export function classificarErroGravacaoReserva(erro: unknown): MotivoFalhaGravacao {
  if (!erro || typeof erro !== "object") return "falha";
  const { code = "", message = "" } = erro as ErroBanco;

  if (message.includes("horario_ocupado") || code === "23505") return "horario_ocupado";
  if (message.includes("reserva_expirada")) return "reserva_expirada";
  return "falha";
}

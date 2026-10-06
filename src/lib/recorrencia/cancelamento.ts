/**
 * Regra de cancelamento dos GRUPOS COMUNS (mensalistas).
 *
 * - Aviso com 7 dias ou mais de antecedência → cancela sem ônus.
 * - Aviso tardio (menos de 7 dias) → o horário é liberado ao público, mas:
 *     • se outro cliente reservar e pagar o horário → grupo isento;
 *     • se ninguém ocupar o horário → grupo deve pagar a sessão.
 *
 * Escolinhas NÃO usam estas regras (contratos próprios, fora do escopo).
 */

import type { Reserva } from "@/store/useReservasStore";
import { diferencaEmDias } from "./datas";
import { encontrarConflitosDoBloco } from "./ocorrencias";

/** Antecedência mínima (dias corridos) para cancelar sem ônus */
export const ANTECEDENCIA_MINIMA_DIAS = 7;

export type ClassificacaoAviso = "sem_onus" | "tardio";

export type SituacaoCobranca =
  | "sem_onus" // cancelou com antecedência (ou contrato encerrado)
  | "aguardando_reposicao" // aviso tardio; horário ainda pode ser ocupado por outro cliente
  | "isento_por_reposicao" // aviso tardio, mas outro cliente ocupou e pagou o horário
  | "cobranca_devida"; // aviso tardio; data passou sem reposição

/** Classifica um aviso pela antecedência entre a data do aviso e a da sessão */
export function classificarAviso(dataAviso: string, dataSessao: string): ClassificacaoAviso {
  return diferencaEmDias(dataAviso, dataSessao) >= ANTECEDENCIA_MINIMA_DIAS
    ? "sem_onus"
    : "tardio";
}

export interface ResultadoValidacao {
  ok: boolean;
  motivo?: string;
}

/**
 * Valida o registro de um aviso de cancelamento para uma ocorrência de grupo.
 *
 * @param hoje data de referência "YYYY-MM-DD"
 */
export function validarRegistroCancelamento(
  ocorrencia: Reserva,
  dataAviso: string,
  hoje: string
): ResultadoValidacao {
  if (ocorrencia.tipoReserva !== "grupo") {
    return { ok: false, motivo: "Apenas ocorrências de grupos comuns podem ser canceladas por aviso." };
  }
  if (ocorrencia.status === "cancelada") {
    return { ok: false, motivo: "Esta ocorrência já está cancelada." };
  }
  if (ocorrencia.data < hoje) {
    return { ok: false, motivo: "Não é possível cancelar uma ocorrência que já passou." };
  }
  if (dataAviso > hoje) {
    return { ok: false, motivo: "A data do aviso não pode estar no futuro." };
  }
  if (dataAviso > ocorrencia.data) {
    return { ok: false, motivo: "A data do aviso não pode ser posterior à sessão." };
  }
  return { ok: true };
}

/**
 * Verifica se outro cliente (reserva avulsa já paga ao menos em sinal) ocupou
 * TODOS os horários da ocorrência cancelada.
 */
export function horarioFoiReposto(cancelada: Reserva, todasReservas: Reserva[]): boolean {
  const candidatas = encontrarConflitosDoBloco(
    cancelada.quadraId,
    cancelada.data,
    cancelada.horarios,
    todasReservas,
    cancelada.id
  ).filter(
    (r) =>
      (r.tipoReserva ?? "avulsa") === "avulsa" &&
      (r.status === "pendente" || r.status === "confirmada")
  );

  const cobertos = new Set(candidatas.flatMap((r) => r.horarios));
  return cancelada.horarios.every((h) => cobertos.has(h));
}

/**
 * Situação financeira de uma ocorrência de grupo cancelada.
 *
 * @param hoje data de referência "YYYY-MM-DD"
 */
export function calcularSituacaoCobranca(
  cancelada: Reserva,
  todasReservas: Reserva[],
  hoje: string
): SituacaoCobranca {
  // Sem aviso registrado = cancelamento administrativo (ex.: contrato encerrado)
  if (!cancelada.avisoCancelamentoEm) return "sem_onus";

  if (classificarAviso(cancelada.avisoCancelamentoEm, cancelada.data) === "sem_onus") {
    return "sem_onus";
  }

  if (horarioFoiReposto(cancelada, todasReservas)) return "isento_por_reposicao";

  return cancelada.data < hoje ? "cobranca_devida" : "aguardando_reposicao";
}

export const ROTULO_SITUACAO_COBRANCA: Record<SituacaoCobranca, string> = {
  sem_onus: "Cancelado sem ônus",
  aguardando_reposicao: "Aguardando reposição",
  isento_por_reposicao: "Isento (horário reposto)",
  cobranca_devida: "Cobrança devida",
};

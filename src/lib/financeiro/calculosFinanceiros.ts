/**
 * Regras puras do financeiro e da ocupação do painel admin.
 * Spec: SPEC/2026-11-27-financeiro-correto-e-csv.md
 */
import { QUADRAS } from "@/lib/quadras";
import type { TipoReserva } from "@/lib/recorrencia/types";
import type { Reserva, StatusReserva } from "@/store/useReservasStore";

export interface ResumoFinanceiro {
  /** Sinais (ou pagamentos integrais) já recebidos por Pix/balcão */
  recebido: number;
  /** Saldo que ainda será pago presencialmente */
  aReceberNoLocal: number;
  /** Total líquido previsto (recebido + a receber) */
  previsto: number;
  /** Valor de tabela dos horários, antes dos descontos de fidelidade */
  brutoTabela: number;
  descontosFidelidade: number;
}

function numero(valor: unknown): number {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Reservas que contam no financeiro: sinal pago (`pendente`) ou `confirmada`.
 * Exclui canceladas, provisórias (`em_processamento`, que expiram) e bloqueios de manutenção.
 */
export function filtrarReservasFinanceiras(reservas: Reserva[]): Reserva[] {
  return reservas.filter(
    (r) =>
      r.status !== "cancelada" &&
      r.status !== "em_processamento" &&
      r.tipoReserva !== "manutencao_bloqueio"
  );
}

/** Valor de tabela da reserva: `valorOriginal` quando positivo, senão total + desconto de fidelidade. */
export function valorBrutoReserva(reserva: Reserva): number {
  const original = numero(reserva.valorOriginal);
  if (original > 0) return original;
  return numero(reserva.valorTotal) + numero(reserva.descontoFidelidade);
}

export function calcularResumoFinanceiro(reservas: Reserva[]): ResumoFinanceiro {
  return filtrarReservasFinanceiras(reservas).reduce<ResumoFinanceiro>(
    (acc, r) => ({
      recebido: acc.recebido + numero(r.valorSinal),
      aReceberNoLocal: acc.aReceberNoLocal + numero(r.valorPendente),
      previsto: acc.previsto + numero(r.valorTotal),
      brutoTabela: acc.brutoTabela + valorBrutoReserva(r),
      descontosFidelidade: acc.descontosFidelidade + numero(r.descontoFidelidade),
    }),
    { recebido: 0, aReceberNoLocal: 0, previsto: 0, brutoTabela: 0, descontosFidelidade: 0 }
  );
}

function chavesHorarios(reservas: Reserva[]): Set<string> {
  return new Set(reservas.flatMap((r) => r.horarios.map((h) => `${r.quadraId}|${h}`)));
}

/**
 * Percentual inteiro de horários ocupados no dia.
 * Capacidade = quadras × horários − horários bloqueados. Cada quadra + horário conta uma vez.
 */
export function calcularTaxaOcupacao(
  reservasDoDia: Reserva[],
  totalQuadras: number,
  totalHorarios: number
): number {
  const bloqueados = chavesHorarios(
    reservasDoDia.filter((r) => r.status !== "cancelada" && r.tipoReserva === "manutencao_bloqueio")
  );
  const capacidade = totalQuadras * totalHorarios - bloqueados.size;
  if (capacidade <= 0) return 0;

  const ocupados = [...chavesHorarios(filtrarReservasFinanceiras(reservasDoDia))].filter(
    (chave) => !bloqueados.has(chave)
  ).length;
  return Math.min(100, Math.round((ocupados / capacidade) * 100));
}

// ─── CSV ─────────────────────────────────────────────────────────────────────

const STATUS_CSV: Record<StatusReserva, string> = {
  em_processamento: "Em processamento",
  pendente: "Sinal pago",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
};

const TIPO_CSV: Record<TipoReserva, string> = {
  avulsa: "Avulsa",
  escolinha: "Escolinha",
  grupo: "Grupo",
  admin_manual: "Manual (admin)",
  manutencao_bloqueio: "Bloqueio",
};

const METODO_CSV: Record<NonNullable<Reserva["metodoPagamento"]>, string> = {
  pix: "Pix",
  fidelidade: "Fidelidade",
  misto: "Misto",
  balcao: "Balcão",
};

const CABECALHO_CSV = [
  "Data", "Quadra", "Início", "Fim", "Cliente", "WhatsApp", "Status", "Tipo",
  "Método de pagamento", "Valor total", "Sinal", "Pendente", "Desconto fidelidade",
];

/** Texto seguro para CSV: neutraliza fórmulas e coloca entre aspas quando necessário. */
function celulaTexto(valor: string): string {
  const seguro = /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
  return /[;"\r\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
}

function celulaValor(valor: unknown): string {
  return numero(valor).toFixed(2).replace(".", ",");
}

function dataBrasileira(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}

function nomeQuadra(quadraId: string): string {
  const quadra = QUADRAS.find((q) => q.id === quadraId);
  return quadra ? `Quadra ${quadra.numero}` : quadraId;
}

/**
 * CSV das reservas para o Excel: BOM UTF-8, separador `;`, vírgula decimal e
 * datas DD/MM/AAAA. Não inclui CPF.
 */
export function gerarCsvReservas(reservas: Reserva[]): string {
  const linhas = reservas.map((r) =>
    [
      celulaTexto(dataBrasileira(r.data)),
      celulaTexto(nomeQuadra(r.quadraId)),
      celulaTexto(r.horaInicio),
      celulaTexto(r.horaFim),
      celulaTexto(r.nomeCliente ?? ""),
      celulaTexto(r.whatsappCliente ?? ""),
      celulaTexto(STATUS_CSV[r.status] ?? r.status),
      celulaTexto(TIPO_CSV[r.tipoReserva ?? "avulsa"] ?? String(r.tipoReserva)),
      celulaTexto(r.metodoPagamento ? METODO_CSV[r.metodoPagamento] ?? r.metodoPagamento : ""),
      celulaValor(r.valorTotal),
      celulaValor(r.valorSinal),
      celulaValor(r.valorPendente),
      celulaValor(r.descontoFidelidade),
    ].join(";")
  );
  return `﻿${[CABECALHO_CSV.join(";"), ...linhas].join("\r\n")}\r\n`;
}

export function nomeArquivoCsvFinanceiro(dataISO: string): string {
  return `reservei-financeiro-${dataISO}.csv`;
}

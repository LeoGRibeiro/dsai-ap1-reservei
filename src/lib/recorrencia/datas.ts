/**
 * Utilitários de data para recorrência.
 *
 * Todas as datas trafegam como string "YYYY-MM-DD" e são interpretadas no
 * fuso LOCAL. Nunca usamos toISOString() aqui (retorna UTC e desloca o dia).
 */

import type { DiaSemana } from "./types";

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** Converte "YYYY-MM-DD" em Date local (meia-noite) */
export function parseDataISO(iso: string): Date {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

/** Converte Date local em "YYYY-MM-DD" */
export function formatarDataISO(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/** Valida o formato e a existência real da data (ex.: rejeita 2026-02-30) */
export function isDataISOValida(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  return formatarDataISO(parseDataISO(iso)) === iso;
}

export function adicionarDias(iso: string, dias: number): string {
  const data = parseDataISO(iso);
  data.setDate(data.getDate() + dias);
  return formatarDataISO(data);
}

/**
 * Soma meses preservando o dia quando possível.
 * Se o dia não existir no mês de destino (ex.: 31/08 + 6 meses → fevereiro),
 * usa o último dia do mês de destino.
 */
export function adicionarMeses(iso: string, meses: number): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const primeiroDiaDestino = new Date(ano, mes - 1 + meses, 1);
  const ultimoDiaDestino = new Date(
    primeiroDiaDestino.getFullYear(),
    primeiroDiaDestino.getMonth() + 1,
    0
  ).getDate();
  primeiroDiaDestino.setDate(Math.min(dia, ultimoDiaDestino));
  return formatarDataISO(primeiroDiaDestino);
}

export function diaDaSemana(iso: string): DiaSemana {
  return parseDataISO(iso).getDay() as DiaSemana;
}

/**
 * Diferença em dias corridos (ate - de). Usa UTC para não sofrer com
 * mudança de horário de verão.
 */
export function diferencaEmDias(deISO: string, ateISO: string): number {
  const [a1, m1, d1] = deISO.split("-").map(Number);
  const [a2, m2, d2] = ateISO.split("-").map(Number);
  const utcDe = Date.UTC(a1, m1 - 1, d1);
  const utcAte = Date.UTC(a2, m2 - 1, d2);
  return Math.round((utcAte - utcDe) / MS_POR_DIA);
}

/** Formata hora "HH:mm" a partir de um número de hora (ex.: 9 → "09:00") */
export function horaParaTexto(hora: number): string {
  return `${String(hora).padStart(2, "0")}:00`;
}

/** Extrai o número da hora de "HH:mm" */
export function textoParaHora(horario: string): number {
  return parseInt(horario.split(":")[0], 10);
}

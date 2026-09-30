/**
 * Constantes de negócio centralizadas — single source of truth.
 * Nenhuma regra de negócio deve ser hardcoded nos componentes.
 */

// ─── Financeiro ───────────────────────────────────────────────────────────────

/** Percentual cobrado como sinal no momento da reserva (40%) */
export const PERCENTUAL_SINAL = 0.4;

/** Horas mínimas de antecedência para cancelamento sem cobrança */
export const TOLERANCIA_CANCELAMENTO_HORAS = 24;

/** Tabela de preços por faixa de horário (R$/hora) */
export const PRECOS = {
  MANHA: 70, // 08:00 – 11:59
  TARDE: 90, // 12:00 – 16:59
  NOITE: 110, // 17:00 – 21:59
} as const;

// ─── Agendamento ──────────────────────────────────────────────────────────────

/** Quantidade de dias no futuro disponíveis para agendamento (hoje + 7) */
export const DIAS_AGENDAMENTO_FUTURO = 7;

// ─── Complexo ─────────────────────────────────────────────────────────────────

export const NOME_COMPLEXO = "Complexo Esportivo Reservei";
export const ENDERECO_COMPLEXO = "Rua das Quadras, 100 – Centro";
export const TELEFONE_COMPLEXO = "(11) 99999-0000";

// ─── Funções Utilitárias ──────────────────────────────────────────────────────

/**
 * Retorna o valor (R$) cobrado por hora de acordo com o horário de início.
 * Regra: manhã (08-11h) R$70 | tarde (12-16h) R$90 | noite (17-22h) R$110
 */
export function calcularValorHora(horaInicio: string): number {
  const hora = parseInt(horaInicio.split(":")[0], 10);
  if (hora >= 8 && hora < 12) return PRECOS.MANHA;
  if (hora >= 12 && hora < 18) return PRECOS.TARDE;
  return PRECOS.NOITE;
}

/** Soma os valores de cada slot horário selecionado */
export function calcularValorTotal(horarios: string[]): number {
  return horarios.reduce((total, h) => total + calcularValorHora(h), 0);
}

/** Valor do sinal (40% do total, arredondado para centavos) */
export function calcularValorSinal(valorTotal: number): number {
  return Math.round(valorTotal * PERCENTUAL_SINAL * 100) / 100;
}

/** Valor pendente após pagamento do sinal */
export function calcularValorPendente(valorTotal: number): number {
  return Math.round(valorTotal * (1 - PERCENTUAL_SINAL) * 100) / 100;
}

/** Formata valor monetário em Real brasileiro */
export function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Formata data ISO "YYYY-MM-DD" para exibição amigável */
export function formatarDataExibicao(
  dataISO: string,
  opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
  }
): string {
  const [year, month, day] = dataISO.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("pt-BR", opts);
}

/** Verifica se os horários selecionados são estritamente consecutivos */
export function saoConsecutivos(horarios: string[]): boolean {
  if (horarios.length <= 1) return true;
  const sorted = [...horarios].sort();
  for (let i = 1; i < sorted.length; i++) {
    const prev = parseInt(sorted[i - 1].split(":")[0], 10);
    const curr = parseInt(sorted[i].split(":")[0], 10);
    if (curr - prev !== 1) return false;
  }
  return true;
}

/** Gera os próximos N dias (hoje inclusive) no formato "YYYY-MM-DD" */
export function gerarDiasDisponiveis(
  total: number = DIAS_AGENDAMENTO_FUTURO + 1
): string[] {
  const result: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < total; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    result.push(d.toISOString().split("T")[0]);
  }
  return result;
}

/** Retorna a data de hoje no formato "YYYY-MM-DD" */
export function getHoje(): string {
  return new Date().toISOString().split("T")[0];
}

/** Mascara WhatsApp: (00) 00000-0000 */
export function mascaraWhatsApp(valor: string): string {
  const nums = valor.replace(/\D/g, "").slice(0, 11);
  if (nums.length <= 2) return `(${nums}`;
  if (nums.length <= 7) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
  return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
}

/** Mascara CPF: 000.000.000-00 */
export function mascaraCPF(valor: string): string {
  const nums = valor.replace(/\D/g, "").slice(0, 11);
  if (nums.length <= 3) return nums;
  if (nums.length <= 6) return `${nums.slice(0, 3)}.${nums.slice(3)}`;
  if (nums.length <= 9)
    return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6)}`;
  return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6, 9)}-${nums.slice(9)}`;
}

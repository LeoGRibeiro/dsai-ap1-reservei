/**
 * Política de cancelamento de reservas pelo próprio cliente, no site.
 * Spec: SPEC/2026-11-27-cancelamento-24h-cliente.md
 *
 * A regra vale só na tela; a garantia no banco virá com o endurecimento da RLS.
 */
import { TOLERANCIA_CANCELAMENTO_HORAS } from "@/lib/constants";
import type { Reserva } from "@/store/useReservasStore";

export interface AvaliacaoCancelamento {
  permitido: boolean;
  motivo?: string;
  /** Horas entre `agora` e o início da reserva; negativo quando já começou. */
  horasRestantes: number;
}

const MS_POR_HORA = 60 * 60 * 1000;

/** Início da reserva no fuso local (nunca via `toISOString`, que usa UTC). */
function inicioLocal(reserva: Pick<Reserva, "data" | "horaInicio">): Date {
  const [ano, mes, dia] = reserva.data.split("-").map(Number);
  const [hora, minuto] = reserva.horaInicio.split(":").map(Number);
  return new Date(ano, mes - 1, dia, hora, minuto, 0, 0);
}

function motivoBloqueio(reserva: Reserva, horasRestantes: number): string | undefined {
  if (reserva.status === "cancelada") return "Esta reserva já foi cancelada.";
  if (reserva.status === "em_processamento") return "O pagamento desta reserva ainda não foi concluído.";
  if (reserva.contratoId) {
    return "Reservas de contrato recorrente (escolinhas e grupos) são canceladas pelo complexo.";
  }
  if (horasRestantes <= 0) return "Esta reserva já começou ou já passou.";
  if (horasRestantes < TOLERANCIA_CANCELAMENTO_HORAS) {
    return `Cancelamento pelo site só com pelo menos ${TOLERANCIA_CANCELAMENTO_HORAS} horas de antecedência. Fale com o complexo pelo WhatsApp.`;
  }
  return undefined;
}

/**
 * Diz se o cliente pode cancelar a reserva pelo site em `agora`.
 * Exatamente 24 horas antes do início ainda é permitido.
 *
 * @example
 * avaliarCancelamentoOnline(reserva, new Date()).permitido
 */
export function avaliarCancelamentoOnline(reserva: Reserva, agora: Date): AvaliacaoCancelamento {
  const horasRestantes = (inicioLocal(reserva).getTime() - agora.getTime()) / MS_POR_HORA;
  const motivo = motivoBloqueio(reserva, horasRestantes);
  return motivo ? { permitido: false, motivo, horasRestantes } : { permitido: true, horasRestantes };
}

export function textoPoliticaCancelamento(): string {
  return (
    `O cancelamento pelo site é permitido até ${TOLERANCIA_CANCELAMENTO_HORAS} horas antes do início da reserva. ` +
    "Depois desse prazo, fale com o complexo pelo WhatsApp."
  );
}

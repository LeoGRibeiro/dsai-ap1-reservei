/**
 * Política de cancelamento online com 24 horas de antecedência.
 * Spec: SPEC/2026-11-27-cancelamento-24h-cliente.md
 */
import { describe, expect, it } from "vitest";
import {
  avaliarCancelamentoOnline,
  textoPoliticaCancelamento,
} from "@/lib/cancelamentoCliente/politicaCancelamento";
import { criarReservaTeste } from "../../helpers/reservaFactory";

// Reserva às 18:00 de 20/11/2026 (horário local)
const reserva = criarReservaTeste({ data: "2026-11-20", horaInicio: "18:00", horaFim: "19:00" });

function agoraLocal(dia: number, hora: number, minuto = 0): Date {
  return new Date(2026, 10, dia, hora, minuto, 0, 0);
}

describe("avaliarCancelamentoOnline", () => {
  it("permite com 25 horas de antecedência", () => {
    const r = avaliarCancelamentoOnline(reserva, agoraLocal(19, 17));
    expect(r).toEqual({ permitido: true, horasRestantes: 25 });
  });

  it("permite exatamente 24 horas antes", () => {
    expect(avaliarCancelamentoOnline(reserva, agoraLocal(19, 18)).permitido).toBe(true);
  });

  it("nega 23h59 antes, explicando a regra das 24 horas", () => {
    const r = avaliarCancelamentoOnline(reserva, agoraLocal(19, 18, 1));
    expect(r.permitido).toBe(false);
    expect(r.motivo).toMatch(/24 horas/);
    expect(r.horasRestantes).toBeCloseTo(23 + 59 / 60, 5);
  });

  it("considera a virada de dia pelo horário local", () => {
    const manha = criarReservaTeste({ data: "2026-11-20", horaInicio: "09:00" });
    expect(avaliarCancelamentoOnline(manha, agoraLocal(19, 9, 30)).permitido).toBe(false);
    expect(avaliarCancelamentoOnline(manha, agoraLocal(19, 8, 59)).permitido).toBe(true);
  });

  it("nega reserva já iniciada ou passada, com horas negativas", () => {
    const r = avaliarCancelamentoOnline(reserva, agoraLocal(20, 18, 30));
    expect(r.permitido).toBe(false);
    expect(r.motivo).toMatch(/já começou ou já passou/);
    expect(r.horasRestantes).toBeLessThan(0);
  });

  it("nega reserva já cancelada", () => {
    const r = avaliarCancelamentoOnline({ ...reserva, status: "cancelada" }, agoraLocal(1, 8));
    expect(r.permitido).toBe(false);
    expect(r.motivo).toMatch(/já foi cancelada/);
  });

  it("nega reserva provisória com pagamento não concluído", () => {
    const r = avaliarCancelamentoOnline({ ...reserva, status: "em_processamento" }, agoraLocal(1, 8));
    expect(r.permitido).toBe(false);
    expect(r.motivo).toMatch(/pagamento/);
  });

  it("nega reserva de contrato recorrente mesmo com antecedência", () => {
    const r = avaliarCancelamentoOnline({ ...reserva, contratoId: "ctr_1" }, agoraLocal(1, 8));
    expect(r.permitido).toBe(false);
    expect(r.motivo).toMatch(/contrato recorrente/);
  });

  it("explica a regra do contrato mesmo quando faltam menos de 24 horas", () => {
    const r = avaliarCancelamentoOnline({ ...reserva, contratoId: "ctr_1" }, agoraLocal(20, 12));
    expect(r.motivo).toMatch(/contrato recorrente/);
  });

  it("nega na dúvida quando o horário gravado não pode ser lido", () => {
    const r = avaliarCancelamentoOnline({ ...reserva, horaInicio: "18h" }, agoraLocal(1, 8));
    expect(r.permitido).toBe(false);
    expect(r.motivo).toMatch(/Não foi possível verificar o horário/);
  });

  it("devolve o motivo da primeira regra que se aplica", () => {
    const r = avaliarCancelamentoOnline(
      { ...reserva, status: "cancelada", contratoId: "ctr_1" },
      agoraLocal(20, 20)
    );
    expect(r.motivo).toMatch(/já foi cancelada/);
  });
});

describe("textoPoliticaCancelamento", () => {
  it("cita a antecedência mínima e a ausência de cancelamento online depois dela", () => {
    expect(textoPoliticaCancelamento()).toMatch(/24 horas/);
    expect(textoPoliticaCancelamento()).toMatch(/WhatsApp/);
  });
});

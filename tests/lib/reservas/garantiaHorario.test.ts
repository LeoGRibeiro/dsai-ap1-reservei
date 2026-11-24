import { describe, it, expect } from "vitest";
import {
  PRAZO_RESERVA_PROVISORIA_MINUTOS,
  MENSAGENS_GRAVACAO_RESERVA,
  classificarErroGravacaoReserva,
  reservaOcupaHorario,
  reservaProvisoriaExpirada,
} from "@/lib/reservas/garantiaHorario";
import type { Reserva } from "@/store/useReservasStore";

function reserva(parcial: Partial<Reserva>): Reserva {
  return {
    id: "r1",
    quadraId: "q1",
    data: "2026-12-01",
    horarios: ["18:00"],
    horaInicio: "18:00",
    horaFim: "19:00",
    nomeCliente: "Ana",
    whatsappCliente: "",
    cpfCliente: "",
    valorTotal: 110,
    valorSinal: 44,
    valorPendente: 66,
    status: "em_processamento",
    statusWhatsApp: "nao_enviado",
    criadaEm: "2026-11-24T15:00:00.000Z",
    ...parcial,
  };
}

const minutos = (n: number) => n * 60_000;
const criadaEm = new Date("2026-11-24T15:00:00.000Z");

describe("reservaProvisoriaExpirada", () => {
  it("prazo da provisória é de 10 minutos", () => {
    expect(PRAZO_RESERVA_PROVISORIA_MINUTOS).toBe(10);
  });

  it("usa expiraEm do banco quando existe", () => {
    const r = reserva({ expiraEm: "2026-11-24T15:02:00.000Z" });
    expect(reservaProvisoriaExpirada(r, new Date("2026-11-24T15:01:59.000Z"))).toBe(false);
    expect(reservaProvisoriaExpirada(r, new Date("2026-11-24T15:02:00.000Z"))).toBe(true);
  });

  it("sem expiraEm, conta 10 minutos a partir de criadaEm", () => {
    const r = reserva({});
    expect(reservaProvisoriaExpirada(r, new Date(criadaEm.getTime() + minutos(9)))).toBe(false);
    expect(reservaProvisoriaExpirada(r, new Date(criadaEm.getTime() + minutos(10)))).toBe(true);
  });

  it("reserva paga nunca expira", () => {
    const r = reserva({ status: "pendente" });
    expect(reservaProvisoriaExpirada(r, new Date(criadaEm.getTime() + minutos(60)))).toBe(false);
  });

  it("criadaEm inválida não é tratada como vencida", () => {
    const r = reserva({ criadaEm: "data-quebrada" });
    expect(reservaProvisoriaExpirada(r, new Date())).toBe(false);
  });
});

describe("reservaOcupaHorario", () => {
  const agora = new Date(criadaEm.getTime() + minutos(15));

  it("cancelada não ocupa", () => {
    expect(reservaOcupaHorario(reserva({ status: "cancelada" }), agora)).toBe(false);
  });

  it("provisória vencida não ocupa", () => {
    expect(reservaOcupaHorario(reserva({}), agora)).toBe(false);
  });

  it("provisória no prazo ocupa", () => {
    expect(reservaOcupaHorario(reserva({}), new Date(criadaEm.getTime() + minutos(5)))).toBe(true);
  });

  it("pendente, confirmada e bloqueio ocupam", () => {
    expect(reservaOcupaHorario(reserva({ status: "pendente" }), agora)).toBe(true);
    expect(reservaOcupaHorario(reserva({ status: "confirmada" }), agora)).toBe(true);
    expect(
      reservaOcupaHorario(reserva({ status: "confirmada", tipoReserva: "manutencao_bloqueio" }), agora)
    ).toBe(true);
  });
});

describe("classificarErroGravacaoReserva", () => {
  it("reconhece horário ocupado vindo do trigger", () => {
    expect(classificarErroGravacaoReserva({ code: "P0001", message: "horario_ocupado" })).toBe("horario_ocupado");
  });

  it("reconhece violação de chave única como horário ocupado", () => {
    expect(classificarErroGravacaoReserva({ code: "23505", message: "duplicate key" })).toBe("horario_ocupado");
  });

  it("reconhece reserva expirada", () => {
    expect(classificarErroGravacaoReserva({ code: "P0001", message: "reserva_expirada" })).toBe("reserva_expirada");
  });

  it("reconhece cliente bloqueado", () => {
    expect(classificarErroGravacaoReserva({ code: "P0001", message: "usuario_bloqueado" })).toBe("usuario_bloqueado");
    expect(MENSAGENS_GRAVACAO_RESERVA.usuario_bloqueado).toMatch(/bloqueada/);
  });

  it("qualquer outro erro é falha genérica", () => {
    expect(classificarErroGravacaoReserva({ message: "Failed to fetch" })).toBe("falha");
    expect(classificarErroGravacaoReserva(null)).toBe("falha");
  });

  it("cada motivo tem mensagem para o usuário", () => {
    expect(MENSAGENS_GRAVACAO_RESERVA.horario_ocupado).toMatch(/acabou de ser reservado/);
    expect(MENSAGENS_GRAVACAO_RESERVA.reserva_expirada).toMatch(/expirou/);
    expect(MENSAGENS_GRAVACAO_RESERVA.falha).toMatch(/Não foi possível/);
  });
});

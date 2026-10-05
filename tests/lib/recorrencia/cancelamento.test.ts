import { describe, it, expect } from "vitest";
import {
  ANTECEDENCIA_MINIMA_DIAS,
  calcularSituacaoCobranca,
  classificarAviso,
  horarioFoiReposto,
  validarRegistroCancelamento,
} from "@/lib/recorrencia/cancelamento";
import type { Reserva } from "@/store/useReservasStore";

// Sessão do grupo: quinta-feira 2026-10-15, 14:00–16:00, quadra 1
const DATA_SESSAO = "2026-10-15";

function criarSessaoGrupo(overrides: Partial<Reserva> = {}): Reserva {
  return {
    id: "ctr_1_2026-10-15",
    quadraId: "q1",
    nomeCliente: "Pelada de Quinta",
    whatsappCliente: "11999990000",
    cpfCliente: "",
    data: DATA_SESSAO,
    horarios: ["14:00", "15:00"],
    horaInicio: "14:00",
    horaFim: "16:00",
    valorTotal: 180,
    valorSinal: 0,
    valorPendente: 180,
    status: "pendente",
    statusWhatsApp: "nao_enviado",
    criadaEm: "2026-10-01T10:00:00.000Z",
    contratoId: "ctr_1",
    tipoReserva: "grupo",
    ...overrides,
  };
}

function criarAvulsa(overrides: Partial<Reserva> = {}): Reserva {
  return criarSessaoGrupo({
    id: "rsv_avulsa",
    nomeCliente: "Cliente Avulso",
    valorTotal: 90,
    valorSinal: 36,
    valorPendente: 54,
    status: "pendente",
    contratoId: undefined,
    tipoReserva: undefined,
    ...overrides,
  });
}

describe("classificarAviso", () => {
  it("define 7 dias como a antecedência mínima", () => {
    expect(ANTECEDENCIA_MINIMA_DIAS).toBe(7);
  });

  it("aviso com exatamente 7 dias é sem ônus", () => {
    expect(classificarAviso("2026-10-08", DATA_SESSAO)).toBe("sem_onus");
  });

  it("aviso com mais de 7 dias é sem ônus", () => {
    expect(classificarAviso("2026-10-01", DATA_SESSAO)).toBe("sem_onus");
  });

  it("aviso com 6 dias é tardio", () => {
    expect(classificarAviso("2026-10-09", DATA_SESSAO)).toBe("tardio");
  });

  it("aviso no próprio dia é tardio", () => {
    expect(classificarAviso(DATA_SESSAO, DATA_SESSAO)).toBe("tardio");
  });
});

describe("validarRegistroCancelamento", () => {
  const hoje = "2026-10-09";

  it("aceita cancelamento de sessão futura de grupo", () => {
    expect(validarRegistroCancelamento(criarSessaoGrupo(), hoje, hoje)).toEqual({ ok: true });
  });

  it("rejeita ocorrência que não é de grupo", () => {
    const escolinha = criarSessaoGrupo({ tipoReserva: "escolinha" });
    expect(validarRegistroCancelamento(escolinha, hoje, hoje).ok).toBe(false);
    expect(validarRegistroCancelamento(criarAvulsa(), hoje, hoje).ok).toBe(false);
  });

  it("rejeita ocorrência já cancelada", () => {
    const resultado = validarRegistroCancelamento(criarSessaoGrupo({ status: "cancelada" }), hoje, hoje);
    expect(resultado).toEqual({ ok: false, motivo: "Esta ocorrência já está cancelada." });
  });

  it("rejeita sessão que já passou", () => {
    const passada = criarSessaoGrupo({ data: "2026-10-01" });
    expect(validarRegistroCancelamento(passada, "2026-10-01", hoje).ok).toBe(false);
  });

  it("aceita cancelamento no próprio dia da sessão", () => {
    const resultado = validarRegistroCancelamento(criarSessaoGrupo(), DATA_SESSAO, DATA_SESSAO);
    expect(resultado.ok).toBe(true);
  });

  it("rejeita data de aviso no futuro", () => {
    expect(validarRegistroCancelamento(criarSessaoGrupo(), "2026-10-12", hoje).ok).toBe(false);
  });

  it("rejeita data de aviso posterior à sessão", () => {
    const sessaoCedo = criarSessaoGrupo({ data: "2026-10-09" });
    const resultado = validarRegistroCancelamento(sessaoCedo, "2026-10-10", "2026-10-10");
    expect(resultado.ok).toBe(false);
  });
});

describe("horarioFoiReposto", () => {
  const cancelada = criarSessaoGrupo({ status: "cancelada" });

  it("é falso quando ninguém ocupou o horário", () => {
    expect(horarioFoiReposto(cancelada, [cancelada])).toBe(false);
  });

  it("é verdadeiro quando um cliente avulso pagou todos os horários", () => {
    const avulsa = criarAvulsa({ horarios: ["14:00", "15:00"] });
    expect(horarioFoiReposto(cancelada, [cancelada, avulsa])).toBe(true);
  });

  it("considera a união de várias reservas avulsas", () => {
    const a = criarAvulsa({ id: "a", horarios: ["14:00"], horaInicio: "14:00", horaFim: "15:00" });
    const b = criarAvulsa({ id: "b", horarios: ["15:00"], horaInicio: "15:00", horaFim: "16:00" });
    expect(horarioFoiReposto(cancelada, [cancelada, a, b])).toBe(true);
  });

  it("é falso se a reposição cobre só parte dos horários", () => {
    const parcial = criarAvulsa({ horarios: ["14:00"], horaInicio: "14:00", horaFim: "15:00" });
    expect(horarioFoiReposto(cancelada, [cancelada, parcial])).toBe(false);
  });

  it("não conta reserva ainda em processamento (não paga)", () => {
    const lock = criarAvulsa({ status: "em_processamento", horarios: ["14:00", "15:00"] });
    expect(horarioFoiReposto(cancelada, [cancelada, lock])).toBe(false);
  });

  it("aceita reserva totalmente paga (confirmada)", () => {
    const paga = criarAvulsa({ status: "confirmada", horarios: ["14:00", "15:00"] });
    expect(horarioFoiReposto(cancelada, [cancelada, paga])).toBe(true);
  });

  it("ignora reserva avulsa cancelada, de outra quadra ou de outra data", () => {
    const reservas = [
      cancelada,
      criarAvulsa({ id: "x", status: "cancelada" }),
      criarAvulsa({ id: "y", quadraId: "q2" }),
      criarAvulsa({ id: "z", data: "2026-10-16" }),
    ];
    expect(horarioFoiReposto(cancelada, reservas)).toBe(false);
  });

  it("não considera outra sessão de contrato como reposição", () => {
    const outroGrupo = criarSessaoGrupo({ id: "outro", status: "pendente", contratoId: "ctr_2" });
    expect(horarioFoiReposto(cancelada, [cancelada, outroGrupo])).toBe(false);
  });
});

describe("calcularSituacaoCobranca", () => {
  it("sem aviso registrado (cancelamento administrativo) é sem ônus", () => {
    const cancelada = criarSessaoGrupo({ status: "cancelada" });
    expect(calcularSituacaoCobranca(cancelada, [cancelada], "2026-10-20")).toBe("sem_onus");
  });

  it("aviso com antecedência é sem ônus", () => {
    const cancelada = criarSessaoGrupo({ status: "cancelada", avisoCancelamentoEm: "2026-10-05" });
    expect(calcularSituacaoCobranca(cancelada, [cancelada], "2026-10-06")).toBe("sem_onus");
  });

  it("aviso tardio antes da data e sem reposição: aguardando reposição", () => {
    const cancelada = criarSessaoGrupo({ status: "cancelada", avisoCancelamentoEm: "2026-10-12" });
    expect(calcularSituacaoCobranca(cancelada, [cancelada], "2026-10-13")).toBe("aguardando_reposicao");
  });

  it("aviso tardio no dia da sessão ainda aguarda reposição", () => {
    const cancelada = criarSessaoGrupo({ status: "cancelada", avisoCancelamentoEm: "2026-10-12" });
    expect(calcularSituacaoCobranca(cancelada, [cancelada], DATA_SESSAO)).toBe("aguardando_reposicao");
  });

  it("aviso tardio com data passada e sem reposição: cobrança devida", () => {
    const cancelada = criarSessaoGrupo({ status: "cancelada", avisoCancelamentoEm: "2026-10-12" });
    expect(calcularSituacaoCobranca(cancelada, [cancelada], "2026-10-16")).toBe("cobranca_devida");
  });

  it("aviso tardio com reposição paga: isento", () => {
    const cancelada = criarSessaoGrupo({ status: "cancelada", avisoCancelamentoEm: "2026-10-12" });
    const avulsa = criarAvulsa({ horarios: ["14:00", "15:00"] });
    expect(calcularSituacaoCobranca(cancelada, [cancelada, avulsa], "2026-10-13")).toBe("isento_por_reposicao");
  });

  it("reposição vence mesmo depois que a data passou", () => {
    const cancelada = criarSessaoGrupo({ status: "cancelada", avisoCancelamentoEm: "2026-10-12" });
    const avulsa = criarAvulsa({ status: "confirmada", horarios: ["14:00", "15:00"] });
    expect(calcularSituacaoCobranca(cancelada, [cancelada, avulsa], "2026-10-30")).toBe("isento_por_reposicao");
  });
});

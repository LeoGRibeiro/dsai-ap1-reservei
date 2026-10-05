import { describe, it, expect } from "vitest";
import { montarLinkWhatsApp, obterAvisosEscolinha, obterHorariosEscolinha } from "@/lib/recorrencia/agenda";
import { contratoToRow, rowToContrato } from "@/lib/recorrencia/contratoMapper";
import { reservaToRow, rowToReserva } from "@/lib/supabase/types";
import type { ContratoRecorrente } from "@/lib/recorrencia/types";
import type { Reserva } from "@/store/useReservasStore";

const contrato: ContratoRecorrente = {
  id: "ctr_1",
  tipo: "escolinha",
  nome: "Craques do Futuro",
  esporte: "Futsal",
  descricao: "Turmas de 8 a 12 anos",
  responsavelNome: "Prof. Marcos",
  contatoWhatsapp: "(11) 99999-1234",
  quadraId: "q1",
  diasSemana: [2, 4],
  horaInicio: "14:00",
  horaFim: "16:00",
  dataInicio: "2026-10-05",
  meses: 6,
  ativo: true,
  criadoEm: "2026-10-05T10:00:00.000Z",
};

function criarReserva(overrides: Partial<Reserva> = {}): Reserva {
  return {
    id: "ctr_1_2026-10-06",
    quadraId: "q1",
    nomeCliente: "Craques do Futuro",
    whatsappCliente: "(11) 99999-1234",
    cpfCliente: "",
    data: "2026-10-06",
    horarios: ["14:00", "15:00"],
    horaInicio: "14:00",
    horaFim: "16:00",
    valorTotal: 0,
    valorSinal: 0,
    valorPendente: 0,
    status: "confirmada",
    statusWhatsApp: "nao_enviado",
    criadaEm: "2026-10-05T10:00:00.000Z",
    esporte: "Futsal",
    contratoId: "ctr_1",
    tipoReserva: "escolinha",
    ...overrides,
  };
}

describe("obterAvisosEscolinha", () => {
  it("retorna o bloco da escolinha enriquecido com o contrato", () => {
    const avisos = obterAvisosEscolinha([criarReserva()], [contrato], "2026-10-06", "q1");
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatchObject({
      contratoId: "ctr_1",
      nome: "Craques do Futuro",
      esporte: "Futsal",
      horaInicio: "14:00",
      horaFim: "16:00",
      horarios: ["14:00", "15:00"],
      descricao: "Turmas de 8 a 12 anos",
      responsavelNome: "Prof. Marcos",
      diasSemana: [2, 4],
    });
  });

  it("funciona só com os dados da reserva se o contrato não carregou", () => {
    const avisos = obterAvisosEscolinha([criarReserva()], [], "2026-10-06", "q1");
    expect(avisos).toHaveLength(1);
    expect(avisos[0].nome).toBe("Craques do Futuro");
    expect(avisos[0].contatoWhatsapp).toBe("(11) 99999-1234");
    expect(avisos[0].descricao).toBeUndefined();
  });

  it("ignora grupos, avulsas, canceladas e outras quadras/datas", () => {
    const reservas = [
      criarReserva({ id: "grupo", tipoReserva: "grupo" }),
      criarReserva({ id: "avulsa", tipoReserva: undefined }),
      criarReserva({ id: "cancelada", status: "cancelada" }),
      criarReserva({ id: "outra-quadra", quadraId: "q2" }),
      criarReserva({ id: "outra-data", data: "2026-10-07" }),
    ];
    expect(obterAvisosEscolinha(reservas, [contrato], "2026-10-06", "q1")).toEqual([]);
  });

  it("ordena por horário de início", () => {
    const tarde = criarReserva({ id: "b", horaInicio: "18:00", horaFim: "19:00", horarios: ["18:00"], nomeCliente: "Tarde" });
    const cedo = criarReserva({ id: "a", horaInicio: "09:00", horaFim: "10:00", horarios: ["09:00"], nomeCliente: "Cedo", contratoId: "ctr_x" });
    const avisos = obterAvisosEscolinha([tarde, cedo], [], "2026-10-06", "q1");
    expect(avisos.map((a) => a.horaInicio)).toEqual(["09:00", "18:00"]);
  });

  it("une os slots de todas as escolinhas", () => {
    const avisos = obterAvisosEscolinha([criarReserva()], [contrato], "2026-10-06", "q1");
    expect(obterHorariosEscolinha(avisos)).toEqual(["14:00", "15:00"]);
  });
});

describe("montarLinkWhatsApp", () => {
  it("adiciona o código do país e codifica a mensagem", () => {
    const link = montarLinkWhatsApp("(11) 99999-1234", "Olá, tudo bem?");
    expect(link).toBe("https://wa.me/5511999991234?text=Ol%C3%A1%2C%20tudo%20bem%3F");
  });

  it("não duplica o código do país", () => {
    expect(montarLinkWhatsApp("5511999991234", "oi")).toBe("https://wa.me/5511999991234?text=oi");
  });
});

describe("mapeamento de contratos", () => {
  it("converte contrato para linha do banco e de volta", () => {
    const row = contratoToRow(contrato);
    expect(row).toMatchObject({
      id: "ctr_1",
      tipo: "escolinha",
      responsavel_nome: "Prof. Marcos",
      contato_whatsapp: "(11) 99999-1234",
      dias_semana: [2, 4],
      data_inicio: "2026-10-05",
    });
    expect(rowToContrato(row as never)).toEqual(contrato);
  });

  it("aceita dias_semana no formato literal do Postgres", () => {
    const row = { ...contratoToRow(contrato), dias_semana: "{1,3,5}" };
    expect(rowToContrato(row as never).diasSemana).toEqual([1, 3, 5]);
  });

  it("descarta dias inválidos", () => {
    const row = { ...contratoToRow(contrato), dias_semana: [1, 9, -1, 3] };
    expect(rowToContrato(row as never).diasSemana).toEqual([1, 3]);
  });

  it("normaliza data_inicio com timestamp", () => {
    const row = { ...contratoToRow(contrato), data_inicio: "2026-10-05T00:00:00+00:00" };
    expect(rowToContrato(row as never).dataInicio).toBe("2026-10-05");
  });

  it("só gera colunas dos campos informados em atualizações parciais", () => {
    expect(contratoToRow({ ativo: false })).toEqual({ ativo: false });
  });
});

describe("mapeamento de reservas recorrentes", () => {
  it("grava contrato_id, tipo_reserva e aviso_cancelamento_em", () => {
    const row = reservaToRow(criarReserva({ avisoCancelamentoEm: "2026-10-01" }));
    expect(row).toMatchObject({
      contrato_id: "ctr_1",
      tipo_reserva: "escolinha",
      aviso_cancelamento_em: "2026-10-01",
    });
  });

  it("não envia colunas novas para reservas avulsas", () => {
    const row = reservaToRow({ id: "x", status: "confirmada" });
    expect(row).not.toHaveProperty("contrato_id");
    expect(row).not.toHaveProperty("tipo_reserva");
    expect(row).not.toHaveProperty("aviso_cancelamento_em");
  });

  it("limpa o aviso enviando null", () => {
    expect(reservaToRow({ avisoCancelamentoEm: null })).toEqual({ aviso_cancelamento_em: null });
  });

  it("lê os campos novos da linha do banco", () => {
    const reserva = rowToReserva({
      id: "r1",
      data: "2026-10-06",
      horarios: ["14:00"],
      status: "cancelada",
      contrato_id: "ctr_9",
      tipo_reserva: "grupo",
      aviso_cancelamento_em: "2026-10-01T00:00:00+00:00",
    });
    expect(reserva.contratoId).toBe("ctr_9");
    expect(reserva.tipoReserva).toBe("grupo");
    expect(reserva.avisoCancelamentoEm).toBe("2026-10-01");
  });

  it("deixa os campos novos indefinidos em reservas antigas", () => {
    const reserva = rowToReserva({ id: "r2", data: "2026-10-06", horarios: ["14:00"], status: "confirmada" });
    expect(reserva.contratoId).toBeUndefined();
    expect(reserva.tipoReserva).toBeUndefined();
    expect(reserva.avisoCancelamentoEm).toBeUndefined();
  });
});

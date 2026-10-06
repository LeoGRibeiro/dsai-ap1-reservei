import { describe, it, expect } from "vitest";
import {
  encontrarConflitosDoBloco,
  encontrarConflitosDoContrato,
  expandirHorarios,
  gerarDatasRecorrentes,
  gerarIdOcorrencia,
  gerarReservasDoContrato,
  horariosFimDisponiveis,
  montarReservaDaOcorrencia,
  validarDadosContrato,
} from "@/lib/recorrencia/ocorrencias";
import { diaDaSemana } from "@/lib/recorrencia/datas";
import type { ContratoRecorrente, DadosNovoContrato } from "@/lib/recorrencia/types";
import type { Reserva } from "@/store/useReservasStore";

const HOJE = "2026-10-05"; // segunda-feira

const dadosBase: DadosNovoContrato = {
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
  dataInicio: HOJE,
  meses: 6,
};

const contratoBase: ContratoRecorrente = {
  ...dadosBase,
  id: "ctr_1",
  ativo: true,
  criadoEm: "2026-10-05T10:00:00.000Z",
};

function criarReserva(overrides: Partial<Reserva> = {}): Reserva {
  return {
    id: "rsv_1",
    quadraId: "q1",
    nomeCliente: "Cliente",
    whatsappCliente: "11988887777",
    cpfCliente: "",
    data: "2026-10-06",
    horarios: ["14:00"],
    horaInicio: "14:00",
    horaFim: "15:00",
    valorTotal: 90,
    valorSinal: 36,
    valorPendente: 54,
    status: "confirmada",
    statusWhatsApp: "nao_enviado",
    criadaEm: "2026-10-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("expandirHorarios", () => {
  it("expande intervalo em slots de 1h", () => {
    expect(expandirHorarios("14:00", "16:00")).toEqual(["14:00", "15:00"]);
    expect(expandirHorarios("08:00", "09:00")).toEqual(["08:00"]);
    expect(expandirHorarios("20:00", "23:00")).toEqual(["20:00", "21:00", "22:00"]);
  });

  it("retorna vazio para intervalos inválidos", () => {
    expect(expandirHorarios("16:00", "14:00")).toEqual([]);
    expect(expandirHorarios("14:00", "14:00")).toEqual([]);
    expect(expandirHorarios("", "14:00")).toEqual([]);
  });

  it("lista os horários de fim possíveis (09:00 até 22:00)", () => {
    const fins = horariosFimDisponiveis();
    expect(fins[0]).toBe("09:00");
    expect(fins[fins.length - 1]).toBe("22:00");
  });
});

describe("gerarDatasRecorrentes", () => {
  it("gera terças e quintas por 6 meses (26 semanas = 52 sessões)", () => {
    const datas = gerarDatasRecorrentes("2026-10-05", [2, 4], 6);
    expect(datas).toHaveLength(52);
    expect(datas[0]).toBe("2026-10-06");
    expect(datas[datas.length - 1]).toBe("2027-04-01");
    expect(datas.every((d) => [2, 4].includes(diaDaSemana(d)))).toBe(true);
  });

  it("não ultrapassa a data limite (exclusiva)", () => {
    const datas = gerarDatasRecorrentes("2026-10-05", [1], 1);
    // segundas entre 05/10 e 05/11 (exclusive): 5, 12, 19, 26 e 02/11
    expect(datas).toEqual([
      "2026-10-05",
      "2026-10-12",
      "2026-10-19",
      "2026-10-26",
      "2026-11-02",
    ]);
    expect(datas.every((d) => d < "2026-11-05")).toBe(true);
  });

  it("inclui a data inicial quando ela cai num dia escolhido", () => {
    expect(gerarDatasRecorrentes("2026-10-05", [1], 1)[0]).toBe("2026-10-05");
  });

  it("retorna vazio para entradas inválidas", () => {
    expect(gerarDatasRecorrentes("data-ruim", [1], 6)).toEqual([]);
    expect(gerarDatasRecorrentes("2026-10-05", [], 6)).toEqual([]);
    expect(gerarDatasRecorrentes("2026-10-05", [1], 0)).toEqual([]);
  });
});

describe("validarDadosContrato", () => {
  it("aceita dados válidos", () => {
    expect(validarDadosContrato(dadosBase, HOJE)).toEqual([]);
  });

  it("exige nome, responsável e WhatsApp", () => {
    const erros = validarDadosContrato(
      { ...dadosBase, nome: " ", responsavelNome: "", contatoWhatsapp: "123" },
      HOJE
    );
    expect(erros).toContain("Informe o nome da escolinha.");
    expect(erros).toContain("Informe o nome do responsável.");
    expect(erros).toContain("Informe um WhatsApp válido com DDD.");
  });

  it("usa mensagem específica para grupo", () => {
    const erros = validarDadosContrato({ ...dadosBase, tipo: "grupo", nome: "" }, HOJE);
    expect(erros).toContain("Informe o nome do grupo.");
  });

  it("exige esporte apenas para escolinha", () => {
    expect(validarDadosContrato({ ...dadosBase, esporte: undefined }, HOJE)).toContain(
      "Informe o esporte da escolinha."
    );
    expect(
      validarDadosContrato({ ...dadosBase, tipo: "grupo", esporte: undefined }, HOJE)
    ).toEqual([]);
  });

  it("rejeita quadra inexistente e ausência de dias", () => {
    const erros = validarDadosContrato({ ...dadosBase, quadraId: "q99", diasSemana: [] }, HOJE);
    expect(erros).toContain("Selecione uma quadra válida.");
    expect(erros).toContain("Selecione ao menos um dia da semana.");
  });

  it("rejeita horário de fim anterior ao início", () => {
    const erros = validarDadosContrato({ ...dadosBase, horaInicio: "16:00", horaFim: "14:00" }, HOJE);
    expect(erros).toContain("O horário de fim deve ser posterior ao horário de início.");
  });

  it("rejeita horários fora do funcionamento", () => {
    const erros = validarDadosContrato({ ...dadosBase, horaInicio: "06:00", horaFim: "08:00" }, HOJE);
    expect(erros).toContain("O intervalo contém horários fora do funcionamento do complexo.");
  });

  it("rejeita data de início no passado ou inválida", () => {
    expect(validarDadosContrato({ ...dadosBase, dataInicio: "2026-10-04" }, HOJE)).toContain(
      "A data de início não pode estar no passado."
    );
    expect(validarDadosContrato({ ...dadosBase, dataInicio: "" }, HOJE)).toContain(
      "Informe uma data de início válida."
    );
  });

  it("aceita data de início igual a hoje", () => {
    expect(validarDadosContrato({ ...dadosBase, dataInicio: HOJE }, HOJE)).toEqual([]);
  });

  it("limita a duração entre 1 e 12 meses", () => {
    expect(validarDadosContrato({ ...dadosBase, meses: 0 }, HOJE).join()).toContain("1 a 12 meses");
    expect(validarDadosContrato({ ...dadosBase, meses: 13 }, HOJE).join()).toContain("1 a 12 meses");
    expect(validarDadosContrato({ ...dadosBase, meses: 1.5 }, HOJE).join()).toContain("1 a 12 meses");
    expect(validarDadosContrato({ ...dadosBase, meses: 12 }, HOJE)).toEqual([]);
  });
});

describe("detecção de conflitos", () => {
  it("encontra reserva ativa com horário sobreposto", () => {
    const existente = criarReserva({ horarios: ["15:00"], horaInicio: "15:00", horaFim: "16:00" });
    const conflitos = encontrarConflitosDoBloco("q1", "2026-10-06", ["14:00", "15:00"], [existente]);
    expect(conflitos).toHaveLength(1);
  });

  it("ignora reservas canceladas, de outra quadra, de outra data ou sem sobreposição", () => {
    const reservas = [
      criarReserva({ id: "a", status: "cancelada" }),
      criarReserva({ id: "b", quadraId: "q2" }),
      criarReserva({ id: "c", data: "2026-10-07" }),
      criarReserva({ id: "d", horarios: ["17:00"], horaInicio: "17:00", horaFim: "18:00" }),
    ];
    expect(encontrarConflitosDoBloco("q1", "2026-10-06", ["14:00", "15:00"], reservas)).toEqual([]);
  });

  it("considera reservas em processamento (lock) como conflito", () => {
    const lock = criarReserva({ status: "em_processamento" });
    expect(encontrarConflitosDoBloco("q1", "2026-10-06", ["14:00"], [lock])).toHaveLength(1);
  });

  it("permite ignorar a própria reserva", () => {
    const propria = criarReserva();
    expect(encontrarConflitosDoBloco("q1", "2026-10-06", ["14:00"], [propria], propria.id)).toEqual([]);
  });

  it("lista conflitos por data para um contrato inteiro", () => {
    const existente = criarReserva({ data: "2026-10-08", nomeCliente: "Fulano" });
    const conflitos = encontrarConflitosDoContrato(dadosBase, [existente]);
    expect(conflitos).toHaveLength(1);
    expect(conflitos[0]).toMatchObject({ data: "2026-10-08", nomeCliente: "Fulano" });
  });

  it("não reporta conflito quando a agenda está livre", () => {
    expect(encontrarConflitosDoContrato(dadosBase, [])).toEqual([]);
  });
});

describe("materialização das ocorrências", () => {
  it("gera id determinístico por contrato e data", () => {
    expect(gerarIdOcorrencia("ctr_1", "2026-10-06")).toBe("ctr_1_2026-10-06");
  });

  it("escolinha: sem valores, confirmada e marcada como escolinha", () => {
    const reserva = montarReservaDaOcorrencia(contratoBase, "2026-10-06");
    expect(reserva).toMatchObject({
      id: "ctr_1_2026-10-06",
      quadraId: "q1",
      nomeCliente: "Craques do Futuro",
      horarios: ["14:00", "15:00"],
      horaInicio: "14:00",
      horaFim: "16:00",
      valorTotal: 0,
      valorSinal: 0,
      valorPendente: 0,
      status: "confirmada",
      tipoReserva: "escolinha",
      contratoId: "ctr_1",
      esporte: "Futsal",
    });
    expect(reserva.userId).toBeUndefined();
  });

  it("grupo: valor normal da sessão, nada pago, status pendente", () => {
    const grupo: ContratoRecorrente = { ...contratoBase, tipo: "grupo", nome: "Pelada de Terça" };
    const reserva = montarReservaDaOcorrencia(grupo, "2026-10-06");
    expect(reserva.valorTotal).toBe(180); // 2h × R$ 90 (faixa da tarde)
    expect(reserva.valorSinal).toBe(0);
    expect(reserva.valorPendente).toBe(180);
    expect(reserva.status).toBe("pendente");
    expect(reserva.tipoReserva).toBe("grupo");
  });

  it("gera uma reserva por data do contrato, todas únicas", () => {
    const reservas = gerarReservasDoContrato(contratoBase);
    expect(reservas).toHaveLength(52);
    expect(new Set(reservas.map((r) => r.id)).size).toBe(52);
    expect(reservas.every((r) => r.contratoId === "ctr_1")).toBe(true);
  });
});

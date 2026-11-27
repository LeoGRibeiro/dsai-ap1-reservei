/**
 * Regras puras do financeiro do admin.
 * Spec: SPEC/2026-11-27-financeiro-correto-e-csv.md
 */
import { describe, expect, it } from "vitest";
import {
  calcularResumoFinanceiro,
  calcularTaxaOcupacao,
  filtrarReservasFinanceiras,
  gerarCsvReservas,
  nomeArquivoCsvFinanceiro,
  valorBrutoReserva,
} from "@/lib/financeiro/calculosFinanceiros";
import { criarReservaTeste as reserva } from "../../helpers/reservaFactory";

const BOM = "﻿";
const CABECALHO =
  "Data;Quadra;Início;Fim;Cliente;WhatsApp;Status;Tipo;Método de pagamento;Valor total;Sinal;Pendente;Desconto fidelidade";

/** Linhas do CSV sem o BOM e sem a linha final vazia. */
function linhasCsv(csv: string): string[] {
  return csv.replace(BOM, "").split("\r\n").filter((l) => l !== "");
}

const bloqueio = reserva({
  id: "bloq",
  tipoReserva: "manutencao_bloqueio",
  status: "confirmada",
  valorTotal: 0,
  valorSinal: 0,
  valorPendente: 0,
  horarios: ["08:00", "09:00"],
});

describe("filtrarReservasFinanceiras", () => {
  it("mantém pendente e confirmada e exclui cancelada, provisória e bloqueio", () => {
    const lista = [
      reserva({ id: "pend", status: "pendente" }),
      reserva({ id: "conf", status: "confirmada" }),
      reserva({ id: "canc", status: "cancelada" }),
      reserva({ id: "proc", status: "em_processamento" }),
      bloqueio,
    ];
    expect(filtrarReservasFinanceiras(lista).map((r) => r.id)).toEqual(["pend", "conf"]);
  });
});

describe("valorBrutoReserva", () => {
  it("usa o valor original quando informado", () => {
    expect(valorBrutoReserva(reserva({ valorOriginal: 220, valorTotal: 110, descontoFidelidade: 110 }))).toBe(220);
  });

  it("soma total e desconto quando não há valor original", () => {
    expect(valorBrutoReserva(reserva({ valorTotal: 50, descontoFidelidade: 40 }))).toBe(90);
  });

  it("trata valores inválidos como zero", () => {
    expect(valorBrutoReserva(reserva({ valorTotal: NaN, descontoFidelidade: undefined }))).toBe(0);
  });
});

describe("calcularResumoFinanceiro", () => {
  it("bate com um cenário montado à mão", () => {
    const resumo = calcularResumoFinanceiro([
      // sinal pago, saldo no balcão
      reserva({ id: "a", status: "pendente", valorTotal: 110, valorSinal: 44, valorPendente: 66 }),
      // quitada no balcão
      reserva({ id: "b", status: "confirmada", valorTotal: 180, valorSinal: 180, valorPendente: 0 }),
      // voucher de fidelidade abateu 70 de 140
      reserva({
        id: "c", status: "confirmada", valorOriginal: 140, descontoFidelidade: 70,
        valorTotal: 70, valorSinal: 70, valorPendente: 0,
      }),
      reserva({ id: "d", status: "cancelada", valorTotal: 90, valorSinal: 36, valorPendente: 54 }),
      reserva({ id: "e", status: "em_processamento", valorTotal: 90, valorSinal: 36, valorPendente: 54 }),
      bloqueio,
    ]);

    expect(resumo).toEqual({
      recebido: 44 + 180 + 70,
      aReceberNoLocal: 66,
      previsto: 110 + 180 + 70,
      brutoTabela: 110 + 180 + 140,
      descontosFidelidade: 70,
    });
  });

  it("devolve tudo zerado para lista vazia", () => {
    expect(calcularResumoFinanceiro([])).toEqual({
      recebido: 0, aReceberNoLocal: 0, previsto: 0, brutoTabela: 0, descontosFidelidade: 0,
    });
  });
});

describe("calcularTaxaOcupacao", () => {
  it("divide os horários ocupados pela capacidade de quadras × horários", () => {
    const dia = [reserva({ horarios: ["18:00", "19:00", "20:00"] }), reserva({ quadraId: "q2", horarios: ["10:00"] })];
    // 4 de 42 horários = 9,5%
    expect(calcularTaxaOcupacao(dia, 3, 14)).toBe(10);
  });

  it("desconta os horários bloqueados da capacidade e não conta o bloqueio como ocupação", () => {
    const dia = [bloqueio, reserva({ quadraId: "q1", horarios: ["10:00", "11:00"] })];
    // capacidade 1 × 4 − 2 bloqueados = 2; ocupados 2
    expect(calcularTaxaOcupacao(dia, 1, 4)).toBe(100);
  });

  it("ignora provisórias e canceladas e conta uma vez o mesmo horário", () => {
    const dia = [
      reserva({ id: "x", horarios: ["18:00"] }),
      reserva({ id: "y", horarios: ["18:00"], tipoReserva: "escolinha", valorTotal: 0 }),
      reserva({ id: "p", horarios: ["19:00"], status: "em_processamento" }),
      reserva({ id: "c", horarios: ["20:00"], status: "cancelada" }),
    ];
    expect(calcularTaxaOcupacao(dia, 1, 10)).toBe(10);
  });

  it("devolve 0 quando a capacidade é zero", () => {
    expect(calcularTaxaOcupacao([bloqueio], 1, 2)).toBe(0);
    expect(calcularTaxaOcupacao([], 0, 14)).toBe(0);
  });
});

describe("gerarCsvReservas", () => {
  it("gera só BOM e cabeçalho para lista vazia", () => {
    expect(gerarCsvReservas([])).toBe(`${BOM}${CABECALHO}\r\n`);
  });

  it("formata data, quadra, status, tipo e valores no padrão brasileiro", () => {
    const csv = gerarCsvReservas([
      reserva({
        data: "2026-11-05", quadraId: "q2", nomeCliente: "Ana", valorTotal: 1234.5,
        valorSinal: 493.8, valorPendente: 740.7, descontoFidelidade: 0, status: "pendente",
      }),
    ]);
    expect(linhasCsv(csv)[1]).toBe(
      "05/11/2026;Quadra 2;18:00;19:00;Ana;91988887777;Sinal pago;Avulsa;Pix;1234,50;493,80;740,70;0,00"
    );
  });

  it("não exporta o CPF", () => {
    expect(gerarCsvReservas([reserva({ cpfCliente: "123.456.789-00" })])).not.toContain("123.456.789-00");
  });

  it("mantém acentos e escapa ponto e vírgula, aspas e quebra de linha", () => {
    const csv = gerarCsvReservas([reserva({ nomeCliente: 'João "Zé"; Conceição\nSilva' })]);
    expect(csv.startsWith(BOM)).toBe(true);
    expect(csv).toContain(';"João ""Zé""; Conceição\nSilva";');
  });

  it.each(["=HYPERLINK(\"http://x\")", "+5511", "-2+3", "@SUM(A1)", "\tcmd", "\rcmd"])(
    "neutraliza fórmula na célula %j",
    (nome) => {
      const celula = linhasCsv(gerarCsvReservas([reserva({ nomeCliente: nome })]))[1]?.split(";")[4] ?? "";
      expect(celula.replace(/^"/, "").startsWith(`'${nome[0]}`)).toBe(true);
    }
  );

  it("mantém o id da quadra quando ela não existe e deixa vazio o método ausente", () => {
    const linha = linhasCsv(gerarCsvReservas([reserva({ quadraId: "q9", metodoPagamento: undefined })]))[1];
    expect(linha.split(";")[1]).toBe("q9");
    expect(linha.split(";")[8]).toBe("");
  });
});

describe("nomeArquivoCsvFinanceiro", () => {
  it("usa a data informada no nome", () => {
    expect(nomeArquivoCsvFinanceiro("2026-11-27")).toBe("reservei-financeiro-2026-11-27.csv");
  });
});

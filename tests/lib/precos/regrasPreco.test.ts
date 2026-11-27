/**
 * Regras de preço e sinal conferidas contra a fixture compartilhada com o MCP.
 * Spec: SPEC/2026-11-27-precos-fonte-unica.md
 */
import { describe, expect, it } from "vitest";
import {
  calcularValorHora,
  calcularValorPendente,
  calcularValorSinal,
  calcularValorTotal,
  PERCENTUAL_SINAL,
} from "@/lib/constants";
import regras from "../../fixtures/regras-preco.json";

describe("regras de preço (fixture compartilhada com o MCP)", () => {
  it("usa o mesmo percentual de sinal da fixture", () => {
    expect(PERCENTUAL_SINAL).toBe(regras.percentualSinal);
  });

  it.each(regras.valorHora)("cobra R$ $valor pela hora das $horario", ({ horario, valor }) => {
    expect(calcularValorHora(horario)).toBe(valor);
  });

  it.each(regras.horariosInvalidos)("recusa o horário fora da grade %j", (horario) => {
    expect(() => calcularValorHora(horario)).toThrow(RangeError);
  });

  it("recusa a reserva inteira quando um dos horários é inválido", () => {
    expect(() => calcularValorTotal(["20:00", "21:00", "22:00"])).toThrow(RangeError);
  });

  it.each(regras.reservas)(
    "calcula total, sinal e pendente: $descricao",
    ({ horarios, valorTotal, valorSinal, valorPendente }) => {
      const total = calcularValorTotal(horarios);
      expect(total).toBe(valorTotal);
      expect(calcularValorSinal(total)).toBe(valorSinal);
      expect(calcularValorPendente(total)).toBe(valorPendente);
    }
  );

  it.each(regras.arredondamento)(
    "arredonda os centavos do total R$ $valorTotal",
    ({ valorTotal, valorSinal, valorPendente }) => {
      expect(calcularValorSinal(valorTotal)).toBe(valorSinal);
      expect(calcularValorPendente(valorTotal)).toBe(valorPendente);
    }
  );
});

import { describe, it, expect } from "vitest";
import {
  adicionarDias,
  adicionarMeses,
  diaDaSemana,
  diferencaEmDias,
  formatarDataISO,
  horaParaTexto,
  isDataISOValida,
  parseDataISO,
  textoParaHora,
} from "@/lib/recorrencia/datas";

describe("datas de recorrência", () => {
  it("converte ISO para Date local e de volta sem deslocar o dia", () => {
    const data = parseDataISO("2026-10-05");
    expect(data.getFullYear()).toBe(2026);
    expect(data.getMonth()).toBe(9);
    expect(data.getDate()).toBe(5);
    expect(formatarDataISO(data)).toBe("2026-10-05");
  });

  it("valida datas existentes e rejeita inexistentes ou mal formatadas", () => {
    expect(isDataISOValida("2026-10-05")).toBe(true);
    expect(isDataISOValida("2028-02-29")).toBe(true);
    expect(isDataISOValida("2026-02-29")).toBe(false);
    expect(isDataISOValida("2026-02-30")).toBe(false);
    expect(isDataISOValida("05/10/2026")).toBe(false);
    expect(isDataISOValida("")).toBe(false);
  });

  it("adiciona dias atravessando mês e ano", () => {
    expect(adicionarDias("2026-10-05", 1)).toBe("2026-10-06");
    expect(adicionarDias("2026-10-31", 1)).toBe("2026-11-01");
    expect(adicionarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(adicionarDias("2026-10-05", -5)).toBe("2026-09-30");
  });

  it("adiciona meses preservando o dia", () => {
    expect(adicionarMeses("2026-10-05", 6)).toBe("2027-04-05");
    expect(adicionarMeses("2026-10-05", 12)).toBe("2027-10-05");
  });

  it("ajusta para o último dia do mês quando o dia não existe no destino", () => {
    expect(adicionarMeses("2026-08-31", 6)).toBe("2027-02-28");
    expect(adicionarMeses("2027-08-31", 6)).toBe("2028-02-29");
    expect(adicionarMeses("2026-01-31", 1)).toBe("2026-02-28");
  });

  it("calcula o dia da semana (0 = domingo)", () => {
    expect(diaDaSemana("2026-10-05")).toBe(1); // segunda-feira
    expect(diaDaSemana("2026-10-11")).toBe(0); // domingo
    expect(diaDaSemana("2026-10-10")).toBe(6); // sábado
  });

  it("calcula a diferença em dias corridos", () => {
    expect(diferencaEmDias("2026-10-05", "2026-10-12")).toBe(7);
    expect(diferencaEmDias("2026-10-12", "2026-10-05")).toBe(-7);
    expect(diferencaEmDias("2026-10-05", "2026-10-05")).toBe(0);
    expect(diferencaEmDias("2026-12-25", "2027-01-01")).toBe(7);
  });

  it("não sofre com mudança de horário de verão", () => {
    // Intervalo longo que cruza viradas de horário de verão em vários fusos
    expect(diferencaEmDias("2026-01-01", "2026-12-31")).toBe(364);
  });

  it("converte hora entre texto e número", () => {
    expect(horaParaTexto(9)).toBe("09:00");
    expect(horaParaTexto(22)).toBe("22:00");
    expect(textoParaHora("14:00")).toBe(14);
    expect(textoParaHora("08:00")).toBe(8);
  });
});

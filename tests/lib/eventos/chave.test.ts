import { describe, it, expect } from "vitest";
import {
  campeao,
  desfazerResultado,
  embaralhar,
  gerarChave,
  nomeDaRodada,
  registrarResultado,
} from "@/lib/eventos/chave";
import type { PartidaEvento } from "@/lib/eventos/types";

// Spec: SPEC/2026-11-27-eventos-e-torneios.md

const times = (n: number) => Array.from({ length: n }, (_, i) => `t${i + 1}`);
const rodada = (partidas: PartidaEvento[], r: number) =>
  partidas.filter((p) => p.rodada === r).sort((a, b) => a.posicao - b.posicao);
const partida = (partidas: PartidaEvento[], r: number, pos: number) =>
  partidas.find((p) => p.rodada === r && p.posicao === pos)!;

describe("gerarChave", () => {
  it.each([
    [2, 1, 0],
    [3, 2, 1],
    [5, 3, 3],
    [6, 3, 2],
    [8, 3, 0],
    [16, 4, 0],
  ])("%i times: %i rodadas e %i byes", (n, rodadas, byes) => {
    const chave = gerarChave("ev", times(n));
    expect(Math.max(...chave.map((p) => p.rodada))).toBe(rodadas);
    expect(chave.filter((p) => p.resultado === "bye")).toHaveLength(byes);
  });

  it("nunca há bye contra bye e todo time aparece uma vez na primeira rodada", () => {
    for (const n of [3, 5, 6, 7, 9, 12, 15]) {
      const primeira = rodada(gerarChave("ev", times(n)), 1);
      expect(primeira.every((p) => p.inscricaoA !== null)).toBe(true);
      const nomes = primeira.flatMap((p) => [p.inscricaoA, p.inscricaoB]).filter(Boolean);
      expect(new Set(nomes).size).toBe(n);
    }
  });

  it("time com bye já aparece na rodada seguinte", () => {
    const chave = gerarChave("ev", times(3));
    // t1 tem bye; t2 x t3 jogam
    expect(partida(chave, 1, 0)).toMatchObject({ inscricaoA: "t1", inscricaoB: null, vencedor: "t1", resultado: "bye" });
    expect(partida(chave, 1, 1)).toMatchObject({ inscricaoA: "t2", inscricaoB: "t3", vencedor: null });
    expect(partida(chave, 2, 0)).toMatchObject({ inscricaoA: "t1", inscricaoB: null });
  });

  it("recusa menos de 2 ou mais de 16 times", () => {
    expect(() => gerarChave("ev", times(1))).toThrow("minimo_2_times");
    expect(() => gerarChave("ev", times(17))).toThrow("maximo_16_times");
  });

  it("ids das partidas são estáveis por evento, rodada e posição", () => {
    expect(partida(gerarChave("ev9", times(4)), 2, 0).id).toBe("ev9_r2_p0");
  });
});

describe("registrarResultado", () => {
  const chave4 = () => gerarChave("ev", times(4)); // t1 x t2, t3 x t4

  it("vencedor pelo placar avança para a partida seguinte", () => {
    const depois = registrarResultado(chave4(), "ev_r1_p1", { golsA: 1, golsB: 3 });
    expect(partida(depois, 1, 1)).toMatchObject({ vencedor: "t4", resultado: "placar", golsA: 1, golsB: 3 });
    expect(partida(depois, 2, 0).inscricaoB).toBe("t4");
  });

  it("empate exige vencedor nos pênaltis", () => {
    expect(() => registrarResultado(chave4(), "ev_r1_p0", { golsA: 2, golsB: 2 })).toThrow("empate_exige_penaltis");
    const depois = registrarResultado(chave4(), "ev_r1_p0", { golsA: 2, golsB: 2, vencedorPenaltis: "b" });
    expect(partida(depois, 1, 0)).toMatchObject({ vencedor: "t2", resultado: "penaltis" });
    expect(partida(depois, 2, 0).inscricaoA).toBe("t2");
  });

  it("pênaltis só valem com placar empatado", () => {
    expect(() =>
      registrarResultado(chave4(), "ev_r1_p0", { golsA: 3, golsB: 1, vencedorPenaltis: "b" })
    ).toThrow("penaltis_so_com_empate");
  });

  it("W.O.: o time que não compareceu perde", () => {
    const depois = registrarResultado(chave4(), "ev_r1_p0", { woDe: "a" });
    expect(partida(depois, 1, 0)).toMatchObject({ vencedor: "t2", resultado: "wo", golsA: null, golsB: null });
  });

  it("não lança resultado em partida sem os dois times", () => {
    expect(() => registrarResultado(chave4(), "ev_r2_p0", { golsA: 1, golsB: 0 })).toThrow("partida_incompleta");
  });

  it("placar negativo ou não inteiro é recusado", () => {
    expect(() => registrarResultado(chave4(), "ev_r1_p0", { golsA: -1, golsB: 0 })).toThrow("placar_invalido");
    expect(() => registrarResultado(chave4(), "ev_r1_p0", { golsA: 1.5, golsB: 0 })).toThrow("placar_invalido");
  });

  it("corrigir resultado troca quem avançou, se a partida seguinte não foi jogada", () => {
    let chave = registrarResultado(chave4(), "ev_r1_p0", { golsA: 2, golsB: 0 });
    chave = registrarResultado(chave, "ev_r1_p0", { golsA: 0, golsB: 2 });
    expect(partida(chave, 2, 0).inscricaoA).toBe("t2");
  });

  it("não corrige se a partida seguinte já tem resultado", () => {
    let chave = registrarResultado(chave4(), "ev_r1_p0", { golsA: 2, golsB: 0 });
    chave = registrarResultado(chave, "ev_r1_p1", { golsA: 1, golsB: 0 });
    chave = registrarResultado(chave, "ev_r2_p0", { golsA: 1, golsB: 0 });
    expect(() => registrarResultado(chave, "ev_r1_p0", { golsA: 0, golsB: 1 })).toThrow("proxima_partida_ja_jogada");
  });

  it("não altera um bye", () => {
    const chave = gerarChave("ev", times(3));
    expect(() => registrarResultado(chave, "ev_r1_p0", { woDe: "b" })).toThrow("partida_incompleta");
  });

  it("não modifica a lista recebida", () => {
    const original = chave4();
    registrarResultado(original, "ev_r1_p0", { golsA: 1, golsB: 0 });
    expect(partida(original, 1, 0).vencedor).toBeNull();
  });
});

describe("desfazerResultado", () => {
  it("limpa o resultado e tira o vencedor da partida seguinte", () => {
    let chave = registrarResultado(gerarChave("ev", times(4)), "ev_r1_p0", { golsA: 2, golsB: 1 });
    chave = desfazerResultado(chave, "ev_r1_p0");
    expect(partida(chave, 1, 0)).toMatchObject({ vencedor: null, resultado: null, golsA: null, golsB: null });
    expect(partida(chave, 2, 0).inscricaoA).toBeNull();
  });

  it("não desfaz se a seguinte já foi jogada nem desfaz bye", () => {
    let chave = gerarChave("ev", times(4));
    chave = registrarResultado(chave, "ev_r1_p0", { golsA: 1, golsB: 0 });
    chave = registrarResultado(chave, "ev_r1_p1", { golsA: 1, golsB: 0 });
    chave = registrarResultado(chave, "ev_r2_p0", { golsA: 1, golsB: 0 });
    expect(() => desfazerResultado(chave, "ev_r1_p0")).toThrow("proxima_partida_ja_jogada");
    expect(() => desfazerResultado(gerarChave("ev", times(3)), "ev_r1_p0")).toThrow("bye_nao_desfaz");
  });
});

describe("campeao e nomes das rodadas", () => {
  it("campeão é o vencedor da final", () => {
    let chave = gerarChave("ev", times(3));
    expect(campeao(chave)).toBeNull();
    chave = registrarResultado(chave, "ev_r1_p1", { golsA: 0, golsB: 1 });
    chave = registrarResultado(chave, "ev_r2_p0", { golsA: 0, golsB: 4 });
    expect(campeao(chave)).toBe("t3");
  });

  it("nomes das rodadas a partir do fim", () => {
    expect(nomeDaRodada(4, 4)).toBe("Final");
    expect(nomeDaRodada(3, 4)).toBe("Semifinal");
    expect(nomeDaRodada(2, 4)).toBe("Quartas de final");
    expect(nomeDaRodada(1, 4)).toBe("Oitavas de final");
  });

  it("embaralhar mantém os mesmos itens e usa o sorteio informado", () => {
    const resultado = embaralhar(["a", "b", "c"], () => 0);
    expect([...resultado].sort()).toEqual(["a", "b", "c"]);
    expect(resultado).toEqual(["b", "c", "a"]);
  });
});

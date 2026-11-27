/**
 * Chave de mata-mata: geração com byes, registro de resultados e campeão.
 * Funções puras; quem persiste é o repositório.
 *
 * Spec: SPEC/2026-11-27-eventos-e-torneios.md
 */

import type { EntradaResultado, PartidaEvento } from "./types";

/** Embaralha (Fisher-Yates) sem alterar a lista recebida. */
export function embaralhar<T>(lista: readonly T[], aleatorio: () => number = Math.random): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function idPartida(eventoId: string, rodada: number, posicao: number): string {
  return `${eventoId}_r${rodada}_p${posicao}`;
}

function partidaVazia(eventoId: string, rodada: number, posicao: number): PartidaEvento {
  return {
    id: idPartida(eventoId, rodada, posicao),
    eventoId,
    rodada,
    posicao,
    inscricaoA: null,
    inscricaoB: null,
    golsA: null,
    golsB: null,
    vencedor: null,
    resultado: null,
  };
}

/** Coloca (ou retira, com `null`) o vencedor na vaga dele da partida seguinte. */
function levarParaProxima(partidas: PartidaEvento[], origem: PartidaEvento, time: string | null) {
  const proxima = partidas.find(
    (p) => p.rodada === origem.rodada + 1 && p.posicao === Math.floor(origem.posicao / 2)
  );
  if (!proxima) return;
  if (origem.posicao % 2 === 0) proxima.inscricaoA = time;
  else proxima.inscricaoB = time;
}

function proximaJaJogada(partidas: PartidaEvento[], origem: PartidaEvento): boolean {
  const proxima = partidas.find(
    (p) => p.rodada === origem.rodada + 1 && p.posicao === Math.floor(origem.posicao / 2)
  );
  return Boolean(proxima?.resultado);
}

/**
 * Gera a chave a partir da ordem do sorteio. O tamanho é a próxima potência de
 * 2; as vagas que sobram viram byes para os primeiros sorteados. Como há mais
 * times do que metade das vagas, nunca sobra partida de bye contra bye.
 */
export function gerarChave(eventoId: string, inscricoes: readonly string[]): PartidaEvento[] {
  const n = inscricoes.length;
  if (n < 2) throw new Error("minimo_2_times");
  if (n > 16) throw new Error("maximo_16_times");

  const tamanho = 2 ** Math.ceil(Math.log2(n));
  const totalRodadas = Math.log2(tamanho);
  const byes = tamanho - n;

  const partidas: PartidaEvento[] = [];
  for (let rodada = 1; rodada <= totalRodadas; rodada++) {
    for (let posicao = 0; posicao < tamanho / 2 ** rodada; posicao++) {
      partidas.push(partidaVazia(eventoId, rodada, posicao));
    }
  }

  let proximo = 0;
  for (const p of partidas.filter((x) => x.rodada === 1)) {
    p.inscricaoA = inscricoes[proximo++];
    if (p.posicao < byes) {
      p.vencedor = p.inscricaoA;
      p.resultado = "bye";
      levarParaProxima(partidas, p, p.inscricaoA);
    } else {
      p.inscricaoB = inscricoes[proximo++];
    }
  }

  return partidas;
}

/** Registra placar, pênaltis ou W.O. e leva o vencedor para a partida seguinte. */
export function registrarResultado(
  partidas: readonly PartidaEvento[],
  partidaId: string,
  entrada: EntradaResultado
): PartidaEvento[] {
  const copia = partidas.map((p) => ({ ...p }));
  const alvo = copia.find((p) => p.id === partidaId);
  if (!alvo || !alvo.inscricaoA || !alvo.inscricaoB || alvo.resultado === "bye") {
    throw new Error("partida_incompleta");
  }
  if (alvo.resultado && proximaJaJogada(copia, alvo)) throw new Error("proxima_partida_ja_jogada");

  if (entrada.woDe) {
    alvo.golsA = null;
    alvo.golsB = null;
    alvo.resultado = "wo";
    alvo.vencedor = entrada.woDe === "a" ? alvo.inscricaoB : alvo.inscricaoA;
  } else {
    const { golsA, golsB, vencedorPenaltis } = entrada;
    if (![golsA, golsB].every((g) => Number.isInteger(g) && g >= 0)) throw new Error("placar_invalido");
    if (golsA === golsB && !vencedorPenaltis) throw new Error("empate_exige_penaltis");
    if (golsA !== golsB && vencedorPenaltis) throw new Error("penaltis_so_com_empate");

    const ladoVencedor = vencedorPenaltis ?? (golsA > golsB ? "a" : "b");
    alvo.golsA = golsA;
    alvo.golsB = golsB;
    alvo.resultado = vencedorPenaltis ? "penaltis" : "placar";
    alvo.vencedor = ladoVencedor === "a" ? alvo.inscricaoA : alvo.inscricaoB;
  }

  levarParaProxima(copia, alvo, alvo.vencedor);
  return copia;
}

/** Apaga o resultado e tira o vencedor da partida seguinte. */
export function desfazerResultado(partidas: readonly PartidaEvento[], partidaId: string): PartidaEvento[] {
  const copia = partidas.map((p) => ({ ...p }));
  const alvo = copia.find((p) => p.id === partidaId);
  if (!alvo || !alvo.resultado) return copia;
  if (alvo.resultado === "bye") throw new Error("bye_nao_desfaz");
  if (proximaJaJogada(copia, alvo)) throw new Error("proxima_partida_ja_jogada");

  alvo.golsA = null;
  alvo.golsB = null;
  alvo.vencedor = null;
  alvo.resultado = null;
  levarParaProxima(copia, alvo, null);
  return copia;
}

/** Vencedor da final, ou `null` enquanto a final não foi jogada. */
export function campeao(partidas: readonly PartidaEvento[]): string | null {
  if (partidas.length === 0) return null;
  const ultimaRodada = Math.max(...partidas.map((p) => p.rodada));
  return partidas.find((p) => p.rodada === ultimaRodada)?.vencedor ?? null;
}

const NOMES_A_PARTIR_DO_FIM = ["Final", "Semifinal", "Quartas de final", "Oitavas de final"];

export function nomeDaRodada(rodada: number, totalRodadas: number): string {
  return NOMES_A_PARTIR_DO_FIM[totalRodadas - rodada] ?? `${rodada}ª rodada`;
}

/**
 * Chave de mata-mata em colunas por rodada. Com `onLancar`, cada partida
 * ganha o formulário de resultado do admin.
 *
 * Spec: SPEC/2026-11-27-eventos-e-torneios.md
 */

"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import { nomeDaRodada } from "@/lib/eventos/chave";
import type { EntradaResultado, PartidaEvento } from "@/lib/eventos/types";

interface ChaveTorneioProps {
  partidas: PartidaEvento[];
  nomes: Record<string, string>;
  onLancar?: (partidaId: string, entrada: EntradaResultado | "desfazer") => void;
}

export function ChaveTorneio({ partidas, nomes, onLancar }: ChaveTorneioProps) {
  if (partidas.length === 0) {
    return <p className="text-sm text-slate-400">A chave ainda não foi sorteada.</p>;
  }

  const totalRodadas = Math.max(...partidas.map((p) => p.rodada));
  const rodadas = Array.from({ length: totalRodadas }, (_, i) =>
    partidas.filter((p) => p.rodada === i + 1).sort((a, b) => a.posicao - b.posicao)
  );

  return (
    <div className="flex gap-4 overflow-x-auto pb-2" aria-label="Chave do torneio">
      {rodadas.map((lista, i) => (
        <section key={i} className="min-w-[220px] flex-1 space-y-3" aria-label={nomeDaRodada(i + 1, totalRodadas)}>
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            {nomeDaRodada(i + 1, totalRodadas)}
          </h4>
          {lista.map((p) => (
            <CartaoPartida key={p.id} partida={p} nomes={nomes} onLancar={onLancar} />
          ))}
        </section>
      ))}
    </div>
  );
}

function CartaoPartida({
  partida,
  nomes,
  onLancar,
}: {
  partida: PartidaEvento;
  nomes: Record<string, string>;
  onLancar?: ChaveTorneioProps["onLancar"];
}) {
  const nome = (id: string | null) => (id ? nomes[id] ?? "Time" : "A definir");
  const linha = (id: string | null, gols: number | null) => (
    <div className={`flex justify-between gap-2 ${partida.vencedor && partida.vencedor === id ? "font-bold text-white" : "text-slate-300"}`}>
      <span className="truncate">
        {partida.vencedor && partida.vencedor === id && <Trophy className="mr-1 inline h-3 w-3 text-amber-400" aria-label="Vencedor" />}
        {nome(id)}
      </span>
      <span>{gols ?? ""}</span>
    </div>
  );

  const rotulo: Record<string, string> = { bye: "Avançou sem jogar", wo: "W.O.", penaltis: "Pênaltis" };
  const podeLancar = onLancar && partida.inscricaoA && partida.inscricaoB && partida.resultado !== "bye";

  return (
    <article className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-sm" data-testid={`partida-${partida.id}`}>
      {linha(partida.inscricaoA, partida.golsA)}
      {partida.resultado !== "bye" && linha(partida.inscricaoB, partida.golsB)}
      {partida.resultado && rotulo[partida.resultado] && (
        <p className="mt-1 text-[11px] text-slate-500">{rotulo[partida.resultado]}</p>
      )}
      {podeLancar && <FormularioResultado partida={partida} nomes={nomes} onLancar={onLancar} />}
    </article>
  );
}

function FormularioResultado({
  partida,
  nomes,
  onLancar,
}: {
  partida: PartidaEvento;
  nomes: Record<string, string>;
  onLancar: NonNullable<ChaveTorneioProps["onLancar"]>;
}) {
  const [golsA, setGolsA] = useState(partida.golsA?.toString() ?? "");
  const [golsB, setGolsB] = useState(partida.golsB?.toString() ?? "");
  const [penaltis, setPenaltis] = useState<"" | "a" | "b">("");
  const empate = golsA !== "" && golsA === golsB;
  const campo = "w-14 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-white";

  const salvar = () =>
    onLancar(partida.id, {
      golsA: Number(golsA),
      golsB: Number(golsB),
      ...(empate && penaltis ? { vencedorPenaltis: penaltis } : {}),
    });

  return (
    <div className="mt-2 space-y-2 border-t border-slate-800 pt-2">
      <div className="flex items-center gap-2">
        <input aria-label={`Gols de ${nomes[partida.inscricaoA!]}`} type="number" min={0} value={golsA} onChange={(e) => setGolsA(e.target.value)} className={campo} />
        <span className="text-slate-500">x</span>
        <input aria-label={`Gols de ${nomes[partida.inscricaoB!]}`} type="number" min={0} value={golsB} onChange={(e) => setGolsB(e.target.value)} className={campo} />
      </div>
      {empate && (
        <select aria-label="Vencedor nos pênaltis" value={penaltis} onChange={(e) => setPenaltis(e.target.value as "" | "a" | "b")} className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-white">
          <option value="">Vencedor nos pênaltis…</option>
          <option value="a">{nomes[partida.inscricaoA!]}</option>
          <option value="b">{nomes[partida.inscricaoB!]}</option>
        </select>
      )}
      <div className="flex flex-wrap gap-1 text-xs">
        <button type="button" onClick={salvar} disabled={golsA === "" || golsB === ""} className="rounded-md bg-emerald-600 px-2 py-1 font-semibold text-white disabled:opacity-40">
          Salvar placar
        </button>
        <button type="button" onClick={() => onLancar(partida.id, { woDe: "a" })} className="rounded-md bg-slate-700 px-2 py-1 text-slate-200">
          W.O. de {nomes[partida.inscricaoA!]}
        </button>
        <button type="button" onClick={() => onLancar(partida.id, { woDe: "b" })} className="rounded-md bg-slate-700 px-2 py-1 text-slate-200">
          W.O. de {nomes[partida.inscricaoB!]}
        </button>
        {partida.resultado && (
          <button type="button" onClick={() => onLancar(partida.id, "desfazer")} className="rounded-md bg-red-900/60 px-2 py-1 text-red-200">
            Desfazer
          </button>
        )}
      </div>
    </div>
  );
}

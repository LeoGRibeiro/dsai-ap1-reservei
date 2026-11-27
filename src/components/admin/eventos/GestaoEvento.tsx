/**
 * Gestão de um evento pelo admin: publicar, cancelar, inscrições, sorteio e
 * resultados da chave.
 *
 * Spec: SPEC/2026-11-27-eventos-e-torneios.md
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ChaveTorneio } from "@/components/eventos/ChaveTorneio";
import type { EntradaResultado, Evento, InscricaoEvento, PartidaEvento } from "@/lib/eventos/types";
import type { useEventosAdmin } from "@/hooks/useEventosService";

type AcoesAdmin = ReturnType<typeof useEventosAdmin>;

const ROTULO_STATUS: Record<Evento["status"], string> = {
  rascunho: "Rascunho",
  publicado: "Publicado",
  chave_sorteada: "Chave sorteada",
  encerrado: "Encerrado",
  cancelado: "Cancelado",
};

export function GestaoEvento({ evento, acoes, onEditar }: { evento: Evento; acoes: AcoesAdmin; onEditar: () => void }) {
  const [inscricoes, setInscricoes] = useState<InscricaoEvento[]>([]);
  const [partidas, setPartidas] = useState<PartidaEvento[]>([]);
  const { listarInscricoes, listarPartidas } = acoes;

  const buscar = useCallback(
    () => Promise.all([listarInscricoes(evento.id), listarPartidas(evento.id)]),
    [evento.id, listarInscricoes, listarPartidas]
  );

  const recarregar = useCallback(async () => {
    const [lista, chave] = await buscar();
    setInscricoes(lista);
    setPartidas(chave);
  }, [buscar]);

  useEffect(() => {
    let ativo = true;
    void buscar().then(([lista, chave]) => {
      if (!ativo) return;
      setInscricoes(lista);
      setPartidas(chave);
    });
    return () => {
      ativo = false;
    };
  }, [buscar]);

  const avisar = (r: { ok: true } | { ok: false; erro: string }, sucesso: string) => {
    if (r.ok) toast.success(sucesso);
    else toast.error("Não foi possível concluir", { description: r.erro });
    return r.ok;
  };

  const confirmados = inscricoes.filter((i) => i.confirmada).length;
  const nomes = Object.fromEntries(inscricoes.map((i) => [i.id, i.nomeTime]));

  const lancar = async (partidaId: string, entrada: EntradaResultado | "desfazer") => {
    const r = await acoes.alterarResultado(evento, partidas, partidaId, entrada);
    if (r.ok) setPartidas(r.partidas);
    else toast.error("Resultado não salvo", { description: r.erro });
  };

  return (
    <section className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-5" aria-label={`Gestão de ${evento.nome}`}>
      <header className="flex flex-wrap items-center gap-2">
        <h3 className="mr-auto text-lg font-bold text-white">{evento.nome}</h3>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">{ROTULO_STATUS[evento.status]}</span>
        {evento.status === "rascunho" && (
          <>
            <button type="button" onClick={onEditar} className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-slate-200">Editar</button>
            <button type="button" onClick={async () => avisar(await acoes.publicar(evento), "Evento publicado e quadra bloqueada.")} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white">
              Publicar
            </button>
          </>
        )}
        {(evento.status === "rascunho" || evento.status === "publicado") && (
          <button
            type="button"
            onClick={async () => {
              if (window.confirm("Cancelar o evento e liberar a quadra?")) avisar(await acoes.cancelar(evento), "Evento cancelado.");
            }}
            className="rounded-lg bg-red-900/60 px-3 py-1.5 text-sm text-red-200"
          >
            Cancelar evento
          </button>
        )}
      </header>

      {evento.tipo === "torneio" && (
        <>
          <div>
            <h4 className="mb-2 text-sm font-semibold text-slate-200">
              Inscrições ({inscricoes.length}{evento.maxTimes ? ` de ${evento.maxTimes}` : ""}) · {confirmados} confirmadas
            </h4>
            {inscricoes.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhuma inscrição ainda.</p>
            ) : (
              <ul className="divide-y divide-slate-800 text-sm">
                {inscricoes.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center gap-2 py-2">
                    <span className="mr-auto text-white">{i.nomeTime}</span>
                    <span className="text-slate-400">{i.responsavelNome} · {i.responsavelWhatsapp}</span>
                    {evento.status === "publicado" && (
                      <>
                        <button
                          type="button"
                          onClick={async () => {
                            if (avisar(await acoes.confirmarInscricao(i.id, !i.confirmada), i.confirmada ? "Confirmação retirada." : "Inscrição confirmada.")) await recarregar();
                          }}
                          className={`rounded-md px-2 py-1 text-xs ${i.confirmada ? "bg-emerald-700 text-white" : "bg-slate-700 text-slate-200"}`}
                        >
                          {i.confirmada ? `Confirmada: desfazer (${i.nomeTime})` : `Confirmar pagamento (${i.nomeTime})`}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm(`Remover a inscrição de ${i.nomeTime}?`) && avisar(await acoes.removerInscricao(i.id), "Inscrição removida.")) await recarregar();
                          }}
                          className="rounded-md bg-red-900/60 px-2 py-1 text-xs text-red-200"
                        >
                          Remover
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {evento.status === "publicado" && (
            <button
              type="button"
              disabled={confirmados < 2}
              title={confirmados < 2 ? "É preciso ter pelo menos 2 times confirmados." : undefined}
              onClick={async () => {
                if (!window.confirm("Sortear a chave? As inscrições serão fechadas.")) return;
                if (avisar(await acoes.sortearChave(evento, inscricoes), "Chave sorteada.")) await recarregar();
              }}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              Sortear chave ({confirmados} times)
            </button>
          )}

          {(evento.status === "chave_sorteada" || evento.status === "encerrado") && (
            <ChaveTorneio partidas={partidas} nomes={nomes} onLancar={evento.status === "chave_sorteada" ? lancar : undefined} />
          )}
        </>
      )}
    </section>
  );
}

/**
 * Seção "Avaliações" da landing: nota média e depoimentos aprovados.
 * Spec: SPEC/2026-11-27-avaliacoes-de-clientes.md
 */

"use client";

import { ExternalLink, Quote } from "lucide-react";
import { SECAO_IDS } from "@/lib/landingPage/secoes";
import { getSecaoPorId } from "@/lib/landingPage/navegacao";
import { useAvaliacoesLanding } from "@/hooks/useAvaliacoes";
import { Estrelas } from "@/components/avaliacoes/Estrelas";
import { SecaoLanding } from "./SecaoLanding";

const formatarMedia = (media: number) =>
  media.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function SecaoAvaliacoes() {
  const secao = getSecaoPorId(SECAO_IDS.AVALIACOES);
  const { resumo, carregando, urlGoogle } = useAvaliacoesLanding();
  if (!secao) return null;

  return (
    <SecaoLanding secao={secao}>
      {carregando ? (
        <p className="text-sm text-slate-400">Carregando avaliações…</p>
      ) : resumo.media === null ? (
        <p className="text-sm text-slate-400">
          Ainda não há avaliações publicadas. Jogou com a gente? Avalie sua reserva na sua conta.
        </p>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <span className="text-4xl font-black text-white">{formatarMedia(resumo.media)}</span>
            <Estrelas nota={resumo.media} className="h-6 w-6" />
            <span className="text-sm text-slate-400">
              {resumo.total} {resumo.total === 1 ? "avaliação" : "avaliações"}
            </span>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resumo.recentes.map((a) => (
              <li key={a.id} className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <Estrelas nota={a.nota} />
                {a.comentario && (
                  <p className="flex gap-2 text-sm text-slate-200">
                    <Quote className="h-4 w-4 shrink-0 text-slate-600" aria-hidden="true" />
                    {a.comentario}
                  </p>
                )}
                <p className="mt-auto text-xs font-semibold text-slate-400">{a.nomeExibicao}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      {urlGoogle && (
        <a
          href={urlGoogle}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
        >
          Avalie-nos no Google
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      )}
    </SecaoLanding>
  );
}

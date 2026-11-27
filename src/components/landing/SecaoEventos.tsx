/**
 * Seção "Eventos" da landing: próximos eventos e o último campeão.
 * Spec: SPEC/2026-11-27-eventos-e-torneios.md
 */

"use client";

import Link from "next/link";
import { CalendarDays, Clock, Trophy } from "lucide-react";
import { SECAO_IDS } from "@/lib/landingPage/secoes";
import { getSecaoPorId } from "@/lib/landingPage/navegacao";
import { formatarDataExibicao, formatarMoeda } from "@/lib/constants";
import { useEventosLanding } from "@/hooks/useEventosService";
import type { Evento } from "@/lib/eventos/types";
import { SecaoLanding } from "./SecaoLanding";

export function SecaoEventos() {
  const secao = getSecaoPorId(SECAO_IDS.EVENTOS);
  const { proximos, ultimoEncerrado, nomeCampeao, carregando } = useEventosLanding();
  if (!secao) return null;

  return (
    <SecaoLanding secao={secao}>
      {ultimoEncerrado && nomeCampeao && (
        <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
          <Trophy className="h-4 w-4" aria-hidden="true" />
          Último campeão: <strong>{nomeCampeao}</strong> — {ultimoEncerrado.nome}
        </p>
      )}

      {carregando ? (
        <p className="text-sm text-slate-400">Carregando eventos…</p>
      ) : proximos.length === 0 ? (
        <p className="text-sm text-slate-400">
          Nenhum evento programado no momento. Volte em breve para conferir os próximos torneios.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {proximos.map((evento) => (
            <li key={evento.id}>
              <CartaoEvento evento={evento} />
            </li>
          ))}
        </ul>
      )}
    </SecaoLanding>
  );
}

function CartaoEvento({ evento }: { evento: Evento }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
      {evento.bannerUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- imagem do bucket do Supabase, tamanho variável
        <img src={evento.bannerUrl} alt={`Banner de ${evento.nome}`} className="h-36 w-full object-cover" loading="lazy" />
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="w-fit rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
          {evento.tipo === "torneio" ? "Torneio" : "Evento"}
          {evento.status === "chave_sorteada" && " · chave sorteada"}
        </span>
        <h3 className="text-lg font-bold text-white">{evento.nome}</h3>
        <p className="flex items-center gap-2 text-sm text-slate-300">
          <CalendarDays className="h-4 w-4 text-slate-500" aria-hidden="true" />
          {formatarDataExibicao(evento.data, { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <p className="flex items-center gap-2 text-sm text-slate-300">
          <Clock className="h-4 w-4 text-slate-500" aria-hidden="true" />
          {evento.horaInicio} às {evento.horaFim}
        </p>
        <p className="text-sm text-slate-400">
          {evento.valorInscricao > 0 ? `Inscrição: ${formatarMoeda(evento.valorInscricao)} (pago no local)` : "Participação gratuita"}
        </p>
        <Link
          href={`/eventos/${evento.id}`}
          className="mt-auto inline-flex justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          {evento.tipo === "torneio" ? "Ver torneio e inscrição" : "Ver detalhes"}
        </Link>
      </div>
    </article>
  );
}

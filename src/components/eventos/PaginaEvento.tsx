/**
 * Página pública do evento: detalhes, inscrição de time e chave.
 * Spec: SPEC/2026-11-27-eventos-e-torneios.md
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, CalendarDays, Clock, MapPin } from "lucide-react";
import { formatarDataExibicao, formatarMoeda } from "@/lib/constants";
import { QUADRAS } from "@/lib/quadras";
import { useEventoPublico } from "@/hooks/useEventosService";
import { ChaveTorneio } from "./ChaveTorneio";

export function PaginaEvento({ eventoId }: { eventoId: string }) {
  const { evento, times, partidas, minhaInscricao, situacao, carregando, logado, inscrever, desistir } =
    useEventoPublico(eventoId);
  const [nomeTime, setNomeTime] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (carregando) return <Moldura><p className="text-slate-400">Carregando evento…</p></Moldura>;
  if (!evento) {
    return (
      <Moldura>
        <p className="text-slate-300">Evento não encontrado.</p>
      </Moldura>
    );
  }

  const quadra = QUADRAS.find((q) => q.id === evento.quadraId);
  const nomes = Object.fromEntries(times.map((t) => [t.id, t.nomeTime]));

  const handleInscrever = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    const r = await inscrever(nomeTime);
    setEnviando(false);
    if (r.ok) {
      toast.success("Time inscrito!", { description: "A vaga é confirmada pelo complexo após o pagamento no local." });
      setNomeTime("");
    } else {
      toast.error("Inscrição não concluída", { description: r.erro });
    }
  };

  const handleDesistir = async () => {
    const r = await desistir();
    if (r.ok) toast.success("Inscrição cancelada.");
    else toast.error("Não foi possível cancelar", { description: r.erro });
  };

  return (
    <Moldura>
      {evento.bannerUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- imagem do bucket do Supabase
        <img src={evento.bannerUrl} alt={`Banner de ${evento.nome}`} className="mb-6 h-48 w-full rounded-2xl object-cover" />
      )}
      <h1 className="text-3xl font-black text-white">{evento.nome}</h1>
      {evento.status === "cancelado" && (
        <p className="mt-2 inline-block rounded-full bg-red-500/15 px-3 py-1 text-sm font-semibold text-red-300">Cancelado</p>
      )}

      <ul className="mt-4 space-y-1 text-sm text-slate-300">
        <li className="flex items-center gap-2"><CalendarDays className="h-4 w-4" aria-hidden="true" />{formatarDataExibicao(evento.data, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</li>
        <li className="flex items-center gap-2"><Clock className="h-4 w-4" aria-hidden="true" />{evento.horaInicio} às {evento.horaFim}</li>
        {quadra && <li className="flex items-center gap-2"><MapPin className="h-4 w-4" aria-hidden="true" />Quadra {quadra.numero}</li>}
        <li>{evento.valorInscricao > 0 ? `Inscrição: ${formatarMoeda(evento.valorInscricao)}, paga no local` : "Participação gratuita"}</li>
      </ul>

      {evento.descricao && <p className="mt-4 whitespace-pre-line text-slate-300">{evento.descricao}</p>}
      {evento.regras && (
        <section className="mt-6">
          <h2 className="text-lg font-bold text-white">Regras</h2>
          <p className="mt-1 whitespace-pre-line text-sm text-slate-300">{evento.regras}</p>
        </section>
      )}

      {evento.tipo === "torneio" && (
        <>
          <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-5" aria-labelledby="inscricao-titulo">
            <h2 id="inscricao-titulo" className="text-lg font-bold text-white">Inscrição do time</h2>
            {minhaInscricao ? (
              <div className="mt-2 space-y-2 text-sm text-slate-300">
                <p>
                  Seu time <strong className="text-white">{minhaInscricao.nomeTime}</strong> está inscrito
                  {minhaInscricao.confirmada ? " e confirmado." : ". A confirmação sai após o pagamento no local."}
                </p>
                {evento.status === "publicado" && (
                  <button type="button" onClick={handleDesistir} className="text-red-300 underline">Cancelar inscrição</button>
                )}
              </div>
            ) : situacao && !situacao.aberta ? (
              <p className="mt-2 text-sm text-slate-400">{situacao.motivo}</p>
            ) : !logado ? (
              <p className="mt-2 text-sm text-slate-300">
                <Link href="/login" className="font-semibold text-emerald-400 underline">Entre na sua conta</Link> para inscrever um time.
              </p>
            ) : (
              <form onSubmit={handleInscrever} className="mt-3 flex flex-col gap-2 sm:flex-row">
                <label htmlFor="nome-time" className="sr-only">Nome do time</label>
                <input id="nome-time" value={nomeTime} onChange={(e) => setNomeTime(e.target.value)} placeholder="Nome do time" maxLength={40} className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-white" />
                <button type="submit" disabled={enviando} className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-50">
                  {enviando ? "Enviando…" : "Inscrever time"}
                </button>
              </form>
            )}
          </section>

          <section className="mt-8" aria-labelledby="times-titulo">
            <h2 id="times-titulo" className="text-lg font-bold text-white">Times confirmados ({times.length})</h2>
            {times.length === 0 ? (
              <p className="mt-1 text-sm text-slate-400">Nenhum time confirmado ainda.</p>
            ) : (
              <ul className="mt-2 flex flex-wrap gap-2">{times.map((t) => <li key={t.id} className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-200">{t.nomeTime}</li>)}</ul>
            )}
          </section>

          <section className="mt-8" aria-labelledby="chave-titulo">
            <h2 id="chave-titulo" className="mb-3 text-lg font-bold text-white">Chave</h2>
            <ChaveTorneio partidas={partidas} nomes={nomes} />
          </section>
        </>
      )}
    </Moldura>
  );
}

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/#eventos" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar para os eventos
        </Link>
        {children}
      </div>
    </main>
  );
}

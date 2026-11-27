/**
 * Formulário de cadastro e edição de evento (só em rascunho).
 * Spec: SPEC/2026-11-27-eventos-e-torneios.md
 */

"use client";

import { useState } from "react";
import { HORARIOS_DISPONIVEIS, QUADRAS } from "@/lib/quadras";
import { uploadImagemInstitucional } from "@/lib/supabase/institucionalRepository";
import type { Evento, TipoEvento } from "@/lib/eventos/types";

export type DadosFormularioEvento = Omit<Evento, "id" | "status" | "reservasBloqueio"> & { id?: string };

interface Props {
  inicial?: Evento;
  onSalvar: (dados: DadosFormularioEvento) => Promise<{ ok: true } | { ok: false; erro: string }>;
  onCancelar: () => void;
}

const HORAS_FIM = [...HORARIOS_DISPONIVEIS.slice(1), "22:00"];

export function FormularioEvento({ inicial, onSalvar, onCancelar }: Props) {
  const [dados, setDados] = useState<DadosFormularioEvento>(
    inicial ?? {
      tipo: "torneio",
      nome: "",
      data: "",
      horaInicio: "18:00",
      horaFim: "22:00",
      quadraId: QUADRAS[0].id,
      valorInscricao: 0,
      maxTimes: 8,
    }
  );
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const campo = <K extends keyof DadosFormularioEvento>(chave: K, valor: DadosFormularioEvento[K]) =>
    setDados((atual) => ({ ...atual, [chave]: valor }));

  const enviarBanner = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    const r = await uploadImagemInstitucional(arquivo, "eventos");
    if (r.success && r.url) campo("bannerUrl", r.url);
    else setErro(r.error ?? "Não foi possível enviar a imagem.");
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    const r = await onSalvar(dados);
    setSalvando(false);
    setErro(r.ok ? null : r.erro);
  };

  const estilo = "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white";
  const torneio = dados.tipo === "torneio";

  return (
    <form onSubmit={salvar} className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5" aria-label="Cadastro de evento">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-slate-300">Nome
          <input className={estilo} value={dados.nome} onChange={(e) => campo("nome", e.target.value)} />
        </label>
        <label className="text-xs text-slate-300">Tipo
          <select className={estilo} value={dados.tipo} onChange={(e) => campo("tipo", e.target.value as TipoEvento)}>
            <option value="torneio">Torneio (com inscrição e chave)</option>
            <option value="social">Evento social (só divulgação)</option>
          </select>
        </label>
        <label className="text-xs text-slate-300">Data
          <input type="date" className={estilo} value={dados.data} onChange={(e) => campo("data", e.target.value)} />
        </label>
        <label className="text-xs text-slate-300">Quadra
          <select className={estilo} value={dados.quadraId ?? ""} onChange={(e) => campo("quadraId", e.target.value || undefined)}>
            {QUADRAS.map((q) => <option key={q.id} value={q.id}>Quadra {q.numero}</option>)}
            <option value="">Sem quadra (fora das quadras)</option>
          </select>
        </label>
        <label className="text-xs text-slate-300">Início
          <select className={estilo} value={dados.horaInicio} onChange={(e) => campo("horaInicio", e.target.value)}>
            {HORARIOS_DISPONIVEIS.map((h) => <option key={h}>{h}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-300">Fim
          <select className={estilo} value={dados.horaFim} onChange={(e) => campo("horaFim", e.target.value)}>
            {HORAS_FIM.map((h) => <option key={h}>{h}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-300">Valor da inscrição (pago no local)
          <input type="number" min={0} step="0.01" className={estilo} value={dados.valorInscricao} onChange={(e) => campo("valorInscricao", Number(e.target.value))} />
        </label>
        {torneio && (
          <>
            <label className="text-xs text-slate-300">Máximo de times
              <select className={estilo} value={dados.maxTimes ?? 8} onChange={(e) => campo("maxTimes", Number(e.target.value) as 4 | 8 | 16)}>
                {[4, 8, 16].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label className="text-xs text-slate-300">Inscrições até
              <input type="date" className={estilo} value={dados.inscricoesAte ?? ""} onChange={(e) => campo("inscricoesAte", e.target.value || undefined)} />
            </label>
          </>
        )}
        <label className="text-xs text-slate-300">Esporte
          <input className={estilo} value={dados.esporte ?? ""} onChange={(e) => campo("esporte", e.target.value || undefined)} />
        </label>
      </div>
      <label className="block text-xs text-slate-300">Descrição
        <textarea className={estilo} rows={2} value={dados.descricao ?? ""} onChange={(e) => campo("descricao", e.target.value || undefined)} />
      </label>
      <label className="block text-xs text-slate-300">Regras
        <textarea className={estilo} rows={3} value={dados.regras ?? ""} onChange={(e) => campo("regras", e.target.value || undefined)} />
      </label>
      <label className="block text-xs text-slate-300">Banner (imagem)
        <input type="file" accept="image/*" className="mt-1 block text-sm text-slate-300" onChange={(e) => void enviarBanner(e.target.files?.[0])} />
      </label>

      {erro && <p role="alert" className="text-sm text-red-300">{erro}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={salvando} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {salvando ? "Salvando…" : "Salvar rascunho"}
        </button>
        <button type="button" onClick={onCancelar} className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-200">Fechar</button>
      </div>
    </form>
  );
}

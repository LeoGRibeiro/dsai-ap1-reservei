/**
 * Tela "Eventos" do painel admin.
 * Spec: SPEC/2026-11-27-eventos-e-torneios.md
 */

"use client";

import { useState } from "react";
import { Plus, Trophy } from "lucide-react";
import { toast } from "sonner";
import { formatarDataExibicao } from "@/lib/constants";
import { useEventosAdmin } from "@/hooks/useEventosService";
import { FormularioEvento } from "./eventos/FormularioEvento";
import { GestaoEvento } from "./eventos/GestaoEvento";

export function AdminEventosPage() {
  const acoes = useEventosAdmin();
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [editando, setEditando] = useState<"novo" | string | null>(null);

  const selecionado = acoes.eventos.find((e) => e.id === selecionadoId) ?? null;
  const emEdicao = editando && editando !== "novo" ? acoes.eventos.find((e) => e.id === editando) : undefined;

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <Trophy className="h-6 w-6 text-emerald-400" aria-hidden="true" />
        <h2 className="mr-auto text-2xl font-black text-white">Eventos e torneios</h2>
        <button type="button" onClick={() => setEditando("novo")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" aria-hidden="true" /> Novo evento
        </button>
      </header>

      {editando && (
        <FormularioEvento
          key={editando}
          inicial={emEdicao}
          onCancelar={() => setEditando(null)}
          onSalvar={async (dados) => {
            const r = await acoes.salvarRascunho(dados);
            if (r.ok) {
              toast.success("Rascunho salvo.");
              setEditando(null);
            }
            return r;
          }}
        />
      )}

      {acoes.carregando ? (
        <p className="text-sm text-slate-400">Carregando eventos…</p>
      ) : acoes.eventos.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhum evento cadastrado.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {acoes.eventos.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => setSelecionadoId(e.id)}
                aria-pressed={e.id === selecionadoId}
                className={`w-full rounded-xl border p-3 text-left ${e.id === selecionadoId ? "border-emerald-500 bg-emerald-500/10" : "border-slate-800 bg-slate-900/60"}`}
              >
                <span className="block font-semibold text-white">{e.nome}</span>
                <span className="text-xs text-slate-400">{formatarDataExibicao(e.data)} · {e.horaInicio} · {e.status.replace("_", " ")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selecionado && <GestaoEvento key={selecionado.id} evento={selecionado} acoes={acoes} onEditar={() => setEditando(selecionado.id)} />}
    </div>
  );
}

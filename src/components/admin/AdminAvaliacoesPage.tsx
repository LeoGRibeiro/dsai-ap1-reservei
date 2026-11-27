/**
 * Tela "Avaliações" do painel admin: moderação das avaliações dos clientes.
 * Spec: SPEC/2026-11-27-avaliacoes-de-clientes.md
 */

"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { useAvaliacoesAdmin } from "@/hooks/useAvaliacoes";
import { Estrelas } from "@/components/avaliacoes/Estrelas";
import type { StatusAvaliacao } from "@/lib/avaliacoes/types";

const ABAS: ReadonlyArray<{ status: StatusAvaliacao; rotulo: string }> = [
  { status: "pendente", rotulo: "Pendentes" },
  { status: "aprovada", rotulo: "Aprovadas" },
  { status: "oculta", rotulo: "Ocultas" },
];

export function AdminAvaliacoesPage() {
  const { avaliacoes, carregando, moderar } = useAvaliacoesAdmin();
  const [aba, setAba] = useState<StatusAvaliacao>("pendente");
  const visiveis = avaliacoes.filter((a) => a.status === aba);

  const alterar = async (id: string, status: StatusAvaliacao) => {
    const r = await moderar(id, status);
    if (r.ok) toast.success(status === "aprovada" ? "Avaliação publicada." : "Avaliação ocultada.");
    else toast.error("Moderação não salva", { description: r.erro });
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <Star className="h-6 w-6 text-amber-400" aria-hidden="true" />
        <h2 className="text-2xl font-black text-white">Avaliações</h2>
      </header>

      <div role="tablist" aria-label="Situação das avaliações" className="flex flex-wrap gap-2">
        {ABAS.map(({ status, rotulo }) => (
          <button
            key={status}
            type="button"
            role="tab"
            aria-selected={aba === status}
            onClick={() => setAba(status)}
            className={`rounded-lg px-3 py-1.5 text-sm ${aba === status ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-300"}`}
          >
            {rotulo} ({avaliacoes.filter((a) => a.status === status).length})
          </button>
        ))}
      </div>

      {carregando ? (
        <p className="text-sm text-slate-400">Carregando avaliações…</p>
      ) : visiveis.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhuma avaliação nesta situação.</p>
      ) : (
        <ul className="space-y-3">
          {visiveis.map((a) => (
            <li key={a.id} className="flex flex-wrap items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              <div className="mr-auto space-y-1">
                <Estrelas nota={a.nota} />
                <p className={`text-sm ${a.comentario ? "text-slate-200" : "italic text-slate-500"}`}>
                  {a.comentario ?? "Sem comentário"}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(a.criadaEm).toLocaleDateString("pt-BR")} · reserva {a.reservaId}
                </p>
              </div>
              {a.status !== "aprovada" && (
                <button type="button" onClick={() => alterar(a.id, "aprovada")} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white">
                  Aprovar
                </button>
              )}
              {a.status !== "oculta" && (
                <button type="button" onClick={() => alterar(a.id, "oculta")} className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-slate-200">
                  Ocultar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * BarraNavegacaoDia — Barra de navegação unificada de data para a Grade do Dia e a Timeline (Gantt).
 * Combina navegação por setas (anterior/próximo), calendário nativo e atalho Hoje em uma única barra segmentada elegante.
 */

"use client";

import React from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { formatarDataExibicao } from "@/lib/constants";

interface Props {
  data: string;
  onMudarData: (novaData: string) => void;
  subtitulo?: string;
  children?: React.ReactNode;
}

export function BarraNavegacaoDia({
  data,
  onMudarData,
  subtitulo,
  children,
}: Props) {
  function hojeLocal(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }

  function navDia(delta: number) {
    const [y, m, d] = data.split("-").map(Number);
    const atual = new Date(y, m - 1, d);
    atual.setDate(atual.getDate() + delta);
    const novoAno = atual.getFullYear();
    const novoMes = String(atual.getMonth() + 1).padStart(2, "0");
    const novoDia = String(atual.getDate()).padStart(2, "0");
    onMudarData(`${novoAno}-${novoMes}-${novoDia}`);
  }

  const isHoje = data === hojeLocal();

  return (
    <div className="bg-slate-900 border border-slate-700/60 rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between gap-4 shadow-xl overflow-x-auto scrollbar-hide">
      <div className="flex items-center gap-4 min-w-0 flex-shrink-0">
        {/* Controle Segmentado Único: [ < | 📅 Data | > | Hoje ] */}
        <div className="inline-flex items-center h-10 rounded-xl bg-slate-800/90 border border-slate-700/80 overflow-hidden divide-x divide-slate-700/80 shadow-sm flex-shrink-0">
          <button
            type="button"
            id="btn-agenda-dia-anterior"
            onClick={() => navDia(-1)}
            title="Dia anterior"
            className="h-full px-3 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <label
            htmlFor="input-agenda-data"
            title="Clique para escolher a data no calendário"
            className="flex items-center h-full px-3 gap-2 hover:bg-slate-700/40 transition-colors cursor-pointer group"
          >
            <CalendarIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400 transition-colors pointer-events-none" />
            <input
              type="date"
              id="input-agenda-data"
              value={data}
              onChange={(e) => {
                if (e.target.value) {
                  onMudarData(e.target.value);
                }
              }}
              className="bg-transparent border-0 p-0 text-xs font-semibold text-white font-mono focus:outline-none cursor-pointer [color-scheme:dark]"
            />
          </label>

          <button
            type="button"
            id="btn-agenda-proximo-dia"
            onClick={() => navDia(1)}
            title="Próximo dia"
            className="h-full px-3 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {!isHoje && (
            <button
              type="button"
              onClick={() => onMudarData(hojeLocal())}
              title="Voltar para a data de hoje"
              className="h-full px-3 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700/60 transition-colors cursor-pointer whitespace-nowrap"
            >
              Hoje
            </button>
          )}
        </div>

        {/* Informação Textual da Data */}
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-white leading-tight capitalize truncate">
            {formatarDataExibicao(data, {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </h2>
          {subtitulo && (
            <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">
              {subtitulo}
            </p>
          )}
        </div>
      </div>

      {/* Conteúdo à Direita (Botões de Ação) */}
      {children && (
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {children}
        </div>
      )}
    </div>
  );
}

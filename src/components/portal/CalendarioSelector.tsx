"use client";

import { cn } from "@/lib/utils";
import { formatarDataExibicao } from "@/lib/constants";

interface Props {
  dias: string[];           // lista de "YYYY-MM-DD"
  dataSelecionada: string;
  onSelectData: (data: string) => void;
}

export function CalendarioSelector({ dias, dataSelecionada, onSelectData }: Props) {
  const hoje = dias[0];

  return (
    <div className="w-full">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
        Escolha o dia
      </p>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
        {dias.map((dia) => {
          const isHoje = dia === hoje;
          const isSelecionado = dia === dataSelecionada;
          const [year, month, day] = dia.split("-").map(Number);
          const date = new Date(year, month - 1, day);
          const diaSemana = date
            .toLocaleDateString("pt-BR", { weekday: "short" })
            .replace(".", "")
            .toUpperCase();
          const diaMes = date.toLocaleDateString("pt-BR", {
            day: "numeric",
            month: "short",
          });

          return (
            <button
              key={dia}
              onClick={() => onSelectData(dia)}
              className={cn(
                "flex flex-col items-center justify-center min-w-[64px] h-[72px] rounded-2xl border text-center transition-all duration-200 snap-start flex-shrink-0",
                isSelecionado
                  ? "bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/30 scale-105"
                  : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-600"
              )}
            >
              <span className="text-[10px] font-bold tracking-wider opacity-70">
                {isHoje ? "HOJE" : diaSemana}
              </span>
              <span className="text-lg font-bold leading-tight">
                {date.getDate()}
              </span>
              <span className="text-[10px] opacity-70">
                {date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

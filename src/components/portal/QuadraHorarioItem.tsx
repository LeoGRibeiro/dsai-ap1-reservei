"use client";

import { cn } from "@/lib/utils";
import { type Quadra } from "@/lib/quadras";
import { HorarioGrid } from "./HorarioGrid";
import { type AvisoEscolinha } from "@/lib/recorrencia/agenda";

interface Props {
  quadra: Quadra;
  dataSelecionada: string;
  horariosSelecionados: string[];
  horariosOcupados: string[];
  /** Blocos de escolinha nesta quadra/data (exibe banner promocional) */
  avisosEscolinha?: AvisoEscolinha[];
  isAtiva: boolean; // esta quadra está com seleção ativa?
  onToggleHorario: (horario: string, quadraId: string) => void;
}

export function QuadraHorarioItem({
  quadra,
  dataSelecionada,
  horariosSelecionados,
  horariosOcupados,
  avisosEscolinha = [],
  isAtiva,
  onToggleHorario,
}: Props) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-5 transition-all duration-200",
        isAtiva
          ? "bg-slate-800/80 border-emerald-500/40 shadow-lg shadow-emerald-500/5"
          : "bg-slate-900/60 border-slate-800"
      )}
    >
      {/* ── Header da Quadra ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isAtiva && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          )}
          <h3 className="font-bold text-white text-base">
            Quadra {quadra.numero}
          </h3>
        </div>

        {isAtiva && horariosSelecionados.length > 0 && (
          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-full font-semibold flex-shrink-0">
            {horariosSelecionados.length}h selecionada{horariosSelecionados.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <HorarioGrid
        quadraId={quadra.id}
        dataSelecionada={dataSelecionada}
        horariosSelecionados={horariosSelecionados}
        horariosOcupados={horariosOcupados}
        avisosEscolinha={avisosEscolinha}
        onToggleHorario={(horario) => onToggleHorario(horario, quadra.id)}
      />
    </div>
  );
}

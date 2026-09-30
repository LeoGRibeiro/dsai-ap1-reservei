"use client";

import { cn } from "@/lib/utils";
import { HORARIOS_DISPONIVEIS } from "@/lib/quadras";
import { saoConsecutivos, isHorarioExpirado } from "@/lib/constants";
import { toast } from "sonner";

interface Props {
  dataSelecionada: string;
  horariosSelecionados: string[]; // slots selecionados NESTA quadra
  horariosOcupados: string[];     // slots já reservados (persistidos)
  onToggleHorario: (horario: string) => void;
}

// ─── Faixas de horário ────────────────────────────────────────────────────────

const FAIXA: Record<string, { label: string; faixaHora: string; cor: string }> = {
  MANHA: { label: "Manhã",  faixaHora: "08h – 12h", cor: "text-amber-400"  },
  TARDE: { label: "Tarde",  faixaHora: "12h – 18h", cor: "text-sky-400"    },
  NOITE: { label: "Noite",  faixaHora: "18h – 22h", cor: "text-violet-400" },
};

const PRECO_POR_FAIXA: Record<string, string> = {
  MANHA: "R$ 70 / hora",
  TARDE: "R$ 90 / hora",
  NOITE: "R$ 110 / hora",
};

function getFaixa(hora: number): "MANHA" | "TARDE" | "NOITE" {
  if (hora >= 8  && hora < 12) return "MANHA";
  if (hora >= 12 && hora < 18) return "TARDE";
  return "NOITE";
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function HorarioGrid({
  dataSelecionada,
  horariosSelecionados,
  horariosOcupados,
  onToggleHorario,
}: Props) {
  const handleClick = (horario: string) => {
    if (horariosOcupados.includes(horario)) return;
    if (isHorarioExpirado(dataSelecionada, horario, 10)) return;

    const isSelecionado = horariosSelecionados.includes(horario);
    if (!isSelecionado) {
      const proximo = [...horariosSelecionados, horario];
      if (!saoConsecutivos(proximo)) {
        toast.error("Selecione horários consecutivos", {
          description: "Ex: 13h → 14h → 15h. Não é possível pular horários.",
        });
        return;
      }
    }
    onToggleHorario(horario);
  };

  // Agrupar slots por faixa
  const grupos: Array<{ faixa: string; horarios: string[] }> = [];
  let faixaAtual = "";
  for (const h of HORARIOS_DISPONIVEIS) {
    const f = getFaixa(parseInt(h.split(":")[0], 10));
    if (f !== faixaAtual) {
      faixaAtual = f;
      grupos.push({ faixa: f, horarios: [] });
    }
    grupos[grupos.length - 1].horarios.push(h);
  }

  return (
    <div className="space-y-4">
      {grupos.map(({ faixa, horarios }) => (
        <div key={faixa}>
          {/* ── Label da faixa ── */}
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2.5">
            <span className={cn("text-xs font-bold uppercase tracking-wider", FAIXA[faixa].cor)}>
              {FAIXA[faixa].label}
            </span>
            <span className="text-base sm:text-lg font-black text-white">
              {PRECO_POR_FAIXA[faixa]}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              ({FAIXA[faixa].faixaHora})
            </span>
          </div>

          {/* ── Chips de horário ── */}
          <div className="flex flex-wrap gap-2">
            {horarios.map((horario) => {
              const hora = parseInt(horario.split(":")[0], 10);
              const isSelecionado = horariosSelecionados.includes(horario);
              const isOcupado = horariosOcupados.includes(horario);
              const expiradoParaSelecao = isHorarioExpirado(dataSelecionada, horario, 10);
              const isDisabled = isOcupado || expiradoParaSelecao;

              return (
                <button
                  key={horario}
                  onClick={() => handleClick(horario)}
                  disabled={isDisabled}
                  title={
                    isOcupado
                      ? "Horário ocupado"
                      : expiradoParaSelecao
                      ? "Horário indisponível"
                      : `${horario} – ${String(hora + 1).padStart(2, "0")}:00`
                  }
                  className={cn(
                    "px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-150 select-none",
                    isSelecionado
                      ? "bg-emerald-500/25 border-emerald-500 text-emerald-300 shadow-sm"
                      : isDisabled
                      ? "bg-slate-900/40 border-slate-800 text-slate-700 cursor-not-allowed line-through"
                      : "bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-600 active:scale-95"
                  )}
                >
                  {isSelecionado ? "✓ " : ""}
                  {horario}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

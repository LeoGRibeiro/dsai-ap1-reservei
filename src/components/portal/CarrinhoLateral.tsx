"use client";

import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  formatarMoeda,
  formatarDataExibicao,
  PERCENTUAL_SINAL,
  ENDERECO_COMPLEXO,
} from "@/lib/constants";
import { QUADRAS } from "@/lib/quadras";
import { ShoppingCart, MapPin, Calendar, Clock, Trash2 } from "lucide-react";

interface Props {
  quadraId: string | null;
  data: string;
  horariosSelecionados: string[];
  valorTotal: number;
  valorSinal: number;
  valorPendente: number;
  onContinuar: () => void;
  onLimpar: () => void;
  // Mobile: controla abertura do drawer
  isOpen?: boolean;
  onToggle?: () => void;
}

export function CarrinhoLateral({
  quadraId,
  data,
  horariosSelecionados,
  valorTotal,
  valorSinal,
  valorPendente,
  onContinuar,
  onLimpar,
}: Props) {
  const quadra = QUADRAS.find((q) => q.id === quadraId);
  const temItens = (horariosSelecionados ?? []).length > 0;

  const horariosOrdenados = [...(horariosSelecionados ?? [])].sort();
  const primeiroHorario = horariosOrdenados[0];
  const ultimoHorario = horariosOrdenados[horariosOrdenados.length - 1];
  const ultimaHora = ultimoHorario
    ? `${String(parseInt(ultimoHorario.split(":")[0]) + 1).padStart(2, "0")}:00`
    : "";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
          <ShoppingCart className="w-4 h-4 text-emerald-400" />
        </div>
        <h2 className="text-base font-bold text-white">Resumo da Reserva</h2>
      </div>

      {!temItens ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-4 opacity-50">
            <ShoppingCart className="w-7 h-7 text-slate-500" />
          </div>
          <p className="text-slate-500 text-sm leading-relaxed">
            Selecione uma quadra e horário ao lado para ver o resumo aqui.
          </p>
        </div>
      ) : (
        <>
          {/* Detalhes */}
          <div className="flex-1 space-y-4">
            {/* Local */}
            <div className="flex gap-3 items-start">
              <MapPin className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500 font-medium">Local</p>
                <p className="text-sm text-slate-200">{ENDERECO_COMPLEXO}</p>
                {quadra && (
                  <p className="text-xs text-emerald-400 font-semibold mt-0.5">
                    Quadra {quadra.numero}
                  </p>
                )}
              </div>
            </div>

            {/* Data */}
            <div className="flex gap-3 items-start">
              <Calendar className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500 font-medium">Data</p>
                <p className="text-sm text-slate-200 capitalize">
                  {formatarDataExibicao(data, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </p>
              </div>
            </div>

            {/* Horários */}
            <div className="flex gap-3 items-start">
              <Clock className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-slate-500 font-medium">Horário</p>
                <p className="text-sm text-slate-200">
                  {primeiroHorario} – {ultimaHora}
                  <span className="text-slate-500 ml-1">
                    ({horariosSelecionados.length}h)
                  </span>
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {horariosOrdenados.map((h) => (
                    <span
                      key={h}
                      className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <Separator className="bg-slate-700/50" />

            {/* Valores */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Valor total</span>
                <span className="text-white font-semibold">
                  {formatarMoeda(valorTotal)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">
                  Sinal ({Math.round(PERCENTUAL_SINAL * 100)}%)
                </span>
                <span className="text-emerald-400 font-bold">
                  {formatarMoeda(valorSinal)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Restante no dia</span>
                <span className="text-slate-300">
                  {formatarMoeda(valorPendente)}
                </span>
              </div>
            </div>

            {/* Aviso cancelamento */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
              <p className="text-[11px] text-amber-400 leading-relaxed">
                ⚠️ Cancelamentos com menos de 24h de antecedência não são
                reembolsados.
              </p>
            </div>
          </div>

          {/* Ações */}
          <div className="mt-6 space-y-2">
            <Button
              onClick={onContinuar}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold h-12 rounded-xl text-base shadow-lg shadow-emerald-500/20"
            >
              Continuar →
            </Button>
            <Button
              variant="ghost"
              onClick={onLimpar}
              className="w-full text-slate-500 hover:text-red-400 hover:bg-red-500/10 h-9 text-sm gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar seleção
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Botão flutuante para mobile ────────────────────────────────────────────────

interface BotaoCarrinhoProps {
  count: number;
  valorSinal: number;
  onClick: () => void;
}

export function BotaoCarrinhoMobile({ count, valorSinal, onClick }: BotaoCarrinhoProps) {
  if (count === 0) return null;
  return (
    <button
      onClick={onClick}
      className={cn(
        "md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40",
        "flex items-center gap-3 px-5 py-3.5 rounded-2xl",
        "bg-emerald-500 text-slate-950 font-bold shadow-2xl shadow-emerald-500/40",
        "transition-all duration-300 active:scale-95"
      )}
    >
      <div className="relative">
        <ShoppingCart className="w-5 h-5" />
        <span className="absolute -top-2 -right-2 bg-slate-950 text-emerald-400 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
          {count}
        </span>
      </div>
      <span>Ver reserva · {formatarMoeda(valorSinal)}</span>
    </button>
  );
}

"use client";

import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHeaderRolado } from "@/hooks/useHeaderRolado";
import { rolarParaSecao } from "@/lib/landingPage/navegacao";
import { SECAO_IDS } from "@/lib/landingPage/secoes";

/** Limiar de rolagem (px) a partir do qual o botão "Voltar ao Topo" surge na tela. */
export const LIMIAR_BOTAO_TOPO_PX = 400;

/** Props do {@link BotaoVoltarAoTopo}. */
export interface BotaoVoltarAoTopoProps {
  /** Distância em px para exibir o botão (padrão: 400px). */
  limiarPx?: number;
  /** Classes extras para estilização. */
  className?: string;
}

/**
 * Botão flutuante "Voltar ao Topo" posicionado no canto inferior direito.
 *
 * Surge suavemente (fade-in + elevação) quando o usuário rola a página para baixo
 * e retorna ao fluxo de reserva no topo com animação suave refinada (easeInOutCubic).
 *
 * @example
 * <BotaoVoltarAoTopo />
 */
export function BotaoVoltarAoTopo({
  limiarPx = LIMIAR_BOTAO_TOPO_PX,
  className,
}: BotaoVoltarAoTopoProps) {
  const visivel = useHeaderRolado(limiarPx);

  return (
    <button
      type="button"
      id="botao-voltar-ao-topo"
      aria-label="Voltar ao início da página"
      aria-hidden={!visivel}
      tabIndex={visivel ? 0 : -1}
      onClick={() => rolarParaSecao(SECAO_IDS.INICIO)}
      className={cn(
        "fixed bottom-6 right-4 sm:right-6 z-30",
        "w-11 h-11 rounded-2xl",
        "bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50",
        "text-slate-300 hover:text-emerald-400 shadow-xl shadow-black/40 backdrop-blur-md",
        "flex items-center justify-center cursor-pointer",
        "transition-all duration-300 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60",
        visivel
          ? "opacity-100 translate-y-0 pointer-events-auto scale-100"
          : "opacity-0 translate-y-3 pointer-events-none scale-90",
        className
      )}
    >
      <ArrowUp className="w-5 h-5" aria-hidden="true" />
    </button>
  );
}

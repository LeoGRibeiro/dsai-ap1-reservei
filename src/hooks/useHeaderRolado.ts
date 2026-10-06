"use client";

import { useEffect, useState } from "react";
import { deveExibirHeaderSolido, LIMIAR_HEADER_SOLIDO_PX } from "@/lib/landingPage/navegacao";

/**
 * Hook que indica se a página foi rolada além de um limiar — usado para trocar
 * o cabeçalho de "transparente" para "sólido".
 *
 * - Usa listener `passive` (não bloqueia a rolagem).
 * - Calcula o estado inicial na montagem (ex.: página recarregada no meio).
 * - O React descarta re-renderizações quando o valor booleano não muda.
 *
 * @param limiar - Distância em pixels para ativar o estilo sólido (padrão: 16px).
 * @returns `true` quando `window.scrollY` ultrapassa o limiar.
 *
 * @example
 * const rolado = useHeaderRolado();
 * <header className={rolado ? "bg-slate-950/90" : "bg-transparent"} />
 */
export function useHeaderRolado(limiar: number = LIMIAR_HEADER_SOLIDO_PX): boolean {
  const [rolado, setRolado] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const atualizar = () => {
      setRolado(deveExibirHeaderSolido(window.scrollY, limiar));
    };

    atualizar();
    window.addEventListener("scroll", atualizar, { passive: true });
    return () => window.removeEventListener("scroll", atualizar);
  }, [limiar]);

  return rolado;
}

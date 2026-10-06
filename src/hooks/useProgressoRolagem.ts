"use client";

import { useEffect, useState } from "react";

/**
 * Hook customizado para calcular o percentual de rolagem vertical da página (0 a 100%).
 *
 * Utilizado para alimentar a barra visual de progresso da Landing Page, oferecendo
 * feedback imediato e refinado sobre a posição atual do usuário ao longo da navegação.
 *
 * - Usa listeners de eventos com flag `passive: true` para não impactar a taxa de quadros (60/120 FPS).
 * - Trata redimensionamentos de tela para recalcular os limites da página dinamicamente.
 * - Garante retorno seguro entre `0` e `100`.
 *
 * @returns Percentual numérico arredondado ou decimal entre 0 e 100.
 *
 * @example
 * ```tsx
 * const progresso = useProgressoRolagem();
 * <div style={{ width: `${progresso}%` }} className="h-0.5 bg-emerald-500" />
 * ```
 */
export function useProgressoRolagem(): number {
  const [progresso, setProgresso] = useState<number>(0);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const recalcular = () => {
      const scrollAtual = window.scrollY || document.documentElement.scrollTop || 0;
      const alturaTotal = document.documentElement.scrollHeight - window.innerHeight;

      if (alturaTotal <= 0) {
        setProgresso(0);
        return;
      }

      const percentual = Math.min(100, Math.max(0, (scrollAtual / alturaTotal) * 100));
      setProgresso(percentual);
    };

    recalcular();
    window.addEventListener("scroll", recalcular, { passive: true });
    window.addEventListener("resize", recalcular, { passive: true });

    return () => {
      window.removeEventListener("scroll", recalcular);
      window.removeEventListener("resize", recalcular);
    };
  }, []);

  return progresso;
}

"use client";

import { useEffect, useRef, useState } from "react";
import { selecionarSecaoAtiva } from "@/lib/landingPage/navegacao";
import type { SecaoLandingId } from "@/lib/landingPage/types";

/** Opções do scroll spy. */
export interface OpcoesSecaoAtiva {
  /**
   * Margem do viewport observado. O topo negativo compensa o cabeçalho fixo e
   * o rodapé negativo faz a seção "ativar" antes de ocupar a tela toda.
   */
  rootMargin?: string;
  /** Pontos de corte de visibilidade que disparam o recálculo. */
  thresholds?: number[];
}

const OPCOES_PADRAO: Required<OpcoesSecaoAtiva> = {
  rootMargin: "-72px 0px -35% 0px",
  thresholds: [0, 0.1, 0.25, 0.5, 0.75, 1],
};

/**
 * Hook de "scroll spy": observa as seções da Landing Page e retorna qual delas
 * está mais visível no momento, para destacar o link correspondente no menu.
 *
 * - Usa `IntersectionObserver` (sem listeners de scroll caros).
 * - Em ambientes sem suporte (SSR, navegadores antigos, testes), retorna a
 *   primeira seção da lista de forma estável.
 * - Seções inexistentes no DOM são ignoradas silenciosamente.
 *
 * @param ids - IDs das seções, na ordem em que aparecem na página.
 * @param opcoes - Ajustes finos de `rootMargin` e `thresholds`.
 * @returns ID da seção ativa.
 *
 * @example
 * const ativa = useSecaoAtiva(["inicio", "estrutura", "contato"]);
 * <a aria-current={ativa === "contato" ? "location" : undefined}>Contato</a>
 */
export function useSecaoAtiva(
  ids: readonly SecaoLandingId[],
  opcoes: OpcoesSecaoAtiva = {}
): SecaoLandingId | null {
  const primeira = ids[0] ?? null;
  const [ativa, setAtiva] = useState<SecaoLandingId | null>(primeira);
  const visibilidadesRef = useRef<Partial<Record<SecaoLandingId, number>>>({});

  const chaveIds = ids.join("|");
  const rootMargin = opcoes.rootMargin ?? OPCOES_PADRAO.rootMargin;
  const chaveThresholds = (opcoes.thresholds ?? OPCOES_PADRAO.thresholds).join(",");

  useEffect(() => {
    const ordem = chaveIds ? (chaveIds.split("|") as SecaoLandingId[]) : [];
    if (ordem.length === 0) return;
    if (typeof window === "undefined" || typeof window.IntersectionObserver !== "function") {
      return;
    }

    visibilidadesRef.current = {};
    const thresholds = chaveThresholds.split(",").map(Number);

    let observer: IntersectionObserver;
    try {
      observer = new window.IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const id = entry.target.id as SecaoLandingId;
            visibilidadesRef.current[id] = entry.isIntersecting ? entry.intersectionRatio : 0;
          }
          setAtiva((atual) =>
            selecionarSecaoAtiva(visibilidadesRef.current, ordem, atual ?? ordem[0])
          );
        },
        { rootMargin, threshold: thresholds }
      );
    } catch (erro) {
      console.error("[useSecaoAtiva] Falha ao criar IntersectionObserver:", erro);
      return;
    }

    for (const id of ordem) {
      const elemento = document.getElementById(id);
      if (elemento) observer.observe(elemento);
    }

    return () => observer.disconnect();
  }, [chaveIds, rootMargin, chaveThresholds]);

  return ativa;
}

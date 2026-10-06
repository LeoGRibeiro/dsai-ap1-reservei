"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/** Interface estendida do objeto Window para registrar a instância ativa do Lenis. */
declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

/** Props do componente {@link SmoothScrollProvider}. */
export interface SmoothScrollProviderProps {
  /** Elementos filhos da aplicação envolvidos pelo provedor de rolagem suave. */
  children: React.ReactNode;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CONFIGURAÇÃO DA VELOCIDADE E SENSIBILIDADE DO SCROLL (LENIS)
 * ─────────────────────────────────────────────────────────────────────────────
 * Ajuste estas constantes para calibrar a sensação física da rolagem na página:
 *
 * 1. DURACAO_ROLAGEM_SEGUNDOS:
 *    Tempo de desaceleração (em segundos). Menor = mais rápido/ágil (ex.: 0.7s a 0.85s).
 *
 * 2. MULTIPLICADOR_RODA_MOUSE:
 *    Quantidade de pixels avançados a cada "clique" ou giro da rodinha do mouse.
 *    Aumente (ex.: 1.2, 1.4, 1.6) para andar mais distância por giro do mouse.
 *
 * 3. MULTIPLICADOR_TOUCHPAD:
 *    Sensibilidade de movimento para touchpads de notebook e telas touch.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const CONFIG_SCROLL = {
  /** Tempo de atenuação da inércia em segundos (padrão: 0.85s - mais rápido e ágil). */
  duracaoSegundos: 0.85,
  /** Multiplicador de pixels por giro da rodinha do mouse (padrão: 1.35 - avança mais pixels). */
  multiplicadorRoda: 1.35,
  /** Sensibilidade para trackpads/touch (padrão: 1.8). */
  multiplicadorTouch: 1.8,
} as const;

/**
 * Provedor de rolagem suave inercial contínua (Lenis) para a Landing Page.
 *
 * Transforma a experiência de rolagem da página inteira, aplicando desaceleração
 * inercial física e amortecimento a cada movimento da rodinha do mouse ou do trackpad:
 * - Elimina os saltos mecânicos e truncados nativos do navegador.
 * - Sincroniza um loop contínuo de interpolação via `requestAnimationFrame`.
 * - Fornece suporte a touchpads e telas de alta taxa de atualização (120Hz/ProMotion).
 * - Registra a instância ativa em `window.__lenis` para que ações de navegação por âncora
 *   possam reutilizar o mesmo motor de interpolação.
 * - Desativa o bypass automático por flag de SO (`respectReducedMotion: false`) para
 *   garantir que a rolagem fluida e elegante seja sempre entregue aos usuários.
 *
 * @param props - Propriedades contendo os filhos React a serem renderizados.
 *
 * @example
 * ```tsx
 * <SmoothScrollProvider>
 *   <LandingHeader />
 *   <main>{conteudo}</main>
 * </SmoothScrollProvider>
 * ```
 */
export function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  useEffect(() => {
    // Não inicializar no servidor ou em ambientes de testes sem navegador completo (ex: JSDOM)
    if (
      typeof window === "undefined" ||
      typeof Window === "undefined" ||
      typeof window.matchMedia !== "function" ||
      process.env.NODE_ENV === "test"
    ) {
      return;
    }

    const lenis = new Lenis({
      duration: CONFIG_SCROLL.duracaoSegundos,
      wheelMultiplier: CONFIG_SCROLL.multiplicadorRoda,
      touchMultiplier: CONFIG_SCROLL.multiplicadorTouch,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      respectReducedMotion: false,
    });

    window.__lenis = lenis;

    let rafId: number;
    const onRaf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(onRaf);
    };
    rafId = requestAnimationFrame(onRaf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      delete window.__lenis;
    };
  }, []);

  return <>{children}</>;
}

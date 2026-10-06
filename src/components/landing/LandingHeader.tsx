"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHeaderRolado } from "@/hooks/useHeaderRolado";
import { useSecaoAtiva } from "@/hooks/useSecaoAtiva";
import { getSecoesDoMenu, rolarParaSecao } from "@/lib/landingPage/navegacao";
import { SECAO_IDS, SECOES_LANDING_PAGE } from "@/lib/landingPage/secoes";
import type { SecaoLandingId, SecaoLandingPage } from "@/lib/landingPage/types";
import { AcoesUsuarioHeader } from "./AcoesUsuarioHeader";
import { ListaLinksNavegacao } from "./ListaLinksNavegacao";
import { LogoReservei } from "./LogoReservei";
import { MenuNavegacaoMobile } from "./MenuNavegacaoMobile";

/**
 * Tempo (ms) aguardado após fechar o menu mobile antes de rolar a página.
 * Corresponde à animação de saída do Sheet, garantindo que o bloqueio de
 * rolagem do painel já tenha sido removido.
 */
export const ATRASO_ROLAGEM_APOS_MENU_MS = 220;

/** Props do {@link LandingHeader}. */
export interface LandingHeaderProps {
  /** Catálogo de seções (injeção para testes). Padrão: {@link SECOES_LANDING_PAGE}. */
  secoes?: readonly SecaoLandingPage[];
}

/**
 * Cabeçalho fixo da Landing Page.
 *
 * Comportamentos (SPEC/2026-10-06-lp-base-navegacao.md §2.1):
 * - Sticky no topo (fixo durante toda a rolagem); fundo transparente que fica sólido ao rolar.
 * - Links de âncora com rolagem suave e destaque da seção ativa (scroll spy).
 * - Ações de conta (Entrar/Criar Conta ou Minhas Reservas).
 * - CTA "Agendar Agora" que leva ao fluxo de reserva.
 * - Menu hambúrguer em telas menores que `lg`.
 *
 * @example
 * <LandingHeader />
 */
export function LandingHeader({ secoes = SECOES_LANDING_PAGE }: LandingHeaderProps) {
  const rolado = useHeaderRolado();
  const secoesMenu = useMemo(() => getSecoesDoMenu(secoes), [secoes]);
  const idsObservados = useMemo(() => secoes.map((s) => s.id), [secoes]);
  const secaoAtiva = useSecaoAtiva(idsObservados);

  const [menuAberto, setMenuAberto] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const navegar = useCallback(
    (id: SecaoLandingId) => {
      if (!menuAberto) {
        rolarParaSecao(id);
        return;
      }
      setMenuAberto(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        rolarParaSecao(id);
        timeoutRef.current = null;
      }, ATRASO_ROLAGEM_APOS_MENU_MS);
    },
    [menuAberto]
  );

  const agendarAgora = useCallback(() => navegar(SECAO_IDS.INICIO), [navegar]);

  return (
    <header
      data-rolado={rolado ? "true" : "false"}
      className={cn(
        "sticky top-0 z-30 border-b transition-colors duration-300",
        rolado
          ? "bg-slate-950/85 backdrop-blur-md border-slate-800 shadow-lg shadow-black/20"
          : "bg-transparent border-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <a
          href={`#${SECAO_IDS.INICIO}`}
          id="header-logo"
          aria-label="Ir para o início"
          onClick={(evento) => {
            evento.preventDefault();
            navegar(SECAO_IDS.INICIO);
          }}
          className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
        >
          <LogoReservei />
        </a>

        <ListaLinksNavegacao
          secoes={secoesMenu}
          secaoAtiva={secaoAtiva}
          onNavegar={navegar}
          idPrefixo="nav-desktop"
          ariaLabel="Navegação principal"
          className="hidden lg:block"
        />

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            id="header-agendar-agora"
            onClick={agendarAgora}
            className="hidden md:inline-flex items-center gap-2 h-9 px-4 rounded-full border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-emerald-200 text-xs font-bold transition-colors cursor-pointer"
          >
            <CalendarCheck className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            <span>Agendar Agora</span>
          </button>

          <AcoesUsuarioHeader />

          <MenuNavegacaoMobile
            aberto={menuAberto}
            onAbertoChange={setMenuAberto}
            secoes={secoesMenu}
            secaoAtiva={secaoAtiva}
            onNavegar={navegar}
            onAgendarAgora={agendarAgora}
          />
        </div>
      </div>
    </header>
  );
}

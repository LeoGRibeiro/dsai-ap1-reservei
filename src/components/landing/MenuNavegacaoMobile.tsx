"use client";

import { CalendarCheck, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ListaLinksNavegacao } from "./ListaLinksNavegacao";
import { LogoReservei } from "./LogoReservei";
import type { SecaoLandingId, SecaoLandingPage } from "@/lib/landingPage/types";

/** Props do {@link MenuNavegacaoMobile}. */
export interface MenuNavegacaoMobileProps {
  /** Controla a abertura do painel lateral. */
  aberto: boolean;
  /** Disparado quando o painel deve abrir/fechar. */
  onAbertoChange: (aberto: boolean) => void;
  /** Seções exibidas no menu. */
  secoes: readonly SecaoLandingPage[];
  /** Seção ativa no momento (destacada). */
  secaoAtiva: SecaoLandingId | null;
  /** Disparado ao escolher uma seção. */
  onNavegar: (id: SecaoLandingId) => void;
  /** Disparado ao tocar em "Agendar Agora". */
  onAgendarAgora: () => void;
}

/**
 * Menu de navegação para telas pequenas (abaixo de `lg`).
 *
 * Renderiza o botão "hambúrguer" e um painel lateral (Sheet) com os links das
 * seções e o atalho "Agendar Agora".
 *
 * @example
 * <MenuNavegacaoMobile
 *   aberto={aberto}
 *   onAbertoChange={setAberto}
 *   secoes={getSecoesDoMenu()}
 *   secaoAtiva={ativa}
 *   onNavegar={navegar}
 *   onAgendarAgora={() => navegar("inicio")}
 * />
 */
export function MenuNavegacaoMobile({
  aberto,
  onAbertoChange,
  secoes,
  secaoAtiva,
  onNavegar,
  onAgendarAgora,
}: MenuNavegacaoMobileProps) {
  return (
    <>
      <button
        type="button"
        id="header-menu-mobile"
        aria-label="Abrir menu de navegação"
        aria-expanded={aberto}
        onClick={() => onAbertoChange(true)}
        className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
      >
        <Menu className="w-5 h-5" aria-hidden="true" />
      </button>

      <Sheet open={aberto} onOpenChange={(open) => onAbertoChange(open)}>
        <SheetContent
          side="right"
          className="bg-slate-950 border-l border-slate-800 text-white p-6 flex flex-col gap-6"
        >
          <SheetHeader className="p-0">
            <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
            <LogoReservei exibirDescricao={false} />
          </SheetHeader>

          <ListaLinksNavegacao
            secoes={secoes}
            secaoAtiva={secaoAtiva}
            onNavegar={onNavegar}
            idPrefixo="nav-mobile"
            ariaLabel="Navegação do menu mobile"
            orientacao="vertical"
          />

          <button
            type="button"
            id="menu-mobile-agendar-agora"
            onClick={onAgendarAgora}
            className="mt-auto w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-3 transition-colors"
          >
            <CalendarCheck className="w-4 h-4" aria-hidden="true" />
            Agendar Agora
          </button>
        </SheetContent>
      </Sheet>
    </>
  );
}

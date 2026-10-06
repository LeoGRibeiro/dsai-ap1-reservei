"use client";

import type { MouseEvent } from "react";
import { cn } from "@/lib/utils";
import type { SecaoLandingId, SecaoLandingPage } from "@/lib/landingPage/types";

/** Props da {@link ListaLinksNavegacao}. */
export interface ListaLinksNavegacaoProps {
  /** Seções exibidas como links, na ordem desejada. */
  secoes: readonly SecaoLandingPage[];
  /** Seção destacada como ativa (recebe `aria-current="location"`). */
  secaoAtiva: SecaoLandingId | null;
  /** Disparado ao clicar em um link (clique simples, sem teclas modificadoras). */
  onNavegar: (id: SecaoLandingId) => void;
  /** Prefixo dos IDs dos links — deve ser único por instância na página. */
  idPrefixo: string;
  /** Nome acessível do bloco de navegação. */
  ariaLabel: string;
  /** Disposição dos links. */
  orientacao?: "horizontal" | "vertical";
  /** Classes extras do `<nav>`. */
  className?: string;
}

/**
 * Indica se o clique deve ser tratado pela navegação interna (rolagem suave)
 * ou deixado para o navegador (ex.: Ctrl+Clique para abrir em nova aba).
 */
function isCliqueSimples(evento: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    evento.button === 0 &&
    !evento.metaKey &&
    !evento.ctrlKey &&
    !evento.shiftKey &&
    !evento.altKey
  );
}

/**
 * Lista de links de âncora para as seções da Landing Page.
 *
 * Cada link mantém um `href="#secao"` real (funciona sem JavaScript e permite
 * abrir em nova aba), mas o clique simples é interceptado para executar a
 * rolagem suave controlada via `onNavegar`.
 *
 * @example
 * <ListaLinksNavegacao
 *   secoes={getSecoesDoMenu()}
 *   secaoAtiva="inicio"
 *   onNavegar={(id) => rolarParaSecao(id)}
 *   idPrefixo="nav-desktop"
 *   ariaLabel="Navegação principal"
 * />
 */
export function ListaLinksNavegacao({
  secoes,
  secaoAtiva,
  onNavegar,
  idPrefixo,
  ariaLabel,
  orientacao = "horizontal",
  className,
}: ListaLinksNavegacaoProps) {
  const vertical = orientacao === "vertical";

  return (
    <nav aria-label={ariaLabel} className={className}>
      <ul className={cn("flex", vertical ? "flex-col gap-1" : "items-center gap-1")}>
        {secoes.map((secao) => {
          const ativo = secao.id === secaoAtiva;
          return (
            <li key={secao.id}>
              <a
                id={`${idPrefixo}-${secao.id}`}
                href={`#${secao.id}`}
                aria-current={ativo ? "location" : undefined}
                onClick={(evento) => {
                  if (!isCliqueSimples(evento)) return;
                  evento.preventDefault();
                  onNavegar(secao.id);
                }}
                className={cn(
                  "block rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60",
                  vertical ? "px-3 py-2.5 text-base" : "px-3 py-1.5 text-sm",
                  ativo
                    ? "text-emerald-400 bg-emerald-500/10"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                )}
              >
                {secao.rotuloMenu}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

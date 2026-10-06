import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { SecaoLandingPage } from "@/lib/landingPage/types";

/** Props da {@link SecaoLanding}. */
export interface SecaoLandingProps {
  /** Metadados da seção (id, título, subtítulo e rótulo). */
  secao: SecaoLandingPage;
  /** Conteúdo da seção. */
  children: ReactNode;
  /** Aplica fundo levemente destacado (útil para alternar seções). */
  destaque?: boolean;
  /** Classes extras do `<section>`. */
  className?: string;
}

/**
 * Contêiner padrão de uma seção da Landing Page.
 *
 * Garante para TODAS as seções:
 * - `id` igual ao da âncora (navegação por `#id`);
 * - `scroll-margin-top` para não ficar escondida atrás do cabeçalho fixo;
 * - cabeçalho semântico (`h2`) ligado via `aria-labelledby`;
 * - espaçamento e largura máxima consistentes.
 *
 * As specs seguintes devem reutilizar este componente ao implementar o
 * conteúdo real de cada seção.
 *
 * @example
 * <SecaoLanding secao={getSecaoPorId("estrutura")!}>
 *   <GaleriaEstrutura />
 * </SecaoLanding>
 */
export function SecaoLanding({ secao, children, destaque = false, className }: SecaoLandingProps) {
  const tituloId = `${secao.id}-titulo`;

  return (
    <section
      id={secao.id}
      aria-labelledby={tituloId}
      className={cn(
        "scroll-mt-20 py-16 md:py-20 border-t border-slate-800/60",
        destaque && "bg-slate-900/30",
        className
      )}
    >
      <div className="max-w-7xl mx-auto px-4">
        <header className="mb-8 md:mb-10 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
            {secao.rotuloMenu}
          </p>
          <h2 id={tituloId} className="mt-2 text-2xl md:text-3xl font-black text-white tracking-tight">
            {secao.titulo}
          </h2>
          <p className="mt-2 text-sm md:text-base text-slate-400">{secao.subtitulo}</p>
        </header>
        {children}
      </div>
    </section>
  );
}

import type { ComponentType } from "react";
import { Construction } from "lucide-react";
import type { PlaceholderSecao, SecaoLandingPage } from "@/lib/landingPage/types";
import { SecaoLanding } from "./SecaoLanding";

/** Props do {@link SecaoPlaceholder}. */
export interface SecaoPlaceholderProps {
  /** Metadados da seção. */
  secao: SecaoLandingPage;
  /** Funcionalidades previstas para a seção. */
  placeholder: PlaceholderSecao;
  /** Ícone ilustrativo da seção. */
  icone: ComponentType<{ className?: string }>;
  /** Aplica fundo destacado (alternância visual entre seções). */
  destaque?: boolean;
}

/**
 * Esqueleto visual de uma seção ainda não implementada.
 *
 * Mantém o mesmo contêiner, âncora e título da versão final para que a
 * navegação e o layout completo da página possam ser validados desde já.
 *
 * @example
 * <SecaoPlaceholder
 *   secao={getSecaoPorId("eventos")!}
 *   placeholder={getPlaceholderDaSecao("eventos")!}
 *   icone={Trophy}
 * />
 */
export function SecaoPlaceholder({ secao, placeholder, icone: Icone, destaque }: SecaoPlaceholderProps) {
  return (
    <SecaoLanding secao={secao} destaque={destaque}>
      <div
        data-testid={`placeholder-${secao.id}`}
        data-spec={secao.specReferencia}
        className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-6 md:p-8 flex flex-col md:flex-row gap-6"
      >
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
          <Icone className="w-7 h-7" />
        </div>

        <div className="flex-1 min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1">
            <Construction className="w-3.5 h-3.5" aria-hidden="true" />
            Em construção
          </span>

          <ul className="mt-4 grid gap-2 sm:grid-cols-2" aria-label={`Previsto para ${secao.titulo}`}>
            {placeholder.itensPlanejados.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SecaoLanding>
  );
}

import { Fragment, type ComponentType, type ReactNode } from "react";
import {
  CalendarCheck,
  Camera,
  CircleQuestionMark,
  Gift,
  GraduationCap,
  Images,
  MapPin,
  Star,
  Trophy,
} from "lucide-react";
import { getPlaceholderDaSecao } from "@/lib/landingPage/navegacao";
import { PLACEHOLDERS_SECOES, SECAO_IDS, SECOES_LANDING_PAGE } from "@/lib/landingPage/secoes";
import type { PlaceholderSecao, SecaoLandingId, SecaoLandingPage } from "@/lib/landingPage/types";
import { SecaoPlaceholder } from "./SecaoPlaceholder";

/** Ícone ilustrativo de cada seção da Landing Page. */
export const ICONES_SECOES: Record<SecaoLandingId, ComponentType<{ className?: string }>> = {
  inicio: CalendarCheck,
  estrutura: Images,
  escolinhas: GraduationCap,
  fidelidade: Gift,
  eventos: Trophy,
  avaliacoes: Star,
  instagram: Camera,
  faq: CircleQuestionMark,
  contato: MapPin,
};

/** Props do {@link LandingSecoesPlaceholder}. */
export interface LandingSecoesPlaceholderProps {
  /** Catálogo de seções (injeção para testes). */
  secoes?: readonly SecaoLandingPage[];
  /** Placeholders disponíveis (injeção para testes). */
  placeholders?: readonly PlaceholderSecao[];
  /** Seções já implementadas, renderizadas na posição do catálogo no lugar do placeholder. */
  implementadas?: Partial<Record<SecaoLandingId, ReactNode>>;
}

/**
 * Renderiza, na ordem do catálogo, todas as seções abaixo do fluxo de reserva
 * que ainda não foram implementadas (as que possuem placeholder).
 *
 * À medida que cada spec for implementada, basta remover o placeholder da
 * seção em `PLACEHOLDERS_SECOES` e renderizar o componente real.
 *
 * @example
 * <LandingSecoesPlaceholder />
 */
export function LandingSecoesPlaceholder({
  secoes = SECOES_LANDING_PAGE,
  placeholders = PLACEHOLDERS_SECOES,
  implementadas = {},
}: LandingSecoesPlaceholderProps) {
  const itens = secoes
    .filter((secao) => secao.id !== SECAO_IDS.INICIO)
    .map((secao) => ({
      secao,
      real: implementadas[secao.id],
      placeholder: getPlaceholderDaSecao(secao.id, placeholders),
    }))
    .filter((item) => item.real !== undefined || item.placeholder !== null);

  return (
    <>
      {itens.map(({ secao, real, placeholder }, indice) =>
        real !== undefined ? (
          <Fragment key={secao.id}>{real}</Fragment>
        ) : (
          <SecaoPlaceholder
            key={secao.id}
            secao={secao}
            placeholder={placeholder as PlaceholderSecao}
            icone={ICONES_SECOES[secao.id]}
            destaque={indice % 2 === 0}
          />
        )
      )}
    </>
  );
}

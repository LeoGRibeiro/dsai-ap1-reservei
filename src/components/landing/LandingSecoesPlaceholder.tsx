import type { ComponentType } from "react";
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
}: LandingSecoesPlaceholderProps) {
  const itens = secoes
    .filter((secao) => secao.id !== SECAO_IDS.INICIO)
    .map((secao) => ({ secao, placeholder: getPlaceholderDaSecao(secao.id, placeholders) }))
    .filter(
      (item): item is { secao: SecaoLandingPage; placeholder: PlaceholderSecao } =>
        item.placeholder !== null
    );

  return (
    <>
      {itens.map(({ secao, placeholder }, indice) => (
        <SecaoPlaceholder
          key={secao.id}
          secao={secao}
          placeholder={placeholder}
          icone={ICONES_SECOES[secao.id]}
          destaque={indice % 2 === 0}
        />
      ))}
    </>
  );
}

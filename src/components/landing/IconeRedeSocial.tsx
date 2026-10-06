import { MessageCircle } from "lucide-react";
import type { RedeSocial } from "@/lib/landingPage/types";

/** Props comuns aos ícones de redes sociais. */
export interface IconeRedeSocialProps {
  /** Rede social cujo ícone será exibido. */
  rede: RedeSocial;
  /** Classes utilitárias aplicadas ao SVG (tamanho/cor). */
  className?: string;
}

/**
 * Ícone do Instagram em SVG inline.
 * (Os ícones de marcas foram removidos do `lucide-react` v1, por isso são locais.)
 */
function IconeInstagram({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

/** Ícone do Facebook em SVG inline. */
function IconeFacebook({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

/**
 * Renderiza o ícone correspondente à rede social informada.
 *
 * Os ícones são decorativos (`aria-hidden`): o nome acessível deve ser
 * definido no link que os envolve (`aria-label`).
 *
 * @example
 * <a href={url} aria-label="Instagram">
 *   <IconeRedeSocial rede="instagram" className="w-4 h-4" />
 * </a>
 */
export function IconeRedeSocial({ rede, className }: IconeRedeSocialProps) {
  switch (rede) {
    case "instagram":
      return <IconeInstagram className={className} />;
    case "facebook":
      return <IconeFacebook className={className} />;
    case "whatsapp":
      return <MessageCircle className={className} aria-hidden="true" />;
    default:
      return null;
  }
}

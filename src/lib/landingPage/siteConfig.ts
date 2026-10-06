/**
 * @module landingPage/siteConfig
 *
 * Configuração institucional exibida no cabeçalho e no rodapé da Landing Page.
 *
 * IMPORTANTE: os valores de contato abaixo são os mesmos já utilizados no
 * restante do portal (ex.: alerta de conta bloqueada). A gestão desses dados
 * pelo Painel Admin está prevista em SPEC/2026-10-06-lp-suporte-contato.md e
 * SPEC/2026-10-06-lp-prova-social-redes.md.
 */

import type { ConfiguracaoSite } from "./types";

/**
 * Configuração padrão do site.
 *
 * @example
 * import { SITE_CONFIG } from "@/lib/landingPage/siteConfig";
 * <span>{SITE_CONFIG.nomePlataforma}</span>
 */
export const SITE_CONFIG: ConfiguracaoSite = {
  nomePlataforma: "Reservei",
  descricaoEstabelecimento: "Complexo Esportivo",
  slogan: "Reserve sua quadra em segundos, jogue e acumule recompensas.",
  whatsappNumero: "5500000000000",
  redesSociais: [
    { rede: "instagram", rotulo: "Instagram", url: "https://www.instagram.com/" },
    { rede: "facebook", rotulo: "Facebook", url: "https://www.facebook.com/" },
    { rede: "whatsapp", rotulo: "WhatsApp", url: "https://wa.me/5500000000000" },
  ],
};

/**
 * @module landingPage/types
 *
 * Tipos de domínio da Landing Page do Portal do Cliente.
 *
 * A Landing Page é organizada em "seções" ancoradas (Single Page com rolagem
 * contínua). Cada seção possui um identificador estável que é usado como `id`
 * do elemento HTML, como âncora (`#id`) nos links de navegação e como chave
 * para o "scroll spy" que destaca o item ativo no cabeçalho.
 *
 * @see SPEC/2026-10-06-lp-base-navegacao.md
 */

/**
 * Identificadores estáveis de todas as seções da Landing Page.
 *
 * - `inicio`      → Fluxo de reserva (Spec Base e Navegação) — SEMPRE a primeira seção.
 * - `estrutura`   → O Local e Estrutura (Spec Conteúdo Institucional).
 * - `escolinhas`  → Escolinhas e Aulas (Spec Conteúdo Institucional).
 * - `fidelidade`  → Destaque do Sistema de Fidelidade (Spec Eventos e Fidelidade).
 * - `eventos`     → Campeonatos, Ligas e Eventos (Spec Eventos e Fidelidade).
 * - `avaliacoes`  → Avaliações do Google (Spec Prova Social e Redes).
 * - `instagram`   → Feed do Instagram (Spec Prova Social e Redes).
 * - `faq`         → Termos, Regras e FAQ (Spec Suporte e Contato).
 * - `contato`     → Localização, Horários e Contato (Spec Suporte e Contato).
 */
export type SecaoLandingId =
  | "inicio"
  | "estrutura"
  | "escolinhas"
  | "fidelidade"
  | "eventos"
  | "avaliacoes"
  | "instagram"
  | "faq"
  | "contato";

/**
 * Metadados de uma seção da Landing Page.
 *
 * @example
 * const secao: SecaoLandingPage = {
 *   id: "estrutura",
 *   rotuloMenu: "Estrutura",
 *   titulo: "O Local e Estrutura",
 *   subtitulo: "Conheça nossas quadras, vestiários e área de lazer.",
 *   exibirNoMenu: true,
 *   specReferencia: "SPEC/2026-10-06-lp-conteudo-institucional.md",
 * };
 */
export interface SecaoLandingPage {
  /** Identificador único — usado como `id` do elemento e âncora (`#id`). */
  id: SecaoLandingId;
  /** Texto curto exibido nos links de navegação (cabeçalho, menu mobile e rodapé). */
  rotuloMenu: string;
  /** Título principal da seção (renderizado como heading). */
  titulo: string;
  /** Texto de apoio exibido abaixo do título. */
  subtitulo: string;
  /** Define se a seção aparece como link no menu de navegação principal. */
  exibirNoMenu: boolean;
  /** Caminho da especificação responsável pela implementação da seção. */
  specReferencia: string;
}

/**
 * Informações exibidas enquanto uma seção ainda não foi implementada.
 * Serve como "esqueleto" visual para validar o layout completo da página.
 */
export interface PlaceholderSecao {
  /** Seção à qual o placeholder pertence. */
  secaoId: SecaoLandingId;
  /** Lista de funcionalidades previstas na spec para essa seção. */
  itensPlanejados: string[];
}

/** Redes sociais suportadas pelo rodapé e pelos atalhos de contato. */
export type RedeSocial = "instagram" | "facebook" | "whatsapp";

/**
 * Link para um perfil/canal em rede social.
 *
 * @example
 * const link: LinkRedeSocial = {
 *   rede: "instagram",
 *   rotulo: "Instagram",
 *   url: "https://instagram.com/meucomplexo",
 * };
 */
export interface LinkRedeSocial {
  /** Rede social de destino (define o ícone exibido). */
  rede: RedeSocial;
  /** Nome acessível do link (usado em `aria-label`). */
  rotulo: string;
  /** URL absoluta do perfil/canal. */
  url: string;
}

/**
 * Configuração institucional do site exibida no cabeçalho e no rodapé.
 *
 * Nesta etapa os valores são estáticos (`siteConfig.ts`). As specs de
 * Suporte/Contato e Prova Social preveem a gestão desses dados pelo Painel Admin.
 */
export interface ConfiguracaoSite {
  /** Nome da plataforma (marca do produto). */
  nomePlataforma: string;
  /** Descrição curta do estabelecimento exibida ao lado da marca. */
  descricaoEstabelecimento: string;
  /** Frase curta exibida no rodapé. */
  slogan: string;
  /** Número de WhatsApp do estabelecimento (apenas dígitos, com DDI). */
  whatsappNumero: string;
  /** Perfis em redes sociais exibidos no rodapé. */
  redesSociais: LinkRedeSocial[];
}

/** Opções de configuração da animação suave com easing. */
export interface OpcoesAnimacaoRolagem {
  /** Janela onde a rolagem será executada (injeção para testes). */
  janela?: Window;
  /** Duração em ms (se omitido, calculada proporcionalmente à distância). */
  duracaoMs?: number;
  /** Função de interpolação temporal normalizada (padrão: easeInOutCubic). */
  funcaoEasing?: (t: number) => number;
  /** Se `true`, cancela a animação se prefers-reduced-motion estiver ativo no sistema (padrão: false). */
  respeitarMovimentoReduzido?: boolean;
  /** Callback disparado ao completar a rolagem. */
  onConcluir?: () => void;
}

/** Opções aceitas por {@link rolarParaSecao}. */
export interface OpcoesRolagem {
  /** Documento onde o elemento será buscado (injeção para testes). */
  documento?: Document;
  /** Janela usada para detectar preferências e atualizar o histórico (injeção para testes). */
  janela?: Window;
  /** Quando `true` (padrão), atualiza o hash da URL sem criar nova entrada no histórico. */
  atualizarHash?: boolean;
  /**
   * Quando `true` (padrão), utiliza animação com curva suave customizada (easeInOutCubic).
   * Se `false`, utiliza scrollIntoView com rolagem nativa.
   */
  suaveRefinado?: boolean;
  /**
   * Compensação em pixels para o cabeçalho fixo no topo da página (padrão: 72px).
   */
  compensacaoTopoPx?: number;
  /**
   * Se `true`, acata a preferência do sistema por redução de movimento com salto instantâneo.
   * Por padrão é `false` para garantir a experiência de rolagem refinada solicitada na Landing Page.
   */
  respeitarMovimentoReduzido?: boolean;
}


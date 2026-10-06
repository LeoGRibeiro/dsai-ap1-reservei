/**
 * @module landingPage/navegacao
 *
 * Regras de negócio puras (sem React) da navegação da Landing Page.
 * Mantidas isoladas para serem testadas sem renderizar componentes.
 *
 * @see SPEC/2026-10-06-lp-base-navegacao.md
 */

import { PLACEHOLDERS_SECOES, SECOES_LANDING_PAGE } from "./secoes";
import type {
  OpcoesAnimacaoRolagem,
  OpcoesRolagem,
  PlaceholderSecao,
  SecaoLandingId,
  SecaoLandingPage,
} from "./types";

/** Distância de rolagem (px) a partir da qual o cabeçalho assume o estilo sólido. */
export const LIMIAR_HEADER_SOLIDO_PX = 16;

/** Media query de acessibilidade para usuários que preferem menos movimento. */
const MEDIA_QUERY_MOVIMENTO_REDUZIDO = "(prefers-reduced-motion: reduce)";

/**
 * Retorna apenas as seções que devem aparecer no menu de navegação,
 * preservando a ordem do catálogo.
 *
 * @param secoes - Catálogo de seções (padrão: {@link SECOES_LANDING_PAGE}).
 * @returns Lista ordenada das seções com `exibirNoMenu === true`.
 *
 * @example
 * getSecoesDoMenu().map((s) => s.rotuloMenu);
 * // ["Início", "Estrutura", "Escolinhas", "Eventos", "Contato"]
 */
export function getSecoesDoMenu(
  secoes: readonly SecaoLandingPage[] = SECOES_LANDING_PAGE
): SecaoLandingPage[] {
  return secoes.filter((secao) => secao.exibirNoMenu);
}

/**
 * Busca os metadados de uma seção pelo seu identificador.
 *
 * @param id - Identificador da seção.
 * @param secoes - Catálogo de seções (padrão: {@link SECOES_LANDING_PAGE}).
 * @returns A seção encontrada ou `null`.
 *
 * @example
 * getSecaoPorId("contato")?.titulo; // "Localização e Contato"
 */
export function getSecaoPorId(
  id: SecaoLandingId,
  secoes: readonly SecaoLandingPage[] = SECOES_LANDING_PAGE
): SecaoLandingPage | null {
  return secoes.find((secao) => secao.id === id) ?? null;
}

/**
 * Retorna o placeholder (funcionalidades planejadas) de uma seção.
 *
 * @param id - Identificador da seção.
 * @param placeholders - Lista de placeholders (padrão: {@link PLACEHOLDERS_SECOES}).
 * @returns O placeholder encontrado ou `null` quando a seção já foi implementada.
 */
export function getPlaceholderDaSecao(
  id: SecaoLandingId,
  placeholders: readonly PlaceholderSecao[] = PLACEHOLDERS_SECOES
): PlaceholderSecao | null {
  return placeholders.find((p) => p.secaoId === id) ?? null;
}

/**
 * Type guard que verifica se um texto qualquer é um ID de seção válido.
 *
 * @param valor - Texto a ser validado.
 * @param secoes - Catálogo de seções (padrão: {@link SECOES_LANDING_PAGE}).
 * @returns `true` quando o valor corresponde a uma seção existente.
 *
 * @example
 * isSecaoLandingId("eventos"); // true
 * isSecaoLandingId("admin");   // false
 */
export function isSecaoLandingId(
  valor: string,
  secoes: readonly SecaoLandingPage[] = SECOES_LANDING_PAGE
): valor is SecaoLandingId {
  return secoes.some((secao) => secao.id === valor);
}

/**
 * Extrai o ID da seção a partir de um hash de URL.
 *
 * Tolera o caractere `#`, espaços e letras maiúsculas. Retorna `null` para
 * hashes vazios ou que não correspondam a nenhuma seção conhecida.
 *
 * @param hash - Hash da URL (ex.: `window.location.hash`).
 * @returns O ID da seção ou `null`.
 *
 * @example
 * extrairIdDoHash("#Estrutura"); // "estrutura"
 * extrairIdDoHash("#nada");      // null
 */
export function extrairIdDoHash(hash: string | null | undefined): SecaoLandingId | null {
  if (!hash) return null;
  const limpo = hash.trim().replace(/^#/, "").toLowerCase();
  if (!limpo) return null;
  return isSecaoLandingId(limpo) ? limpo : null;
}

/**
 * Escolhe qual seção deve ser destacada como "ativa" no menu (scroll spy).
 *
 * Regras:
 * 1. Vence a seção com maior proporção visível (`intersectionRatio`).
 * 2. Em caso de empate, vence a que aparece primeiro na ordem da página.
 * 3. Se nenhuma seção estiver visível, mantém a seção atual (`fallback`).
 *
 * @param visibilidades - Mapa `id → proporção visível (0..1)`.
 * @param ordem - Ordem das seções na página.
 * @param fallback - Seção a manter quando nenhuma estiver visível.
 * @returns O ID da seção ativa.
 *
 * @example
 * selecionarSecaoAtiva({ inicio: 0.1, estrutura: 0.6 }, ["inicio", "estrutura"], "inicio");
 * // "estrutura"
 */
export function selecionarSecaoAtiva(
  visibilidades: Partial<Record<SecaoLandingId, number>>,
  ordem: readonly SecaoLandingId[],
  fallback: SecaoLandingId
): SecaoLandingId {
  let melhorId: SecaoLandingId | null = null;
  let melhorRatio = 0;

  for (const id of ordem) {
    const ratio = visibilidades[id] ?? 0;
    if (ratio > melhorRatio) {
      melhorRatio = ratio;
      melhorId = id;
    }
  }

  return melhorId ?? fallback;
}

/**
 * Indica se o cabeçalho deve assumir o estilo "sólido" (com fundo e borda).
 *
 * @param scrollY - Posição vertical atual da rolagem, em pixels.
 * @param limiar - Distância mínima para ativar o estilo sólido.
 * @returns `true` quando a página foi rolada além do limiar.
 */
export function deveExibirHeaderSolido(
  scrollY: number,
  limiar: number = LIMIAR_HEADER_SOLIDO_PX
): boolean {
  if (!Number.isFinite(scrollY)) return false;
  return scrollY > limiar;
}

/**
 * Detecta se o usuário configurou o sistema para reduzir animações.
 *
 * @param janela - Janela do navegador (injeção para testes).
 * @returns `true` quando `prefers-reduced-motion: reduce` está ativo.
 */
export function prefereMovimentoReduzido(janela?: Window): boolean {
  const alvo = janela ?? (typeof window !== "undefined" ? window : undefined);
  if (!alvo || typeof alvo.matchMedia !== "function") return false;
  try {
    return alvo.matchMedia(MEDIA_QUERY_MOVIMENTO_REDUZIDO).matches;
  } catch {
    return false;
  }
}

/**
 * Função de atenuação cúbica bidirecional (ease-in-out cubic).
 * Garante aceleração suave no início e desaceleração gradual no final,
 * eliminando a sensação abrupta ou mecânica do scroll linear.
 *
 * @param t - Progresso temporal normalizado (0 a 1).
 * @returns Progresso de posicionamento (0 a 1).
 *
 * @example
 * easeInOutCubic(0);   // 0
 * easeInOutCubic(0.5); // 0.5
 * easeInOutCubic(1);   // 1
 */
export function easeInOutCubic(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Calcula a duração ideal (em ms) da animação com base na distância em pixels.
 *
 * Distâncias curtas (ex.: 200px) rolam em ~380ms para resposta ágil.
 * Distâncias longas (ex.: 2000px) ganham até 750ms para conforto visual.
 *
 * @param distanciaPx - Distância vertical absoluta a ser percorrida.
 * @param duracaoMinMs - Duração mínima em ms (padrão: 380).
 * @param duracaoMaxMs - Duração máxima em ms (padrão: 750).
 * @returns Duração calculada em milissegundos.
 */
export function calcularDuracaoRolagem(
  distanciaPx: number,
  duracaoMinMs: number = 380,
  duracaoMaxMs: number = 750
): number {
  const distanciaAbs = Math.abs(distanciaPx);
  if (distanciaAbs <= 0) return 0;
  const fator = Math.min(distanciaAbs / 2500, 1);
  return Math.round(duracaoMinMs + (duracaoMaxMs - duracaoMinMs) * Math.sqrt(fator));
}

/**
 * Executa uma rolagem animada com curva easeInOutCubic via requestAnimationFrame.
 *
 * Permite cancelamento caso o usuário intervenha manualmente (roda do mouse ou toque).
 *
 * @param posicaoFinal - Posição vertical de destino (px).
 * @param opcoes - Configurações opcionais de janela, duração, easing e callback.
 * @returns Função para cancelar a animação prematuramente.
 */
export function animarRolagemSuave(
  posicaoFinal: number,
  opcoes: OpcoesAnimacaoRolagem = {}
): () => void {
  const janela = opcoes.janela ?? (typeof window !== "undefined" ? window : undefined);
  if (!janela) {
    opcoes.onConcluir?.();
    return () => {};
  }

  const scrollAtual = janela.scrollY ?? (janela as unknown as { pageYOffset?: number }).pageYOffset ?? 0;
  const distancia = posicaoFinal - scrollAtual;

  if (Math.abs(distancia) < 1) {
    if (typeof janela.scrollTo === "function") {
      janela.scrollTo({ top: posicaoFinal, behavior: "auto" });
    }
    opcoes.onConcluir?.();
    return () => {};
  }

  const respeitarReducao = opcoes.respeitarMovimentoReduzido ?? false;
  if ((respeitarReducao && prefereMovimentoReduzido(janela)) || typeof janela.requestAnimationFrame !== "function") {
    if (typeof janela.scrollTo === "function") {
      janela.scrollTo({ top: posicaoFinal, behavior: "auto" });
    }
    opcoes.onConcluir?.();
    return () => {};
  }

  const duracao = opcoes.duracaoMs ?? calcularDuracaoRolagem(distancia);
  const easing = opcoes.funcaoEasing ?? easeInOutCubic;

  let cancelado = false;
  let animacaoId: number | null = null;
  let inicioTimestamp: number | null = null;

  const cancelar = () => {
    if (cancelado) return;
    cancelado = true;
    if (animacaoId !== null && typeof janela.cancelAnimationFrame === "function") {
      janela.cancelAnimationFrame(animacaoId);
    }
    removerListeners();
  };

  const removerListeners = () => {
    if (typeof janela.removeEventListener === "function") {
      janela.removeEventListener("wheel", cancelar);
      janela.removeEventListener("touchstart", cancelar);
    }
  };

  if (typeof janela.addEventListener === "function") {
    janela.addEventListener("wheel", cancelar, { passive: true });
    janela.addEventListener("touchstart", cancelar, { passive: true });
  }

  const passo = (timestamp: number) => {
    if (cancelado) return;
    if (inicioTimestamp === null) {
      inicioTimestamp = timestamp;
    }
    const decorrido = timestamp - inicioTimestamp;
    const progressoTempo = duracao > 0 ? Math.min(decorrido / duracao, 1) : 1;
    const progressoPosicao = easing(progressoTempo);
    const posAtual = scrollAtual + distancia * progressoPosicao;

    if (typeof janela.scrollTo === "function") {
      janela.scrollTo({ top: Math.round(posAtual), behavior: "auto" });
    }

    if (progressoTempo < 1) {
      animacaoId = janela.requestAnimationFrame(passo);
    } else {
      removerListeners();
      opcoes.onConcluir?.();
    }
  };

  animacaoId = janela.requestAnimationFrame(passo);
  return cancelar;
}

/**
 * Rola a página suavemente até a seção informada.
 *
 * - Utiliza a instância global do Lenis ou animação refinada com curva easeInOutCubic.
 * - Desativa cancelamento automático por flag de SO (respeitarMovimentoReduzido = false por padrão).
 * - O deslocamento do cabeçalho fixo é tratado via compensacaoTopoPx e `scroll-margin-top`.
 * - Atualiza o hash da URL com `history.replaceState` (não polui o histórico).
 * - Nunca lança exceções: retorna `false` em qualquer falha.
 *
 * @param id - Seção de destino.
 * @param opcoes - Dependências injetáveis e comportamento do hash.
 * @returns `true` se a rolagem foi disparada; `false` caso o elemento não exista ou ocorra erro.
 *
 * @example
 * <button onClick={() => rolarParaSecao("inicio")}>Agendar Agora</button>
 */
export function rolarParaSecao(id: SecaoLandingId, opcoes: OpcoesRolagem = {}): boolean {
  const {
    atualizarHash = true,
    suaveRefinado = true,
    compensacaoTopoPx = 72,
    respeitarMovimentoReduzido = false,
  } = opcoes;
  const documento = opcoes.documento ?? (typeof document !== "undefined" ? document : undefined);
  const janela = opcoes.janela ?? (typeof window !== "undefined" ? window : undefined);

  if (!documento) return false;

  try {
    const elemento = documento.getElementById(id);
    if (!elemento) {
      console.warn(`[landingPage] Seção "#${id}" não encontrada na página.`);
      return false;
    }

    const reducaoMovimento = Boolean(respeitarMovimentoReduzido && prefereMovimentoReduzido(janela));

    const lenisInstancia = (
      janela as unknown as {
        __lenis?: {
          scrollTo: (
            target: HTMLElement,
            opts: { offset: number; duration?: number; immediate?: boolean; force?: boolean }
          ) => void;
        };
      }
    )?.__lenis;

    if (reducaoMovimento) {
      if (typeof elemento.scrollIntoView === "function") {
        elemento.scrollIntoView({ behavior: "auto", block: "start" });
      } else if (janela && typeof janela.scrollTo === "function") {
        janela.scrollTo({ top: Math.max(0, elemento.offsetTop - compensacaoTopoPx), behavior: "auto" });
      }
    } else if (lenisInstancia && typeof lenisInstancia.scrollTo === "function") {
      lenisInstancia.scrollTo(elemento, {
        offset: -compensacaoTopoPx,
        duration: 0.85,
        immediate: false,
        force: true,
      });
    } else if (
      suaveRefinado &&
      janela &&
      typeof janela.requestAnimationFrame === "function" &&
      typeof janela.scrollTo === "function"
    ) {
      const scrollAtual = janela.scrollY ?? (janela as unknown as { pageYOffset?: number }).pageYOffset ?? 0;
      const rect = typeof elemento.getBoundingClientRect === "function" ? elemento.getBoundingClientRect() : null;
      const topoAbsoluto = rect ? rect.top + scrollAtual : elemento.offsetTop;
      const destinoY = Math.max(0, topoAbsoluto - compensacaoTopoPx);
      animarRolagemSuave(destinoY, { janela, respeitarMovimentoReduzido });
    } else if (typeof elemento.scrollIntoView === "function") {
      elemento.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (atualizarHash && janela?.history && typeof janela.history.replaceState === "function") {
      janela.history.replaceState(janela.history.state, "", `#${id}`);
    }

    return true;
  } catch (erro) {
    console.error(`[landingPage] Falha ao rolar até a seção "#${id}":`, erro);
    return false;
  }
}

/**
 * Monta um link "click to chat" do WhatsApp.
 *
 * @param numero - Número com DDI/DDD (caracteres não numéricos são ignorados).
 * @param mensagem - Mensagem opcional pré-preenchida.
 * @returns URL `https://wa.me/...` ou `null` se o número for inválido (menos de 10 dígitos).
 *
 * @example
 * montarLinkWhatsApp("+55 (11) 99999-8888", "Olá!");
 * // "https://wa.me/5511999998888?text=Ol%C3%A1!"
 */
export function montarLinkWhatsApp(numero: string, mensagem?: string): string | null {
  const digitos = (numero ?? "").replace(/\D/g, "");
  if (digitos.length < 10) return null;
  const base = `https://wa.me/${digitos}`;
  const texto = mensagem?.trim();
  return texto ? `${base}?text=${encodeURIComponent(texto)}` : base;
}

/**
 * Calcula o ano exibido no copyright do rodapé.
 *
 * @param agora - Data de referência (injeção para testes).
 * @returns Ano com 4 dígitos.
 */
export function getAnoCopyright(agora: Date = new Date()): number {
  return agora.getFullYear();
}

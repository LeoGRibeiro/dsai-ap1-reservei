import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  animarRolagemSuave,
  calcularDuracaoRolagem,
  deveExibirHeaderSolido,
  easeInOutCubic,
  extrairIdDoHash,
  getAnoCopyright,
  getPlaceholderDaSecao,
  getSecaoPorId,
  getSecoesDoMenu,
  isSecaoLandingId,
  LIMIAR_HEADER_SOLIDO_PX,
  montarLinkWhatsApp,
  prefereMovimentoReduzido,
  rolarParaSecao,
  selecionarSecaoAtiva,
} from "@/lib/landingPage/navegacao";
import type { SecaoLandingPage } from "@/lib/landingPage/types";

describe("landingPage/navegacao - getSecoesDoMenu", () => {
  it("retorna exatamente os links definidos na spec, na ordem correta", () => {
    expect(getSecoesDoMenu().map((s) => s.rotuloMenu)).toEqual([
      "Início",
      "Estrutura",
      "Escolinhas",
      "Eventos",
      "Contato",
    ]);
  });

  it("respeita um catálogo customizado e filtra seções fora do menu", () => {
    const catalogo: SecaoLandingPage[] = [
      { id: "inicio", rotuloMenu: "A", titulo: "", subtitulo: "", exibirNoMenu: false, specReferencia: "" },
      { id: "faq", rotuloMenu: "B", titulo: "", subtitulo: "", exibirNoMenu: true, specReferencia: "" },
    ];
    expect(getSecoesDoMenu(catalogo).map((s) => s.id)).toEqual(["faq"]);
  });

  it("retorna lista vazia para catálogo vazio", () => {
    expect(getSecoesDoMenu([])).toEqual([]);
  });
});

describe("landingPage/navegacao - getSecaoPorId / getPlaceholderDaSecao", () => {
  it("encontra a seção pelo id", () => {
    expect(getSecaoPorId("contato")?.titulo).toBe("Localização e Contato");
  });

  it("retorna null quando a seção não existe no catálogo informado", () => {
    expect(getSecaoPorId("contato", [])).toBeNull();
  });

  it("retorna os itens planejados de uma seção futura", () => {
    const placeholder = getPlaceholderDaSecao("fidelidade");
    expect(placeholder).not.toBeNull();
    expect(placeholder?.itensPlanejados.length).toBeGreaterThan(0);
  });

  it("não possui placeholder para a seção de reserva (já implementada)", () => {
    expect(getPlaceholderDaSecao("inicio")).toBeNull();
  });
});

describe("landingPage/navegacao - isSecaoLandingId / extrairIdDoHash", () => {
  it("valida ids conhecidos e rejeita desconhecidos", () => {
    expect(isSecaoLandingId("eventos")).toBe(true);
    expect(isSecaoLandingId("admin")).toBe(false);
    expect(isSecaoLandingId("")).toBe(false);
  });

  it("extrai o id normalizando '#', espaços e maiúsculas", () => {
    expect(extrairIdDoHash("#Estrutura")).toBe("estrutura");
    expect(extrairIdDoHash("  #contato ")).toBe("contato");
    expect(extrairIdDoHash("faq")).toBe("faq");
  });

  it("retorna null para hash vazio, nulo ou inválido", () => {
    expect(extrairIdDoHash("")).toBeNull();
    expect(extrairIdDoHash("#")).toBeNull();
    expect(extrairIdDoHash(null)).toBeNull();
    expect(extrairIdDoHash(undefined)).toBeNull();
    expect(extrairIdDoHash("#minha-conta")).toBeNull();
  });
});

describe("landingPage/navegacao - selecionarSecaoAtiva", () => {
  const ordem = ["inicio", "estrutura", "escolinhas"] as const;

  it("escolhe a seção com maior proporção visível", () => {
    expect(selecionarSecaoAtiva({ inicio: 0.1, estrutura: 0.7, escolinhas: 0.2 }, ordem, "inicio")).toBe(
      "estrutura"
    );
  });

  it("em caso de empate, prioriza a seção que vem primeiro na página", () => {
    expect(selecionarSecaoAtiva({ estrutura: 0.5, escolinhas: 0.5 }, ordem, "inicio")).toBe("estrutura");
  });

  it("mantém o fallback quando nenhuma seção está visível", () => {
    expect(selecionarSecaoAtiva({ inicio: 0, estrutura: 0 }, ordem, "escolinhas")).toBe("escolinhas");
    expect(selecionarSecaoAtiva({}, ordem, "inicio")).toBe("inicio");
  });

  it("ignora seções que não fazem parte da ordem informada", () => {
    expect(selecionarSecaoAtiva({ contato: 1, inicio: 0.2 }, ordem, "inicio")).toBe("inicio");
  });
});

describe("landingPage/navegacao - deveExibirHeaderSolido", () => {
  it("fica transparente no topo e sólido após o limiar padrão", () => {
    expect(deveExibirHeaderSolido(0)).toBe(false);
    expect(deveExibirHeaderSolido(LIMIAR_HEADER_SOLIDO_PX)).toBe(false);
    expect(deveExibirHeaderSolido(LIMIAR_HEADER_SOLIDO_PX + 1)).toBe(true);
  });

  it("aceita limiar customizado", () => {
    expect(deveExibirHeaderSolido(50, 100)).toBe(false);
    expect(deveExibirHeaderSolido(150, 100)).toBe(true);
  });

  it("trata valores inválidos como topo da página", () => {
    expect(deveExibirHeaderSolido(Number.NaN)).toBe(false);
    expect(deveExibirHeaderSolido(Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe("landingPage/navegacao - prefereMovimentoReduzido", () => {
  it("retorna false quando matchMedia não está disponível", () => {
    expect(prefereMovimentoReduzido({} as Window)).toBe(false);
  });

  it("lê a media query de movimento reduzido", () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: true });
    expect(prefereMovimentoReduzido({ matchMedia } as unknown as Window)).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
  });

  it("retorna false se matchMedia lançar erro", () => {
    const matchMedia = vi.fn(() => {
      throw new Error("boom");
    });
    expect(prefereMovimentoReduzido({ matchMedia } as unknown as Window)).toBe(false);
  });
});

describe("landingPage/navegacao - rolarParaSecao", () => {
  let scrollSpy: ReturnType<typeof vi.fn>;
  const scrollOriginal = Element.prototype.scrollIntoView;

  beforeEach(() => {
    scrollSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollSpy as unknown as typeof Element.prototype.scrollIntoView;
    document.body.innerHTML = '<section id="estrutura"></section>';
    window.history.replaceState(null, "", "/");
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    Element.prototype.scrollIntoView = scrollOriginal;
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("rola suavemente com animação refinada e atualiza o hash da URL por padrão", () => {
    const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    expect(rolarParaSecao("estrutura")).toBe(true);
    expect(scrollToSpy).toHaveBeenCalled();
    expect(window.location.hash).toBe("#estrutura");
  });

  it("utiliza scrollIntoView nativo quando suaveRefinado = false", () => {
    expect(rolarParaSecao("estrutura", { suaveRefinado: false })).toBe(true);
    expect(scrollSpy).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(window.location.hash).toBe("#estrutura");
  });

  it("não altera o hash quando atualizarHash = false", () => {
    rolarParaSecao("estrutura", { atualizarHash: false });
    expect(window.location.hash).toBe("");
  });

  it("usa rolagem instantânea apenas quando configurado para respeitar movimento reduzido", () => {
    const janela = {
      matchMedia: () => ({ matches: true }),
      history: window.history,
    } as unknown as Window;
    rolarParaSecao("estrutura", { janela, respeitarMovimentoReduzido: true });
    expect(scrollSpy).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
  });

  it("mantem animacao suave por padrao mesmo com prefers-reduced-motion no SO", () => {
    const scrollToMock = vi.fn();
    const janela = {
      matchMedia: () => ({ matches: true }),
      history: window.history,
      scrollY: 0,
      scrollTo: scrollToMock,
      requestAnimationFrame: vi.fn(),
    } as unknown as Window;
    rolarParaSecao("estrutura", { janela });
    expect(scrollSpy).not.toHaveBeenCalled();
    expect(scrollToMock).toHaveBeenCalled();
  });

  it("retorna false e avisa quando a seção não existe", () => {
    expect(rolarParaSecao("contato")).toBe(false);
    expect(scrollSpy).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
  });

  it("não lança exceção quando o scrollIntoView falha", () => {
    scrollSpy.mockImplementation(() => {
      throw new Error("falha de layout");
    });
    expect(() => rolarParaSecao("estrutura", { suaveRefinado: false })).not.toThrow();
    expect(rolarParaSecao("estrutura", { suaveRefinado: false })).toBe(false);
    expect(console.error).toHaveBeenCalled();
  });

  it("não lança exceção quando a animação customizada falha", () => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => {
      throw new Error("falha de scrollTo");
    });
    expect(() => rolarParaSecao("estrutura")).not.toThrow();
    expect(rolarParaSecao("estrutura")).toBe(false);
    expect(console.error).toHaveBeenCalled();
  });

  it("usa o documento injetado para localizar a seção", () => {
    const getElementById = vi.fn().mockReturnValue(null);
    const documento = { getElementById } as unknown as Document;
    expect(rolarParaSecao("faq", { documento })).toBe(false);
    expect(getElementById).toHaveBeenCalledWith("faq");
  });
});

describe("landingPage/navegacao - montarLinkWhatsApp", () => {
  it("remove caracteres não numéricos e codifica a mensagem", () => {
    expect(montarLinkWhatsApp("+55 (11) 99999-8888", "Olá!")).toBe(
      "https://wa.me/5511999998888?text=Ol%C3%A1!"
    );
  });

  it("gera link sem texto quando a mensagem é vazia", () => {
    expect(montarLinkWhatsApp("5511999998888")).toBe("https://wa.me/5511999998888");
    expect(montarLinkWhatsApp("5511999998888", "   ")).toBe("https://wa.me/5511999998888");
  });

  it("retorna null para números curtos ou vazios", () => {
    expect(montarLinkWhatsApp("123")).toBeNull();
    expect(montarLinkWhatsApp("")).toBeNull();
  });
});

describe("landingPage/navegacao - getAnoCopyright", () => {
  it("retorna o ano da data de referência", () => {
    expect(getAnoCopyright(new Date(2030, 0, 1))).toBe(2030);
  });
});

describe("landingPage/navegacao - easeInOutCubic", () => {
  it("retorna 0 para t <= 0 e 1 para t >= 1", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(-0.5)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(1.5)).toBe(1);
  });

  it("retorna exatamente 0.5 na metade do tempo (t = 0.5)", () => {
    expect(easeInOutCubic(0.5)).toBe(0.5);
  });

  it("apresenta progressão estritamente crescente e simétrica", () => {
    const v25 = easeInOutCubic(0.25);
    const v75 = easeInOutCubic(0.75);
    expect(v25).toBeLessThan(0.5);
    expect(v75).toBeGreaterThan(0.5);
    // Simetria central em torno de (0.5, 0.5)
    expect(Math.abs(v25 + v75 - 1)).toBeLessThan(1e-6);
  });

  it("garante aceleração suave no início e frenagem suave no final", () => {
    const taxaInicio = easeInOutCubic(0.1) - easeInOutCubic(0);
    const taxaMeio = easeInOutCubic(0.6) - easeInOutCubic(0.5);
    const taxaFim = easeInOutCubic(1) - easeInOutCubic(0.9);
    expect(taxaInicio).toBeLessThan(taxaMeio);
    expect(taxaFim).toBeLessThan(taxaMeio);
  });
});

describe("landingPage/navegacao - calcularDuracaoRolagem", () => {
  it("retorna 0 para distância zero ou nula", () => {
    expect(calcularDuracaoRolagem(0)).toBe(0);
    expect(calcularDuracaoRolagem(-0)).toBe(0);
  });

  it("considera o valor absoluto da distância (mesmo tempo descendo ou subindo)", () => {
    expect(calcularDuracaoRolagem(500)).toBe(calcularDuracaoRolagem(-500));
  });

  it("distâncias curtas têm duração reduzida e distâncias longas atingem o teto", () => {
    const dCurta = calcularDuracaoRolagem(150);
    const dMedia = calcularDuracaoRolagem(1000);
    const dLonga = calcularDuracaoRolagem(2500);
    const dMuitoLonga = calcularDuracaoRolagem(5000);

    expect(dCurta).toBeGreaterThanOrEqual(380);
    expect(dCurta).toBeLessThan(dMedia);
    expect(dMedia).toBeLessThan(dLonga);
    expect(dLonga).toBe(750);
    expect(dMuitoLonga).toBe(750);
  });

  it("aceita limites customizados de tempo", () => {
    expect(calcularDuracaoRolagem(2500, 200, 500)).toBe(500);
  });
});

describe("landingPage/navegacao - animarRolagemSuave", () => {
  it("executa rolagem instantânea e conclui imediatamente em movimento reduzido", () => {
    const scrollTo = vi.fn();
    const onConcluir = vi.fn();
    const janela = {
      scrollY: 100,
      scrollTo,
      matchMedia: () => ({ matches: true }),
      requestAnimationFrame: vi.fn(),
    } as unknown as Window;

    animarRolagemSuave(600, { janela, onConcluir, respeitarMovimentoReduzido: true });

    expect(scrollTo).toHaveBeenCalledWith({ top: 600, behavior: "auto" });
    expect(onConcluir).toHaveBeenCalled();
  });

  it("aplica rolagem direta e conclui imediatamente se a distância for inferior a 1px", () => {
    const scrollTo = vi.fn();
    const onConcluir = vi.fn();
    const janela = {
      scrollY: 500,
      scrollTo,
      requestAnimationFrame: vi.fn(),
    } as unknown as Window;

    animarRolagemSuave(500.4, { janela, onConcluir });

    expect(scrollTo).toHaveBeenCalledWith({ top: 500.4, behavior: "auto" });
    expect(onConcluir).toHaveBeenCalled();
  });

  it("itera frames até o destino e chama onConcluir ao término", () => {
    let frameCb: FrameRequestCallback | null = null;
    const requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
      frameCb = cb;
      return 1;
    });
    const scrollTo = vi.fn();
    const onConcluir = vi.fn();
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();

    const janela = {
      scrollY: 0,
      scrollTo,
      requestAnimationFrame,
      addEventListener,
      removeEventListener,
    } as unknown as Window;

    animarRolagemSuave(1000, { janela, duracaoMs: 400, onConcluir });

    expect(requestAnimationFrame).toHaveBeenCalled();
    expect(addEventListener).toHaveBeenCalledWith("wheel", expect.any(Function), { passive: true });

    // Primeiro frame (timestamp = 0)
    frameCb!(0);
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "auto" });

    // Frame intermediário (timestamp = 200ms -> t=0.5 -> pos=500)
    frameCb!(200);
    expect(scrollTo).toHaveBeenCalledWith({ top: 500, behavior: "auto" });

    // Frame final (timestamp = 400ms -> t=1 -> pos=1000)
    frameCb!(400);
    expect(scrollTo).toHaveBeenCalledWith({ top: 1000, behavior: "auto" });
    expect(onConcluir).toHaveBeenCalled();
    expect(removeEventListener).toHaveBeenCalledWith("wheel", expect.any(Function));
  });

  it("cancela a animação quando o usuário gira a roda do mouse", () => {
    const cancelAnimationFrame = vi.fn();
    const listeners: Record<string, () => void> = {};
    const addEventListener = vi.fn((ev: string, fn: () => void) => {
      listeners[ev] = fn;
    });

    const janela = {
      scrollY: 0,
      scrollTo: vi.fn(),
      requestAnimationFrame: vi.fn(() => 42),
      cancelAnimationFrame,
      addEventListener,
      removeEventListener: vi.fn(),
    } as unknown as Window;

    animarRolagemSuave(800, { janela });
    expect(listeners.wheel).toBeDefined();

    listeners.wheel();
    expect(cancelAnimationFrame).toHaveBeenCalledWith(42);
  });
});


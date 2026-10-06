import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSecaoAtiva } from "@/hooks/useSecaoAtiva";
import type { SecaoLandingId } from "@/lib/landingPage/types";

type CallbackIO = (entries: Partial<IntersectionObserverEntry>[]) => void;

/** Dublê de IntersectionObserver que permite disparar interseções manualmente. */
class IntersectionObserverFake {
  static instancias: IntersectionObserverFake[] = [];
  readonly observados: Element[] = [];
  readonly disconnect = vi.fn();
  constructor(
    public readonly callback: CallbackIO,
    public readonly opcoes?: IntersectionObserverInit
  ) {
    IntersectionObserverFake.instancias.push(this);
  }
  observe(elemento: Element) {
    this.observados.push(elemento);
  }
  unobserve() {}
  takeRecords() {
    return [];
  }
  disparar(entries: { id: string; ratio: number; visivel?: boolean }[]) {
    this.callback(
      entries.map(({ id, ratio, visivel = ratio > 0 }) => ({
        target: document.getElementById(id) as Element,
        intersectionRatio: ratio,
        isIntersecting: visivel,
      }))
    );
  }
}

const IDS: SecaoLandingId[] = ["inicio", "estrutura", "contato"];
const ioOriginal = (window as unknown as { IntersectionObserver?: unknown }).IntersectionObserver;

function instalarIO(valor: unknown) {
  Object.defineProperty(window, "IntersectionObserver", {
    value: valor,
    writable: true,
    configurable: true,
  });
}

describe("useSecaoAtiva", () => {
  beforeEach(() => {
    IntersectionObserverFake.instancias = [];
    document.body.innerHTML = IDS.map((id) => `<section id="${id}"></section>`).join("");
    instalarIO(IntersectionObserverFake);
  });

  afterEach(() => {
    instalarIO(ioOriginal);
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("retorna a primeira seção como estado inicial", () => {
    const { result } = renderHook(() => useSecaoAtiva(IDS));
    expect(result.current).toBe("inicio");
  });

  it("observa todas as seções existentes no DOM", () => {
    renderHook(() => useSecaoAtiva(IDS));
    const io = IntersectionObserverFake.instancias[0];
    expect(io.observados.map((el) => el.id)).toEqual(IDS);
  });

  it("ignora seções que não existem no DOM", () => {
    document.getElementById("contato")?.remove();
    renderHook(() => useSecaoAtiva(IDS));
    const io = IntersectionObserverFake.instancias[0];
    expect(io.observados.map((el) => el.id)).toEqual(["inicio", "estrutura"]);
  });

  it("atualiza para a seção mais visível", () => {
    const { result } = renderHook(() => useSecaoAtiva(IDS));
    const io = IntersectionObserverFake.instancias[0];

    act(() => io.disparar([{ id: "inicio", ratio: 0.2 }, { id: "estrutura", ratio: 0.8 }]));
    expect(result.current).toBe("estrutura");

    act(() => io.disparar([{ id: "estrutura", ratio: 0 }, { id: "contato", ratio: 0.5 }]));
    expect(result.current).toBe("contato");
  });

  it("mantém a seção atual quando nada está visível", () => {
    const { result } = renderHook(() => useSecaoAtiva(IDS));
    const io = IntersectionObserverFake.instancias[0];

    act(() => io.disparar([{ id: "estrutura", ratio: 0.6 }]));
    act(() => io.disparar([{ id: "estrutura", ratio: 0 }]));
    expect(result.current).toBe("estrutura");
  });

  it("repassa rootMargin e thresholds customizados", () => {
    renderHook(() => useSecaoAtiva(IDS, { rootMargin: "0px", thresholds: [0.5] }));
    const io = IntersectionObserverFake.instancias[0];
    expect(io.opcoes).toEqual({ rootMargin: "0px", threshold: [0.5] });
  });

  it("desconecta o observer ao desmontar", () => {
    const { unmount } = renderHook(() => useSecaoAtiva(IDS));
    const io = IntersectionObserverFake.instancias[0];
    unmount();
    expect(io.disconnect).toHaveBeenCalled();
  });

  it("funciona sem IntersectionObserver (fallback estável)", () => {
    instalarIO(undefined);
    const { result } = renderHook(() => useSecaoAtiva(IDS));
    expect(result.current).toBe("inicio");
  });

  it("não quebra se o IntersectionObserver lançar erro na criação", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    instalarIO(
      class {
        constructor() {
          throw new Error("não suportado");
        }
      }
    );
    const { result } = renderHook(() => useSecaoAtiva(IDS));
    expect(result.current).toBe("inicio");
    expect(console.error).toHaveBeenCalled();
  });

  it("retorna null para lista vazia", () => {
    const { result } = renderHook(() => useSecaoAtiva([]));
    expect(result.current).toBeNull();
  });
});

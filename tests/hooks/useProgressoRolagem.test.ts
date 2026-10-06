import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useProgressoRolagem } from "@/hooks/useProgressoRolagem";

describe("useProgressoRolagem - Hook", () => {
  const originalScrollY = window.scrollY;
  const originalInnerHeight = window.innerHeight;

  beforeEach(() => {
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: 800,
    });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      writable: true,
      configurable: true,
      value: 2400,
    });
    Object.defineProperty(window, "scrollY", {
      writable: true,
      configurable: true,
      value: 0,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: originalInnerHeight,
    });
    Object.defineProperty(window, "scrollY", {
      writable: true,
      configurable: true,
      value: originalScrollY,
    });
    vi.restoreAllMocks();
  });

  it("inicia em 0% quando no topo da pagina", () => {
    const { result } = renderHook(() => useProgressoRolagem());
    expect(result.current).toBe(0);
  });

  it("calcula 50% quando rolado ate a metade da distancia util", () => {
    // scrollHeight: 2400, innerHeight: 800 => alturaUtil = 1600. Metade = 800
    Object.defineProperty(window, "scrollY", { value: 800, configurable: true });

    const { result } = renderHook(() => useProgressoRolagem());
    expect(result.current).toBe(50);
  });

  it("calcula 100% quando no fim da pagina", () => {
    Object.defineProperty(window, "scrollY", { value: 1600, configurable: true });

    const { result } = renderHook(() => useProgressoRolagem());
    expect(result.current).toBe(100);
  });

  it("atualiza o percentual dinamicamente ao disparar evento de scroll", () => {
    const { result } = renderHook(() => useProgressoRolagem());
    expect(result.current).toBe(0);

    act(() => {
      Object.defineProperty(window, "scrollY", { value: 400, configurable: true });
      window.dispatchEvent(new Event("scroll"));
    });

    expect(result.current).toBe(25);
  });

  it("trata pagina sem rolagem retornando 0%", () => {
    Object.defineProperty(document.documentElement, "scrollHeight", {
      writable: true,
      configurable: true,
      value: 800,
    });

    const { result } = renderHook(() => useProgressoRolagem());
    expect(result.current).toBe(0);
  });
});

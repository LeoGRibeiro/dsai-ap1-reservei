import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useHeaderRolado } from "@/hooks/useHeaderRolado";

function definirScrollY(valor: number) {
  Object.defineProperty(window, "scrollY", { value: valor, writable: true, configurable: true });
}

describe("useHeaderRolado", () => {
  afterEach(() => {
    definirScrollY(0);
    vi.restoreAllMocks();
  });

  it("inicia como false quando a página está no topo", () => {
    definirScrollY(0);
    const { result } = renderHook(() => useHeaderRolado());
    expect(result.current).toBe(false);
  });

  it("inicia como true se a página já carregou rolada", () => {
    definirScrollY(400);
    const { result } = renderHook(() => useHeaderRolado());
    expect(result.current).toBe(true);
  });

  it("alterna conforme o usuário rola a página", () => {
    definirScrollY(0);
    const { result } = renderHook(() => useHeaderRolado());

    act(() => {
      definirScrollY(200);
      window.dispatchEvent(new Event("scroll"));
    });
    expect(result.current).toBe(true);

    act(() => {
      definirScrollY(0);
      window.dispatchEvent(new Event("scroll"));
    });
    expect(result.current).toBe(false);
  });

  it("respeita limiar customizado", () => {
    definirScrollY(50);
    const { result } = renderHook(() => useHeaderRolado(100));
    expect(result.current).toBe(false);

    act(() => {
      definirScrollY(150);
      window.dispatchEvent(new Event("scroll"));
    });
    expect(result.current).toBe(true);
  });

  it("registra listener passivo e remove ao desmontar", () => {
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useHeaderRolado());

    expect(add).toHaveBeenCalledWith("scroll", expect.any(Function), { passive: true });
    unmount();
    expect(remove).toHaveBeenCalledWith("scroll", expect.any(Function));
  });
});

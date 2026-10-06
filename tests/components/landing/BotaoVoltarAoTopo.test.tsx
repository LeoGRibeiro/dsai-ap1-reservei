import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BotaoVoltarAoTopo } from "@/components/landing/BotaoVoltarAoTopo";

function definirScrollY(valor: number) {
  Object.defineProperty(window, "scrollY", { value: valor, writable: true, configurable: true });
}

describe("BotaoVoltarAoTopo - Componente", () => {
  let scrollToSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    definirScrollY(0);
    window.history.replaceState(null, "", "/");
    document.body.innerHTML = '<section id="inicio"></section>';
  });

  afterEach(() => {
    definirScrollY(0);
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("inicia invisível e com tabIndex negativo no topo da página", () => {
    render(<BotaoVoltarAoTopo />);
    const botao = screen.getByRole("button", { hidden: true });
    expect(botao).toHaveAttribute("aria-hidden", "true");
    expect(botao).toHaveAttribute("tabindex", "-1");
    expect(botao.className).toContain("opacity-0");
  });

  it("torna-se visível e interativo após rolar além do limiar padrão (400px)", () => {
    render(<BotaoVoltarAoTopo />);
    const botao = screen.getByRole("button", { hidden: true });

    act(() => {
      definirScrollY(450);
      window.dispatchEvent(new Event("scroll"));
    });

    expect(botao).toHaveAttribute("aria-hidden", "false");
    expect(botao).toHaveAttribute("tabindex", "0");
    expect(botao.className).toContain("opacity-100");
    expect(botao.className).toContain("pointer-events-auto");
  });

  it("respeita limiar customizado via prop", () => {
    render(<BotaoVoltarAoTopo limiarPx={200} />);
    const botao = screen.getByRole("button", { hidden: true });

    act(() => {
      definirScrollY(250);
      window.dispatchEvent(new Event("scroll"));
    });

    expect(botao).toHaveAttribute("aria-hidden", "false");
    expect(botao.className).toContain("opacity-100");
  });

  it("ao ser clicado, rola suavemente de volta para a seção de início (#inicio)", async () => {
    render(<BotaoVoltarAoTopo />);
    act(() => {
      definirScrollY(600);
      window.dispatchEvent(new Event("scroll"));
    });

    const botao = screen.getByRole("button", { name: "Voltar ao início da página" });
    fireEvent.click(botao);

    await waitFor(() => {
      expect(scrollToSpy).toHaveBeenCalled();
    });
    expect(window.location.hash).toBe("#inicio");
  });
});

import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LandingSecoesPlaceholder } from "@/components/landing/LandingSecoesPlaceholder";
import { CabecalhoReserva, ID_TITULO_RESERVA } from "@/components/landing/CabecalhoReserva";
import { PLACEHOLDERS_SECOES, SECOES_LANDING_PAGE } from "@/lib/landingPage/secoes";
import type { PlaceholderSecao } from "@/lib/landingPage/types";

describe("LandingSecoesPlaceholder - Componente", () => {
  it("renderiza uma seção para cada área futura, na ordem do catálogo", () => {
    const { container } = render(<LandingSecoesPlaceholder />);
    const ids = Array.from(container.querySelectorAll("section")).map((s) => s.id);
    const esperados = PLACEHOLDERS_SECOES.map((p) => p.secaoId);
    expect(ids).toEqual(esperados);
  });

  it("não renderiza a seção de reserva (ela vive no PortalCliente)", () => {
    const { container } = render(<LandingSecoesPlaceholder />);
    expect(container.querySelector("#inicio")).toBeNull();
  });

  it("cada seção possui h2 ligado por aria-labelledby e âncora compensando o header", () => {
    const { container } = render(<LandingSecoesPlaceholder />);
    for (const section of Array.from(container.querySelectorAll("section"))) {
      const tituloId = section.getAttribute("aria-labelledby");
      expect(tituloId).toBe(`${section.id}-titulo`);
      const titulo = container.querySelector(`#${tituloId}`);
      expect(titulo?.tagName).toBe("H2");
      expect(section.className).toContain("scroll-mt-20");
    }
  });

  it("exibe o selo 'Em construção' e os itens planejados de cada seção", () => {
    render(<LandingSecoesPlaceholder />);
    for (const placeholder of PLACEHOLDERS_SECOES) {
      const card = screen.getByTestId(`placeholder-${placeholder.secaoId}`);
      expect(within(card).getByText("Em construção")).toBeInTheDocument();
      for (const item of placeholder.itensPlanejados) {
        expect(within(card).getByText(item)).toBeInTheDocument();
      }
    }
  });

  it("exibe a seção de Fidelidade com destaque do programa", () => {
    render(<LandingSecoesPlaceholder />);
    expect(screen.getByRole("heading", { level: 2, name: "Programa de Fidelidade" })).toBeInTheDocument();
  });

  it("referencia a spec responsável em cada placeholder", () => {
    render(<LandingSecoesPlaceholder />);
    const card = screen.getByTestId("placeholder-eventos");
    expect(card).toHaveAttribute("data-spec", "SPEC/2026-10-06-lp-eventos-fidelidade.md");
  });

  it("omite seções que já não possuem placeholder (já implementadas)", () => {
    const parciais: PlaceholderSecao[] = PLACEHOLDERS_SECOES.filter((p) => p.secaoId !== "eventos");
    const { container } = render(<LandingSecoesPlaceholder placeholders={parciais} />);
    expect(container.querySelector("#eventos")).toBeNull();
    expect(container.querySelector("#fidelidade")).not.toBeNull();
  });

  it("alterna o fundo destacado entre seções consecutivas", () => {
    const { container } = render(<LandingSecoesPlaceholder />);
    const secoes = Array.from(container.querySelectorAll("section"));
    expect(secoes[0].className).toContain("bg-slate-900/30");
    expect(secoes[1].className).not.toContain("bg-slate-900/30");
  });
});

describe("CabecalhoReserva - Componente", () => {
  it("renderiza o único h1 da página com o título da reserva", () => {
    render(<CabecalhoReserva />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("Agende sua quadra agora");
    expect(h1).toHaveAttribute("id", ID_TITULO_RESERVA);
  });
});

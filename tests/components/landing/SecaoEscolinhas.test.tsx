import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SecaoEscolinhas } from "@/components/landing/SecaoEscolinhas";
import { SECAO_IDS } from "@/lib/landingPage/secoes";

describe("SecaoEscolinhas - Componente", () => {
  it("renderiza a seção com id de ancoragem e cabeçalho h2", () => {
    const { container } = render(<SecaoEscolinhas />);
    const section = container.querySelector(`section#${SECAO_IDS.ESCOLINHAS}`);
    expect(section).not.toBeNull();
    expect(section).toHaveAttribute("aria-labelledby", "escolinhas-titulo");

    const h2 = screen.getByRole("heading", { level: 2, name: "Escolinhas e Aulas Esportivas" });
    expect(h2).toBeInTheDocument();
  });

  it("renderiza os cards com as modalidades iniciais e professores", () => {
    render(<SecaoEscolinhas />);
    expect(screen.getByText("Tênis de Campo")).toBeInTheDocument();
    expect(screen.getByText("Prof. Rodrigo Alencar")).toBeInTheDocument();

    expect(screen.getByText("Beach Tennis")).toBeInTheDocument();
    expect(screen.getByText("Profª. Camila Duarte")).toBeInTheDocument();

    expect(screen.getByText("Futebol Society Kids")).toBeInTheDocument();
    expect(screen.getByText("Prof. Marcos Silveira")).toBeInTheDocument();
  });

  it("cada card possui botão WhatsApp com target blank e texto preformatado", () => {
    render(<SecaoEscolinhas />);
    const botoes = screen.getAllByRole("link", { name: /Agendar Aula Experimental/i });
    expect(botoes.length).toBeGreaterThanOrEqual(3);

    for (const btn of botoes) {
      expect(btn).toHaveAttribute("target", "_blank");
      expect(btn).toHaveAttribute("href");
      const href = btn.getAttribute("href") || "";
      expect(href).toContain("https://wa.me/");
      expect(href).toContain("aula");
    }
  });
});

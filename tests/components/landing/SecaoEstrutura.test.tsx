import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SecaoEstrutura } from "@/components/landing/SecaoEstrutura";
import { SECAO_IDS } from "@/lib/landingPage/secoes";

describe("SecaoEstrutura - Componente", () => {
  it("renderiza a seção com id de ancoragem e cabeçalho h2", () => {
    const { container } = render(<SecaoEstrutura />);
    const section = container.querySelector(`section#${SECAO_IDS.ESTRUTURA}`);
    expect(section).not.toBeNull();
    expect(section).toHaveAttribute("aria-labelledby", "estrutura-titulo");

    const h2 = screen.getByRole("heading", { level: 2, name: "O Local e Estrutura" });
    expect(h2).toBeInTheDocument();
  });

  it("renderiza os botões de filtros de categoria", () => {
    render(<SecaoEstrutura />);
    expect(screen.getByRole("button", { name: "Todas as Áreas" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quadras" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sports Bar & Lounge" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Vestiários" })).toBeInTheDocument();
  });

  it("filtra as fotos ao clicar na aba Quadras", () => {
    render(<SecaoEstrutura />);
    const btnQuadras = screen.getByRole("button", { name: "Quadras" });
    fireEvent.click(btnQuadras);

    expect(screen.getByText("Quadras de Saibro Profissionais")).toBeInTheDocument();
    expect(screen.queryByText("Vestiários Climatizados & Armários")).toBeNull();
  });

  it("abre o modal lightbox ao clicar em um card e permite fechar", () => {
    render(<SecaoEstrutura />);
    const card = screen.getByText("Quadras de Saibro Profissionais");
    fireEvent.click(card);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();

    const btnFechar = screen.getByLabelText("Fechar visualização");
    fireEvent.click(btnFechar);

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("não exibe o texto 'Instalação oficial' e mantém o botão 'Ver detalhes →'", () => {
    render(<SecaoEstrutura />);
    expect(screen.queryByText(/Instalação oficial/i)).toBeNull();
    expect(screen.getAllByText("Ver detalhes →").length).toBeGreaterThan(0);
  });
});

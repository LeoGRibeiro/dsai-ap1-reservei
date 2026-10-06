import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminInstitucionalPage } from "@/components/admin/AdminInstitucionalPage";

describe("AdminInstitucionalPage - Painel de Gestão", () => {
  it("renderiza o título da página e as abas Galeria e Escolinhas", async () => {
    render(<AdminInstitucionalPage />);
    const heading = await screen.findByRole("heading", { name: "Conteúdo Institucional" });
    expect(heading).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Galeria do Complexo/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Escolinhas da LP/i })).toBeInTheDocument();
  });

  it("abre a aba de escolinhas ao clicar no botão correspondente", async () => {
    render(<AdminInstitucionalPage />);
    const abaEscolinhas = await screen.findByRole("button", { name: /Escolinhas da LP/i });
    fireEvent.click(abaEscolinhas);

    expect(screen.getByText(/Modalidades e turmas exibidas na seção/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Nova Escolinha/i })).toBeInTheDocument();
  });

  it("abre o modal de nova foto ao clicar em Adicionar Foto", async () => {
    render(<AdminInstitucionalPage />);
    const btnNovaFoto = await screen.findByRole("button", { name: /Adicionar Foto/i });
    fireEvent.click(btnNovaFoto);

    expect(screen.getByRole("heading", { name: "Nova Foto da Estrutura" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ex: Nossas Quadras de Saibro")).toBeInTheDocument();
  });

  it("exibe o botão de sincronização com a agenda e abre o modal de nova escolinha", async () => {
    render(<AdminInstitucionalPage />);
    const abaEscolinhas = await screen.findByRole("button", { name: /Escolinhas da LP/i });
    fireEvent.click(abaEscolinhas);

    // Botão de sincronizar
    const btnSincronizar = screen.getByRole("button", { name: /Sincronizar com Agenda/i });
    expect(btnSincronizar).toBeInTheDocument();

    // Abrir modal de nova escolinha
    const btnNovaEscolinha = screen.getByRole("button", { name: /Nova Escolinha/i });
    fireEvent.click(btnNovaEscolinha);

    expect(screen.getByRole("heading", { name: "Nova Escolinha" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ex: Tênis de Campo")).toBeInTheDocument();
  });
});

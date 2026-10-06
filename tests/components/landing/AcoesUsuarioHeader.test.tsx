import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AcoesUsuarioHeader } from "@/components/landing/AcoesUsuarioHeader";

// Mock do next/link
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

let mockUser: { id: string; nome: string; telefone: string } | null = null;

vi.mock("@/hooks/useUserAuth", () => ({
  useUserAuth: () => ({
    user: mockUser,
    isAutenticado: Boolean(mockUser),
  }),
}));

describe("AcoesUsuarioHeader - Componente", () => {
  beforeEach(() => {
    mockUser = null;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza botoes Entrar e Criar Conta quando visitante nao autenticado com altura padronizada h-9", () => {
    render(<AcoesUsuarioHeader />);

    const btnEntrar = screen.getByText("Entrar");
    const btnCriarConta = screen.getByText("Criar Conta");

    expect(btnEntrar).toBeInTheDocument();
    expect(btnCriarConta).toBeInTheDocument();
    expect(document.getElementById("header-entrar")).toHaveAttribute("href", "/login");
    expect(document.getElementById("header-criar-conta")).toHaveAttribute("href", "/cadastro");

    // Valida altura padronizada h-9
    expect(btnEntrar.closest("button")).toHaveClass("h-9");
    expect(btnCriarConta.closest("button")).toHaveClass("h-9");
    expect(screen.queryByText("Minhas Reservas")).not.toBeInTheDocument();
  });

  it("renderiza botao de Minhas Reservas e link direto de perfil com altura h-9", () => {
    mockUser = { id: "u1", nome: "Rafaella Silva", telefone: "11987654321" };
    render(<AcoesUsuarioHeader />);

    // Botão de Minhas Reservas destacado
    const linkReservas = document.getElementById("header-minha-conta");
    expect(linkReservas).toBeInTheDocument();
    expect(linkReservas).toHaveAttribute("href", "/minha-conta");
    const btnReservas = screen.getByText("Minhas Reservas").closest("button");
    expect(btnReservas).toBeInTheDocument();
    expect(btnReservas).toHaveClass("h-9");

    // Botão de perfil que leva diretamente à página de perfil (/minha-conta)
    const linkPerfil = document.getElementById("header-usuario-perfil");
    expect(linkPerfil).toBeInTheDocument();
    expect(linkPerfil).toHaveAttribute("href", "/minha-conta");

    const btnPerfil = screen.getByText("Rafaella").closest("button");
    expect(btnPerfil).toBeInTheDocument();
    expect(btnPerfil).toHaveClass("h-9");
    expect(screen.getByText("R")).toBeInTheDocument();
  });
});

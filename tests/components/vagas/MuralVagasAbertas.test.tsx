import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MuralVagasAbertas } from "@/components/vagas/MuralVagasAbertas";
import type { VagaDisponivelItem } from "@/lib/vagas/types";

// Mocks

const mockVagasState = {
  vagasDisponiveis: [] as VagaDisponivelItem[],
  temInteresseRegistrado: vi.fn(),
  demonstrarInteresse: vi.fn(),
};

vi.mock("@/hooks/useVagasService", () => ({
  useVagasService: () => mockVagasState,
}));

let mockUserAuth: { user: { id: string; nome: string; telefone: string } | null } = {
  user: null,
};

vi.mock("@/hooks/useUserAuth", () => ({
  useUserAuth: () => mockUserAuth,
}));

describe("MuralVagasAbertas - Componente", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVagasState.vagasDisponiveis = [];
    mockVagasState.temInteresseRegistrado.mockReturnValue(false);
    mockUserAuth = { user: null };
  });

  it("renderiza mensagem informativa quando não existem vagas abertas", () => {
    render(<MuralVagasAbertas />);
    expect(screen.getByText("Mural de Vagas da Galera")).toBeInTheDocument();
    expect(
      screen.getByText(/Nenhum time precisando de jogadores no momento/i)
    ).toBeInTheDocument();
  });

  it("renderiza cards com informações das partidas quando há vagas abertas", () => {
    mockVagasState.vagasDisponiveis = [
      {
        reservaId: "r1",
        data: "2026-10-15",
        horaInicio: "19:00",
        horaFim: "20:00",
        quadraId: "1",
        quadraNumero: 1,
        quadraDescricao: "Quadra 1 (Futebol Society)",
        esporte: "Futebol",
        organizadorId: "usr_org_1",
        organizadorNome: "Carlos Alberto",
        vagasAbertas: 2,
        totalInteressados: 1,
      },
    ];

    render(<MuralVagasAbertas />);

    expect(screen.getByText("Vagas Abertas na Arena")).toBeInTheDocument();
    expect(screen.getByText("Quadra 1 (Futebol Society)")).toBeInTheDocument();
    expect(screen.getByText("2 vagas")).toBeInTheDocument();
    expect(screen.getByText("Quero Jogar")).toBeInTheDocument();
  });

  it("indica 'Sua partida' quando o usuário logado é o próprio organizador", () => {
    mockUserAuth = {
      user: { id: "usr_org_1", nome: "Carlos", telefone: "11999998888" },
    };

    mockVagasState.vagasDisponiveis = [
      {
        reservaId: "r1",
        data: "2026-10-15",
        horaInicio: "19:00",
        horaFim: "20:00",
        quadraId: "1",
        quadraNumero: 1,
        quadraDescricao: "Quadra 1",
        esporte: "Futebol",
        organizadorId: "usr_org_1",
        organizadorNome: "Carlos",
        vagasAbertas: 2,
        totalInteressados: 0,
      },
    ];

    render(<MuralVagasAbertas />);
    expect(screen.getByText("Sua partida")).toBeInTheDocument();
    expect(screen.queryByText("Quero Jogar")).not.toBeInTheDocument();
  });

  it("indica 'Interesse enviado' quando o usuário já registrou interesse na vaga", () => {
    mockUserAuth = {
      user: { id: "usr_jogador_2", nome: "Lucas", telefone: "11977776666" },
    };
    mockVagasState.temInteresseRegistrado.mockReturnValue(true);

    mockVagasState.vagasDisponiveis = [
      {
        reservaId: "r1",
        data: "2026-10-15",
        horaInicio: "19:00",
        horaFim: "20:00",
        quadraId: "1",
        quadraNumero: 1,
        quadraDescricao: "Quadra 1",
        esporte: "Futebol",
        organizadorId: "usr_outro",
        organizadorNome: "Marcos",
        vagasAbertas: 1,
        totalInteressados: 1,
      },
    ];

    render(<MuralVagasAbertas />);
    expect(screen.getByText("Interesse enviado")).toBeInTheDocument();
    expect(screen.queryByText("Quero Jogar")).not.toBeInTheDocument();
  });
});

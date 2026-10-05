import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ModalGerenciarVagas } from "@/components/vagas/ModalGerenciarVagas";
import type { Reserva } from "@/store/useReservasStore";
import type { InteresseVaga } from "@/lib/vagas/types";

const mockVagasService = {
  abrirVagas: vi.fn(),
  fecharVagas: vi.fn(),
  atualizarQuantidadeVagas: vi.fn(),
  getInteressadosReserva: vi.fn(),
  atualizarStatusInteresse: vi.fn(),
};

vi.mock("@/hooks/useVagasService", () => ({
  useVagasService: () => mockVagasService,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("ModalGerenciarVagas - Componente", () => {
  const reservaMock: Reserva = {
    id: "rsv_teste_gerenciar",
    quadraId: "1",
    nomeCliente: "Organizador Principal",
    whatsappCliente: "11988887777",
    cpfCliente: "",
    data: "2026-10-20",
    horarios: ["19:00"],
    horaInicio: "19:00",
    horaFim: "20:00",
    valorTotal: 100,
    valorSinal: 40,
    valorPendente: 60,
    status: "confirmada",
    statusWhatsApp: "nao_enviado",
    criadaEm: "2026-10-01T10:00:00Z",
    esporte: "Futebol",
    permiteVagas: true,
    vagasAbertas: 2,
  };

  const interessadosMock: InteresseVaga[] = [
    {
      id: "int_1",
      reservaId: reservaMock.id,
      usuarioId: "usr_int_1",
      nomeUsuario: "Matheus Pereira",
      telefoneUsuario: "11912345678",
      status: "pendente",
      criadoEm: "2026-10-02T12:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockVagasService.getInteressadosReserva.mockReturnValue(interessadosMock);
    mockVagasService.abrirVagas.mockResolvedValue({ sucesso: true });
    mockVagasService.fecharVagas.mockResolvedValue({ sucesso: true });
  });

  it("renderiza modal aberto com resumo da partida e interessados", () => {
    render(
      <ModalGerenciarVagas
        open={true}
        onClose={vi.fn()}
        reserva={reservaMock}
      />
    );

    expect(screen.getByText("Gerenciar Vagas da Partida")).toBeInTheDocument();
    expect(screen.getByText(/2 vaga\(s\) ativa\(s\)/i)).toBeInTheDocument();
    expect(screen.getByText("Matheus Pereira")).toBeInTheDocument();
    expect(screen.getByText("Chamar no WhatsApp")).toBeInTheDocument();
  });

  it("permite alterar a quantidade de vagas pelos botões de incremento", () => {
    render(
      <ModalGerenciarVagas
        open={true}
        onClose={vi.fn()}
        reserva={reservaMock}
      />
    );

    // Initial value is 2 vagas
    expect(screen.getByText("2 vagas")).toBeInTheDocument();

    // Encontra botões de mais e menos
    const buttons = screen.getAllByRole("button");
    const minusBtn = buttons.find((b) => b.querySelector("svg.lucide-minus"));
    const plusBtn = buttons.find((b) => b.querySelector("svg.lucide-plus"));

    expect(plusBtn).toBeDefined();
    if (plusBtn) fireEvent.click(plusBtn);

    expect(screen.getByText("3 vagas")).toBeInTheDocument();

    if (minusBtn) {
      fireEvent.click(minusBtn);
      fireEvent.click(minusBtn);
    }

    expect(screen.getByText("1 vaga")).toBeInTheDocument();
  });

  it("chama abrirVagas com quantidade atualizada ao submeter formulário", async () => {
    const onClose = vi.fn();
    render(
      <ModalGerenciarVagas
        open={true}
        onClose={onClose}
        reserva={reservaMock}
      />
    );

    // Clica no checkbox dos termos se ainda não estiver marcado
    const checkbox = screen.getByRole("checkbox");
    if (!(checkbox as HTMLInputElement).checked) {
      fireEvent.click(checkbox);
    }

    const salvarBtn = screen.getByText("Atualizar Vagas");
    fireEvent.click(salvarBtn);

    await waitFor(() => {
      expect(mockVagasService.abrirVagas).toHaveBeenCalledWith(
        reservaMock.id,
        2,
        true
      );
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("chama fecharVagas ao clicar no botão Fechar Vagas", async () => {
    const onClose = vi.fn();
    render(
      <ModalGerenciarVagas
        open={true}
        onClose={onClose}
        reserva={reservaMock}
      />
    );

    const fecharBtn = screen.getByText("Fechar Vagas (Não Aceitar Mais)");
    fireEvent.click(fecharBtn);

    await waitFor(() => {
      expect(mockVagasService.fecharVagas).toHaveBeenCalledWith(reservaMock.id);
      expect(onClose).toHaveBeenCalled();
    });
  });
});

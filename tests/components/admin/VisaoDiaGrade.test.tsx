import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { VisaoDiaGrade } from "@/components/admin/agenda/VisaoDiaGrade";
import type { Reserva } from "@/store/useReservasStore";

// Mock do hook useReservasService
const mockRemoverBloqueio = vi.fn().mockResolvedValue(true);
vi.mock("@/hooks/useReservasService", () => ({
  useReservasService: () => ({
    reservas: [
      {
        id: "rsv_manual_1",
        quadraId: "q1",
        nomeCliente: "Reserva VIP do Diretor",
        whatsappCliente: "11988887777",
        cpfCliente: "",
        data: "2026-10-15",
        horarios: ["10:00", "11:00"],
        horaInicio: "10:00",
        horaFim: "12:00",
        valorTotal: 180,
        valorSinal: 180,
        valorPendente: 0,
        status: "confirmada",
        statusWhatsApp: "nao_enviado",
        criadaEm: "2026-10-01T10:00:00Z",
        tipoReserva: "admin_manual",
      },
      {
        id: "bloq_manut_1",
        quadraId: "q2",
        nomeCliente: "Bloqueio: Troca de Rede",
        whatsappCliente: "",
        cpfCliente: "",
        data: "2026-10-15",
        horarios: ["14:00"],
        horaInicio: "14:00",
        horaFim: "15:00",
        valorTotal: 0,
        valorSinal: 0,
        valorPendente: 0,
        status: "confirmada",
        statusWhatsApp: "nao_enviado",
        criadaEm: "2026-10-01T10:00:00Z",
        tipoReserva: "manutencao_bloqueio",
        observacoes: "Equipe de manutenção",
      },
    ] as Reserva[],
    removerBloqueio: mockRemoverBloqueio,
  }),
}));

describe("VisaoDiaGrade - Componente da Grade Simplificada Diária", () => {
  it("renderiza a data e as quadras disponíveis", () => {
    render(
      <VisaoDiaGrade
        data="2026-10-15"
        onMudarData={vi.fn()}
        onAbrirReservaManual={vi.fn()}
        onAbrirBloqueio={vi.fn()}
        onVerDetalhesReserva={vi.fn()}
      />
    );

    expect(screen.getAllByText(/quadra 1/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/quadra 2/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/quadra 3/i).length).toBeGreaterThan(0);
  });

  it("exibe destaque visual de Reserva Admin e Bloqueio de Manutenção", () => {
    render(
      <VisaoDiaGrade
        data="2026-10-15"
        onMudarData={vi.fn()}
        onAbrirReservaManual={vi.fn()}
        onAbrirBloqueio={vi.fn()}
        onVerDetalhesReserva={vi.fn()}
      />
    );

    // Reserva Manual Admin (aparece nos 2 slots da reserva: 10h e 11h)
    expect(screen.getAllByText(/reserva admin/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/reserva vip do diretor/i).length).toBeGreaterThan(0);

    // Bloqueio de Manutenção
    expect(screen.getAllByText(/bloqueio/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/equipe de manutenção/i)).toBeInTheDocument();
  });

  it("dispara callback para abrir modal de reserva manual ao clicar no botão do topo", () => {
    const handleAbrirReserva = vi.fn();

    render(
      <VisaoDiaGrade
        data="2026-10-15"
        onMudarData={vi.fn()}
        onAbrirReservaManual={handleAbrirReserva}
        onAbrirBloqueio={vi.fn()}
        onVerDetalhesReserva={vi.fn()}
      />
    );

    const btn = screen.getByRole("button", { name: /nova reserva manual/i });
    fireEvent.click(btn);
    expect(handleAbrirReserva).toHaveBeenCalled();
  });

  it("dispara callback para abrir modal de bloqueio ao clicar no botão do topo", () => {
    const handleAbrirBloqueio = vi.fn();

    const { container } = render(
      <VisaoDiaGrade
        data="2026-10-15"
        onMudarData={vi.fn()}
        onAbrirReservaManual={vi.fn()}
        onAbrirBloqueio={handleAbrirBloqueio}
        onVerDetalhesReserva={vi.fn()}
      />
    );

    const btn = container.querySelector("#btn-topo-bloquear-horario") as HTMLElement;
    expect(btn).not.toBeNull();
    fireEvent.click(btn);
    expect(handleAbrirBloqueio).toHaveBeenCalled();
  });

  it("permite navegar para o dia anterior e próximo", () => {
    const handleMudarData = vi.fn();

    render(
      <VisaoDiaGrade
        data="2026-10-15"
        onMudarData={handleMudarData}
        onAbrirReservaManual={vi.fn()}
        onAbrirBloqueio={vi.fn()}
        onVerDetalhesReserva={vi.fn()}
      />
    );

    const btnPrev = screen.getByTitle(/dia anterior/i);
    fireEvent.click(btnPrev);
    expect(handleMudarData).toHaveBeenCalledWith("2026-10-14");

    const btnNext = screen.getByTitle(/próximo dia/i);
    fireEvent.click(btnNext);
    expect(handleMudarData).toHaveBeenCalledWith("2026-10-16");
  });
});

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CalendarioMensal } from "@/components/admin/agenda/CalendarioMensal";
import type { Reserva } from "@/store/useReservasStore";

describe("CalendarioMensal - Componente de Visualização Mensal", () => {
  const reservasMock: Reserva[] = [
    {
      id: "rsv_1",
      quadraId: "q1",
      nomeCliente: "Pelada dos Amigos",
      whatsappCliente: "11999998888",
      cpfCliente: "",
      data: "2026-10-15",
      horarios: ["18:00", "19:00"],
      horaInicio: "18:00",
      horaFim: "20:00",
      valorTotal: 180,
      valorSinal: 180,
      valorPendente: 0,
      status: "confirmada",
      statusWhatsApp: "nao_enviado",
      criadaEm: "2026-10-01T10:00:00Z",
      tipoReserva: "admin_manual",
    },
    {
      id: "bloq_1",
      quadraId: "q2",
      nomeCliente: "Bloqueio: Pintura",
      whatsappCliente: "",
      cpfCliente: "",
      data: "2026-10-20",
      horarios: ["08:00", "09:00"],
      horaInicio: "08:00",
      horaFim: "10:00",
      valorTotal: 0,
      valorSinal: 0,
      valorPendente: 0,
      status: "confirmada",
      statusWhatsApp: "nao_enviado",
      criadaEm: "2026-10-01T10:00:00Z",
      tipoReserva: "manutencao_bloqueio",
      observacoes: "Manutenção",
    },
  ];

  it("renderiza o mês e o ano no título", () => {
    render(
      <CalendarioMensal
        ano={2026}
        mes={10}
        dataSelecionada="2026-10-15"
        reservas={reservasMock}
        onMudarMes={vi.fn()}
        onSelecionarDia={vi.fn()}
        onIrParaHoje={vi.fn()}
      />
    );

    expect(screen.getByText(/outubro/i)).toBeInTheDocument();
    expect(screen.getByText("2026")).toBeInTheDocument();
  });

  it("exibe as métricas consolidadas do mês", () => {
    render(
      <CalendarioMensal
        ano={2026}
        mes={10}
        dataSelecionada="2026-10-15"
        reservas={reservasMock}
        onMudarMes={vi.fn()}
        onSelecionarDia={vi.fn()}
        onIrParaHoje={vi.fn()}
      />
    );

    // 1 reserva e 1 bloqueio
    expect(screen.getByText("Reservas do Mês")).toBeInTheDocument();
    expect(screen.getByText("Bloqueios")).toBeInTheDocument();
    expect(screen.getByText("Horas Ocupadas")).toBeInTheDocument();
  });

  it("dispara callback ao avançar e retroceder mês", () => {
    const handleMudarMes = vi.fn();

    render(
      <CalendarioMensal
        ano={2026}
        mes={10}
        dataSelecionada="2026-10-15"
        reservas={reservasMock}
        onMudarMes={handleMudarMes}
        onSelecionarDia={vi.fn()}
        onIrParaHoje={vi.fn()}
      />
    );

    const btnAnterior = screen.getByTitle(/mês anterior/i);
    fireEvent.click(btnAnterior);
    expect(handleMudarMes).toHaveBeenCalledWith(2026, 9);

    const btnProximo = screen.getByTitle(/próximo mês/i);
    fireEvent.click(btnProximo);
    expect(handleMudarMes).toHaveBeenCalledWith(2026, 11);
  });

  it("dispara callback ao selecionar um dia específico no grid", () => {
    const handleSelecionarDia = vi.fn();

    render(
      <CalendarioMensal
        ano={2026}
        mes={10}
        dataSelecionada="2026-10-15"
        reservas={reservasMock}
        onMudarMes={vi.fn()}
        onSelecionarDia={handleSelecionarDia}
        onIrParaHoje={vi.fn()}
      />
    );

    // Clica no elemento contendo 15
    const dia15 = screen.getByText("15");
    fireEvent.click(dia15);
    expect(handleSelecionarDia).toHaveBeenCalledWith("2026-10-15");
  });
});

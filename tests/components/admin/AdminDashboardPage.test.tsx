import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdminDashboardPage } from "@/components/admin/AdminDashboardPage";
import type { Reserva } from "@/store/useReservasStore";

// Mock das reservas retornadas
let reservasMock: Reserva[] = [];

vi.mock("@/hooks/useReservasService", () => ({
  useReservasService: () => ({
    reservas: reservasMock,
  }),
}));

vi.mock("@/lib/supabase/authService", () => ({
  getTelefonesCadastradosLocal: () => new Set(["11999998888"]),
}));

function getHojeISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

describe("AdminDashboardPage - Seções Verticais de Reservas", () => {
  const dataHoje = getHojeISO();

  beforeEach(() => {
    reservasMock = [
      {
        id: "res_avulsa_1",
        quadraId: "q1",
        nomeCliente: "Rafaella Reis",
        whatsappCliente: "11999998888",
        cpfCliente: "123.456.789-00",
        data: dataHoje,
        horarios: ["18:00"],
        horaInicio: "18:00",
        horaFim: "19:00",
        valorTotal: 90,
        valorSinal: 90,
        valorPendente: 0,
        status: "confirmada",
        statusWhatsApp: "enviado",
        criadaEm: "2026-10-06T10:00:00Z",
        tipoReserva: "avulsa",
      },
      {
        id: "res_escolinha_1",
        quadraId: "q2",
        nomeCliente: "Escolinha do Edivaldo",
        whatsappCliente: "11977776666",
        cpfCliente: "",
        data: dataHoje,
        horarios: ["15:00", "16:00"],
        horaInicio: "15:00",
        horaFim: "17:00",
        valorTotal: 0,
        valorSinal: 0,
        valorPendente: 0,
        status: "confirmada",
        statusWhatsApp: "nao_enviado",
        criadaEm: "2026-10-06T10:00:00Z",
        tipoReserva: "escolinha",
        esporte: "Futsal",
      },
      {
        id: "res_grupo_1",
        quadraId: "q3",
        nomeCliente: "Grupo Vôlei Amigos",
        whatsappCliente: "11955554444",
        cpfCliente: "",
        data: dataHoje,
        horarios: ["19:00", "20:00"],
        horaInicio: "19:00",
        horaFim: "21:00",
        valorTotal: 0,
        valorSinal: 0,
        valorPendente: 0,
        status: "confirmada",
        statusWhatsApp: "nao_enviado",
        criadaEm: "2026-10-06T10:00:00Z",
        tipoReserva: "grupo",
        esporte: "Vôlei",
      },
    ];
  });

  it("renderiza os três cabeçalhos das seções separadas verticalmente", () => {
    render(<AdminDashboardPage />);

    expect(
      screen.getByRole("heading", { name: "Reservas Avulsas & Balcão" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Aulas de Escolinhas & Turmas" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Grupos & Mensalistas Recorrentes" })
    ).toBeInTheDocument();
  });

  it("diferencia claramente a escolinha com o badge '🎓 Escolinha' e '🎓 Aula Ativa'", () => {
    render(<AdminDashboardPage />);

    expect(screen.getByText("Escolinha do Edivaldo")).toBeInTheDocument();
    expect(screen.getByText("🎓 Escolinha")).toBeInTheDocument();
    expect(screen.getByText("🎓 Aula Ativa")).toBeInTheDocument();
  });

  it("diferencia claramente o grupo mensalista com o badge '🔁 Mensalista' e '🔁 Horário Fixo'", () => {
    render(<AdminDashboardPage />);

    expect(screen.getByText("Grupo Vôlei Amigos")).toBeInTheDocument();
    expect(screen.getByText("🔁 Mensalista")).toBeInTheDocument();
    expect(screen.getByText("🔁 Horário Fixo")).toBeInTheDocument();
  });

  it("exibe a reserva avulsa cadastrada com seu valor e sem misturar com escolinhas", () => {
    render(<AdminDashboardPage />);

    expect(screen.getByText("Rafaella Reis")).toBeInTheDocument();
    expect(screen.getByText("⭐ Cadastrado")).toBeInTheDocument();
  });
});

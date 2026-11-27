/**
 * Taxa de ocupação do dashboard com a grade real e bloqueios.
 * Spec: SPEC/2026-11-27-financeiro-correto-e-csv.md
 */
import React from "react";
import { render, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminDashboardPage } from "@/components/admin/AdminDashboardPage";
import { HORARIOS_DISPONIVEIS } from "@/lib/quadras";
import { getHoje } from "@/lib/constants";
import type { Reserva } from "@/store/useReservasStore";
import { criarReservaTeste as reserva } from "../../helpers/reservaFactory";

let reservasMock: Reserva[] = [];

vi.mock("@/hooks/useReservasService", () => ({
  useReservasService: () => ({ reservas: reservasMock }),
}));

vi.mock("@/lib/supabase/authService", () => ({
  getTelefonesCadastradosLocal: () => new Set<string>(),
}));

function valorDoCard(id: string): string {
  const card = document.getElementById(id);
  if (!card) throw new Error(`card ${id} não encontrado`);
  return within(card).getAllByText(/%|R\$/)[0].textContent ?? "";
}

describe("AdminDashboardPage - taxa de ocupação", () => {
  it("usa 3 quadras × 14 horários, desconta o bloqueio e ignora a reserva provisória", () => {
    const hoje = getHoje();
    reservasMock = [
      reserva({
        id: "bloq", data: hoje, quadraId: "q1", tipoReserva: "manutencao_bloqueio", status: "confirmada",
        horarios: [...HORARIOS_DISPONIVEIS], horaInicio: "08:00", horaFim: "22:00",
        valorTotal: 0, valorSinal: 0, valorPendente: 0, nomeCliente: "Manutenção",
      }),
      reserva({
        id: "r1", data: hoje, quadraId: "q2", horarios: ["18:00", "19:00", "20:00"],
        valorTotal: 330, valorSinal: 132, valorPendente: 198,
      }),
      reserva({ id: "proc", data: hoje, quadraId: "q3", horarios: ["10:00"], status: "em_processamento" }),
    ];

    render(<AdminDashboardPage />);

    // capacidade 42 − 14 bloqueados = 28; ocupados 3 → 10,7%
    expect(valorDoCard("kpi-ocupacao")).toBe("11%");
  });
});

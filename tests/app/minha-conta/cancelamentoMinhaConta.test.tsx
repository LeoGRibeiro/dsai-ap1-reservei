/**
 * Cancelamento em "Minha Conta" respeitando a antecedência de 24 horas.
 * Spec: SPEC/2026-11-27-cancelamento-24h-cliente.md
 */
import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import MinhaContaPage from "@/app/minha-conta/page";
import type { Reserva } from "@/store/useReservasStore";
import { criarReservaTeste } from "../../helpers/reservaFactory";

let reservasMock: Reserva[] = [];
const cancelarReserva = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/useUserAuth", () => ({
  useUserAuth: () => ({
    user: { id: "user_1", nome: "Ana Souza", telefone: "(91) 98888-7777" },
    loading: false,
    logout: vi.fn(),
    atualizarPerfil: vi.fn(),
    excluirConta: vi.fn(),
  }),
}));
vi.mock("@/hooks/useReservasService", () => ({
  useReservasService: () => ({ reservas: reservasMock, cancelarReserva }),
}));
vi.mock("@/hooks/useVagasService", () => ({
  useVagasService: () => ({ getTotalNovosInteressados: () => 0 }),
}));
vi.mock("@/hooks/useFidelidadeService", () => ({
  useFidelidadeService: () => ({
    progresso: { vouchersDisponiveis: [], totalHorasAtivas: 0, horasNecessarias: 12 },
    carregando: false,
    resgatarVoucher: vi.fn(),
  }),
}));
vi.mock("@/components/fidelidade/CartelaFidelidadeTimeline", () => ({ CartelaFidelidadeTimeline: () => null }));
vi.mock("@/components/vagas/ModalGerenciarVagas", () => ({ ModalGerenciarVagas: () => null }));

// "Agora" fixo: 19/11/2026 às 10:00 (horário local)
const AGORA = new Date(2026, 10, 19, 10, 0, 0);

function reserva(id: string, data: string, horaInicio: string): Reserva {
  const fim = `${String(Number(horaInicio.slice(0, 2)) + 1).padStart(2, "0")}:00`;
  return criarReservaTeste({ id, userId: "user_1", data, horarios: [horaInicio], horaInicio, horaFim: fim });
}

describe("Minha Conta - cancelamento com 24 horas de antecedência", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(AGORA);
    cancelarReserva.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("não mostra o botão para reserva dentro de 24 horas e oferece o WhatsApp do complexo", () => {
    reservasMock = [reserva("perto0001", "2026-11-20", "09:00")]; // 23h depois
    render(<MinhaContaPage />);

    expect(screen.queryByRole("button", { name: /Cancelar Reserva/ })).not.toBeInTheDocument();
    expect(screen.getByText(/só com pelo menos 24 horas/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Falar com o complexo/ });
    expect(link.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
    expect(decodeURIComponent(link.getAttribute("href") ?? "")).toContain("20/11/2026 às 09:00");
  });

  it("mostra o botão para reserva com mais de 24 horas e a política no modal", () => {
    reservasMock = [reserva("longe0001", "2026-11-20", "11:00")]; // 25h depois
    render(<MinhaContaPage />);

    fireEvent.click(screen.getByRole("button", { name: /Cancelar Reserva/ }));

    const modal = screen.getByRole("dialog");
    expect(within(modal).getByText(/até 24 horas antes do início/)).toBeInTheDocument();
    fireEvent.click(within(modal).getByRole("button", { name: /Confirmar Cancelamento/ }));
    expect(cancelarReserva).toHaveBeenCalledWith("longe0001");
  });

  it("revalida na confirmação e não cancela se o prazo passou com o modal aberto", () => {
    reservasMock = [reserva("limite001", "2026-11-20", "10:30")]; // 24h30 depois
    render(<MinhaContaPage />);

    fireEvent.click(screen.getByRole("button", { name: /Cancelar Reserva/ }));
    vi.setSystemTime(new Date(2026, 10, 19, 11, 0, 0)); // agora faltam 23h30
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /Confirmar Cancelamento/ }));

    expect(cancelarReserva).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/24 horas/));
  });

  it("explica por que uma reserva de contrato recorrente não é cancelada pelo site", () => {
    reservasMock = [{ ...reserva("contrato1", "2026-11-25", "18:00"), contratoId: "ctr_1" }];
    render(<MinhaContaPage />);

    expect(screen.getByText("#contrato")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Cancelar Reserva/ })).not.toBeInTheDocument();
    expect(screen.getByText(/contrato recorrente/)).toBeInTheDocument();
  });
});

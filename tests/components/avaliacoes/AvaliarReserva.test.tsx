import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Avaliacao } from "@/lib/avaliacoes/types";
import type { Reserva } from "@/store/useReservasStore";

// Spec: SPEC/2026-11-27-avaliacoes-de-clientes.md

const { toastOk } = vi.hoisted(() => ({ toastOk: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: toastOk, error: vi.fn() } }));

import { AvaliarReserva } from "@/components/avaliacoes/AvaliarReserva";

const reserva: Reserva = {
  id: "r1", quadraId: "q1", nomeCliente: "Ana", whatsappCliente: "91900000001", cpfCliente: "",
  data: "2026-11-20", horarios: ["18:00"], horaInicio: "18:00", horaFim: "19:00",
  valorTotal: 100, valorSinal: 40, valorPendente: 60, status: "confirmada", statusWhatsApp: "nao_enviado",
  criadaEm: "2026-11-01T10:00:00Z", tipoReserva: "avulsa",
};
const JOGADA = new Date("2026-11-21T12:00:00Z");
const avaliacao = (parcial: Partial<Avaliacao> = {}): Avaliacao => ({
  id: "a1", reservaId: "r1", usuarioId: "u1", nota: 4, comentario: "Bom", status: "pendente",
  criadaEm: "2026-11-21T10:00:00Z", ...parcial,
});

describe("AvaliarReserva", () => {
  const onSalvar = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    onSalvar.mockResolvedValue({ ok: true });
  });

  it("reserva ainda não jogada não mostra o botão", () => {
    render(<AvaliarReserva reserva={reserva} agora={new Date("2026-11-20T12:00:00Z")} onSalvar={onSalvar} />);
    expect(screen.queryByText("Avaliar")).not.toBeInTheDocument();
  });

  it("envia nota e comentário", async () => {
    render(<AvaliarReserva reserva={reserva} agora={JOGADA} onSalvar={onSalvar} />);
    fireEvent.click(screen.getByText("Avaliar"));
    fireEvent.click(screen.getByLabelText("5 estrelas"));
    fireEvent.change(screen.getByLabelText("Comentário (opcional)"), { target: { value: "Ótima quadra" } });
    expect(screen.getByText("12/500")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Enviar avaliação"));
    await waitFor(() => expect(onSalvar).toHaveBeenCalledWith("r1", { nota: 5, comentario: "Ótima quadra" }));
    expect(toastOk).toHaveBeenCalled();
    expect(screen.queryByText("Enviar avaliação")).not.toBeInTheDocument();
  });

  it("erro do banco aparece no formulário", async () => {
    onSalvar.mockResolvedValue({ ok: false, erro: "O prazo para avaliar esta reserva (30 dias) terminou." });
    render(<AvaliarReserva reserva={reserva} agora={JOGADA} onSalvar={onSalvar} />);
    fireEvent.click(screen.getByText("Avaliar"));
    fireEvent.click(screen.getByLabelText("3 estrelas"));
    fireEvent.click(screen.getByText("Enviar avaliação"));
    expect(await screen.findByRole("alert")).toHaveTextContent("O prazo para avaliar");
  });

  it("pendente: mostra a nota, 'Em análise' e permite editar com os valores atuais", () => {
    render(<AvaliarReserva reserva={reserva} avaliacao={avaliacao()} agora={JOGADA} onSalvar={onSalvar} />);
    expect(screen.getByLabelText("Nota 4 de 5")).toBeInTheDocument();
    expect(screen.getByText("Em análise")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Editar"));
    expect(screen.getByLabelText("4 estrelas")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByLabelText("Comentário (opcional)")).toHaveValue("Bom");
  });

  it("aprovada fica travada, mesmo fora do prazo", () => {
    render(
      <AvaliarReserva reserva={reserva} avaliacao={avaliacao({ status: "aprovada" })} agora={new Date("2027-01-30T12:00:00Z")} onSalvar={onSalvar} />
    );
    expect(screen.getByText("Publicada")).toBeInTheDocument();
    expect(screen.queryByText("Editar")).not.toBeInTheDocument();
  });

  it("oculta aparece como não publicada", () => {
    render(<AvaliarReserva reserva={reserva} avaliacao={avaliacao({ status: "oculta" })} agora={JOGADA} onSalvar={onSalvar} />);
    expect(screen.getByText("Não publicada")).toBeInTheDocument();
  });
});

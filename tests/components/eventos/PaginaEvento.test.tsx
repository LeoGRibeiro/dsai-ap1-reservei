import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Evento, InscricaoEvento } from "@/lib/eventos/types";

// Spec: SPEC/2026-11-27-eventos-e-torneios.md

const { pagina, toastErro } = vi.hoisted(() => ({
  pagina: {} as Record<string, unknown>,
  toastErro: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { error: toastErro, success: vi.fn() } }));
vi.mock("@/hooks/useEventosService", () => ({ useEventoPublico: () => pagina }));

import { PaginaEvento } from "@/components/eventos/PaginaEvento";

const evento: Evento = {
  id: "ev1", tipo: "torneio", nome: "Copa Reservei", data: "2026-12-05", horaInicio: "18:00", horaFim: "22:00",
  quadraId: "q2", valorInscricao: 120, maxTimes: 8, status: "publicado", reservasBloqueio: [],
};

function montar(parcial: Record<string, unknown> = {}) {
  Object.assign(pagina, {
    evento, times: [], partidas: [], minhaInscricao: null, situacao: { aberta: true, vagasRestantes: 8 },
    carregando: false, logado: true, inscrever: vi.fn().mockResolvedValue({ ok: true }), desistir: vi.fn().mockResolvedValue({ ok: true }),
    ...parcial,
  });
  return render(<PaginaEvento eventoId="ev1" />);
}

describe("PaginaEvento", () => {
  beforeEach(() => {
    for (const k of Object.keys(pagina)) delete pagina[k];
    vi.clearAllMocks();
  });

  it("cliente inscreve o time pelo formulário", async () => {
    montar();
    fireEvent.change(screen.getByLabelText("Nome do time"), { target: { value: "Leões" } });
    fireEvent.click(screen.getByText("Inscrever time"));
    await waitFor(() => expect(pagina.inscrever).toHaveBeenCalledWith("Leões"));
  });

  it("erro do banco aparece como aviso", async () => {
    montar({ inscrever: vi.fn().mockResolvedValue({ ok: false, erro: "As vagas deste torneio já foram preenchidas." }) });
    fireEvent.change(screen.getByLabelText("Nome do time"), { target: { value: "Leões" } });
    fireEvent.click(screen.getByText("Inscrever time"));
    await waitFor(() =>
      expect(toastErro).toHaveBeenCalledWith("Inscrição não concluída", { description: "As vagas deste torneio já foram preenchidas." })
    );
  });

  it("visitante é convidado a entrar, sem formulário", () => {
    montar({ logado: false });
    expect(screen.getByRole("link", { name: "Entre na sua conta" })).toHaveAttribute("href", "/login");
    expect(screen.queryByLabelText("Nome do time")).toBeNull();
  });

  it("inscrição fechada mostra o motivo", () => {
    montar({ situacao: { aberta: false, motivo: "As inscrições deste evento estão encerradas." } });
    expect(screen.getByText("As inscrições deste evento estão encerradas.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Nome do time")).toBeNull();
  });

  it("quem já inscreveu vê a situação e pode desistir antes do sorteio", () => {
    const minha: InscricaoEvento = { id: "i1", eventoId: "ev1", nomeTime: "Leões", confirmada: false };
    montar({ minhaInscricao: minha });
    expect(screen.getByText(/confirmação sai após o pagamento/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Cancelar inscrição"));
    expect(pagina.desistir).toHaveBeenCalled();
  });

  it("evento inexistente ou cancelado", () => {
    montar({ evento: null });
    expect(screen.getByText("Evento não encontrado.")).toBeInTheDocument();
  });

  it("evento cancelado mostra a marca", () => {
    montar({ evento: { ...evento, status: "cancelado" }, situacao: { aberta: false, motivo: "Este evento foi cancelado." } });
    expect(screen.getAllByText(/cancelado/i).length).toBeGreaterThan(0);
  });
});

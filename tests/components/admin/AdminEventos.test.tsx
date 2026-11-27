import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Evento, InscricaoEvento } from "@/lib/eventos/types";

// Spec: SPEC/2026-11-27-eventos-e-torneios.md

const { acoes, toastErro, toastOk } = vi.hoisted(() => ({
  acoes: {} as Record<string, unknown>,
  toastErro: vi.fn(),
  toastOk: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { error: toastErro, success: toastOk } }));
vi.mock("@/hooks/useEventosService", () => ({ useEventosAdmin: () => acoes }));
vi.mock("@/lib/supabase/institucionalRepository", () => ({ uploadImagemInstitucional: vi.fn() }));

import { AdminEventosPage } from "@/components/admin/AdminEventosPage";

const evento = (parcial: Partial<Evento> = {}): Evento => ({
  id: "ev1", tipo: "torneio", nome: "Copa Reservei", data: "2026-12-05", horaInicio: "18:00", horaFim: "22:00",
  quadraId: "q1", valorInscricao: 100, maxTimes: 4, status: "rascunho", reservasBloqueio: [], ...parcial,
});
const inscricao = (id: string, confirmada: boolean): InscricaoEvento => ({
  id, eventoId: "ev1", nomeTime: `Time ${id}`, responsavelNome: "Ana", responsavelWhatsapp: "91999998888", confirmada,
});

function montar(eventos: Evento[], inscricoes: InscricaoEvento[] = []) {
  Object.assign(acoes, {
    eventos,
    carregando: false,
    salvarRascunho: vi.fn().mockResolvedValue({ ok: true }),
    publicar: vi.fn().mockResolvedValue({ ok: true }),
    cancelar: vi.fn().mockResolvedValue({ ok: true }),
    sortearChave: vi.fn().mockResolvedValue({ ok: true }),
    alterarResultado: vi.fn(),
    listarInscricoes: vi.fn().mockResolvedValue(inscricoes),
    listarPartidas: vi.fn().mockResolvedValue([]),
    confirmarInscricao: vi.fn().mockResolvedValue({ ok: true }),
    removerInscricao: vi.fn().mockResolvedValue({ ok: true }),
  });
  render(<AdminEventosPage />);
}

describe("AdminEventosPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("cria um rascunho pelo formulário", async () => {
    montar([]);
    fireEvent.click(screen.getByText("Novo evento"));
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Copa de Verão" } });
    fireEvent.change(screen.getByLabelText("Data"), { target: { value: "2026-12-20" } });
    fireEvent.click(screen.getByText("Salvar rascunho"));
    await waitFor(() =>
      expect(acoes.salvarRascunho).toHaveBeenCalledWith(
        expect.objectContaining({ nome: "Copa de Verão", data: "2026-12-20", tipo: "torneio", maxTimes: 8 })
      )
    );
  });

  it("erro de validação aparece no formulário", async () => {
    montar([]);
    (acoes.salvarRascunho as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, erro: "Informe um nome com 3 a 80 caracteres." });
    fireEvent.click(screen.getByText("Novo evento"));
    fireEvent.click(screen.getByText("Salvar rascunho"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Informe um nome");
  });

  it("publicar um rascunho e avisar se a quadra estiver ocupada", async () => {
    montar([evento()]);
    (acoes.publicar as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, erro: "Já existe reserva na quadra nesse horário." });
    fireEvent.click(screen.getByText("Copa Reservei"));
    fireEvent.click(await screen.findByText("Publicar"));
    await waitFor(() => expect(toastErro).toHaveBeenCalledWith("Não foi possível concluir", { description: "Já existe reserva na quadra nesse horário." }));
  });

  it("sorteio só habilita com 2 confirmados; confirmar pagamento chama o admin", async () => {
    montar([evento({ status: "publicado" })], [inscricao("a", true), inscricao("b", false)]);
    fireEvent.click(screen.getByText("Copa Reservei"));
    const sortear = await screen.findByText("Sortear chave (1 times)");
    expect(sortear).toBeDisabled();

    fireEvent.click(screen.getByText("Confirmar pagamento (Time b)"));
    await waitFor(() => expect(acoes.confirmarInscricao).toHaveBeenCalledWith("b", true));
  });

  it("sortear com 2 confirmados", async () => {
    const inscricoes = [inscricao("a", true), inscricao("b", true)];
    montar([evento({ status: "publicado" })], inscricoes);
    fireEvent.click(screen.getByText("Copa Reservei"));
    fireEvent.click(await screen.findByText("Sortear chave (2 times)"));
    await waitFor(() => expect(acoes.sortearChave).toHaveBeenCalledWith(expect.objectContaining({ id: "ev1" }), inscricoes));
  });

  it("cancelar evento publicado pede confirmação e chama o admin", async () => {
    montar([evento({ status: "publicado" })]);
    fireEvent.click(screen.getByText("Copa Reservei"));
    fireEvent.click(await screen.findByText("Cancelar evento"));
    await waitFor(() => expect(acoes.cancelar).toHaveBeenCalled());
    expect(toastOk).toHaveBeenCalledWith("Evento cancelado.");
  });
});

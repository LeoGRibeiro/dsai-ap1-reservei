import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Spec: SPEC/2026-11-24-reserva-atomica.md
// Os componentes filhos viram botões simples: o teste cobre só o fluxo do
// checkout quando o banco recusa a reserva ou o pagamento.

const { servico, toastErro, nada } = vi.hoisted(() => ({
  nada: () => null,
  servico: {
    criarReservaEmProcessamento: vi.fn(),
    confirmarPagamento: vi.fn(),
    atualizarIdentificacao: vi.fn(),
    atualizarDadosCheckout: vi.fn(),
    liberarLock: vi.fn(),
  },
  toastErro: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { error: toastErro, success: vi.fn() } }));

vi.mock("@/hooks/useReservasService", () => ({
  useReservasService: () => ({ ...servico, getHorariosOcupados: () => [] }),
}));
vi.mock("@/hooks/useContratosService", () => ({
  useContratosService: () => ({ getAvisosEscolinha: () => [] }),
}));
vi.mock("@/hooks/useUserAuth", () => ({
  useUserAuth: () => ({ user: null, isAutenticado: false }),
}));
vi.mock("@/hooks/useFidelidadeService", () => ({
  useFidelidadeService: () => ({
    progresso: { vouchersDisponiveis: [] },
    consumirVouchersNoCheckout: vi.fn(),
  }),
}));
vi.mock("@/lib/supabase/authService", () => ({ isTelefoneBloqueado: vi.fn().mockResolvedValue(false) }));

type Props = Record<string, (...args: unknown[]) => unknown> & { open?: boolean; quadra?: { id: string } };

vi.mock("@/components/portal/QuadraHorarioItem", () => ({
  QuadraHorarioItem: (p: Props) => (
    <button onClick={() => p.onToggleHorario("21:00", p.quadra!.id)}>escolher {p.quadra!.id}</button>
  ),
}));
vi.mock("@/components/portal/CarrinhoLateral", () => ({
  CarrinhoLateral: (p: Props) => <button onClick={() => p.onContinuar()}>continuar</button>,
  BotaoCarrinhoMobile: () => null,
}));
vi.mock("@/components/portal/FormularioIdentificacao", () => ({
  FormularioIdentificacao: (p: Props) =>
    p.open ? (
      <button onClick={() => p.onConfirmar({ nome: "Ana", whatsapp: "91999999999", esporte: "", observacoes: "" }, "sinal")}>
        confirmar dados
      </button>
    ) : null,
}));
vi.mock("@/components/portal/ModalPix", () => ({
  ModalPix: (p: Props) => (p.open ? <button onClick={() => p.onSimularPagamento("sinal")}>pagar</button> : null),
}));
vi.mock("@/components/portal/CalendarioSelector", () => ({ CalendarioSelector: nada }));
vi.mock("@/components/portal/ModalPosReservaCadastro", () => ({ ModalPosReservaCadastro: nada }));
vi.mock("@/components/vagas/MuralVagasAbertas", () => ({ MuralVagasAbertas: nada }));
vi.mock("@/components/landing/LandingHeader", () => ({ LandingHeader: nada }));
vi.mock("@/components/landing/LandingFooter", () => ({ LandingFooter: nada }));
vi.mock("@/components/landing/LandingSecoesPlaceholder", () => ({ LandingSecoesPlaceholder: nada }));
vi.mock("@/components/landing/SecaoEstrutura", () => ({ SecaoEstrutura: nada }));
vi.mock("@/components/landing/SecaoEscolinhas", () => ({ SecaoEscolinhas: nada }));
vi.mock("@/components/landing/CabecalhoReserva", () => ({ CabecalhoReserva: nada, ID_TITULO_RESERVA: "titulo" }));
vi.mock("@/components/landing/BotaoVoltarAoTopo", () => ({ BotaoVoltarAoTopo: nada }));
vi.mock("@/components/landing/SmoothScrollProvider", () => ({
  SmoothScrollProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { PortalCliente } from "@/components/portal/PortalCliente";

async function abrirCheckout() {
  render(<PortalCliente />);
  fireEvent.click(screen.getByText("escolher q1"));
  fireEvent.click(screen.getAllByText("continuar")[0]);
}

describe("PortalCliente: reserva recusada pelo banco", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 11, 1, 8, 0));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("horário tomado por outra pessoa: avisa e não abre o formulário", async () => {
    servico.criarReservaEmProcessamento.mockResolvedValue({ ok: false, erro: "Esse horário acabou de ser reservado" });
    await abrirCheckout();

    await waitFor(() =>
      expect(toastErro).toHaveBeenCalledWith("Reserva não concluída", expect.objectContaining({
        description: "Esse horário acabou de ser reservado",
      }))
    );
    expect(screen.queryByText("confirmar dados")).toBeNull();
  });

  it("reserva aceita abre o formulário com o id devolvido pelo banco", async () => {
    servico.criarReservaEmProcessamento.mockResolvedValue({ ok: true, id: "rsv_1" });
    await abrirCheckout();

    await screen.findByText("confirmar dados");
    expect(servico.criarReservaEmProcessamento).toHaveBeenCalledWith(
      expect.objectContaining({ quadraId: "q1", horarios: ["21:00"] })
    );
  });

  it("pagamento recusado por prazo vencido: avisa e fecha o Pix", async () => {
    servico.criarReservaEmProcessamento.mockResolvedValue({ ok: true, id: "rsv_1" });
    servico.confirmarPagamento.mockResolvedValue({ ok: false, erro: "O tempo para concluir a reserva expirou." });
    await abrirCheckout();

    fireEvent.click(await screen.findByText("confirmar dados"));
    fireEvent.click(await screen.findByText("pagar"));

    await waitFor(() =>
      expect(toastErro).toHaveBeenCalledWith("Reserva não concluída", expect.objectContaining({
        description: "O tempo para concluir a reserva expirou.",
      }))
    );
    expect(servico.confirmarPagamento).toHaveBeenCalledWith("rsv_1", "sinal");
    expect(screen.queryByText("pagar")).toBeNull();
  });
});

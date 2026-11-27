/**
 * Financeiro do admin: totais pelas regras puras e exportação CSV da lista filtrada.
 * Spec: SPEC/2026-11-27-financeiro-correto-e-csv.md
 */
import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { AdminFinanceiroPage } from "@/components/admin/AdminFinanceiroPage";
import { getHoje } from "@/lib/constants";
import type { Reserva } from "@/store/useReservasStore";
import { criarReservaTeste as reserva } from "../../helpers/reservaFactory";

let reservasMock: Reserva[] = [];

// O `financeiro` antigo do hook só somava as confirmadas; a tela não deve usá-lo.
vi.mock("@/hooks/useReservasService", () => ({
  useReservasService: () => ({
    reservas: reservasMock,
    financeiro: {
      totalConfirmado: 0,
      totalPrevisto: 0,
      pendenteSinalConfirmado: 0,
      totalDescontoFidelidade: 0,
      totalBrutoQuadras: 0,
    },
  }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/lib/supabase/authService", () => ({
  getTelefonesCadastradosLocal: () => new Set<string>(),
}));

const bloqueio = reserva({
  id: "bloq", tipoReserva: "manutencao_bloqueio", status: "confirmada", nomeCliente: "Manutenção",
  valorTotal: 0, valorSinal: 0, valorPendente: 0,
});

function valorDoKpi(titulo: string): string {
  const card = screen.getByText(titulo).parentElement as HTMLElement;
  return within(card).getByText(/R\$/).textContent?.replace(/\s/g, " ") ?? "";
}

describe("AdminFinanceiroPage", () => {
  let blobExportado: Blob | null;
  let nomeBaixado: string;

  beforeEach(() => {
    blobExportado = null;
    nomeBaixado = "";
    URL.createObjectURL = vi.fn((blob: Blob) => {
      blobExportado = blob;
      return "blob:csv";
    });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      nomeBaixado = this.download;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("soma no recebido o sinal da reserva pendente e ignora bloqueios", () => {
    reservasMock = [
      reserva({ id: "a", status: "pendente", valorTotal: 110, valorSinal: 44, valorPendente: 66 }),
      reserva({ id: "b", status: "confirmada", valorTotal: 90, valorSinal: 90, valorPendente: 0 }),
      bloqueio,
    ];
    render(<AdminFinanceiroPage />);

    expect(valorDoKpi("Total Arrecadado Líquido")).toBe("R$ 134,00");
    expect(valorDoKpi("Saldo Pendente no Balcão")).toBe("R$ 66,00");
    expect(screen.queryByText("Manutenção")).not.toBeInTheDocument();
  });

  it("exporta em CSV apenas a lista filtrada pela busca", async () => {
    reservasMock = [
      reserva({ id: "a", nomeCliente: "Ana Souza", whatsappCliente: "91911112222" }),
      reserva({ id: "b", nomeCliente: "Bruno Lima", whatsappCliente: "91933334444" }),
      bloqueio,
    ];
    render(<AdminFinanceiroPage />);

    fireEvent.change(screen.getByPlaceholderText("Buscar cliente ou voucher..."), { target: { value: "ana" } });
    fireEvent.click(screen.getByRole("button", { name: /Exportar CSV/ }));

    expect(nomeBaixado).toBe(`reservei-financeiro-${getHoje()}.csv`);
    expect(blobExportado?.type).toBe("text/csv;charset=utf-8");
    const csv = await blobExportado!.text();
    expect(csv).toContain("Ana Souza");
    expect(csv).not.toContain("Bruno Lima");
    expect(csv).not.toContain("Manutenção");
  });

  it("avisa o admin quando o navegador não consegue gerar o arquivo", () => {
    reservasMock = [reserva({ id: "a" })];
    URL.createObjectURL = vi.fn(() => {
      throw new Error("bloqueado");
    });
    render(<AdminFinanceiroPage />);

    fireEvent.click(screen.getByRole("button", { name: /Exportar CSV/ }));

    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/Não foi possível exportar/));
  });

  it("desabilita a exportação quando a lista está vazia", () => {
    reservasMock = [bloqueio];
    render(<AdminFinanceiroPage />);

    const botao = screen.getByRole("button", { name: /Exportar CSV/ });
    expect(botao).toBeDisabled();
    expect(botao).toHaveAttribute("title", "Nenhuma reserva na lista para exportar");
  });
});

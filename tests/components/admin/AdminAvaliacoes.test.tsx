import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Avaliacao } from "@/lib/avaliacoes/types";

// Spec: SPEC/2026-11-27-avaliacoes-de-clientes.md

const { estado, toastErro, toastOk } = vi.hoisted(() => ({
  estado: { avaliacoes: [] as Avaliacao[], carregando: false, moderar: vi.fn() },
  toastErro: vi.fn(),
  toastOk: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { error: toastErro, success: toastOk } }));
vi.mock("@/hooks/useAvaliacoes", () => ({ useAvaliacoesAdmin: () => estado }));

import { AdminAvaliacoesPage } from "@/components/admin/AdminAvaliacoesPage";

const avaliacao = (id: string, status: Avaliacao["status"], comentario: string | null = null): Avaliacao => ({
  id, reservaId: `r_${id}`, usuarioId: "u1", nota: 4, comentario, status, criadaEm: "2026-11-20T10:00:00Z",
});

describe("AdminAvaliacoesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    estado.carregando = false;
    estado.moderar.mockResolvedValue({ ok: true });
    estado.avaliacoes = [
      avaliacao("a1", "pendente", "Quadra ótima"),
      avaliacao("a2", "aprovada", "Voltarei"),
      avaliacao("a3", "oculta", "Texto ofensivo"),
    ];
  });

  it("abre nas pendentes, com a contagem por situação", () => {
    render(<AdminAvaliacoesPage />);
    expect(screen.getByText("Quadra ótima")).toBeInTheDocument();
    expect(screen.queryByText("Voltarei")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Pendentes (1)" })).toHaveAttribute("aria-selected", "true");
  });

  it("aprova uma pendente", async () => {
    render(<AdminAvaliacoesPage />);
    fireEvent.click(screen.getByRole("button", { name: "Aprovar" }));
    await waitFor(() => expect(estado.moderar).toHaveBeenCalledWith("a1", "aprovada"));
    expect(toastOk).toHaveBeenCalledWith("Avaliação publicada.");
  });

  it("oculta uma aprovada e reexibe uma oculta", async () => {
    render(<AdminAvaliacoesPage />);
    fireEvent.click(screen.getByRole("tab", { name: "Aprovadas (1)" }));
    fireEvent.click(screen.getByRole("button", { name: "Ocultar" }));
    await waitFor(() => expect(estado.moderar).toHaveBeenCalledWith("a2", "oculta"));

    fireEvent.click(screen.getByRole("tab", { name: "Ocultas (1)" }));
    expect(screen.getByText("Texto ofensivo")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Aprovar" }));
    await waitFor(() => expect(estado.moderar).toHaveBeenCalledWith("a3", "aprovada"));
  });

  it("avaliação sem comentário mostra só a nota", () => {
    estado.avaliacoes = [avaliacao("a4", "pendente")];
    render(<AdminAvaliacoesPage />);
    expect(screen.getByText("Sem comentário")).toBeInTheDocument();
  });

  it("erro na moderação vira aviso", async () => {
    estado.moderar.mockResolvedValue({ ok: false, erro: "Não foi possível concluir agora." });
    render(<AdminAvaliacoesPage />);
    fireEvent.click(screen.getByRole("button", { name: "Aprovar" }));
    await waitFor(() =>
      expect(toastErro).toHaveBeenCalledWith("Moderação não salva", { description: "Não foi possível concluir agora." })
    );
  });

  it("lista vazia na aba mostra mensagem", () => {
    estado.avaliacoes = [];
    render(<AdminAvaliacoesPage />);
    expect(screen.getByText("Nenhuma avaliação nesta situação.")).toBeInTheDocument();
  });
});

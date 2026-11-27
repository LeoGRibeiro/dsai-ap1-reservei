import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ResumoAvaliacoes } from "@/lib/avaliacoes/types";

// Spec: SPEC/2026-11-27-avaliacoes-de-clientes.md

const { estado } = vi.hoisted(() => ({
  estado: {
    resumo: { media: null, total: 0, recentes: [] } as ResumoAvaliacoes,
    carregando: false,
    urlGoogle: null as string | null,
  },
}));

vi.mock("@/hooks/useAvaliacoes", () => ({ useAvaliacoesLanding: () => estado }));

import { SecaoAvaliacoes } from "@/components/landing/SecaoAvaliacoes";

describe("SecaoAvaliacoes", () => {
  beforeEach(() => {
    estado.resumo = { media: null, total: 0, recentes: [] };
    estado.carregando = false;
    estado.urlGoogle = null;
  });

  it("sem avaliações mostra um convite, não nota zero", () => {
    render(<SecaoAvaliacoes />);
    expect(screen.getByText(/Ainda não há avaliações publicadas/)).toBeInTheDocument();
    expect(screen.queryByText(/0,0/)).not.toBeInTheDocument();
  });

  it("mostra a média com vírgula, o total e os depoimentos", () => {
    estado.resumo = {
      media: 4.5,
      total: 2,
      recentes: [
        { id: "a1", nota: 5, comentario: "Quadra impecável", nomeExibicao: "Ana S.", criadaEm: "2026-11-20T10:00:00Z" },
        { id: "a2", nota: 4, comentario: null, nomeExibicao: "Bia", criadaEm: "2026-11-21T10:00:00Z" },
      ],
    };
    render(<SecaoAvaliacoes />);
    expect(screen.getByText("4,5")).toBeInTheDocument();
    expect(screen.getByText("2 avaliações")).toBeInTheDocument();
    expect(screen.getByText(/Quadra impecável/)).toBeInTheDocument();
    expect(screen.getByText("Ana S.")).toBeInTheDocument();
    expect(screen.getByLabelText("Nota 4 de 5")).toBeInTheDocument();
  });

  it("uma avaliação usa o singular", () => {
    estado.resumo = {
      media: 5,
      total: 1,
      recentes: [{ id: "a1", nota: 5, comentario: null, nomeExibicao: "Ana S.", criadaEm: "2026-11-20T10:00:00Z" }],
    };
    render(<SecaoAvaliacoes />);
    expect(screen.getByText("1 avaliação")).toBeInTheDocument();
    expect(screen.getByText("5,0")).toBeInTheDocument();
  });

  it("botão do Google só aparece com link configurado e abre em nova aba", () => {
    const { unmount } = render(<SecaoAvaliacoes />);
    expect(screen.queryByText("Avalie-nos no Google")).not.toBeInTheDocument();
    unmount();

    estado.urlGoogle = "https://g.page/r/abc/review";
    render(<SecaoAvaliacoes />);
    const link = screen.getByText("Avalie-nos no Google").closest("a");
    expect(link).toHaveAttribute("href", "https://g.page/r/abc/review");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });
});

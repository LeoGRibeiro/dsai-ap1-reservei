import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { Avaliacao, AvaliacaoPublica } from "@/lib/avaliacoes/types";

// Spec: SPEC/2026-11-27-avaliacoes-de-clientes.md

const { repo, auth } = vi.hoisted(() => ({
  repo: {
    listarAvaliacoes: vi.fn(),
    listarAvaliacoesPublicas: vi.fn(),
    enviarAvaliacao: vi.fn(),
    editarAvaliacao: vi.fn(),
    moderarAvaliacao: vi.fn(),
  },
  auth: { user: null as null | { id: string } },
}));

vi.mock("@/lib/supabase/avaliacoesRepository", () => repo);
vi.mock("@/hooks/useUserAuth", () => ({ useUserAuth: () => ({ user: auth.user }) }));

import { useAvaliacoesAdmin, useAvaliacoesLanding, useMinhasAvaliacoes } from "@/hooks/useAvaliacoes";
import { MENSAGENS_AVALIACOES } from "@/lib/avaliacoes/regras";

const avaliacao = (parcial: Partial<Avaliacao> = {}): Avaliacao => ({
  id: "a1", reservaId: "r1", usuarioId: "u1", nota: 4, comentario: null, status: "pendente",
  criadaEm: "2026-11-20T10:00:00Z", ...parcial,
});

beforeEach(() => {
  vi.clearAllMocks();
  auth.user = { id: "u1" };
  repo.listarAvaliacoes.mockResolvedValue([]);
  repo.listarAvaliacoesPublicas.mockResolvedValue([]);
  repo.enviarAvaliacao.mockResolvedValue({ ok: true });
  repo.editarAvaliacao.mockResolvedValue({ ok: true });
  repo.moderarAvaliacao.mockResolvedValue({ ok: true });
});

describe("useMinhasAvaliacoes", () => {
  it("indexa as avaliações do cliente pela reserva", async () => {
    repo.listarAvaliacoes.mockResolvedValue([avaliacao()]);
    const { result } = renderHook(() => useMinhasAvaliacoes());
    await waitFor(() => expect(result.current.porReserva.r1?.id).toBe("a1"));
  });

  it("sem login não consulta o banco", async () => {
    auth.user = null;
    const { result } = renderHook(() => useMinhasAvaliacoes());
    expect(result.current.porReserva).toEqual({});
    const r = await result.current.salvar("r1", { nota: 5, comentario: "" });
    expect(r.ok).toBe(false);
    expect(repo.listarAvaliacoes).not.toHaveBeenCalled();
  });

  it("valida antes de gravar", async () => {
    const { result } = renderHook(() => useMinhasAvaliacoes());
    let r: Awaited<ReturnType<typeof result.current.salvar>> | undefined;
    await act(async () => {
      r = await result.current.salvar("r1", { nota: 0, comentario: "" });
    });
    expect(r).toEqual({ ok: false, erro: MENSAGENS_AVALIACOES.notaInvalida });
    expect(repo.enviarAvaliacao).not.toHaveBeenCalled();
  });

  it("primeira avaliação é enviada em nome do cliente e recarrega a lista", async () => {
    const { result } = renderHook(() => useMinhasAvaliacoes());
    await waitFor(() => expect(repo.listarAvaliacoes).toHaveBeenCalledTimes(1));
    await act(async () => {
      await result.current.salvar("r1", { nota: 5, comentario: "Ótimo" });
    });
    expect(repo.enviarAvaliacao).toHaveBeenCalledWith(
      expect.objectContaining({ reservaId: "r1", usuarioId: "u1", nota: 5, comentario: "Ótimo" })
    );
    expect(repo.listarAvaliacoes).toHaveBeenCalledTimes(2);
  });

  it("reserva já avaliada é editada, não duplicada", async () => {
    repo.listarAvaliacoes.mockResolvedValue([avaliacao()]);
    const { result } = renderHook(() => useMinhasAvaliacoes());
    await waitFor(() => expect(result.current.porReserva.r1).toBeDefined());
    await act(async () => {
      await result.current.salvar("r1", { nota: 2, comentario: "Mudei" });
    });
    expect(repo.editarAvaliacao).toHaveBeenCalledWith("a1", { nota: 2, comentario: "Mudei" });
    expect(repo.enviarAvaliacao).not.toHaveBeenCalled();
  });

  it("erro do banco volta para a tela", async () => {
    repo.enviarAvaliacao.mockResolvedValue({ ok: false, erro: MENSAGENS_AVALIACOES.prazo_avaliacao_encerrado });
    const { result } = renderHook(() => useMinhasAvaliacoes());
    let r: Awaited<ReturnType<typeof result.current.salvar>> | undefined;
    await act(async () => {
      r = await result.current.salvar("r1", { nota: 5, comentario: "" });
    });
    expect(r).toEqual({ ok: false, erro: MENSAGENS_AVALIACOES.prazo_avaliacao_encerrado });
  });
});

describe("useAvaliacoesAdmin", () => {
  it("modera e recarrega", async () => {
    repo.listarAvaliacoes.mockResolvedValue([avaliacao()]);
    const { result } = renderHook(() => useAvaliacoesAdmin());
    await waitFor(() => expect(result.current.avaliacoes).toHaveLength(1));
    await act(async () => {
      await result.current.moderar("a1", "aprovada");
    });
    expect(repo.moderarAvaliacao).toHaveBeenCalledWith("a1", "aprovada");
    expect(repo.listarAvaliacoes).toHaveBeenCalledTimes(2);
  });
});

describe("useAvaliacoesLanding", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("resume as públicas e lê o link do Google da configuração", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_AVALIACAO_URL", "https://g.page/r/abc/review");
    const publicas: AvaliacaoPublica[] = [
      { id: "a1", nota: 5, comentario: "Top", nomeExibicao: "Ana S.", criadaEm: "2026-11-20T10:00:00Z" },
      { id: "a2", nota: 4, comentario: null, nomeExibicao: "Bia", criadaEm: "2026-11-21T10:00:00Z" },
    ];
    repo.listarAvaliacoesPublicas.mockResolvedValue(publicas);
    const { result } = renderHook(() => useAvaliacoesLanding());
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.resumo).toMatchObject({ media: 4.5, total: 2 });
    expect(result.current.urlGoogle).toBe("https://g.page/r/abc/review");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

// Spec: SPEC/2026-11-27-avaliacoes-de-clientes.md (auxiliar comum aos repositórios)

const estado = vi.hoisted(() => ({ configurado: true }));
vi.mock("@/lib/supabase/client", () => ({ supabase: {}, isSupabaseConfigured: () => estado.configurado }));

import { criarConsultaSegura } from "@/lib/supabase/consultaSegura";

const { listar, gravar } = criarConsultaSegura({
  modulo: "Teste",
  traduzir: (e) => `traduzido: ${(e as { message: string }).message}`,
  erroGenerico: "genérico",
});

describe("criarConsultaSegura", () => {
  beforeEach(() => {
    estado.configurado = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("listar mapeia as linhas", async () => {
    const r = await listar(() => Promise.resolve({ data: [{ n: 1 }, { n: 2 }], error: null }), (x: { n: number }) => x.n * 10, "itens");
    expect(r).toEqual([10, 20]);
  });

  it("listar devolve lista vazia com erro, exceção ou sem Supabase", async () => {
    expect(await listar(() => Promise.resolve({ data: null, error: { message: "x" } }), (x) => x, "itens")).toEqual([]);
    expect(await listar(() => Promise.reject(new Error("rede")), (x) => x, "itens")).toEqual([]);
    estado.configurado = false;
    const consulta = vi.fn();
    expect(await listar(consulta, (x) => x, "itens")).toEqual([]);
    expect(consulta).not.toHaveBeenCalled();
  });

  it("gravar traduz o erro do banco", async () => {
    expect(await gravar(() => Promise.resolve({ error: null }), "salvar")).toEqual({ ok: true, dado: undefined });
    expect(await gravar(() => Promise.resolve({ error: { message: "codigo_x" } }), "salvar"))
      .toEqual({ ok: false, erro: "traduzido: codigo_x" });
  });

  it("gravar devolve a mensagem genérica com exceção ou sem Supabase", async () => {
    expect(await gravar(() => Promise.reject(new Error("rede")), "salvar")).toEqual({ ok: false, erro: "genérico" });
    estado.configurado = false;
    expect(await gravar(() => Promise.resolve({ error: null }), "salvar")).toEqual({ ok: false, erro: "genérico" });
  });
});

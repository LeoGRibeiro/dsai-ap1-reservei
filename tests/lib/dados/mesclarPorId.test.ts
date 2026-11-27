import { describe, it, expect } from "vitest";
import { mesclarPorId } from "@/lib/dados/mesclarPorId";

// Spec: SPEC/2026-11-24-rls-por-usuario-e-admin.md

describe("mesclarPorId", () => {
  it("a versão completa prevalece sobre a pública de mesmo id", () => {
    const completos = [{ id: "a", nome: "Ana" }];
    const publicos = [{ id: "a", nome: "" }, { id: "b", nome: "" }];

    expect(mesclarPorId(completos, publicos)).toEqual([
      { id: "a", nome: "Ana" },
      { id: "b", nome: "" },
    ]);
  });

  it("sem itens públicos devolve só os completos", () => {
    expect(mesclarPorId([{ id: "a" }], [])).toEqual([{ id: "a" }]);
  });

  it("sem itens completos devolve os públicos", () => {
    expect(mesclarPorId([], [{ id: "b" }])).toEqual([{ id: "b" }]);
  });
});

/**
 * Download de arquivo gerado no navegador.
 * Spec: SPEC/2026-11-27-financeiro-correto-e-csv.md
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { baixarArquivoTexto } from "@/lib/navegador/baixarArquivo";

describe("baixarArquivoTexto", () => {
  let nomeBaixado: string;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    nomeBaixado = "";
    URL.createObjectURL = vi.fn(() => "blob:arquivo");
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      nomeBaixado = this.download;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("baixa com o nome informado e remove o link da página", () => {
    baixarArquivoTexto("relatorio.csv", "a;b", "text/csv");

    expect(nomeBaixado).toBe("relatorio.csv");
    expect(document.querySelector("a[download]")).toBeNull();
  });

  it("só libera a URL do arquivo depois do clique, para o navegador não cancelar o download", () => {
    baixarArquivoTexto("relatorio.csv", "a;b", "text/csv");

    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:arquivo");
  });
});

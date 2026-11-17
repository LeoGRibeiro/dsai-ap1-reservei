import { describe, it, expect } from "vitest";
// @ts-expect-error módulo .mjs de script de CI, sem declaração de tipos
import { normalizarLcov } from "../../scripts/ci/normalizar-lcov.mjs";

// Spec: SPEC/2026-11-17-fundacao-qualidade.md

describe("normalizarLcov - caminhos do lcov a partir da raiz do repositório", () => {
  it("prefixa src/ nos caminhos relativos gerados pelo Vitest", () => {
    const entrada = "TN:\nSF:app/page.tsx\nDA:1,1\nend_of_record\n";
    expect(normalizarLcov(entrada)).toBe("TN:\nSF:src/app/page.tsx\nDA:1,1\nend_of_record\n");
  });

  it("converte separadores do Windows", () => {
    expect(normalizarLcov("SF:components\\portal\\HorarioGrid.tsx")).toBe(
      "SF:src/components/portal/HorarioGrid.tsx"
    );
  });

  it("remove o ./ inicial", () => {
    expect(normalizarLcov("SF:./lib/constants.ts")).toBe("SF:src/lib/constants.ts");
  });

  it("não duplica o prefixo nem altera caminhos absolutos", () => {
    expect(normalizarLcov("SF:src/lib/utils.ts")).toBe("SF:src/lib/utils.ts");
    expect(normalizarLcov("SF:/home/runner/work/x.ts")).toBe("SF:/home/runner/work/x.ts");
  });

  it("altera apenas linhas SF de vários registros", () => {
    const entrada = "SF:a.ts\nLF:2\nend_of_record\nSF:b\\c.ts\nLF:1\nend_of_record";
    expect(normalizarLcov(entrada)).toBe(
      "SF:src/a.ts\nLF:2\nend_of_record\nSF:src/b/c.ts\nLF:1\nend_of_record"
    );
  });
});

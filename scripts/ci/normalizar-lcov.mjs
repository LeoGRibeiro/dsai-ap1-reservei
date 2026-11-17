// Spec: SPEC/2026-11-17-fundacao-qualidade.md
//
// O Vitest roda dentro de src/ e grava no lcov caminhos relativos a src/
// (ex.: "SF:app/page.tsx"). O diff-cover compara esses caminhos com o
// `git diff`, que usa caminhos relativos à raiz do repositório
// (ex.: "src/app/page.tsx"). Este script prefixa os caminhos com "src/" e
// normaliza separadores do Windows, gerando um lcov utilizável na raiz.
//
// Uso: node scripts/ci/normalizar-lcov.mjs <entrada.lcov> <saida.lcov>

import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/**
 * Reescreve as linhas `SF:` de um relatório lcov para caminhos relativos à
 * raiz do repositório.
 *
 * @param {string} conteudo Conteúdo do lcov gerado em src/.
 * @param {string} prefixo Pasta do app em relação à raiz (padrão "src").
 * @returns {string} lcov com caminhos a partir da raiz.
 */
export function normalizarLcov(conteudo, prefixo = "src") {
  return conteudo.replace(/^SF:(.*)$/gm, (_linha, caminho) => {
    const normalizado = caminho.replace(/\\/g, "/").replace(/^\.\//, "");
    if (normalizado.startsWith(`${prefixo}/`) || normalizado.startsWith("/")) {
      return `SF:${normalizado}`;
    }
    return `SF:${prefixo}/${normalizado}`;
  });
}

// Só grava arquivos quando executado pela linha de comando (não ao ser importado em testes).
const executadoDireto = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (executadoDireto) {
  const [entrada, saida] = process.argv.slice(2);
  if (!entrada || !saida) {
    console.error("Uso: node scripts/ci/normalizar-lcov.mjs <entrada.lcov> <saida.lcov>");
    process.exit(1);
  }
  writeFileSync(saida, normalizarLcov(readFileSync(entrada, "utf8")));
}

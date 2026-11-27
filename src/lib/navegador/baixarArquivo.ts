/** Tempo até liberar a URL do Blob: liberar no mesmo instante do clique cancela o download em alguns navegadores. */
const ATRASO_LIBERAR_URL_MS = 1000;

/**
 * Dispara no navegador o download de um arquivo de texto gerado na hora.
 *
 * @throws quando o navegador não consegue criar o arquivo (quem chama deve avisar o usuário).
 */
export function baixarArquivoTexto(nomeArquivo: string, conteudo: string, tipo: string): void {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), ATRASO_LIBERAR_URL_MS);
  }
}

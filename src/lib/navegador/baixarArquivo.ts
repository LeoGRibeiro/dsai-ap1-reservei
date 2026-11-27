/**
 * Dispara no navegador o download de um arquivo de texto gerado na hora.
 * A URL temporária do Blob é liberada logo depois do clique.
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
    URL.revokeObjectURL(url);
  }
}

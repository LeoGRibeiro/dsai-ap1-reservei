/**
 * Junta a lista completa (o que a sessão pode ver por inteiro) com a versão
 * pública (sem dados pessoais). Para o mesmo id, a versão completa prevalece.
 *
 * Spec: SPEC/2026-11-24-rls-por-usuario-e-admin.md
 */
export function mesclarPorId<T extends { id: string }>(completos: T[], publicos: T[]): T[] {
  const ids = new Set(completos.map((item) => item.id));
  return [...completos, ...publicos.filter((item) => !ids.has(item.id))];
}

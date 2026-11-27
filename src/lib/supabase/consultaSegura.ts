/**
 * Consultas e gravações no Supabase que nunca quebram a tela: leitura com erro
 * vira lista vazia e gravação com erro vira mensagem traduzida para o usuário.
 */

import { isSupabaseConfigured } from "./client";

export type ResultadoGravacao = { ok: true; dado: undefined } | { ok: false; erro: string };

type ErroBanco = { message: string } | null;

export function criarConsultaSegura(opcoes: {
  modulo: string;
  traduzir: (erro: unknown) => string;
  erroGenerico: string;
}) {
  const { modulo, traduzir, erroGenerico } = opcoes;

  async function listar<R, T>(
    consulta: () => PromiseLike<{ data: R[] | null; error: ErroBanco }>,
    mapear: (row: R) => T,
    contexto: string
  ): Promise<T[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const { data, error } = await consulta();
      if (error) {
        console.error(`[${modulo}] Erro ao carregar ${contexto}:`, error.message);
        return [];
      }
      return (data ?? []).map(mapear);
    } catch (err) {
      console.error(`[${modulo}] Falha ao carregar ${contexto}:`, err);
      return [];
    }
  }

  async function gravar(operacao: () => PromiseLike<{ error: ErroBanco }>, contexto: string): Promise<ResultadoGravacao> {
    if (!isSupabaseConfigured()) return { ok: false, erro: erroGenerico };
    try {
      const { error } = await operacao();
      if (error) {
        console.error(`[${modulo}] Erro ao ${contexto}:`, error.message);
        return { ok: false, erro: traduzir(error) };
      }
      return { ok: true, dado: undefined };
    } catch (err) {
      console.error(`[${modulo}] Falha ao ${contexto}:`, err);
      return { ok: false, erro: erroGenerico };
    }
  }

  return { listar, gravar };
}

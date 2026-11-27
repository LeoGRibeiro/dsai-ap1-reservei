/**
 * Acesso ao banco de avaliações. A RLS decide o que cada sessão vê (o cliente,
 * as próprias; o admin, todas); o público lê só a visão `avaliacoes_publicas`.
 *
 * Spec: SPEC/2026-11-27-avaliacoes-de-clientes.md
 */

import { supabase } from "./client";
import { criarConsultaSegura, type ResultadoGravacao } from "./consultaSegura";
import { MENSAGENS_AVALIACOES, traduzirErroAvaliacao } from "@/lib/avaliacoes/regras";
import type { Avaliacao, AvaliacaoPublica, EntradaAvaliacao, StatusAvaliacao } from "@/lib/avaliacoes/types";

interface AvaliacaoRow {
  id: string;
  reserva_id: string;
  usuario_id: string;
  nota: number;
  comentario: string | null;
  status: StatusAvaliacao;
  criada_em: string;
}

interface AvaliacaoPublicaRow {
  id: string;
  nota: number;
  comentario: string | null;
  nome_exibicao: string;
  criada_em: string;
}

const { listar, gravar } = criarConsultaSegura({
  modulo: "Avaliações",
  traduzir: traduzirErroAvaliacao,
  erroGenerico: MENSAGENS_AVALIACOES.erroGenerico,
});

const comentarioLimpo = (comentario: string) => comentario.trim() || null;

export function listarAvaliacoesPublicas(): Promise<AvaliacaoPublica[]> {
  return listar<AvaliacaoPublicaRow, AvaliacaoPublica>(
    () => supabase.from("avaliacoes_publicas").select("*").order("criada_em", { ascending: false }),
    (row) => ({ id: row.id, nota: row.nota, comentario: row.comentario, nomeExibicao: row.nome_exibicao, criadaEm: row.criada_em }),
    "avaliações públicas"
  );
}

export function listarAvaliacoes(): Promise<Avaliacao[]> {
  return listar<AvaliacaoRow, Avaliacao>(
    () => supabase.from("avaliacoes").select("*").order("criada_em", { ascending: false }),
    (row) => ({
      id: row.id,
      reservaId: row.reserva_id,
      usuarioId: row.usuario_id,
      nota: row.nota,
      comentario: row.comentario,
      status: row.status,
      criadaEm: row.criada_em,
    }),
    "avaliações"
  );
}

export function enviarAvaliacao(
  dados: EntradaAvaliacao & { id: string; reservaId: string; usuarioId: string }
): Promise<ResultadoGravacao> {
  return gravar(
    () =>
      supabase.from("avaliacoes").insert({
        id: dados.id,
        reserva_id: dados.reservaId,
        usuario_id: dados.usuarioId,
        nota: dados.nota,
        comentario: comentarioLimpo(dados.comentario),
      }),
    "enviar a avaliação"
  );
}

export function editarAvaliacao(id: string, dados: EntradaAvaliacao): Promise<ResultadoGravacao> {
  return gravar(
    () => supabase.from("avaliacoes").update({ nota: dados.nota, comentario: comentarioLimpo(dados.comentario) }).eq("id", id),
    "editar a avaliação"
  );
}

export function moderarAvaliacao(id: string, status: StatusAvaliacao): Promise<ResultadoGravacao> {
  return gravar(() => supabase.from("avaliacoes").update({ status }).eq("id", id), "moderar a avaliação");
}

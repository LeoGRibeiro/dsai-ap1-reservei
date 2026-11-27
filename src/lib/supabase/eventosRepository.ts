/**
 * Acesso ao banco de eventos, inscrições e partidas. A RLS decide o que cada
 * sessão vê; erros do banco viram mensagens com `traduzirErroEvento`.
 *
 * Spec: SPEC/2026-11-27-eventos-e-torneios.md
 */

import { supabase, isSupabaseConfigured } from "./client";
import { MENSAGENS_EVENTOS, traduzirErroEvento } from "@/lib/eventos/regras";
import type {
  Evento,
  InscricaoEvento,
  PartidaEvento,
  ResultadoPartida,
  StatusEvento,
} from "@/lib/eventos/types";

export type ResultadoEventos<T = undefined> = { ok: true; dado: T } | { ok: false; erro: string };

interface EventoRow {
  id: string;
  tipo: Evento["tipo"];
  nome: string;
  esporte: string | null;
  descricao: string | null;
  regras: string | null;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  quadra_id: string | null;
  valor_inscricao: number | string;
  max_times: number | null;
  inscricoes_ate: string | null;
  banner_url: string | null;
  status: StatusEvento;
  reservas_bloqueio: string[] | null;
  criado_em?: string;
}

interface InscricaoRow {
  id: string;
  evento_id: string;
  usuario_id?: string;
  nome_time: string;
  responsavel_nome?: string;
  responsavel_whatsapp?: string;
  confirmada?: boolean;
}

interface PartidaRow {
  id: string;
  evento_id: string;
  rodada: number;
  posicao: number;
  inscricao_a: string | null;
  inscricao_b: string | null;
  gols_a: number | null;
  gols_b: number | null;
  vencedor: string | null;
  resultado: ResultadoPartida | null;
}

export function linhaParaEvento(row: EventoRow): Evento {
  return {
    id: row.id,
    tipo: row.tipo,
    nome: row.nome,
    esporte: row.esporte ?? undefined,
    descricao: row.descricao ?? undefined,
    regras: row.regras ?? undefined,
    data: String(row.data).slice(0, 10),
    horaInicio: row.hora_inicio,
    horaFim: row.hora_fim,
    quadraId: row.quadra_id ?? undefined,
    valorInscricao: Number(row.valor_inscricao) || 0,
    maxTimes: (row.max_times ?? undefined) as Evento["maxTimes"],
    inscricoesAte: row.inscricoes_ate ? String(row.inscricoes_ate).slice(0, 10) : undefined,
    bannerUrl: row.banner_url ?? undefined,
    status: row.status,
    reservasBloqueio: row.reservas_bloqueio ?? [],
    criadoEm: row.criado_em,
  };
}

export function eventoParaLinha(e: Evento): EventoRow {
  return {
    id: e.id,
    tipo: e.tipo,
    nome: e.nome.trim(),
    esporte: e.esporte ?? null,
    descricao: e.descricao ?? null,
    regras: e.regras ?? null,
    data: e.data,
    hora_inicio: e.horaInicio,
    hora_fim: e.horaFim,
    quadra_id: e.quadraId ?? null,
    valor_inscricao: e.valorInscricao,
    max_times: e.tipo === "torneio" ? e.maxTimes ?? null : null,
    inscricoes_ate: e.tipo === "torneio" ? e.inscricoesAte ?? null : null,
    banner_url: e.bannerUrl ?? null,
    status: e.status,
    reservas_bloqueio: e.reservasBloqueio,
  };
}

function linhaParaInscricao(row: InscricaoRow): InscricaoEvento {
  return {
    id: row.id,
    eventoId: row.evento_id,
    usuarioId: row.usuario_id,
    nomeTime: row.nome_time,
    responsavelNome: row.responsavel_nome,
    responsavelWhatsapp: row.responsavel_whatsapp,
    confirmada: row.confirmada ?? true,
  };
}

function linhaParaPartida(row: PartidaRow): PartidaEvento {
  return {
    id: row.id,
    eventoId: row.evento_id,
    rodada: row.rodada,
    posicao: row.posicao,
    inscricaoA: row.inscricao_a,
    inscricaoB: row.inscricao_b,
    golsA: row.gols_a,
    golsB: row.gols_b,
    vencedor: row.vencedor,
    resultado: row.resultado,
  };
}

function partidaParaLinha(p: PartidaEvento): PartidaRow {
  return {
    id: p.id,
    evento_id: p.eventoId,
    rodada: p.rodada,
    posicao: p.posicao,
    inscricao_a: p.inscricaoA,
    inscricao_b: p.inscricaoB,
    gols_a: p.golsA,
    gols_b: p.golsB,
    vencedor: p.vencedor,
    resultado: p.resultado,
  };
}

const NAO_CONFIGURADO = { ok: false as const, erro: MENSAGENS_EVENTOS.erroGenerico };

/** Executa uma consulta e devolve lista vazia em caso de erro (a tela não quebra). */
async function listar<R, T>(
  consulta: () => PromiseLike<{ data: R[] | null; error: { message: string } | null }>,
  mapear: (row: R) => T,
  contexto: string
): Promise<T[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await consulta();
    if (error) {
      console.error(`[Eventos] Erro ao carregar ${contexto}:`, error.message);
      return [];
    }
    return (data ?? []).map(mapear);
  } catch (err) {
    console.error(`[Eventos] Falha ao carregar ${contexto}:`, err);
    return [];
  }
}

/** Executa uma gravação e traduz o erro do banco. */
async function gravar(
  operacao: () => PromiseLike<{ error: { message: string } | null }>,
  contexto: string
): Promise<ResultadoEventos> {
  if (!isSupabaseConfigured()) return NAO_CONFIGURADO;
  try {
    const { error } = await operacao();
    if (error) {
      console.error(`[Eventos] Erro ao ${contexto}:`, error.message);
      return { ok: false, erro: traduzirErroEvento(error) };
    }
    return { ok: true, dado: undefined };
  } catch (err) {
    console.error(`[Eventos] Falha ao ${contexto}:`, err);
    return { ok: false, erro: MENSAGENS_EVENTOS.erroGenerico };
  }
}

export function listarEventos(): Promise<Evento[]> {
  return listar<EventoRow, Evento>(
    () => supabase.from("eventos").select("*").order("data", { ascending: true }),
    linhaParaEvento,
    "eventos"
  );
}

export function salvarEvento(evento: Evento): Promise<ResultadoEventos> {
  return gravar(() => supabase.from("eventos").upsert(eventoParaLinha(evento)), "salvar o evento");
}

export function listarInscricoes(eventoId: string): Promise<InscricaoEvento[]> {
  return listar<InscricaoRow, InscricaoEvento>(
    () => supabase.from("eventos_inscricoes").select("*").eq("evento_id", eventoId).order("criada_em"),
    linhaParaInscricao,
    "inscrições"
  );
}

/** Times confirmados, só com o nome (visão pública). */
export function listarTimesPublicos(eventoId: string): Promise<InscricaoEvento[]> {
  return listar<InscricaoRow, InscricaoEvento>(
    () => supabase.from("eventos_times_publicos").select("*").eq("evento_id", eventoId),
    linhaParaInscricao,
    "times do evento"
  );
}

export function inscreverTime(inscricao: Omit<InscricaoEvento, "confirmada">): Promise<ResultadoEventos> {
  return gravar(
    () =>
      supabase.from("eventos_inscricoes").insert({
        id: inscricao.id,
        evento_id: inscricao.eventoId,
        usuario_id: inscricao.usuarioId,
        nome_time: inscricao.nomeTime.trim(),
        responsavel_nome: inscricao.responsavelNome ?? "",
        responsavel_whatsapp: inscricao.responsavelWhatsapp ?? "",
      }),
    "inscrever o time"
  );
}

export function removerInscricao(id: string): Promise<ResultadoEventos> {
  return gravar(() => supabase.from("eventos_inscricoes").delete().eq("id", id), "remover a inscrição");
}

export function confirmarInscricao(id: string, confirmada: boolean): Promise<ResultadoEventos> {
  return gravar(
    () => supabase.from("eventos_inscricoes").update({ confirmada }).eq("id", id),
    "confirmar a inscrição"
  );
}

export function listarPartidas(eventoId: string): Promise<PartidaEvento[]> {
  return listar<PartidaRow, PartidaEvento>(
    () => supabase.from("eventos_partidas").select("*").eq("evento_id", eventoId),
    linhaParaPartida,
    "partidas"
  );
}

export function salvarPartidas(partidas: PartidaEvento[]): Promise<ResultadoEventos> {
  if (partidas.length === 0) return Promise.resolve({ ok: true, dado: undefined });
  return gravar(
    () => supabase.from("eventos_partidas").upsert(partidas.map(partidaParaLinha)),
    "salvar a chave"
  );
}

/**
 * Camada de persistência para o Sistema de Vagas com Supabase e Fallback LocalStorage.
 * Garante sincronização bidirecional em ambientes de produção e suporte completo offline/local.
 */

import { supabase, isSupabaseConfigured } from "./client";
import type { InteresseVaga, StatusInteresse } from "@/lib/vagas/types";

const TABELA_INTERESSES = "interesses_vagas";
const STORAGE_INTERESSES_KEY = "reservei_interesses_vagas";

interface InteresseDbRow {
  id: string;
  reserva_id: string;
  reservaId?: string;
  usuario_id: string;
  usuarioId?: string;
  nome_usuario: string;
  nomeUsuario?: string;
  telefone_usuario: string;
  telefoneUsuario?: string;
  status: string;
  created_at?: string;
  criado_em?: string;
  criadoEm?: string;
}

/**
 * Converte linha do banco para a entidade de domínio InteresseVaga.
 */
function rowToInteresse(row: InteresseDbRow): InteresseVaga {
  return {
    id: row.id,
    reservaId: row.reserva_id ?? row.reservaId ?? "",
    usuarioId: row.usuario_id ?? row.usuarioId ?? "",
    nomeUsuario: row.nome_usuario ?? row.nomeUsuario ?? "",
    telefoneUsuario: row.telefone_usuario ?? row.telefoneUsuario ?? "",
    status: (row.status as StatusInteresse) || "pendente",
    criadoEm:
      row.created_at ??
      row.criado_em ??
      row.criadoEm ??
      new Date().toISOString(),
  };
}

/**
 * Converte entidade de domínio para payload do Supabase.
 */
function interesseToRow(item: Partial<InteresseVaga>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (item.id !== undefined) row.id = item.id;
  if (item.reservaId !== undefined) row.reserva_id = item.reservaId;
  if (item.usuarioId !== undefined) row.usuario_id = item.usuarioId;
  if (item.nomeUsuario !== undefined) row.nome_usuario = item.nomeUsuario;
  if (item.telefoneUsuario !== undefined) row.telefone_usuario = item.telefoneUsuario;
  if (item.status !== undefined) row.status = item.status;
  if (item.criadoEm !== undefined) row.created_at = item.criadoEm;
  return row;
}

/**
 * Obtém todos os interesses armazenados no LocalStorage.
 */
export function getInteressesLocais(): InteresseVaga[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_INTERESSES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Salva a lista de interesses no LocalStorage.
 */
export function saveInteressesLocais(lista: InteresseVaga[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_INTERESSES_KEY, JSON.stringify(lista));
  } catch (err) {
    console.error("[Vagas] Erro ao salvar interesses no LocalStorage:", err);
  }
}

/**
 * Busca todos os interesses registrados no Supabase, com fallback para o LocalStorage.
 */
export async function fetchInteressesVagasSupabase(): Promise<InteresseVaga[]> {
  const locais = getInteressesLocais();

  if (!isSupabaseConfigured()) {
    return locais;
  }

  try {
    const { data, error } = await supabase
      .from(TABELA_INTERESSES)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn(
        "[Supabase Vagas] Tabela não disponível ou erro de consulta, usando local:",
        error.message
      );
      return locais;
    }

    if (data && Array.isArray(data)) {
      const mapeados = (data as InteresseDbRow[]).map(rowToInteresse);
      saveInteressesLocais(mapeados);
      return mapeados;
    }

    return locais;
  } catch (err) {
    console.warn("[Supabase Vagas] Falha inesperada ao buscar interesses:", err);
    return locais;
  }
}

/**
 * Registra um novo interesse tanto localmente quanto no Supabase.
 */
export async function inserirInteresseVagaSupabase(
  interesse: InteresseVaga
): Promise<boolean> {
  // Salva no LocalStorage imediatamente
  const locais = getInteressesLocais();
  const index = locais.findIndex((i) => i.id === interesse.id);
  if (index >= 0) {
    locais[index] = interesse;
  } else {
    locais.unshift(interesse);
  }
  saveInteressesLocais(locais);

  if (!isSupabaseConfigured()) {
    return true;
  }

  try {
    const row = interesseToRow(interesse);
    const { error } = await supabase.from(TABELA_INTERESSES).insert([row]);

    if (error) {
      console.warn(
        "[Supabase Vagas] Erro ao persistir interesse na nuvem:",
        error.message
      );
      return false;
    }

    return true;
  } catch (err) {
    console.error("[Supabase Vagas] Falha ao inserir interesse:", err);
    return false;
  }
}

/**
 * Atualiza o status de um interesse (ex: para 'contatado' ou 'rejeitado').
 */
export async function atualizarStatusInteresseSupabase(
  id: string,
  status: StatusInteresse
): Promise<boolean> {
  // Atualiza LocalStorage
  const locais = getInteressesLocais();
  const index = locais.findIndex((i) => i.id === id);
  if (index >= 0) {
    locais[index] = { ...locais[index], status };
    saveInteressesLocais(locais);
  }

  if (!isSupabaseConfigured()) {
    return true;
  }

  try {
    const { error } = await supabase
      .from(TABELA_INTERESSES)
      .update({ status })
      .eq("id", id);

    if (error) {
      console.warn(
        `[Supabase Vagas] Erro ao atualizar status do interesse ${id}:`,
        error.message
      );
      return false;
    }

    return true;
  } catch (err) {
    console.error("[Supabase Vagas] Falha ao atualizar interesse:", err);
    return false;
  }
}

/**
 * Remove todos os interesses vinculados a uma reserva cancelada ou excluída.
 */
export async function removerInteressesPorReservaSupabase(
  reservaId: string
): Promise<boolean> {
  const locais = getInteressesLocais().filter((i) => i.reservaId !== reservaId);
  saveInteressesLocais(locais);

  if (!isSupabaseConfigured()) {
    return true;
  }

  try {
    const { error } = await supabase
      .from(TABELA_INTERESSES)
      .delete()
      .eq("reserva_id", reservaId);

    if (error) {
      console.warn(
        `[Supabase Vagas] Erro ao remover interesses da reserva ${reservaId}:`,
        error.message
      );
      return false;
    }

    return true;
  } catch (err) {
    console.error("[Supabase Vagas] Falha ao remover interesses:", err);
    return false;
  }
}

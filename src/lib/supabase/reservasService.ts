import { supabase, isSupabaseConfigured } from "./client";
import { rowToReserva, reservaToRow, type ReservaDbRow } from "./types";
import type { Reserva } from "@/store/useReservasStore";

const TABELA_RESERVAS = "reservas";

/**
 * Busca todas as reservas cadastradas no Supabase.
 */
export async function fetchReservasSupabase(): Promise<Reserva[] | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from(TABELA_RESERVAS)
      .select("*")
      .order("criada_em", { ascending: false });

    if (error) {
      console.error("[Supabase] Erro ao carregar reservas:", error.message);
      return null;
    }

    return (data as ReservaDbRow[]).map(rowToReserva);
  } catch (err) {
    console.error("[Supabase] Falha inesperada ao buscar reservas:", err);
    return null;
  }
}

/**
 * Insere uma nova reserva no banco de dados Supabase.
 */
export async function inserirReservaSupabase(reserva: Reserva): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  try {
    const row = reservaToRow(reserva);
    const { error } = await supabase.from(TABELA_RESERVAS).insert([row]);

    if (error) {
      console.error("[Supabase] Erro ao inserir reserva:", error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[Supabase] Falha inesperada ao inserir reserva:", err);
    return false;
  }
}

/**
 * Atualiza campos de uma reserva existente no Supabase.
 */
export async function atualizarReservaSupabase(
  id: string,
  dados: Partial<Reserva>
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  try {
    const row = reservaToRow(dados);
    const { error } = await supabase
      .from(TABELA_RESERVAS)
      .update(row)
      .eq("id", id);

    if (error) {
      console.error(`[Supabase] Erro ao atualizar reserva ${id}:`, error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`[Supabase] Falha inesperada ao atualizar reserva ${id}:`, err);
    return false;
  }
}

/**
 * Remove uma reserva do banco de dados Supabase.
 */
export async function removerReservaSupabase(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  try {
    const { error } = await supabase
      .from(TABELA_RESERVAS)
      .delete()
      .eq("id", id);

    if (error) {
      console.error(`[Supabase] Erro ao remover reserva ${id}:`, error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`[Supabase] Falha inesperada ao remover reserva ${id}:`, err);
    return false;
  }
}

/**
 * Cria uma inscrição Realtime para escutar inserções, atualizações e deleções
 * na tabela 'reservas' em tempo real.
 */
export function subscreverReservasSupabase(
  onInsert: (reserva: Reserva) => void,
  onUpdate: (reserva: Reserva) => void,
  onDelete: (id: string) => void
) {
  if (!isSupabaseConfigured()) {
    return () => {};
  }

  const canal = supabase
    .channel("mudancas-reservas-realtime")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: TABELA_RESERVAS,
      },
      (payload) => {
        const nova = rowToReserva(payload.new as ReservaDbRow);
        onInsert(nova);
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: TABELA_RESERVAS,
      },
      (payload) => {
        const atualizada = rowToReserva(payload.new as ReservaDbRow);
        onUpdate(atualizada);
      }
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: TABELA_RESERVAS,
      },
      (payload) => {
        const idDeletado = (payload.old as { id?: string })?.id;
        if (idDeletado) {
          onDelete(idDeletado);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(canal);
  };
}

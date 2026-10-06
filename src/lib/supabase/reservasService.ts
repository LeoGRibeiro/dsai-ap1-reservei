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
 * Busca reservas de um determinado mês e ano no Supabase (Lazy Loading).
 * @param ano Ano com 4 dígitos (ex.: 2026)
 * @param mes Mês de 1 a 12 (ex.: 10 para Outubro)
 * @returns Lista de reservas do mês ou null em caso de erro/não configurado.
 */
export async function fetchReservasPorMesSupabase(
  ano: number,
  mes: number
): Promise<Reserva[] | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const dataInicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
    const dataFim = `${ano}-${String(mes).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;

    const { data, error } = await supabase
      .from(TABELA_RESERVAS)
      .select("*")
      .gte("data", dataInicio)
      .lte("data", dataFim)
      .order("data", { ascending: true });

    if (error) {
      console.error(
        `[Supabase] Erro ao carregar reservas do mês ${mes}/${ano}:`,
        error.message
      );
      return null;
    }

    return (data as ReservaDbRow[]).map(rowToReserva);
  } catch (err) {
    console.error(
      `[Supabase] Falha inesperada ao buscar reservas do mês ${mes}/${ano}:`,
      err
    );
    return null;
  }
}

/**
 * Remove colunas ausentes no schema cache do Supabase com base na mensagem de erro do PostgREST.
 * Retorna true se alguma coluna foi removida do payload, permitindo retry imediato sem quebrar o fluxo.
 */
function expurgarColunaIncompativel(
  payload: Record<string, unknown>,
  errorMessage: string
): boolean {
  const match = errorMessage.match(/Could not find the '(\w+)' column/i);
  if (match && match[1] && match[1] in payload) {
    console.warn(
      `[Supabase] Coluna '${match[1]}' ausente no schema cache de 'reservas'. Removendo do payload para compatibilidade retroativa.`
    );
    delete payload[match[1]];
    return true;
  }

  if (errorMessage.includes("user_id") && "user_id" in payload) {
    delete payload.user_id;
    return true;
  }

  return false;
}

/**
 * Insere uma nova reserva no banco de dados Supabase.
 * Trata graciosamente eventuais colunas ausentes no schema cache com retry automático resiliente.
 */
export async function inserirReservaSupabase(reserva: Reserva): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  try {
    const payload: Record<string, unknown> = { ...reservaToRow(reserva) };
    let tentativa = 0;

    while (tentativa < 6) {
      const { error } = await supabase.from(TABELA_RESERVAS).insert([payload]);

      if (!error) {
        return true;
      }

      if (expurgarColunaIncompativel(payload, error.message)) {
        tentativa++;
        continue;
      }

      console.error("[Supabase] Erro ao inserir reserva:", error.message);
      return false;
    }

    return false;
  } catch (err) {
    console.error("[Supabase] Falha inesperada ao inserir reserva:", err);
    return false;
  }
}

/**
 * Insere várias reservas de uma só vez (ocorrências de um contrato recorrente).
 * Usa upsert por id para ser idempotente caso a geração seja repetida.
 */
export async function inserirReservasEmLoteSupabase(reservas: Reserva[]): Promise<boolean> {
  if (!isSupabaseConfigured() || reservas.length === 0) {
    return false;
  }

  try {
    const rows = reservas.map((r) => reservaToRow(r));
    const { error } = await supabase
      .from(TABELA_RESERVAS)
      .upsert(rows, { onConflict: "id" });

    if (error) {
      console.error("[Supabase] Erro ao inserir reservas em lote:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Supabase] Falha inesperada ao inserir reservas em lote:", err);
    return false;
  }
}

/** Aplica o mesmo update a várias reservas (ex.: encerrar contrato → cancelar futuras). */
export async function atualizarReservasEmLoteSupabase(
  ids: string[],
  dados: Partial<Reserva>
): Promise<boolean> {
  if (!isSupabaseConfigured() || ids.length === 0) {
    return false;
  }

  try {
    const payload: Record<string, unknown> = { ...reservaToRow(dados) };
    let tentativa = 0;

    while (tentativa < 6) {
      const { error } = await supabase
        .from(TABELA_RESERVAS)
        .update(payload)
        .in("id", ids);

      if (!error) {
        return true;
      }

      if (expurgarColunaIncompativel(payload, error.message)) {
        tentativa++;
        continue;
      }

      console.error("[Supabase] Erro ao atualizar reservas em lote:", error.message);
      return false;
    }

    return false;
  } catch (err) {
    console.error("[Supabase] Falha inesperada ao atualizar reservas em lote:", err);
    return false;
  }
}

/**
 * Atualiza campos de uma reserva existente no Supabase.
 * Trata graciosamente caso colunas novas (ex: fidelidade) ainda não existam no schema do PostgreSQL,
 * removendo campos incompatíveis e tentando novamente sem interromper o fluxo da aplicação.
 */
export async function atualizarReservaSupabase(
  id: string,
  dados: Partial<Reserva>
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  try {
    const payload: Record<string, unknown> = { ...reservaToRow(dados) };
    let tentativa = 0;

    while (tentativa < 6) {
      const { error } = await supabase
        .from(TABELA_RESERVAS)
        .update(payload)
        .eq("id", id);

      if (!error) {
        return true;
      }

      if (expurgarColunaIncompativel(payload, error.message)) {
        tentativa++;
        continue;
      }

      console.error(`[Supabase] Erro ao atualizar reserva ${id}:`, error.message);
      return false;
    }

    return false;
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

  // Remove qualquer canal anterior com mesmo prefixo para evitar conflito de callbacks após subscribe
  try {
    const canaisExistentes = supabase.getChannels();
    for (const c of canaisExistentes) {
      if (c.topic.includes("mudancas-reservas-realtime")) {
        void supabase.removeChannel(c);
      }
    }
  } catch (err) {
    console.warn("[Supabase] Aviso ao limpar canais anteriores:", err);
  }

  const canalId = `mudancas-reservas-realtime-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const canal = supabase
    .channel(canalId)
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
    void supabase.removeChannel(canal);
  };
}

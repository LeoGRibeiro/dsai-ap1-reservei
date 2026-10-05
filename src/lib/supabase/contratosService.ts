import { supabase, isSupabaseConfigured } from "./client";
import { rowToContrato, contratoToRow, type ContratoDbRow } from "@/lib/recorrencia/contratoMapper";
import type { ContratoRecorrente } from "@/lib/recorrencia/types";

const TABELA_CONTRATOS = "contratos_recorrentes";

/** Busca todos os contratos recorrentes. Retorna null se o Supabase não estiver disponível. */
export async function fetchContratosSupabase(): Promise<ContratoRecorrente[] | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from(TABELA_CONTRATOS)
      .select("*")
      .order("criado_em", { ascending: false });

    if (error) {
      console.error("[Supabase] Erro ao carregar contratos:", error.message);
      return null;
    }
    return (data as ContratoDbRow[]).map(rowToContrato);
  } catch (err) {
    console.error("[Supabase] Falha inesperada ao buscar contratos:", err);
    return null;
  }
}

/** Insere um contrato. Retorna true em caso de sucesso. */
export async function inserirContratoSupabase(contrato: ContratoRecorrente): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase.from(TABELA_CONTRATOS).insert([contratoToRow(contrato)]);
    if (error) {
      console.error("[Supabase] Erro ao inserir contrato:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Supabase] Falha inesperada ao inserir contrato:", err);
    return false;
  }
}

/** Atualiza campos de um contrato existente. */
export async function atualizarContratoSupabase(
  id: string,
  dados: Partial<ContratoRecorrente>
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase
      .from(TABELA_CONTRATOS)
      .update(contratoToRow(dados))
      .eq("id", id);

    if (error) {
      console.error(`[Supabase] Erro ao atualizar contrato ${id}:`, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[Supabase] Falha inesperada ao atualizar contrato ${id}:`, err);
    return false;
  }
}

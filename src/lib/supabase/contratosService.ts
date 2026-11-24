import { supabase, isSupabaseConfigured } from "./client";
import { rowToContrato, contratoToRow, type ContratoDbRow } from "@/lib/recorrencia/contratoMapper";
import type { ContratoRecorrente } from "@/lib/recorrencia/types";
import { mesclarPorId } from "@/lib/dados/mesclarPorId";

const TABELA_CONTRATOS = "contratos_recorrentes";
const VISAO_CONTRATOS_PUBLICOS = "contratos_publicos";

/** Busca todos os contratos recorrentes. Retorna null se o Supabase não estiver disponível. */
export async function fetchContratosSupabase(): Promise<ContratoRecorrente[] | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    // Admin lê a tabela completa; os demais, a visão sem contato de grupos.
    const [completos, publicos] = await Promise.all([
      supabase.from(TABELA_CONTRATOS).select("*").order("criado_em", { ascending: false }),
      supabase.from(VISAO_CONTRATOS_PUBLICOS).select("*"),
    ]);

    if (completos.error) console.error("[Supabase] Erro ao carregar contratos:", completos.error.message);
    if (publicos.error) console.error("[Supabase] Erro ao carregar contratos públicos:", publicos.error.message);
    if (completos.error && publicos.error) return null;

    return mesclarPorId(
      ((completos.data ?? []) as ContratoDbRow[]).map(rowToContrato),
      ((publicos.data ?? []) as ContratoDbRow[]).map(rowToContrato)
    );
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

/**
 * @module supabase/institucionalRepository
 *
 * Repositório tipado para comunicação com as tabelas `landing_page_gallery`
 * e `landing_page_schools` e Supabase Storage, com fallback resiliente
 * para LocalStorage e dados iniciais demonstrativos.
 */

import { supabase, isSupabaseConfigured } from "./client";
import type {
  GaleriaItem,
  EscolinhaItem,
  CriarGaleriaInput,
  AtualizarGaleriaInput,
  CriarEscolinhaInput,
  AtualizarEscolinhaInput,
} from "@/lib/institucional/types";
import { GALERIA_INICIAL, ESCOLINHAS_INICIAIS } from "@/lib/institucional/dadosIniciais";

const STORAGE_KEY_GALERIA = "reservei_landing_gallery";
const STORAGE_KEY_ESCOLINHAS = "reservei_landing_schools";

/**
 * Lê itens de galeria armazenados no cache local.
 */
function getGaleriaLocal(): GaleriaItem[] {
  if (typeof window === "undefined") return [...GALERIA_INICIAL];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GALERIA);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_GALERIA, JSON.stringify(GALERIA_INICIAL));
      return [...GALERIA_INICIAL];
    }
    const parsed = JSON.parse(raw) as GaleriaItem[];
    // Auto-atualização de URLs da galeria padrão caso o cache local contenha links legados
    let modificado = false;
    const atualizados = parsed.map((item) => {
      const base = GALERIA_INICIAL.find((g) => g.id === item.id);
      if (
        base &&
        (item.imageUrl.includes("1596727366422") ||
          item.imageUrl.includes("1529900245534"))
      ) {
        modificado = true;
        return { ...item, imageUrl: base.imageUrl };
      }
      return item;
    });
    if (modificado) {
      localStorage.setItem(STORAGE_KEY_GALERIA, JSON.stringify(atualizados));
    }
    return atualizados;
  } catch {
    return [...GALERIA_INICIAL];
  }
}

/**
 * Salva itens de galeria no cache local.
 */
function setGaleriaLocal(itens: GaleriaItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_GALERIA, JSON.stringify(itens));
  } catch {}
}

/**
 * Lê escolinhas armazenadas no cache local.
 */
function getEscolinhasLocal(): EscolinhaItem[] {
  if (typeof window === "undefined") return [...ESCOLINHAS_INICIAIS];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ESCOLINHAS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_ESCOLINHAS, JSON.stringify(ESCOLINHAS_INICIAIS));
      return [...ESCOLINHAS_INICIAIS];
    }
    return JSON.parse(raw) as EscolinhaItem[];
  } catch {
    return [...ESCOLINHAS_INICIAIS];
  }
}

/**
 * Salva escolinhas no cache local.
 */
function setEscolinhasLocal(itens: EscolinhaItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_ESCOLINHAS, JSON.stringify(itens));
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// REPOSITÓRIO: GALERIA DE FOTOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Busca todas as fotos cadastradas na galeria do complexo.
 */
export async function listarGaleria(): Promise<GaleriaItem[]> {
  if (!isSupabaseConfigured()) {
    return getGaleriaLocal();
  }

  try {
    const { data, error } = await supabase
      .from("landing_page_gallery")
      .select("*")
      .order("display_order", { ascending: true });

    if (error || !data || data.length === 0) {
      // Se a tabela ainda não tiver dados ou o schema não estiver aplicado, usa local
      return getGaleriaLocal();
    }

    const mapeados: GaleriaItem[] = data.map((row) => ({
      id: row.id,
      imageUrl: row.image_url,
      title: row.title,
      description: row.description,
      categoria: row.categoria || "quadras",
      displayOrder: row.display_order ?? 0,
      isActive: row.is_active ?? true,
      createdAt: row.created_at,
    }));

    setGaleriaLocal(mapeados);
    return mapeados;
  } catch {
    return getGaleriaLocal();
  }
}

/**
 * Cadastra uma nova foto na galeria.
 */
export async function criarGaleriaItem(input: CriarGaleriaInput): Promise<GaleriaItem> {
  const novoItem: GaleriaItem = {
    id: `gal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    imageUrl: input.imageUrl,
    title: input.title,
    description: input.description,
    categoria: input.categoria,
    displayOrder: input.displayOrder ?? 99,
    isActive: input.isActive ?? true,
    createdAt: new Date().toISOString(),
  };

  // Sempre sincroniza com o cache local
  const locais = getGaleriaLocal();
  const atualizados = [...locais, novoItem];
  setGaleriaLocal(atualizados);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from("landing_page_gallery").insert({
        id: novoItem.id,
        image_url: novoItem.imageUrl,
        title: novoItem.title,
        description: novoItem.description,
        categoria: novoItem.categoria,
        display_order: novoItem.displayOrder,
        is_active: novoItem.isActive,
      });
    } catch {}
  }

  return novoItem;
}

/**
 * Atualiza um item da galeria de fotos.
 */
export async function atualizarGaleriaItem(
  id: string,
  input: AtualizarGaleriaInput
): Promise<GaleriaItem | null> {
  const locais = getGaleriaLocal();
  const index = locais.findIndex((i) => i.id === id);
  if (index === -1) return null;

  const atualizado: GaleriaItem = {
    ...locais[index],
    ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.categoria !== undefined ? { categoria: input.categoria } : {}),
    ...(input.displayOrder !== undefined ? { displayOrder: input.displayOrder } : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
  };

  locais[index] = atualizado;
  setGaleriaLocal(locais);

  if (isSupabaseConfigured()) {
    try {
      const payload: Record<string, unknown> = {};
      if (input.imageUrl !== undefined) payload.image_url = input.imageUrl;
      if (input.title !== undefined) payload.title = input.title;
      if (input.description !== undefined) payload.description = input.description;
      if (input.categoria !== undefined) payload.categoria = input.categoria;
      if (input.displayOrder !== undefined) payload.display_order = input.displayOrder;
      if (input.isActive !== undefined) payload.is_active = input.isActive;

      await supabase.from("landing_page_gallery").update(payload).eq("id", id);
    } catch {}
  }

  return atualizado;
}

/**
 * Exclui um item da galeria.
 */
export async function excluirGaleriaItem(id: string): Promise<boolean> {
  const locais = getGaleriaLocal();
  const filtrados = locais.filter((i) => i.id !== id);
  setGaleriaLocal(filtrados);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from("landing_page_gallery").delete().eq("id", id);
    } catch {}
  }

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// REPOSITÓRIO: ESCOLINHAS ESPORTIVAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Busca todas as escolinhas esportivas cadastradas.
 */
export async function listarEscolinhas(): Promise<EscolinhaItem[]> {
  if (!isSupabaseConfigured()) {
    return getEscolinhasLocal();
  }

  try {
    const { data, error } = await supabase
      .from("landing_page_schools")
      .select("*")
      .order("sport_name", { ascending: true });

    if (error || !data || data.length === 0) {
      return getEscolinhasLocal();
    }

    const mapeadas: EscolinhaItem[] = data.map((row) => ({
      id: row.id,
      contratoId: row.contrato_id,
      sportName: row.sport_name,
      teacherName: row.teacher_name,
      teacherImageUrl: row.teacher_image_url,
      scheduleInfo: row.schedule_info,
      whatsappNumber: row.whatsapp_number,
      descricao: row.descricao,
      faixaEtaria: row.faixa_etaria,
      isActive: row.is_active ?? true,
      createdAt: row.created_at,
    }));

    setEscolinhasLocal(mapeadas);
    return mapeadas;
  } catch {
    return getEscolinhasLocal();
  }
}

/**
 * Cadastra uma nova escolinha esportiva.
 */
export async function criarEscolinha(input: CriarEscolinhaInput): Promise<EscolinhaItem> {
  const novoItem: EscolinhaItem = {
    id: `esc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    contratoId: input.contratoId,
    sportName: input.sportName,
    teacherName: input.teacherName,
    teacherImageUrl: input.teacherImageUrl,
    scheduleInfo: input.scheduleInfo,
    whatsappNumber: input.whatsappNumber,
    descricao: input.descricao,
    faixaEtaria: input.faixaEtaria,
    isActive: input.isActive ?? true,
    createdAt: new Date().toISOString(),
  };

  const locais = getEscolinhasLocal();
  const atualizadas = [...locais, novoItem];
  setEscolinhasLocal(atualizadas);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from("landing_page_schools").insert({
        id: novoItem.id,
        contrato_id: novoItem.contratoId,
        sport_name: novoItem.sportName,
        teacher_name: novoItem.teacherName,
        teacher_image_url: novoItem.teacherImageUrl,
        schedule_info: novoItem.scheduleInfo,
        whatsapp_number: novoItem.whatsappNumber,
        descricao: novoItem.descricao,
        faixa_etaria: novoItem.faixaEtaria,
        is_active: novoItem.isActive,
      });
    } catch {}
  }

  return novoItem;
}

/**
 * Atualiza uma escolinha esportiva existente.
 */
export async function atualizarEscolinha(
  id: string,
  input: AtualizarEscolinhaInput
): Promise<EscolinhaItem | null> {
  const locais = getEscolinhasLocal();
  const index = locais.findIndex((i) => i.id === id);
  if (index === -1) return null;

  const atualizado: EscolinhaItem = {
    ...locais[index],
    ...(input.contratoId !== undefined ? { contratoId: input.contratoId } : {}),
    ...(input.sportName !== undefined ? { sportName: input.sportName } : {}),
    ...(input.teacherName !== undefined ? { teacherName: input.teacherName } : {}),
    ...(input.teacherImageUrl !== undefined ? { teacherImageUrl: input.teacherImageUrl } : {}),
    ...(input.scheduleInfo !== undefined ? { scheduleInfo: input.scheduleInfo } : {}),
    ...(input.whatsappNumber !== undefined ? { whatsappNumber: input.whatsappNumber } : {}),
    ...(input.descricao !== undefined ? { descricao: input.descricao } : {}),
    ...(input.faixaEtaria !== undefined ? { faixaEtaria: input.faixaEtaria } : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
  };

  locais[index] = atualizado;
  setEscolinhasLocal(locais);

  if (isSupabaseConfigured()) {
    try {
      const payload: Record<string, unknown> = {};
      if (input.contratoId !== undefined) payload.contrato_id = input.contratoId;
      if (input.sportName !== undefined) payload.sport_name = input.sportName;
      if (input.teacherName !== undefined) payload.teacher_name = input.teacherName;
      if (input.teacherImageUrl !== undefined) payload.teacher_image_url = input.teacherImageUrl;
      if (input.scheduleInfo !== undefined) payload.schedule_info = input.scheduleInfo;
      if (input.whatsappNumber !== undefined) payload.whatsapp_number = input.whatsappNumber;
      if (input.descricao !== undefined) payload.descricao = input.descricao;
      if (input.faixaEtaria !== undefined) payload.faixa_etaria = input.faixaEtaria;
      if (input.isActive !== undefined) payload.is_active = input.isActive;

      await supabase.from("landing_page_schools").update(payload).eq("id", id);
    } catch {}
  }

  return atualizado;
}

/**
 * Exclui uma escolinha esportiva.
 */
export async function excluirEscolinha(id: string): Promise<boolean> {
  const locais = getEscolinhasLocal();
  const filtrados = locais.filter((i) => i.id !== id);
  setEscolinhasLocal(filtrados);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from("landing_page_schools").delete().eq("id", id);
    } catch {}
  }

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD DE IMAGEM VIA SUPABASE STORAGE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Faz upload de imagem para o bucket `institucional` do Supabase Storage.
 * Retorna a URL pública gerada ou lança erro explicativo.
 *
 * @param arquivo Arquivo selecionado no input file
 * @param pasta Subpasta interna (ex: "galeria" ou "professores")
 */
export async function uploadImagemInstitucional(
  arquivo: File,
  pasta: "galeria" | "professores" = "galeria"
): Promise<{ success: boolean; url?: string; error?: string }> {
  if (!isSupabaseConfigured()) {
    // Retorna URL de objeto temporário em memória para demonstração offline
    const objectUrl = URL.createObjectURL(arquivo);
    return { success: true, url: objectUrl };
  }

  try {
    const extensao = arquivo.name.split(".").pop() || "jpg";
    const nomeArquivo = `${pasta}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${extensao}`;

    const { error: uploadError } = await supabase.storage
      .from("institucional")
      .upload(nomeArquivo, arquivo, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      // Se o bucket não existir, faz fallback para objectUrl para não travar o usuário
      return {
        success: true,
        url: URL.createObjectURL(arquivo),
        error: uploadError.message,
      };
    }

    const { data: urlData } = supabase.storage
      .from("institucional")
      .getPublicUrl(nomeArquivo);

    return { success: true, url: urlData.publicUrl };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro no upload da imagem.",
    };
  }
}

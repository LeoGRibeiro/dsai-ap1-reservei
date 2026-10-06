/**
 * Camada de Persistência do Sistema de Fidelidade no Supabase com Fallback LocalStorage.
 * Gerencia a sincronização de campanhas, selos acumulados e vouchers de desconto.
 */

import { supabase, isSupabaseConfigured } from "./client";
import type { Reserva } from "@/store/useReservasStore";
import type {
  CampanhaFidelidade,
  SeloFidelidade,
  VoucherFidelidade,
  StatusVoucherFidelidade,
} from "@/lib/fidelidade/types";
import {
  CAMPANHA_PADRAO,
  avaliarElegibilidadeReservaParaSelo,
  construirSeloParaReserva,
  calcularProgressoUsuario,
  resgatarVoucherFidelidade,
} from "@/lib/fidelidade/fidelidadeService";

const TABELA_CAMPANHA = "fidelidade_campanha";
const TABELA_SELOS = "fidelidade_selos";
const TABELA_VOUCHERS = "fidelidade_vouchers";

const STORAGE_CAMPANHA_KEY = "reservei_fidelidade_campanha";
const STORAGE_SELOS_KEY = "reservei_fidelidade_selos";
const STORAGE_VOUCHERS_KEY = "reservei_fidelidade_vouchers";

// ── Helpers de LocalStorage ──────────────────────────────────────────────────

function lerLocalStorage<T>(chave: string, valorPadrao: T): T {
  if (typeof window === "undefined") return valorPadrao;
  try {
    const raw = localStorage.getItem(chave);
    return raw ? (JSON.parse(raw) as T) : valorPadrao;
  } catch {
    return valorPadrao;
  }
}

function salvarLocalStorage<T>(chave: string, valor: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch (err) {
    console.error(`[FidelidadeService] Falha ao persistir LocalStorage (${chave}):`, err);
  }
}

// ── Mappers Supabase <-> Domínio ─────────────────────────────────────────────

interface CampanhaDbRow {
  id: string;
  nome?: string;
  horas_necessarias?: number;
  horasNecessarias?: number;
  meses_validade?: number;
  mesesValidade?: number;
  dias_validade_voucher?: number;
  diasValidadeVoucher?: number;
  ativo?: boolean;
  atualizado_em?: string;
  atualizadoEm?: string;
}

function rowToCampanha(row: CampanhaDbRow): CampanhaFidelidade {
  return {
    id: row.id || CAMPANHA_PADRAO.id,
    nome: row.nome || CAMPANHA_PADRAO.nome,
    horasNecessarias: row.horas_necessarias ?? row.horasNecessarias ?? CAMPANHA_PADRAO.horasNecessarias,
    mesesValidade: row.meses_validade ?? row.mesesValidade ?? CAMPANHA_PADRAO.mesesValidade,
    diasValidadeVoucher:
      row.dias_validade_voucher ?? row.diasValidadeVoucher ?? CAMPANHA_PADRAO.diasValidadeVoucher,
    ativo: row.ativo !== undefined ? row.ativo : true,
    atualizadoEm: row.atualizado_em ?? row.atualizadoEm ?? new Date().toISOString(),
  };
}

interface SeloDbRow {
  id: string;
  usuario_id?: string;
  usuarioId?: string;
  reserva_id?: string;
  reservaId?: string;
  horas_contabilizadas?: number;
  horasContabilizadas?: number;
  valor_por_hora?: number;
  valorPorHora?: number;
  valor_total_reserva?: number;
  valorTotalReserva?: number;
  data_jogo?: string;
  dataJogo?: string;
  criado_em?: string;
  criadoEm?: string;
  expira_em?: string;
  expiraEm?: string;
  resgatado?: boolean;
  voucher_id?: string | null;
  voucherId?: string | null;
}

function rowToSelo(row: SeloDbRow): SeloFidelidade {
  return {
    id: row.id,
    usuarioId: row.usuario_id ?? row.usuarioId ?? "",
    reservaId: row.reserva_id ?? row.reservaId ?? "",
    horasContabilizadas: row.horas_contabilizadas ?? row.horasContabilizadas ?? 1,
    valorPorHora: Number(row.valor_por_hora ?? row.valorPorHora ?? 0),
    valorTotalReserva: Number(row.valor_total_reserva ?? row.valorTotalReserva ?? 0),
    dataJogo: row.data_jogo ?? row.dataJogo ?? "",
    criadoEm: row.criado_em ?? row.criadoEm ?? new Date().toISOString(),
    expiraEm: row.expira_em ?? row.expiraEm ?? "",
    resgatado: Boolean(row.resgatado),
    voucherId: row.voucher_id ?? row.voucherId ?? null,
  };
}

interface VoucherDbRow {
  id: string;
  codigo?: string;
  usuario_id?: string;
  usuarioId?: string;
  valor_teto?: number;
  valorTeto?: number;
  status?: string;
  criado_em?: string;
  criadoEm?: string;
  expira_em?: string;
  expiraEm?: string;
  reserva_utilizada_id?: string | null;
  reservaUtilizadaId?: string | null;
  utilizado_em?: string | null;
  utilizadoEm?: string | null;
}

function rowToVoucher(row: VoucherDbRow): VoucherFidelidade {
  return {
    id: row.id,
    codigo: row.codigo || "",
    usuarioId: row.usuario_id ?? row.usuarioId ?? "",
    valorTeto: Number(row.valor_teto ?? row.valorTeto ?? 0),
    status: (row.status as StatusVoucherFidelidade) || "disponivel",
    criadoEm: row.criado_em ?? row.criadoEm ?? new Date().toISOString(),
    expiraEm: row.expira_em ?? row.expiraEm ?? "",
    reservaUtilizadaId: row.reserva_utilizada_id ?? row.reservaUtilizadaId ?? null,
    utilizadoEm: row.utilizado_em ?? row.utilizadoEm ?? null,
  };
}

// ── Métodos de Persistência ──────────────────────────────────────────────────

/**
 * Carrega a configuração da campanha ativa da arena.
 */
export async function fetchCampanhaSupabase(): Promise<CampanhaFidelidade> {
  const local = lerLocalStorage<CampanhaFidelidade>(STORAGE_CAMPANHA_KEY, CAMPANHA_PADRAO);

  if (!isSupabaseConfigured()) {
    return local;
  }

  try {
    const { data, error } = await supabase
      .from(TABELA_CAMPANHA)
      .select("*")
      .eq("ativo", true)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return local;
    }

    const campanha = rowToCampanha(data as CampanhaDbRow);
    salvarLocalStorage(STORAGE_CAMPANHA_KEY, campanha);
    return campanha;
  } catch (err) {
    console.error("[FidelidadeService] Erro ao buscar campanha do Supabase:", err);
    return local;
  }
}

/**
 * Salva a configuração da campanha de fidelidade (Admin).
 */
export async function salvarCampanhaSupabase(
  campanha: CampanhaFidelidade
): Promise<CampanhaFidelidade> {
  const payload = {
    ...campanha,
    atualizadoEm: new Date().toISOString(),
  };

  salvarLocalStorage(STORAGE_CAMPANHA_KEY, payload);

  if (!isSupabaseConfigured()) {
    return payload;
  }

  try {
    const dbPayload = {
      id: payload.id,
      nome: payload.nome,
      horas_necessarias: payload.horasNecessarias,
      meses_validade: payload.mesesValidade,
      dias_validade_voucher: payload.diasValidadeVoucher,
      ativo: payload.ativo,
      atualizado_em: payload.atualizadoEm,
    };

    await supabase.from(TABELA_CAMPANHA).upsert(dbPayload);
    return payload;
  } catch (err) {
    console.error("[FidelidadeService] Falha ao salvar campanha no Supabase:", err);
    return payload;
  }
}

/**
 * Retorna todos os selos de um usuário específico.
 */
export async function fetchSelosUsuarioSupabase(usuarioId: string): Promise<SeloFidelidade[]> {
  const todosLocais = lerLocalStorage<SeloFidelidade[]>(STORAGE_SELOS_KEY, []);
  const doUsuarioLocal = todosLocais.filter((s) => s.usuarioId === usuarioId);

  if (!isSupabaseConfigured() || !usuarioId) {
    return doUsuarioLocal;
  }

  try {
    const { data, error } = await supabase
      .from(TABELA_SELOS)
      .select("*")
      .eq("usuario_id", usuarioId)
      .order("criado_em", { ascending: false });

    if (error || !data) {
      return doUsuarioLocal;
    }

    const mapeados = data.map((d) => rowToSelo(d as SeloDbRow));

    // Atualiza cache local mesclando
    const outros = todosLocais.filter((s) => s.usuarioId !== usuarioId);
    salvarLocalStorage(STORAGE_SELOS_KEY, [...outros, ...mapeados]);

    return mapeados;
  } catch (err) {
    console.error("[FidelidadeService] Erro ao buscar selos do Supabase:", err);
    return doUsuarioLocal;
  }
}

/**
 * Insere um novo selo de fidelidade.
 */
export async function inserirSeloSupabase(selo: SeloFidelidade): Promise<SeloFidelidade> {
  const todosLocais = lerLocalStorage<SeloFidelidade[]>(STORAGE_SELOS_KEY, []);
  const atualizados = [selo, ...todosLocais.filter((s) => s.id !== selo.id)];
  salvarLocalStorage(STORAGE_SELOS_KEY, atualizados);

  if (!isSupabaseConfigured()) {
    return selo;
  }

  try {
    const dbPayload = {
      id: selo.id,
      usuario_id: selo.usuarioId,
      reserva_id: selo.reservaId,
      horas_contabilizadas: selo.horasContabilizadas,
      valor_por_hora: selo.valorPorHora,
      valor_total_reserva: selo.valorTotalReserva,
      data_jogo: selo.dataJogo,
      criado_em: selo.criadoEm,
      expira_em: selo.expiraEm,
      resgatado: selo.resgatado,
      voucher_id: selo.voucherId,
    };

    await supabase.from(TABELA_SELOS).insert(dbPayload);
    return selo;
  } catch (err) {
    console.error("[FidelidadeService] Falha ao inserir selo no Supabase:", err);
    return selo;
  }
}

/**
 * Atualiza o status de múltiplos selos (geralmente ao resgatar em um voucher).
 */
export async function atualizarSelosSupabase(selosParaAtualizar: SeloFidelidade[]): Promise<void> {
  const ids = new Set(selosParaAtualizar.map((s) => s.id));
  const todosLocais = lerLocalStorage<SeloFidelidade[]>(STORAGE_SELOS_KEY, []);
  const atualizados = todosLocais.map((s) => {
    const correspondente = selosParaAtualizar.find((item) => item.id === s.id);
    return correspondente || s;
  });
  salvarLocalStorage(STORAGE_SELOS_KEY, atualizados);

  if (!isSupabaseConfigured()) return;

  try {
    for (const selo of selosParaAtualizar) {
      await supabase
        .from(TABELA_SELOS)
        .update({
          resgatado: selo.resgatado,
          voucher_id: selo.voucherId,
        })
        .eq("id", selo.id);
    }
  } catch (err) {
    console.error("[FidelidadeService] Falha ao atualizar selos no Supabase:", err);
  }
}

/**
 * Retorna todos os vouchers de um usuário específico.
 */
export async function fetchVouchersUsuarioSupabase(
  usuarioId: string
): Promise<VoucherFidelidade[]> {
  const todosLocais = lerLocalStorage<VoucherFidelidade[]>(STORAGE_VOUCHERS_KEY, []);
  const doUsuarioLocal = todosLocais.filter((v) => v.usuarioId === usuarioId);

  if (!isSupabaseConfigured() || !usuarioId) {
    return doUsuarioLocal;
  }

  try {
    const { data, error } = await supabase
      .from(TABELA_VOUCHERS)
      .select("*")
      .eq("usuario_id", usuarioId)
      .order("criado_em", { ascending: false });

    if (error || !data) {
      return doUsuarioLocal;
    }

    const mapeados = data.map((d) => rowToVoucher(d as VoucherDbRow));

    const outros = todosLocais.filter((v) => v.usuarioId !== usuarioId);
    salvarLocalStorage(STORAGE_VOUCHERS_KEY, [...outros, ...mapeados]);

    return mapeados;
  } catch (err) {
    console.error("[FidelidadeService] Erro ao buscar vouchers do Supabase:", err);
    return doUsuarioLocal;
  }
}

/**
 * Cria um novo voucher de fidelidade.
 */
export async function criarVoucherSupabase(
  voucher: VoucherFidelidade
): Promise<VoucherFidelidade> {
  const todosLocais = lerLocalStorage<VoucherFidelidade[]>(STORAGE_VOUCHERS_KEY, []);
  const atualizados = [voucher, ...todosLocais.filter((v) => v.id !== voucher.id)];
  salvarLocalStorage(STORAGE_VOUCHERS_KEY, atualizados);

  if (!isSupabaseConfigured()) {
    return voucher;
  }

  try {
    const dbPayload = {
      id: voucher.id,
      codigo: voucher.codigo,
      usuario_id: voucher.usuarioId,
      valor_teto: voucher.valorTeto,
      status: voucher.status,
      criado_em: voucher.criadoEm,
      expira_em: voucher.expiraEm,
      reserva_utilizada_id: voucher.reservaUtilizadaId,
      utilizado_em: voucher.utilizadoEm,
    };

    await supabase.from(TABELA_VOUCHERS).insert(dbPayload);
    return voucher;
  } catch (err) {
    console.error("[FidelidadeService] Falha ao criar voucher no Supabase:", err);
    return voucher;
  }
}

/**
 * Marca um voucher como utilizado em uma reserva.
 */
export async function marcarVoucherUtilizadoSupabase(
  voucherId: string,
  reservaId: string
): Promise<boolean> {
  const agoraIso = new Date().toISOString();
  const todosLocais = lerLocalStorage<VoucherFidelidade[]>(STORAGE_VOUCHERS_KEY, []);
  const atualizados = todosLocais.map((v) =>
    v.id === voucherId
      ? {
          ...v,
          status: "utilizado" as StatusVoucherFidelidade,
          reservaUtilizadaId: reservaId,
          utilizadoEm: agoraIso,
        }
      : v
  );
  salvarLocalStorage(STORAGE_VOUCHERS_KEY, atualizados);

  if (!isSupabaseConfigured()) {
    return true;
  }

  try {
    const { error } = await supabase
      .from(TABELA_VOUCHERS)
      .update({
        status: "utilizado",
        reserva_utilizada_id: reservaId,
        utilizado_em: agoraIso,
      })
      .eq("id", voucherId);

    return !error;
  } catch (err) {
    console.error("[FidelidadeService] Falha ao marcar voucher utilizado no Supabase:", err);
    return true;
  }
}

/**
 * Retorna todos os vouchers emitidos para relatório e painel do administrador.
 */
export async function fetchTodosVouchersAdminSupabase(): Promise<VoucherFidelidade[]> {
  const todosLocais = lerLocalStorage<VoucherFidelidade[]>(STORAGE_VOUCHERS_KEY, []);

  if (!isSupabaseConfigured()) {
    return todosLocais;
  }

  try {
    const { data, error } = await supabase
      .from(TABELA_VOUCHERS)
      .select("*")
      .order("criado_em", { ascending: false });

    if (error || !data) {
      return todosLocais;
    }

    return data.map((d) => rowToVoucher(d as VoucherDbRow));
  } catch (err) {
    console.error("[FidelidadeService] Erro ao buscar todos os vouchers no Supabase:", err);
    return todosLocais;
  }
}

/**
 * Retorna todos os selos do sistema para métricas administrativas.
 */
export async function fetchTodosSelosAdminSupabase(): Promise<SeloFidelidade[]> {
  const todosLocais = lerLocalStorage<SeloFidelidade[]>(STORAGE_SELOS_KEY, []);

  if (!isSupabaseConfigured()) {
    return todosLocais;
  }

  try {
    const { data, error } = await supabase
      .from(TABELA_SELOS)
      .select("*")
      .order("criado_em", { ascending: false });

    if (error || !data) {
      return todosLocais;
    }

    return data.map((d) => rowToSelo(d as SeloDbRow));
  } catch (err) {
    console.error("[FidelidadeService] Erro ao buscar todos os selos no Supabase:", err);
    return todosLocais;
  }
}

/**
 * Função de Orquestração / Observer Automático:
 * Varre as reservas de um usuário e sincroniza novos selos para partidas concluídas.
 * Se atingir o teto de 12 horas, gera o Voucher automaticamente sem atrito humano.
 *
 * @param usuarioId ID do usuário
 * @param reservasDoUsuario Lista de reservas pertencentes ao usuário
 * @param campanha Campanha ativa
 * @returns Selos atualizados e voucher gerado, se houver
 */
export async function sincronizarFidelidadeAutomatica(
  usuarioId: string,
  reservasDoUsuario: Reserva[],
  campanha: CampanhaFidelidade
): Promise<{
  novosSelosGerados: SeloFidelidade[];
  voucherGerado: VoucherFidelidade | null;
}> {
  if (!usuarioId || !campanha.ativo) {
    return { novosSelosGerados: [], voucherGerado: null };
  }

  // 1. Carrega selos e vouchers já existentes
  const selosAtuais = await fetchSelosUsuarioSupabase(usuarioId);
  const vouchersAtuais = await fetchVouchersUsuarioSupabase(usuarioId);

  // 2. Avalia reservas elegíveis que ainda não ganharam selos
  const novosSelos: SeloFidelidade[] = [];
  const momentoAgora = new Date();

  for (const reserva of reservasDoUsuario) {
    const avaliacao = avaliarElegibilidadeReservaParaSelo(
      reserva,
      [...selosAtuais, ...novosSelos],
      momentoAgora
    );

    if (avaliacao.elegivel) {
      const selo = construirSeloParaReserva(reserva, usuarioId, campanha);
      novosSelos.push(selo);
      await inserirSeloSupabase(selo);
    }
  }

  const todosSelosAcumulados = [...selosAtuais, ...novosSelos];

  // 3. Avalia se atingiu a meta para gerar o voucher automático
  const progresso = calcularProgressoUsuario(
    usuarioId,
    todosSelosAcumulados,
    vouchersAtuais,
    campanha
  );

  let voucherGerado: VoucherFidelidade | null = null;

  if (progresso.podeResgatar) {
    try {
      const resgate = resgatarVoucherFidelidade(
        usuarioId,
        progresso.selosAtivos,
        campanha
      );

      await atualizarSelosSupabase(resgate.selosUtilizados);
      voucherGerado = await criarVoucherSupabase(resgate.voucher);
    } catch (err) {
      console.error("[FidelidadeService] Erro ao consolidar voucher automático:", err);
    }
  }

  return {
    novosSelosGerados: novosSelos,
    voucherGerado,
  };
}

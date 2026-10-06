/**
 * Hook customizado de abstração para o Sistema de Fidelidade.
 * Conecta os componentes de interface às regras de negócio, dados de reservas
 * e à camada de persistência com Supabase e LocalStorage.
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useUserAuth } from "@/hooks/useUserAuth";
import { useReservasService } from "@/hooks/useReservasService";
import type {
  CampanhaFidelidade,
  SeloFidelidade,
  VoucherFidelidade,
  ProgressoFidelidadeUsuario,
} from "@/lib/fidelidade/types";
import {
  CAMPANHA_PADRAO,
  calcularProgressoUsuario,
  resgatarVoucherFidelidade,
} from "@/lib/fidelidade/fidelidadeService";
import {
  fetchCampanhaSupabase,
  salvarCampanhaSupabase,
  fetchSelosUsuarioSupabase,
  fetchVouchersUsuarioSupabase,
  atualizarSelosSupabase,
  criarVoucherSupabase,
  marcarVoucherUtilizadoSupabase,
  sincronizarFidelidadeAutomatica,
} from "@/lib/supabase/fidelidadeService";

export function useFidelidadeService() {
  const { user } = useUserAuth();
  const { reservas } = useReservasService();

  const [campanha, setCampanha] = useState<CampanhaFidelidade>(CAMPANHA_PADRAO);
  const [selos, setSelos] = useState<SeloFidelidade[]>([]);
  const [vouchers, setVouchers] = useState<VoucherFidelidade[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [ultimoVoucherEmitido, setUltimoVoucherEmitido] = useState<VoucherFidelidade | null>(null);

  const usuarioId = user?.id || "";

  // ── Carregamento e Sincronização ──────────────────────────────────────────

  const recarregarDados = useCallback(async () => {
    try {
      setCarregando(true);
      const camp = await fetchCampanhaSupabase();
      setCampanha(camp);

      if (usuarioId) {
        // Filtra reservas do usuário atual (por userId ou por telefone cadastrado)
        const reservasDoUsuario = reservas.filter(
          (r) =>
            r.userId === usuarioId ||
            (user?.telefone && r.whatsappCliente && r.whatsappCliente.includes(user.telefone.replace(/\D/g, "")))
        );

        // Dispara o observer de sincronização automática para reservas recém-concluídas
        const { voucherGerado } = await sincronizarFidelidadeAutomatica(
          usuarioId,
          reservasDoUsuario,
          camp
        );

        if (voucherGerado) {
          setUltimoVoucherEmitido(voucherGerado);
        }

        const [selosDb, vouchersDb] = await Promise.all([
          fetchSelosUsuarioSupabase(usuarioId),
          fetchVouchersUsuarioSupabase(usuarioId),
        ]);

        setSelos(selosDb);
        setVouchers(vouchersDb);
      }
    } catch (err) {
      console.error("[useFidelidadeService] Falha ao sincronizar fidelidade:", err);
    } finally {
      setCarregando(false);
    }
  }, [usuarioId, user?.telefone, reservas]);

  useEffect(() => {
    void recarregarDados();
  }, [recarregarDados]);

  // ── Progresso Computado Reativamente ───────────────────────────────────────

  const progresso: ProgressoFidelidadeUsuario = useMemo(() => {
    if (!usuarioId) {
      return calcularProgressoUsuario("", [], [], campanha);
    }
    return calcularProgressoUsuario(usuarioId, selos, vouchers, campanha);
  }, [usuarioId, selos, vouchers, campanha]);

  // ── Ações do Cliente ──────────────────────────────────────────────────────

  /**
   * Resgata manualmente o voucher caso o usuário tenha completado as horas.
   */
  const resgatarVoucher = useCallback(async (): Promise<{
    sucesso: boolean;
    voucher?: VoucherFidelidade;
    erro?: string;
  }> => {
    if (!usuarioId) {
      return { sucesso: false, erro: "Usuário precisa estar autenticado." };
    }

    if (!progresso.podeResgatar) {
      return {
        sucesso: false,
        erro: `Você precisa acumular ${campanha.horasNecessarias} horas para gerar um voucher.`,
      };
    }

    try {
      const resgate = resgatarVoucherFidelidade(
        usuarioId,
        progresso.selosAtivos,
        campanha
      );

      await atualizarSelosSupabase(resgate.selosUtilizados);
      const voucherCriado = await criarVoucherSupabase(resgate.voucher);

      setUltimoVoucherEmitido(voucherCriado);
      await recarregarDados();

      return { sucesso: true, voucher: voucherCriado };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido ao resgatar voucher.";
      return { sucesso: false, erro: msg };
    }
  }, [usuarioId, progresso, campanha, recarregarDados]);

  /**
   * Marca múltiplos vouchers como utilizados no checkout de uma nova reserva.
   */
  const consumirVouchersNoCheckout = useCallback(
    async (voucherIds: string[], reservaId: string): Promise<boolean> => {
      try {
        let todosOk = true;
        for (const vid of voucherIds) {
          const ok = await marcarVoucherUtilizadoSupabase(vid, reservaId);
          if (!ok) todosOk = false;
        }
        await recarregarDados();
        return todosOk;
      } catch (err) {
        console.error("[useFidelidadeService] Erro ao consumir múltiplos vouchers:", err);
        return false;
      }
    },
    [recarregarDados]
  );

  /**
   * Marca um voucher individual como utilizado no checkout de uma nova reserva.
   */
  const consumirVoucherNoCheckout = useCallback(
    async (voucherId: string, reservaId: string): Promise<boolean> => {
      return consumirVouchersNoCheckout([voucherId], reservaId);
    },
    [consumirVouchersNoCheckout]
  );

  // ── Ações do Administrador ────────────────────────────────────────────────

  /**
   * Atualiza a configuração global da campanha de fidelidade da arena.
   */
  const atualizarCampanha = useCallback(
    async (dadosNovos: Partial<CampanhaFidelidade>): Promise<boolean> => {
      try {
        const nova = {
          ...campanha,
          ...dadosNovos,
          atualizadoEm: new Date().toISOString(),
        };
        const salva = await salvarCampanhaSupabase(nova);
        setCampanha(salva);
        return true;
      } catch (err) {
        console.error("[useFidelidadeService] Erro ao atualizar campanha:", err);
        return false;
      }
    },
    [campanha]
  );

  return {
    campanha,
    selos,
    vouchers,
    progresso,
    carregando,
    ultimoVoucherEmitido,
    setUltimoVoucherEmitido,
    recarregarDados,
    resgatarVoucher,
    consumirVoucherNoCheckout,
    consumirVouchersNoCheckout,
    atualizarCampanha,
  };
}

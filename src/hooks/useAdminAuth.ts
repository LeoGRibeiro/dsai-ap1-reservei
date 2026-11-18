/**
 * Estado de autenticação do painel administrativo (Supabase Auth + is_admin()).
 *
 * `autenticado` é `null` enquanto a sessão está sendo verificada.
 *
 * Spec: SPEC/2026-11-18-login-real-admin.md
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  assinarSessaoAdmin,
  entrarComoAdmin,
  sairAdmin,
  verificarSessaoAdmin,
  type ResultadoLoginAdmin,
} from "@/lib/supabase/adminAuthService";

/** Flag da autenticação simulada antiga (AP1), removida ao carregar. */
const CHAVE_SESSAO_ANTIGA = "reservei_admin_auth";

export function useAdminAuth() {
  const [autenticado, setAutenticado] = useState<boolean | null>(null);

  useEffect(() => {
    let ativo = true;

    try {
      localStorage.removeItem(CHAVE_SESSAO_ANTIGA);
    } catch {
      // localStorage indisponível (modo privado): nada a limpar.
    }

    const verificar = async () => {
      const ehAdmin = await verificarSessaoAdmin();
      if (ativo) setAutenticado(ehAdmin);
    };

    void verificar();
    const cancelar = assinarSessaoAdmin(() => void verificar());

    return () => {
      ativo = false;
      cancelar();
    };
  }, []);

  const login = useCallback(async (email: string, senha: string): Promise<ResultadoLoginAdmin> => {
    const resultado = await entrarComoAdmin(email, senha);
    if (resultado.ok) setAutenticado(true);
    return resultado;
  }, []);

  const logout = useCallback(async () => {
    await sairAdmin();
    setAutenticado(false);
  }, []);

  return { autenticado, login, logout };
}

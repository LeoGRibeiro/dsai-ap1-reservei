/**
 * Hook de autenticação mockada para o painel administrativo.
 * Usa LocalStorage como mecanismo de sessão front-end.
 *
 * BACKLOG: Substituir por autenticação real (JWT/OAuth) quando
 * houver backend. Ver BACKLOG.md.
 */

"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "reservei_admin_auth";
const SENHA_ADMIN = "admin123";

export function useAdminAuth() {
  const [autenticado, setAutenticado] = useState<boolean | null>(null); // null = carregando

  // Lê o estado do LocalStorage na montagem (client-only)
  useEffect(() => {
    try {
      const flag = localStorage.getItem(STORAGE_KEY);
      setAutenticado(flag === "true");
    } catch {
      setAutenticado(false);
    }
  }, []);

  const login = useCallback((senha: string): boolean => {
    if (senha === SENHA_ADMIN) {
      localStorage.setItem(STORAGE_KEY, "true");
      setAutenticado(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAutenticado(false);
  }, []);

  return { autenticado, login, logout };
}

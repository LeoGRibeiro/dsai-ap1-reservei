"use client";

import { useEffect, useCallback } from "react";
import type { UserProfile } from "@/lib/supabase/types";
import {
  cadastrarUsuarioSupabase,
  loginUsuarioSupabase,
  obterUsuarioAtual,
  logoutUsuarioSupabase,
  atualizarPerfilSupabase,
  excluirContaSupabase,
} from "@/lib/supabase/authService";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuthStore, getUsuarioCacheLocal } from "@/store/useAuthStore";

/**
 * Hook de autenticação do usuário.
 *
 * Conectado à store global Zustand (`useAuthStore`) com hidratação síncrona
 * de cache local (`localStorage`), garantindo que:
 * 1. A sessão nunca se perca durante navegações de rota (ex.: ir para /minha-conta e voltar para /).
 * 2. Não ocorra flickering de botões de login/cadastro enquanto a sessão é revalidada em segundo plano.
 * 3. Qualquer alteração de perfil reflita simultaneamente em todos os componentes.
 */
export function useUserAuth() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const setHasHydrated = useAuthStore((s) => s.setHasHydrated);

  // Carrega e sincroniza usuário na inicialização
  useEffect(() => {
    let isMounted = true;

    // Hidratação síncrona do cache local assim que o componente monta no cliente
    if (!hasHydrated && typeof window !== "undefined") {
      const cached = getUsuarioCacheLocal();
      if (cached && isMounted) {
        setUser(cached);
      }
      setHasHydrated(true);
    }

    async function carregarSessao() {
      try {
        const u = await obterUsuarioAtual();
        if (u && u.id.startsWith("usr_demo_")) {
          await logoutUsuarioSupabase();
          if (isMounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }
        if (isMounted) {
          setUser(u);
          setLoading(false);
        }
      } catch {
        if (isMounted) setLoading(false);
      }
    }

    void carregarSessao();

    const handleSync = async () => {
      if (!isMounted) return;
      try {
        const u = await obterUsuarioAtual();
        if (isMounted) setUser(u);
      } catch {}
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleSync);
      window.addEventListener("focus", handleSync);
    }

    // Inscrição para mudanças de autenticação no Supabase
    let authSub: { unsubscribe: () => void } | null = null;
    if (isSupabaseConfigured()) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (!isMounted) return;
        const u = await obterUsuarioAtual();
        if (isMounted) setUser(u);
      });
      authSub = subscription;
    }

    return () => {
      isMounted = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleSync);
        window.removeEventListener("focus", handleSync);
      }
      if (authSub) {
        authSub.unsubscribe();
      }
    };
  }, [setUser, setLoading]);

  const login = useCallback(
    async (telefone: string, senha: string): Promise<{ success: boolean; error?: string }> => {
      setLoading(true);
      const res = await loginUsuarioSupabase(telefone, senha);
      setLoading(false);
      if (res.user) {
        setUser(res.user);
        return { success: true };
      }
      return { success: false, error: res.error || "Erro ao realizar login." };
    },
    [setUser, setLoading]
  );

  const cadastrar = useCallback(
    async (
      nome: string,
      telefone: string,
      senha: string,
      dataNascimento?: string
    ): Promise<{ success: boolean; user?: UserProfile; error?: string }> => {
      setLoading(true);
      const res = await cadastrarUsuarioSupabase(nome, telefone, senha, dataNascimento);
      setLoading(false);
      if (res.user) {
        setUser(res.user);
        return { success: true, user: res.user };
      }
      return { success: false, error: res.error || "Erro ao cadastrar usuário." };
    },
    [setUser, setLoading]
  );

  const logout = useCallback(async () => {
    setLoading(true);
    await logoutUsuarioSupabase();
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("reservei_current_user");
        sessionStorage.removeItem("reservei_current_user");
      } catch {}
    }
    setUser(null);
    setLoading(false);
  }, [setUser, setLoading]);

  const atualizarPerfil = useCallback(
    async (dados: Partial<Omit<UserProfile, "id" | "criadoEm">>): Promise<boolean> => {
      if (!user) return false;
      const updated = await atualizarPerfilSupabase(user.id, dados);
      if (updated) {
        setUser(updated);
        return true;
      }
      return false;
    },
    [user, setUser]
  );

  const excluirConta = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    const ok = await excluirContaSupabase(user.id);
    if (ok) {
      setUser(null);
      return true;
    }
    return false;
  }, [user, setUser]);

  return {
    user,
    loading,
    hasHydrated,
    isAutenticado: Boolean(user),
    login,
    cadastrar,
    logout,
    atualizarPerfil,
    excluirConta,
  };
}

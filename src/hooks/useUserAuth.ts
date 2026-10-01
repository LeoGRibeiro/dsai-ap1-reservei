"use client";

import { useState, useEffect, useCallback } from "react";
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

export function useUserAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Carrega usuário atual na inicialização
  useEffect(() => {
    let isMounted = true;

    async function carregarSessao() {
      try {
        const u = await obterUsuarioAtual();
        if (isMounted) {
          setUser(u);
          setLoading(false);
        }
      } catch {
        if (isMounted) setLoading(false);
      }
    }

    void carregarSessao();

    // Inscrição para mudanças de autenticação no Supabase
    if (isSupabaseConfigured()) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (!isMounted) return;
        if (session?.user) {
          const u = await obterUsuarioAtual();
          if (isMounted) setUser(u);
        } else {
          // Só limpa se não estiver no fallback local
          const u = await obterUsuarioAtual();
          if (isMounted) setUser(u);
        }
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    }

    return () => {
      isMounted = false;
    };
  }, []);

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
    []
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
    []
  );

  const logout = useCallback(async () => {
    setLoading(true);
    await logoutUsuarioSupabase();
    setUser(null);
    setLoading(false);
  }, []);

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
    [user]
  );

  const excluirConta = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    const ok = await excluirContaSupabase(user.id);
    if (ok) {
      setUser(null);
      return true;
    }
    return false;
  }, [user]);

  return {
    user,
    loading,
    isAutenticado: Boolean(user),
    login,
    cadastrar,
    logout,
    atualizarPerfil,
    excluirConta,
  };
}

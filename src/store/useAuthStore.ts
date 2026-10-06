import { create } from "zustand";
import type { UserProfile } from "@/lib/supabase/types";

export interface AuthState {
  /** Perfil do usuário atualmente autenticado ou null se visitante */
  user: UserProfile | null;
  /** Indica se a verificação inicial de autenticação está em andamento */
  loading: boolean;
  /** Indica se a primeira hidratação do cliente já foi concluída */
  hasHydrated: boolean;
  /** Atualiza o usuário autenticado na store global */
  setUser: (user: UserProfile | null) => void;
  /** Atualiza o estado de carregamento */
  setLoading: (loading: boolean) => void;
  /** Marca a conclusão da hidratação inicial do cliente */
  setHasHydrated: (hasHydrated: boolean) => void;
}

/**
 * Lê o perfil do usuário do cache local (localStorage).
 */
export function getUsuarioCacheLocal(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("reservei_current_user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.id && !parsed.id.startsWith("usr_demo_")) {
      return parsed as UserProfile;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Store global de autenticação baseada em Zustand.
 *
 * `user` inicia como null e `hasHydrated` como false para garantir
 * que o HTML gerado no servidor (SSR) seja idêntico ao primeiro frame
 * de renderização no cliente, prevenindo qualquer erro de hidratação do React/Next.js.
 *
 * Assim que o cliente monta, o cache do localStorage é hidratado e `hasHydrated`
 * torna-se true. Esse estado é preservado na memória global durante toda a navegação
 * client-side (SPA), eliminando flickering ou falsos deslogamentos entre rotas.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  hasHydrated: false,
  setUser: (user) => set({ user, loading: false }),
  setLoading: (loading) => set({ loading }),
  setHasHydrated: (hasHydrated) => set({ hasHydrated }),
}));

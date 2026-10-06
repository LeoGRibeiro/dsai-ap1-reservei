import { create } from "zustand";
import type { UserProfile } from "@/lib/supabase/types";

export interface AuthState {
  /** Perfil do usuário atualmente autenticado ou null se visitante */
  user: UserProfile | null;
  /** Indica se a verificação inicial de autenticação está em andamento */
  loading: boolean;
  /** Atualiza o usuário autenticado na store global */
  setUser: (user: UserProfile | null) => void;
  /** Atualiza o estado de carregamento */
  setLoading: (loading: boolean) => void;
}

/**
 * Lê o perfil do usuário síncronamente do cache local (localStorage),
 * evitando piscamento de interface (flicker) e transições falsas de deslogado
 * durante navegações de rota entre o perfil (/minha-conta) e o portal inicial (/).
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

const initialCachedUser = typeof window !== "undefined" ? getUsuarioCacheLocal() : null;

/**
 * Store global de autenticação baseada em Zustand.
 * Compartilhada por toda a aplicação para manter a sessão sincronizada
 * e eliminar deslogamentos fantasmas durante transições de rota.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: initialCachedUser,
  loading: initialCachedUser ? false : true,
  setUser: (user) => set({ user, loading: false }),
  setLoading: (loading) => set({ loading }),
}));

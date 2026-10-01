import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/**
 * Retorna true se as variáveis de ambiente necessárias para conexão
 * com o Supabase estiverem devidamente preenchidas.
 */
export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes("sua-url-supabase") &&
    !supabaseAnonKey.includes("sua-chave-anon-key")
  );
};

/**
 * Cliente Supabase singleton configurado.
 * Quando não configurado no ambiente, usa placeholders seguros para evitar erros de inicialização.
 */
export const supabase = createClient(
  isSupabaseConfigured() ? supabaseUrl : "https://placeholder-project.supabase.co",
  isSupabaseConfigured() ? supabaseAnonKey : "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

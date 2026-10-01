import { supabase, isSupabaseConfigured } from "./client";
import { mascaraWhatsApp } from "@/lib/constants";
import type { UserProfile } from "./types";

const STORAGE_CURRENT_USER_KEY = "reservei_current_user";
const STORAGE_MOCK_USERS_DB = "reservei_users_db";

interface StoredUserRow {
  id: string;
  nome: string;
  telefone: string;
  senha?: string;
  data_nascimento?: string | null;
  criado_em?: string;
}

function getLocalUsers(): StoredUserRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_MOCK_USERS_DB);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalUsers(users: StoredUserRow[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_MOCK_USERS_DB, JSON.stringify(users));
  } catch (err) {
    console.error("Erro ao salvar usuários locais:", err);
  }
}

/**
 * Cria cadastro de usuário com Nome, Telefone (WhatsApp) e Senha.
 * Grava na tabela 'usuarios' do Supabase se disponível, com fallback local seguro.
 */
export async function cadastrarUsuarioSupabase(
  nome: string,
  telefone: string,
  senha: string,
  dataNascimento?: string
): Promise<{ user: UserProfile | null; error?: string }> {
  const digits = telefone.replace(/\D/g, "");
  const id = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const telefoneFormatado = mascaraWhatsApp(digits);

  // 1. Tenta salvar na tabela 'usuarios' do Supabase
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("usuarios")
        .insert([
          {
            id,
            nome,
            telefone: digits,
            senha,
            data_nascimento: dataNascimento || null,
          },
        ])
        .select()
        .single();

      if (error) {
        // Telefone duplicado
        if (error.code === "23505" || error.message.includes("duplicate") || error.message.includes("unique")) {
          return {
            user: null,
            error: "Este número de WhatsApp já possui uma conta cadastrada.",
          };
        }
        // Se a tabela 'usuarios' ainda não existe no Supabase, continua para o fallback
        console.warn(
          "[Auth] Tabela 'usuarios' ainda não configurada no Supabase. Utilizando armazenamento local sincronizado.",
          error.message
        );
      } else if (data) {
        const perfil: UserProfile = {
          id: data.id,
          nome: data.nome,
          telefone: mascaraWhatsApp(data.telefone),
          dataNascimento: data.data_nascimento,
          criadoEm: data.criado_em,
        };

        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(perfil));
        }

        return { user: perfil };
      }
    } catch (err) {
      console.warn("[Auth] Falha de conexão com Supabase:", err);
    }
  }

  // 2. Fallback Local Storage (garante funcionamento imediato mesmo sem tabela no Supabase)
  const users = getLocalUsers();
  const existe = users.find((u) => u.telefone.replace(/\D/g, "") === digits);
  if (existe) {
    return {
      user: null,
      error: "Este número de WhatsApp já possui uma conta cadastrada.",
    };
  }

  const novoUsuario: StoredUserRow = {
    id,
    nome,
    telefone: digits,
    senha,
    data_nascimento: dataNascimento || null,
    criado_em: new Date().toISOString(),
  };

  users.push(novoUsuario);
  saveLocalUsers(users);

  const perfil: UserProfile = {
    id: novoUsuario.id,
    nome: novoUsuario.nome,
    telefone: telefoneFormatado,
    dataNascimento: novoUsuario.data_nascimento,
    criadoEm: novoUsuario.criado_em,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(perfil));
  }

  return { user: perfil };
}

/**
 * Realiza login com WhatsApp e Senha
 */
export async function loginUsuarioSupabase(
  telefone: string,
  senha: string
): Promise<{ user: UserProfile | null; error?: string }> {
  const digits = telefone.replace(/\D/g, "");

  // 1. Tenta autenticar na tabela 'usuarios' do Supabase
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("telefone", digits)
        .eq("senha", senha)
        .single();

      if (!error && data) {
        const perfil: UserProfile = {
          id: data.id,
          nome: data.nome,
          telefone: mascaraWhatsApp(data.telefone),
          dataNascimento: data.data_nascimento,
          criadoEm: data.criado_em,
        };

        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(perfil));
        }

        return { user: perfil };
      }
    } catch (err) {
      console.warn("[Auth] Falha ao consultar Supabase:", err);
    }
  }

  // 2. Fallback Local Storage
  const users = getLocalUsers();
  const encontrado = users.find(
    (u) => u.telefone.replace(/\D/g, "") === digits && u.senha === senha
  );

  if (!encontrado) {
    return { user: null, error: "WhatsApp ou senha incorretos." };
  }

  const perfil: UserProfile = {
    id: encontrado.id,
    nome: encontrado.nome,
    telefone: mascaraWhatsApp(encontrado.telefone),
    dataNascimento: encontrado.data_nascimento,
    criadoEm: encontrado.criado_em,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(perfil));
  }

  return { user: perfil };
}

/**
 * Obtém usuário logado atualmente (ou null)
 */
export async function obterUsuarioAtual(): Promise<UserProfile | null> {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
    if (!raw) return null;
    const user: UserProfile = JSON.parse(raw);

    // Opcionalmente atualiza dados com o Supabase se a tabela existir
    if (isSupabaseConfigured() && user.id) {
      void supabase
        .from("usuarios")
        .select("*")
        .eq("id", user.id)
        .single()
        .then(
          ({ data }) => {
            if (data) {
              const updated: UserProfile = {
                id: data.id,
                nome: data.nome,
                telefone: mascaraWhatsApp(data.telefone),
                dataNascimento: data.data_nascimento,
                criadoEm: data.criado_em,
              };
              localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(updated));
            }
          },
          () => {}
        );
    }

    return user;
  } catch {
    return null;
  }
}

/**
 * Desconecta o usuário
 */
export async function logoutUsuarioSupabase(): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
    } catch {}
  }
}

/**
 * Atualiza os dados de perfil do usuário
 */
export async function atualizarPerfilSupabase(
  userId: string,
  dados: Partial<Omit<UserProfile, "id" | "criadoEm">>
): Promise<UserProfile | null> {
  const digits = dados.telefone ? dados.telefone.replace(/\D/g, "") : undefined;

  // Atualiza no Supabase
  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from("usuarios")
        .update({
          ...(dados.nome ? { nome: dados.nome } : {}),
          ...(digits ? { telefone: digits } : {}),
          ...(dados.dataNascimento !== undefined ? { data_nascimento: dados.dataNascimento } : {}),
        })
        .eq("id", userId);
    } catch (err) {
      console.warn("[Auth] Erro ao atualizar no Supabase:", err);
    }
  }

  // Atualiza no LocalStorage
  if (typeof window !== "undefined") {
    try {
      // 1. Atualiza na base de usuários cadastrados locais
      const users = getLocalUsers();
      const index = users.findIndex((u) => u.id === userId);
      let updatedUser: UserProfile | null = null;

      if (index >= 0) {
        users[index] = {
          ...users[index],
          ...(dados.nome ? { nome: dados.nome } : {}),
          ...(digits ? { telefone: digits } : {}),
          ...(dados.dataNascimento !== undefined ? { data_nascimento: dados.dataNascimento } : {}),
        };
        saveLocalUsers(users);
        updatedUser = {
          id: users[index].id,
          nome: users[index].nome,
          telefone: mascaraWhatsApp(users[index].telefone),
          dataNascimento: users[index].data_nascimento,
          criadoEm: users[index].criado_em,
        };
      }

      // 2. Se for o usuário atualmente ativo na sessão, atualiza também a sessão ativa
      const raw = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
      if (raw) {
        const current: UserProfile = JSON.parse(raw);
        if (current.id === userId) {
          const updatedSession: UserProfile = {
            ...current,
            ...(dados.nome ? { nome: dados.nome } : {}),
            ...(dados.telefone ? { telefone: mascaraWhatsApp(dados.telefone) } : {}),
            ...(dados.dataNascimento !== undefined ? { dataNascimento: dados.dataNascimento } : {}),
          };
          localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(updatedSession));
          if (!updatedUser) updatedUser = updatedSession;
        }
      }

      if (updatedUser) return updatedUser;
    } catch (err) {
      console.error("Erro ao atualizar usuário local:", err);
    }
  }

  return null;
}

/**
 * Exclui a conta do usuário permanentemente (LGPD)
 */
export async function excluirContaSupabase(userId: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      await supabase.from("usuarios").delete().eq("id", userId);
    } catch (err) {
      console.warn("[Auth] Erro ao deletar no Supabase:", err);
    }
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
      if (raw) {
        const cur: UserProfile = JSON.parse(raw);
        if (cur.id === userId) {
          localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
        }
      }
      const users = getLocalUsers().filter((u) => u.id !== userId);
      saveLocalUsers(users);
    } catch {}
  }

  return true;
}

/**
 * Lista todos os usuários cadastrados (Supabase e armazenamento local sincronizado).
 */
export async function listarUsuariosCadastrados(): Promise<UserProfile[]> {
  const usersMap = new Map<string, UserProfile>();

  // 1. Armazenamento Local
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_MOCK_USERS_DB);
      if (raw) {
        const list: StoredUserRow[] = JSON.parse(raw);
        for (const u of list) {
          const digits = u.telefone.replace(/\D/g, "");
          usersMap.set(digits, {
            id: u.id,
            nome: u.nome,
            telefone: mascaraWhatsApp(u.telefone),
            dataNascimento: u.data_nascimento,
            criadoEm: u.criado_em,
          });
        }
      }
      const rawCur = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
      if (rawCur) {
        const cur: UserProfile = JSON.parse(rawCur);
        const digits = cur.telefone.replace(/\D/g, "");
        if (!usersMap.has(digits)) {
          usersMap.set(digits, cur);
        }
      }
    } catch {}
  }

  // 2. Supabase
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from("usuarios").select("*");
      if (!error && data) {
        for (const row of data) {
          const digits = String(row.telefone).replace(/\D/g, "");
          usersMap.set(digits, {
            id: row.id,
            nome: row.nome,
            telefone: mascaraWhatsApp(row.telefone),
            dataNascimento: row.data_nascimento,
            criadoEm: row.criado_em,
          });
        }
      }
    } catch {}
  }

  return Array.from(usersMap.values());
}

/**
 * Retorna mapa síncrono de telefones cadastrados (apenas dígitos) -> userId
 * baseado no cache local atual.
 */
export function getTelefonesCadastradosLocal(): Map<string, string> {
  const map = new Map<string, string>();
  if (typeof window === "undefined") return map;
  try {
    const raw = localStorage.getItem(STORAGE_MOCK_USERS_DB);
    if (raw) {
      const list: StoredUserRow[] = JSON.parse(raw);
      for (const u of list) {
        const digits = u.telefone.replace(/\D/g, "");
        if (digits) map.set(digits, u.id);
      }
    }
    const rawCur = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
    if (rawCur) {
      const cur: UserProfile = JSON.parse(rawCur);
      const digits = cur.telefone.replace(/\D/g, "");
      if (digits && !map.has(digits)) map.set(digits, cur.id);
    }
  } catch {}
  return map;
}

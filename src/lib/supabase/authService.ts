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
  bloqueado?: boolean;
  motivo_bloqueio?: string | null;
}

function getLocalUsers(): StoredUserRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_MOCK_USERS_DB);
    if (!raw) return [];
    const list: StoredUserRow[] = JSON.parse(raw);
    const valid = list.filter(
      (u) => Boolean(u && u.id && u.telefone && u.telefone.replace(/\D/g, "").length >= 8)
    );
    if (valid.length !== list.length) {
      saveLocalUsers(valid);
    }
    return valid;
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
          bloqueado: data.bloqueado,
          motivo_bloqueio: data.motivo_bloqueio,
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
          bloqueado: novoUsuario.bloqueado,
          motivo_bloqueio: novoUsuario.motivo_bloqueio,
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
          bloqueado: data.bloqueado,
          motivo_bloqueio: data.motivo_bloqueio,
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
          bloqueado: encontrado.bloqueado,
          motivo_bloqueio: encontrado.motivo_bloqueio,
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
    let user: UserProfile = JSON.parse(raw);

    // Consulta em tempo real com o Supabase se configurado
    if (isSupabaseConfigured() && user.id) {
      try {
        const { data } = await supabase
          .from("usuarios")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (data) {
          user = {
            id: data.id,
            nome: data.nome || user.nome,
            telefone: mascaraWhatsApp(data.telefone || user.telefone),
            dataNascimento: data.data_nascimento || user.dataNascimento,
            criadoEm: data.criado_em || user.criadoEm,
            bloqueado: data.bloqueado !== undefined ? Boolean(data.bloqueado) : user.bloqueado,
            motivo_bloqueio:
              data.motivo_bloqueio !== undefined ? data.motivo_bloqueio : user.motivo_bloqueio,
          };
          localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(user));
        }
      } catch (err) {
        console.warn("[Auth] Erro ao sincronizar sessão com Supabase:", err);
      }
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
          ...(dados.bloqueado !== undefined ? { bloqueado: dados.bloqueado } : {}),
          ...(dados.motivo_bloqueio !== undefined ? { motivo_bloqueio: dados.motivo_bloqueio } : {}),
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
      let index = users.findIndex((u) => u.id === userId);
      if (index === -1 && digits) {
        index = users.findIndex((u) => u.telefone.replace(/\D/g, "") === digits);
      }
      let updatedUser: UserProfile | null = null;

      if (index >= 0) {
        users[index] = {
          ...users[index],
          ...(dados.nome ? { nome: dados.nome } : {}),
          ...(digits ? { telefone: digits } : {}),
          ...(dados.dataNascimento !== undefined ? { data_nascimento: dados.dataNascimento } : {}),
          ...(dados.bloqueado !== undefined ? { bloqueado: dados.bloqueado } : {}),
          ...(dados.motivo_bloqueio !== undefined ? { motivo_bloqueio: dados.motivo_bloqueio } : {}),
        };
        saveLocalUsers(users);
        updatedUser = {
          id: users[index].id,
          nome: users[index].nome,
          telefone: mascaraWhatsApp(users[index].telefone),
          dataNascimento: users[index].data_nascimento,
          criadoEm: users[index].criado_em,
          bloqueado: users[index].bloqueado,
          motivo_bloqueio: users[index].motivo_bloqueio,
        };
      } else {
        // Tenta recuperar os dados completos antes de salvar no armazenamento local
        let nomeRecuperado = dados.nome;
        let telRecuperado = digits;
        let nascimentoRecuperado = dados.dataNascimento;
        let criadoEmRecuperado = new Date().toISOString();

        const rawCur = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
        if (rawCur) {
          const cur: UserProfile = JSON.parse(rawCur);
          if (cur.id === userId) {
            nomeRecuperado = nomeRecuperado || cur.nome;
            telRecuperado = telRecuperado || cur.telefone.replace(/\D/g, "");
            nascimentoRecuperado =
              nascimentoRecuperado !== undefined ? nascimentoRecuperado : cur.dataNascimento;
            criadoEmRecuperado = cur.criadoEm || criadoEmRecuperado;
          }
        }

        // Apenas salva no armazenamento local se houver um número de telefone válido
        if (telRecuperado && telRecuperado.length >= 8) {
          const novoLocal: StoredUserRow = {
            id: userId,
            nome: nomeRecuperado || "Cliente",
            telefone: telRecuperado,
            data_nascimento: nascimentoRecuperado || null,
            bloqueado: dados.bloqueado,
            motivo_bloqueio: dados.motivo_bloqueio,
            criado_em: criadoEmRecuperado,
          };
          users.push(novoLocal);
          saveLocalUsers(users);
          updatedUser = {
            id: novoLocal.id,
            nome: novoLocal.nome,
            telefone: mascaraWhatsApp(novoLocal.telefone),
            dataNascimento: novoLocal.data_nascimento,
            criadoEm: novoLocal.criado_em,
            bloqueado: novoLocal.bloqueado,
            motivo_bloqueio: novoLocal.motivo_bloqueio,
          };
        }
      }

      // 2. Se for o usuário atualmente ativo na sessão, atualiza também a sessão ativa
      const raw = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
      if (raw) {
        const current: UserProfile = JSON.parse(raw);
        const curDigits = current.telefone ? current.telefone.replace(/\D/g, "") : "";
        if (current.id === userId || (digits && curDigits === digits)) {
          const updatedSession: UserProfile = {
            ...current,
            ...(dados.nome ? { nome: dados.nome } : {}),
            ...(dados.telefone ? { telefone: mascaraWhatsApp(dados.telefone) } : {}),
            ...(dados.dataNascimento !== undefined ? { dataNascimento: dados.dataNascimento } : {}),
            ...(dados.bloqueado !== undefined ? { bloqueado: dados.bloqueado } : {}),
            ...(dados.motivo_bloqueio !== undefined ? { motivo_bloqueio: dados.motivo_bloqueio } : {}),
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
  const usersById = new Map<string, UserProfile>();
  const idByPhone = new Map<string, string>(); // digits -> id

  // 1. Armazenamento Local
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_MOCK_USERS_DB);
      if (raw) {
        const list: StoredUserRow[] = JSON.parse(raw);
        // Filtra e limpa registros corrompidos ou sem telefone
        const validList = list.filter(
          (u) => Boolean(u && u.id && u.telefone && u.telefone.replace(/\D/g, "").length >= 8)
        );
        if (validList.length !== list.length) {
          saveLocalUsers(validList);
        }

        for (const u of validList) {
          const digits = u.telefone.replace(/\D/g, "");
          const profile: UserProfile = {
            id: u.id,
            nome: u.nome,
            telefone: mascaraWhatsApp(u.telefone),
            dataNascimento: u.data_nascimento,
            criadoEm: u.criado_em,
            bloqueado: Boolean(u.bloqueado),
            motivo_bloqueio: u.motivo_bloqueio || null,
          };
          usersById.set(u.id, profile);
          if (digits) idByPhone.set(digits, u.id);
        }
      }

      const rawCur = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
      if (rawCur) {
        const cur: UserProfile = JSON.parse(rawCur);
        const digits = cur.telefone ? cur.telefone.replace(/\D/g, "") : "";
        if (digits && digits.length >= 8) {
          if (!usersById.has(cur.id) && !idByPhone.has(digits)) {
            usersById.set(cur.id, cur);
            idByPhone.set(digits, cur.id);
          }
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
          if (!digits || digits.length < 8) continue;

          const existingId = idByPhone.get(digits) || row.id;
          const localMatch = usersById.get(existingId) || usersById.get(row.id);

          const profile: UserProfile = {
            id: row.id,
            nome: row.nome || localMatch?.nome || "Cliente",
            telefone: mascaraWhatsApp(row.telefone || localMatch?.telefone || ""),
            dataNascimento: row.data_nascimento || localMatch?.dataNascimento,
            criadoEm: row.criado_em || localMatch?.criadoEm,
            bloqueado:
              row.bloqueado !== undefined && row.bloqueado !== null
                ? Boolean(row.bloqueado)
                : Boolean(localMatch?.bloqueado),
            motivo_bloqueio:
              row.motivo_bloqueio !== undefined && row.motivo_bloqueio !== null
                ? row.motivo_bloqueio
                : (localMatch?.motivo_bloqueio || null),
          };

          if (existingId && existingId !== row.id) {
            usersById.delete(existingId);
          }
          usersById.set(row.id, profile);
          idByPhone.set(digits, row.id);
        }
      }
    } catch {}
  }

  return Array.from(usersById.values());
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
        if (digits && digits.length >= 8) map.set(digits, u.id);
      }
    }
    const rawCur = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
    if (rawCur) {
      const cur: UserProfile = JSON.parse(rawCur);
      const digits = cur.telefone ? cur.telefone.replace(/\D/g, "") : "";
      if (digits && digits.length >= 8 && !map.has(digits)) map.set(digits, cur.id);
    }
  } catch {}
  return map;
}

/**
 * Verifica se um telefone pertence a um usuário bloqueado
 */
export async function isTelefoneBloqueado(telefone: string): Promise<boolean> {
  const digits = telefone.replace(/\D/g, "");
  if (!digits || digits.length < 8) return false;

  // 1. Tenta checar diretamente no Supabase em tempo real
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("usuarios")
        .select("bloqueado")
        .eq("telefone", digits)
        .maybeSingle();

      if (!error && data && data.bloqueado !== undefined && data.bloqueado !== null) {
        return Boolean(data.bloqueado);
      }
    } catch {}
  }

  // 2. Fallback sincronizado
  const todos = await listarUsuariosCadastrados();
  const encontrado = todos.find((u) => u.telefone.replace(/\D/g, "") === digits);
  return Boolean(encontrado?.bloqueado);
}

/**
 * Bloqueia ou desbloqueia um usuário preservando os dados cadastrais
 */
export async function toggleBloqueioUsuario(
  userId: string,
  bloqueado: boolean,
  motivo?: string,
  dadosAtuais?: { nome?: string; telefone?: string; dataNascimento?: string | null }
): Promise<boolean> {
  try {
    await atualizarPerfilSupabase(userId, {
      bloqueado,
      motivo_bloqueio: motivo || null,
      ...(dadosAtuais?.nome ? { nome: dadosAtuais.nome } : {}),
      ...(dadosAtuais?.telefone ? { telefone: dadosAtuais.telefone } : {}),
      ...(dadosAtuais?.dataNascimento !== undefined ? { dataNascimento: dadosAtuais.dataNascimento } : {}),
    });
    return true;
  } catch (err) {
    console.error("Erro ao alterar bloqueio:", err);
    return false;
  }
}

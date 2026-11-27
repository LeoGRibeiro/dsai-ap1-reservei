import { supabase, isSupabaseConfigured } from "./client";
import { mascaraWhatsApp } from "@/lib/constants";
import type { UserProfile } from "./types";
import {
  MENSAGENS_AUTH_CLIENTE,
  emailDoTelefone,
  traduzirErroAuthCliente,
} from "@/lib/clienteAuth/regras";

const STORAGE_CURRENT_USER_KEY = "reservei_current_user";
const STORAGE_MOCK_USERS_DB = "reservei_users_db";

interface StoredUserRow {
  id: string;
  nome: string;
  telefone: string;
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

/** Perfil vindo da linha de `public.usuarios`. */
function linhaParaPerfil(row: StoredUserRow): UserProfile {
  return {
    id: row.id,
    nome: row.nome,
    telefone: mascaraWhatsApp(row.telefone),
    dataNascimento: row.data_nascimento,
    criadoEm: row.criado_em,
    bloqueado: Boolean(row.bloqueado),
    motivo_bloqueio: row.motivo_bloqueio ?? null,
  };
}

/** Cache só para exibição (evita a tela piscar); nunca decide quem está logado. */
function salvarCachePerfil(perfil: UserProfile | null) {
  if (typeof window === "undefined") return;
  try {
    if (perfil) localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(perfil));
    else localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
  } catch {}
}

function lerCachePerfil(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

async function carregarPerfil(userId: string): Promise<UserProfile | null> {
  const { data } = await supabase.from("usuarios").select("*").eq("id", userId).maybeSingle();
  return data ? linhaParaPerfil(data as StoredUserRow) : null;
}

type ResultadoAuthCliente = { user: UserProfile | null; error?: string };

/**
 * Cadastra o cliente no Supabase Auth com o e-mail interno do WhatsApp.
 * O perfil em `usuarios` é criado pelo trigger do banco. Visitante com sessão
 * anônima tem a conta convertida, mantendo o id (e as reservas já feitas).
 */
export async function cadastrarUsuarioSupabase(
  nome: string,
  telefone: string,
  senha: string,
  dataNascimento?: string
): Promise<ResultadoAuthCliente> {
  const email = emailDoTelefone(telefone);
  if (!email) return { user: null, error: MENSAGENS_AUTH_CLIENTE.telefoneInvalido };
  if (!isSupabaseConfigured()) return { user: null, error: MENSAGENS_AUTH_CLIENTE.naoConfigurado };

  const metadados = { nome, data_nascimento: dataNascimento || null };

  try {
    const { data: atual } = await supabase.auth.getSession();
    let userId: string;

    if (atual.session?.user.is_anonymous) {
      const conversao = await supabase.auth.updateUser({ email, data: metadados });
      if (conversao.error) return { user: null, error: traduzirErroAuthCliente(conversao.error) };
      const definirSenha = await supabase.auth.updateUser({ password: senha });
      if (definirSenha.error) return { user: null, error: traduzirErroAuthCliente(definirSenha.error) };
      userId = atual.session.user.id;
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password: senha, options: { data: metadados } });
      if (error) return { user: null, error: traduzirErroAuthCliente(error) };
      if (!data.session) {
        console.warn('[Auth] Cadastro sem sessão: confirme que "Confirm email" está desligado no Supabase.');
        return { user: null, error: MENSAGENS_AUTH_CLIENTE.erroGenerico };
      }
      userId = data.session.user.id;
    }

    const perfil = (await carregarPerfil(userId)) ?? {
      id: userId,
      nome,
      telefone: mascaraWhatsApp(telefone),
      dataNascimento: dataNascimento || null,
      bloqueado: false,
      motivo_bloqueio: null,
    };
    salvarCachePerfil(perfil);
    return { user: perfil };
  } catch (err) {
    console.warn("[Auth] Falha no cadastro:", err);
    return { user: null, error: traduzirErroAuthCliente(err) };
  }
}

/** Login com WhatsApp e senha pelo Supabase Auth. */
export async function loginUsuarioSupabase(telefone: string, senha: string): Promise<ResultadoAuthCliente> {
  const email = emailDoTelefone(telefone);
  if (!email) return { user: null, error: MENSAGENS_AUTH_CLIENTE.credenciaisInvalidas };
  if (!isSupabaseConfigured()) return { user: null, error: MENSAGENS_AUTH_CLIENTE.naoConfigurado };

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error || !data.user) return { user: null, error: traduzirErroAuthCliente(error) };

    const perfil = await carregarPerfil(data.user.id);
    if (!perfil) {
      // Conta do Auth que não é de cliente (ex.: administrador).
      await supabase.auth.signOut();
      return { user: null, error: MENSAGENS_AUTH_CLIENTE.credenciaisInvalidas };
    }
    salvarCachePerfil(perfil);
    return { user: perfil };
  } catch (err) {
    console.warn("[Auth] Falha no login:", err);
    return { user: null, error: traduzirErroAuthCliente(err) };
  }
}

/**
 * Cliente logado de acordo com a sessão do Supabase Auth, ou `null`.
 * Sessão anônima (visitante) não conta como cliente logado.
 */
export async function obterUsuarioAtual(): Promise<UserProfile | null> {
  if (typeof window === "undefined") return null;
  if (!isSupabaseConfigured()) {
    salvarCachePerfil(null);
    return null;
  }

  try {
    const { data } = await supabase.auth.getSession();
    const usuarioAuth = data.session?.user;
    if (!usuarioAuth || usuarioAuth.is_anonymous) {
      salvarCachePerfil(null);
      return null;
    }

    try {
      const perfil = await carregarPerfil(usuarioAuth.id);
      salvarCachePerfil(perfil);
      return perfil;
    } catch (err) {
      console.warn("[Auth] Erro ao carregar o perfil; usando o cache da mesma sessão:", err);
      const cache = lerCachePerfil();
      return cache?.id === usuarioAuth.id ? cache : null;
    }
  } catch {
    return null;
  }
}

/**
 * Garante uma sessão (anônima, se preciso) antes de o visitante reservar.
 * Falhar aqui não impede a reserva; só registra o aviso.
 */
export async function garantirSessaoVisitante(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session) return true;
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.warn("[Auth] Login anônimo indisponível:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[Auth] Falha ao criar sessão de visitante:", err);
    return false;
  }
}

/**
 * Desconecta o usuário
 */
export async function logoutUsuarioSupabase(): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("[Auth] Erro ao deslogar do Supabase:", err);
    }
  }
  salvarCachePerfil(null);
}

/**
 * Atualiza os dados de perfil do usuário
 */
export async function atualizarPerfilSupabase(
  userId: string,
  dados: Partial<Omit<UserProfile, "id" | "criadoEm">>
): Promise<UserProfile | null> {
  const digits = dados.telefone ? dados.telefone.replace(/\D/g, "") : undefined;

  // Atualiza no Supabase; se o banco recusar (ex.: regra de acesso), não salva nada.
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from("usuarios")
        .update({
          ...(dados.nome ? { nome: dados.nome } : {}),
          ...(digits ? { telefone: digits } : {}),
          ...(dados.dataNascimento !== undefined ? { data_nascimento: dados.dataNascimento } : {}),
          ...(dados.bloqueado !== undefined ? { bloqueado: dados.bloqueado } : {}),
          ...(dados.motivo_bloqueio !== undefined ? { motivo_bloqueio: dados.motivo_bloqueio } : {}),
        })
        .eq("id", userId);
      if (error) {
        console.warn("[Auth] Perfil não atualizado no Supabase:", error.message);
        return null;
      }
    } catch (err) {
      console.warn("[Auth] Erro ao atualizar no Supabase:", err);
      return null;
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
 * Exclui a conta do usuário permanentemente (LGPD): perfil e usuário do Auth,
 * pela função `excluir_minha_conta()` do banco.
 */
export async function excluirContaSupabase(userId: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.rpc("excluir_minha_conta");
      if (error) {
        console.warn("[Auth] Erro ao excluir a conta:", error.message);
        return false;
      }
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("[Auth] Erro ao excluir a conta:", err);
      return false;
    }
  }

  if (typeof window !== "undefined") {
    try {
      if (lerCachePerfil()?.id === userId) salvarCachePerfil(null);
      saveLocalUsers(getLocalUsers().filter((u) => u.id !== userId));
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

  // 1. Função do banco: responde só sim ou não, sem expor o cadastro (RLS).
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.rpc("telefone_bloqueado", { p_telefone: digits });
      if (!error && typeof data === "boolean") return data;
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

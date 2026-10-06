"use client";

import Link from "next/link";
import { Ticket } from "lucide-react";
import { useUserAuth } from "@/hooks/useUserAuth";

/**
 * Ações de conta exibidas no cabeçalho da Landing Page.
 *
 * Todos os botões compartilham rigorosamente a mesma altura (`h-9` / 36px),
 * raio arredondado (`rounded-full`) e alinhamento vertical.
 *
 * - Estado carregando inicial:
 *   - Esqueleto discreto com `h-9` para evitar o efeito de piscar (flicker)
 *     botões de visitante quando o usuário já está autenticado.
 *
 * - Visitante:
 *   - Botão "Entrar" (link para /login).
 *   - Botão "Criar Conta" (link para /cadastro).
 *
 * - Cliente autenticado:
 *   1. Botão destacado de "Minhas Reservas" com ícone de Ticket (link para /minha-conta).
 *   2. Pílula de perfil com avatar e primeiro nome que leva diretamente para a página de perfil (/minha-conta).
 *
 * @example
 * <AcoesUsuarioHeader />
 */
export function AcoesUsuarioHeader() {
  const { user, loading } = useUserAuth();

  // Se a verificação inicial de autenticação estiver ocorrendo e não houver usuário em cache,
  // exibe um marcador sutil de mesma altura (h-9) para não piscar "Entrar/Criar Conta" indevidamente.
  if (loading && !user) {
    return (
      <div
        data-testid="header-auth-loading"
        className="h-9 w-20 rounded-full bg-slate-800/30 border border-slate-700/30 animate-pulse"
        aria-hidden="true"
      />
    );
  }

  if (user) {
    const primeiroNome = user.nome.split(" ")[0];
    const inicial = user.nome.charAt(0).toUpperCase();

    return (
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* ── Botão Destacado: Minhas Reservas (ao lado de Agendar Agora) ── */}
        <Link href="/minha-conta" id="header-minha-conta">
          <button
            type="button"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-full border border-slate-700 hover:border-emerald-500/50 bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold transition-all shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
          >
            <Ticket className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            <span>Minhas Reservas</span>
          </button>
        </Link>

        {/* ── Botão Perfil do Usuário: Link direto para a página de perfil ── */}
        <Link
          href="/minha-conta"
          id="header-usuario-perfil"
          aria-label={`Ver perfil de ${user.nome}`}
        >
          <button
            type="button"
            className="inline-flex items-center gap-2.5 h-9 pl-1.5 pr-3.5 rounded-full border border-slate-700/80 hover:border-emerald-500/50 bg-slate-900/80 hover:bg-slate-800/90 text-slate-200 hover:text-white transition-all shadow-sm cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500/25 via-emerald-600/20 to-teal-700/30 border border-emerald-500/40 text-emerald-300 flex items-center justify-center font-bold text-xs shadow-inner flex-shrink-0">
              {inicial}
            </div>
            <span className="text-xs font-semibold text-white group-hover:text-emerald-300 transition-colors max-w-[120px] truncate">
              {primeiroNome}
            </span>
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/login" id="header-entrar">
        <button
          type="button"
          className="inline-flex items-center justify-center h-9 px-3.5 rounded-full text-slate-300 hover:text-white text-xs font-semibold hover:bg-slate-800/60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
        >
          Entrar
        </button>
      </Link>
      <Link href="/cadastro" id="header-criar-conta">
        <button
          type="button"
          className="inline-flex items-center justify-center h-9 px-4 rounded-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
        >
          Criar Conta
        </button>
      </Link>
    </div>
  );
}

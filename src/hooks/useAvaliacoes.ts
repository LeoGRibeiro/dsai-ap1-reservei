/**
 * Hooks de avaliações: as do próprio cliente (Minha Conta), a moderação do
 * admin e o resumo da landing.
 *
 * Spec: SPEC/2026-11-27-avaliacoes-de-clientes.md
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MENSAGENS_AVALIACOES,
  resumoAvaliacoes,
  urlAvaliacaoGoogle,
  validarAvaliacao,
} from "@/lib/avaliacoes/regras";
import type { Avaliacao, AvaliacaoPublica, EntradaAvaliacao, StatusAvaliacao } from "@/lib/avaliacoes/types";
import {
  editarAvaliacao,
  enviarAvaliacao,
  listarAvaliacoes,
  listarAvaliacoesPublicas,
  moderarAvaliacao,
} from "@/lib/supabase/avaliacoesRepository";
import { useUserAuth } from "@/hooks/useUserAuth";

type Resultado = { ok: true } | { ok: false; erro: string };

const comoResultado = (r: Resultado): Resultado => (r.ok ? { ok: true } : { ok: false, erro: r.erro });

/** Carrega uma lista ao montar (se `ativo`) e expõe o recarregamento. */
function useListaAvaliacoes<T>(carregar: () => Promise<T[]>, ativo = true) {
  const [lista, setLista] = useState<T[]>([]);
  const [carregando, setCarregando] = useState(ativo);

  const recarregar = useCallback(async () => setLista(await carregar()), [carregar]);

  useEffect(() => {
    if (!ativo) return;
    let vivo = true;
    void carregar().then((dados) => {
      if (!vivo) return;
      setLista(dados);
      setCarregando(false);
    });
    return () => {
      vivo = false;
    };
  }, [carregar, ativo]);

  return { lista, carregando, recarregar };
}

export function useMinhasAvaliacoes() {
  const { user } = useUserAuth();
  const { lista, recarregar } = useListaAvaliacoes(listarAvaliacoes, Boolean(user));

  const porReserva = useMemo(
    () => (user ? Object.fromEntries(lista.map((a) => [a.reservaId, a])) : {}) as Record<string, Avaliacao>,
    [lista, user]
  );

  /** Envia a primeira avaliação da reserva ou edita a existente (enquanto pendente). */
  const salvar = useCallback(
    async (reservaId: string, entrada: EntradaAvaliacao): Promise<Resultado> => {
      if (!user) return { ok: false, erro: MENSAGENS_AVALIACOES.avaliacao_nao_permitida };
      const erro = validarAvaliacao(entrada);
      if (erro) return { ok: false, erro };
      const existente = porReserva[reservaId];
      const r = existente
        ? await editarAvaliacao(existente.id, entrada)
        : await enviarAvaliacao({
            ...entrada,
            id: `av_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            reservaId,
            usuarioId: user.id,
          });
      if (r.ok) await recarregar();
      return comoResultado(r);
    },
    [user, porReserva, recarregar]
  );

  return { porReserva, salvar };
}

export function useAvaliacoesAdmin() {
  const { lista, carregando, recarregar } = useListaAvaliacoes(listarAvaliacoes);

  const moderar = useCallback(
    async (id: string, status: StatusAvaliacao): Promise<Resultado> => {
      const r = await moderarAvaliacao(id, status);
      if (r.ok) await recarregar();
      return comoResultado(r);
    },
    [recarregar]
  );

  return { avaliacoes: lista, carregando, moderar };
}

export function useAvaliacoesLanding() {
  const { lista, carregando } = useListaAvaliacoes<AvaliacaoPublica>(listarAvaliacoesPublicas);
  const resumo = useMemo(() => resumoAvaliacoes(lista), [lista]);
  return { resumo, carregando, urlGoogle: urlAvaliacaoGoogle(process.env.NEXT_PUBLIC_GOOGLE_AVALIACAO_URL) };
}

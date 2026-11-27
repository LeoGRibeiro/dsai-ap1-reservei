/**
 * Hooks de eventos e torneios: gestão pelo admin, página pública do evento e
 * seção da landing.
 *
 * Spec: SPEC/2026-11-27-eventos-e-torneios.md
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getHoje } from "@/lib/constants";
import { campeao, desfazerResultado, embaralhar, gerarChave, registrarResultado } from "@/lib/eventos/chave";
import {
  eventosParaLanding,
  horariosDoEvento,
  situacaoInscricao,
  traduzirErroEvento,
  validarEvento,
  validarNomeTime,
} from "@/lib/eventos/regras";
import type { EntradaResultado, Evento, InscricaoEvento, PartidaEvento } from "@/lib/eventos/types";
import {
  confirmarInscricao,
  inscreverTime,
  listarEventos,
  listarInscricoes,
  listarPartidas,
  listarTimesPublicos,
  removerInscricao,
  salvarEvento,
  salvarPartidas,
  type ResultadoEventos,
} from "@/lib/supabase/eventosRepository";
import { useReservasService } from "@/hooks/useReservasService";
import { useUserAuth } from "@/hooks/useUserAuth";

type Resultado = { ok: true } | { ok: false; erro: string };

const gerarId = (prefixo: string) => `${prefixo}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

function comoResultado(r: ResultadoEventos): Resultado {
  return r.ok ? { ok: true } : { ok: false, erro: r.erro };
}

/** Partidas que mudaram, para gravar só o necessário. */
function partidasAlteradas(antes: PartidaEvento[], depois: PartidaEvento[]): PartidaEvento[] {
  return depois.filter((p) => JSON.stringify(p) !== JSON.stringify(antes.find((a) => a.id === p.id)));
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export function useEventosAdmin() {
  const { criarBloqueio, removerBloqueio } = useReservasService();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setEventos(await listarEventos());
    setCarregando(false);
  }, []);

  useEffect(() => {
    let ativo = true;
    void listarEventos().then((lista) => {
      if (!ativo) return;
      setEventos(lista);
      setCarregando(false);
    });
    return () => {
      ativo = false;
    };
  }, []);

  /** Cria ou edita um evento em rascunho. */
  const salvarRascunho = useCallback(
    async (dados: Omit<Evento, "id" | "status" | "reservasBloqueio"> & { id?: string }): Promise<Resultado> => {
      const erros = validarEvento(dados, getHoje());
      if (erros.length > 0) return { ok: false, erro: erros.join(" ") };
      const evento: Evento = { ...dados, id: dados.id ?? gerarId("evt"), status: "rascunho", reservasBloqueio: [] };
      const r = await salvarEvento(evento);
      if (r.ok) await recarregar();
      return comoResultado(r);
    },
    [recarregar]
  );

  /** Publica o evento, bloqueando a quadra no horário. Se algo falhar, desfaz os bloqueios. */
  const publicar = useCallback(
    async (evento: Evento): Promise<Resultado> => {
      const erros = validarEvento(evento, getHoje());
      if (erros.length > 0) return { ok: false, erro: erros.join(" ") };

      const bloqueios: string[] = [];
      if (evento.quadraId) {
        const bloqueio = await criarBloqueio({
          quadraId: evento.quadraId,
          data: evento.data,
          horarios: horariosDoEvento(evento),
          motivo: `Evento: ${evento.nome}`,
        });
        if (!bloqueio.ok || !bloqueio.reserva) {
          return { ok: false, erro: bloqueio.motivo ?? traduzirErroEvento({ message: "horario_ocupado" }) };
        }
        bloqueios.push(bloqueio.reserva.id);
      }

      const r = await salvarEvento({ ...evento, status: "publicado", reservasBloqueio: bloqueios });
      if (!r.ok) {
        for (const id of bloqueios) await removerBloqueio(id);
        return comoResultado(r);
      }
      await recarregar();
      return { ok: true };
    },
    [criarBloqueio, removerBloqueio, recarregar]
  );

  /** Cancela o evento e libera a quadra. */
  const cancelar = useCallback(
    async (evento: Evento): Promise<Resultado> => {
      const r = await salvarEvento({ ...evento, status: "cancelado", reservasBloqueio: [] });
      if (!r.ok) return comoResultado(r);
      for (const id of evento.reservasBloqueio) await removerBloqueio(id);
      await recarregar();
      return { ok: true };
    },
    [removerBloqueio, recarregar]
  );

  /** Sorteia a chave com os times confirmados e fecha as inscrições. */
  const sortearChave = useCallback(
    async (evento: Evento, inscricoes: InscricaoEvento[], aleatorio?: () => number): Promise<Resultado> => {
      const confirmados = inscricoes.filter((i) => i.confirmada).map((i) => i.id);
      let partidas: PartidaEvento[];
      try {
        partidas = gerarChave(evento.id, embaralhar(confirmados, aleatorio));
      } catch (err) {
        return { ok: false, erro: traduzirErroEvento(err) };
      }
      const gravacao = await salvarPartidas(partidas);
      if (!gravacao.ok) return comoResultado(gravacao);
      const r = await salvarEvento({ ...evento, status: "chave_sorteada" });
      if (r.ok) await recarregar();
      return comoResultado(r);
    },
    [recarregar]
  );

  /** Lança ou desfaz um resultado; com a final decidida, encerra o evento. */
  const alterarResultado = useCallback(
    async (
      evento: Evento,
      partidas: PartidaEvento[],
      partidaId: string,
      entrada: EntradaResultado | "desfazer"
    ): Promise<{ ok: true; partidas: PartidaEvento[] } | { ok: false; erro: string }> => {
      let depois: PartidaEvento[];
      try {
        depois =
          entrada === "desfazer"
            ? desfazerResultado(partidas, partidaId)
            : registrarResultado(partidas, partidaId, entrada);
      } catch (err) {
        return { ok: false, erro: traduzirErroEvento(err) };
      }
      const gravacao = await salvarPartidas(partidasAlteradas(partidas, depois));
      if (!gravacao.ok) return { ok: false, erro: gravacao.erro };

      const novoStatus = campeao(depois) ? "encerrado" : "chave_sorteada";
      if (novoStatus !== evento.status) {
        await salvarEvento({ ...evento, status: novoStatus });
        await recarregar();
      }
      return { ok: true, partidas: depois };
    },
    [recarregar]
  );

  return {
    eventos,
    carregando,
    recarregar,
    salvarRascunho,
    publicar,
    cancelar,
    sortearChave,
    alterarResultado,
    listarInscricoes,
    listarPartidas,
    confirmarInscricao: async (id: string, confirmada: boolean) => comoResultado(await confirmarInscricao(id, confirmada)),
    removerInscricao: async (id: string) => comoResultado(await removerInscricao(id)),
  };
}

// ─── Página pública do evento ─────────────────────────────────────────────────

export function useEventoPublico(eventoId: string) {
  const { user } = useUserAuth();
  const [evento, setEvento] = useState<Evento | null>(null);
  const [times, setTimes] = useState<InscricaoEvento[]>([]);
  const [minhas, setMinhas] = useState<InscricaoEvento[]>([]);
  const [partidas, setPartidas] = useState<PartidaEvento[]>([]);
  const [carregando, setCarregando] = useState(true);

  const buscar = useCallback(
    () =>
      Promise.all([listarEventos(), listarTimesPublicos(eventoId), listarInscricoes(eventoId), listarPartidas(eventoId)]),
    [eventoId]
  );

  const aplicar = useCallback(
    ([todos, publicos, proprias, chave]: Awaited<ReturnType<typeof buscar>>) => {
      setEvento(todos.find((e) => e.id === eventoId) ?? null);
      setTimes(publicos);
      setMinhas(proprias);
      setPartidas(chave);
      setCarregando(false);
    },
    [eventoId]
  );

  const recarregar = useCallback(async () => aplicar(await buscar()), [aplicar, buscar]);

  useEffect(() => {
    let ativo = true;
    void buscar().then((dados) => {
      if (ativo) aplicar(dados);
    });
    return () => {
      ativo = false;
    };
  }, [buscar, aplicar]);

  const minhaInscricao = useMemo(
    () => (user ? minhas.find((i) => i.usuarioId === user.id) ?? null : null),
    [minhas, user]
  );

  // O total de inscritos não é público; a tela usa os confirmados e o banco decide as vagas.
  const situacao = useMemo(
    () => (evento ? situacaoInscricao(evento, times.length, getHoje()) : null),
    [evento, times.length]
  );

  const inscrever = useCallback(
    async (nomeTime: string): Promise<Resultado> => {
      if (!user) return { ok: false, erro: traduzirErroEvento({ message: "conta_necessaria" }) };
      const erroNome = validarNomeTime(nomeTime);
      if (erroNome) return { ok: false, erro: erroNome };
      const r = await inscreverTime({
        id: gerarId("ins"),
        eventoId,
        usuarioId: user.id,
        nomeTime,
        responsavelNome: user.nome,
        responsavelWhatsapp: user.telefone.replace(/\D/g, ""),
      });
      if (r.ok) await recarregar();
      return comoResultado(r);
    },
    [user, eventoId, recarregar]
  );

  const desistir = useCallback(async (): Promise<Resultado> => {
    if (!minhaInscricao) return { ok: true };
    const r = await removerInscricao(minhaInscricao.id);
    if (r.ok) await recarregar();
    return comoResultado(r);
  }, [minhaInscricao, recarregar]);

  return { evento, times, partidas, minhaInscricao, situacao, carregando, logado: Boolean(user), inscrever, desistir };
}

// ─── Landing ──────────────────────────────────────────────────────────────────

export function useEventosLanding() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [nomeCampeao, setNomeCampeao] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    void (async () => {
      const lista = await listarEventos();
      const { ultimoEncerrado } = eventosParaLanding(lista, getHoje());
      let nome: string | null = null;
      if (ultimoEncerrado) {
        const [chave, times] = await Promise.all([
          listarPartidas(ultimoEncerrado.id),
          listarTimesPublicos(ultimoEncerrado.id),
        ]);
        const idCampeao = campeao(chave);
        nome = times.find((t) => t.id === idCampeao)?.nomeTime ?? null;
      }
      if (ativo) {
        setEventos(lista);
        setNomeCampeao(nome);
        setCarregando(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  return { ...eventosParaLanding(eventos, getHoje()), nomeCampeao, carregando };
}

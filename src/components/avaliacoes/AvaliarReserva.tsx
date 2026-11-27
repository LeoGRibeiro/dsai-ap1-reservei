/**
 * Avaliação de uma reserva no histórico da Minha Conta: botão "Avaliar",
 * formulário e a nota já enviada com a situação da moderação.
 *
 * Spec: SPEC/2026-11-27-avaliacoes-de-clientes.md
 */

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MAX_COMENTARIO, reservaAvaliavel } from "@/lib/avaliacoes/regras";
import type { Avaliacao, EntradaAvaliacao, StatusAvaliacao } from "@/lib/avaliacoes/types";
import type { Reserva } from "@/store/useReservasStore";
import { Estrelas, SeletorEstrelas } from "./Estrelas";

type Resultado = { ok: true } | { ok: false; erro: string };

const ROTULO_STATUS: Record<StatusAvaliacao, string> = {
  pendente: "Em análise",
  aprovada: "Publicada",
  oculta: "Não publicada",
};

interface Props {
  reserva: Reserva;
  avaliacao?: Avaliacao;
  agora: Date;
  onSalvar: (reservaId: string, entrada: EntradaAvaliacao) => Promise<Resultado>;
}

export function AvaliarReserva({ reserva, avaliacao, agora, onSalvar }: Props) {
  const [aberto, setAberto] = useState(false);

  if (aberto) {
    return <FormularioAvaliacao reserva={reserva} avaliacao={avaliacao} onSalvar={onSalvar} onFechar={() => setAberto(false)} />;
  }

  if (avaliacao) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Estrelas nota={avaliacao.nota} className="h-3.5 w-3.5" />
        <span className="text-[10px] text-slate-400">{ROTULO_STATUS[avaliacao.status]}</span>
        {avaliacao.status === "pendente" && (
          <button type="button" onClick={() => setAberto(true)} className="text-[10px] font-semibold text-emerald-400 underline">
            Editar
          </button>
        )}
      </div>
    );
  }

  if (!reservaAvaliavel(reserva, agora)) return null;
  return (
    <button
      type="button"
      onClick={() => setAberto(true)}
      className="mt-2 rounded-lg bg-amber-500/15 px-3 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-500/25"
    >
      Avaliar
    </button>
  );
}

function FormularioAvaliacao({
  reserva,
  avaliacao,
  onSalvar,
  onFechar,
}: Omit<Props, "agora"> & { onFechar: () => void }) {
  const [nota, setNota] = useState(avaliacao?.nota ?? 0);
  const [comentario, setComentario] = useState(avaliacao?.comentario ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const idComentario = `comentario-${reserva.id}`;

  const enviar = async () => {
    setEnviando(true);
    const r = await onSalvar(reserva.id, { nota, comentario });
    setEnviando(false);
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    toast.success("Avaliação enviada!", { description: "Ela aparece no site depois de analisada pelo complexo." });
    onFechar();
  };

  return (
    <div className="mt-3 w-full space-y-3 rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-left">
      <SeletorEstrelas valor={nota} onChange={setNota} />
      <div>
        <label htmlFor={idComentario} className="mb-1 block text-[11px] text-slate-400">
          Comentário (opcional)
        </label>
        <textarea
          id={idComentario}
          value={comentario}
          maxLength={MAX_COMENTARIO}
          rows={3}
          onChange={(e) => setComentario(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs text-white"
        />
        <p className="text-right text-[10px] text-slate-500">
          {comentario.length}/{MAX_COMENTARIO}
        </p>
      </div>
      {erro && (
        <p role="alert" className="text-[11px] text-red-400">
          {erro}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onFechar} className="rounded-lg px-3 py-1.5 text-[11px] text-slate-300">
          Cancelar
        </button>
        <button
          type="button"
          disabled={enviando}
          onClick={enviar}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
        >
          Enviar avaliação
        </button>
      </div>
    </div>
  );
}

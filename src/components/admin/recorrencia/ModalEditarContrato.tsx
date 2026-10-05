/**
 * Modal para edição das informações cadastrais e de divulgação de um contrato
 * recorrente (escolinha ou grupo comum).
 */

"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { GraduationCap, Users, X, Loader2, Info } from "lucide-react";
import { ESPORTES, QUADRAS, type Esporte } from "@/lib/quadras";
import { mascaraWhatsApp, formatarDataExibicao } from "@/lib/constants";
import { DIAS_SEMANA, type ContratoRecorrente } from "@/lib/recorrencia/types";

interface Props {
  contrato: ContratoRecorrente | null;
  onClose: () => void;
  onSalvar: (
    contratoId: string,
    dados: {
      nome: string;
      esporte?: Esporte;
      descricao?: string;
      responsavelNome: string;
      contatoWhatsapp: string;
    }
  ) => Promise<{ ok: boolean; motivo?: string }>;
}

const CLASSE_INPUT =
  "w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/60 transition-colors";
const CLASSE_LABEL = "block text-xs font-semibold text-slate-400 mb-1.5";

export function ModalEditarContrato({ contrato, onClose, onSalvar }: Props) {
  const [mounted, setMounted] = useState(false);
  const [nome, setNome] = useState("");
  const [esporte, setEsporte] = useState<Esporte | "">("");
  const [descricao, setDescricao] = useState("");
  const [responsavelNome, setResponsavelNome] = useState("");
  const [contatoWhatsapp, setContatoWhatsapp] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (contrato) {
      setNome(contrato.nome);
      setEsporte(contrato.esporte || "");
      setDescricao(contrato.descricao || "");
      setResponsavelNome(contrato.responsavelNome);
      setContatoWhatsapp(mascaraWhatsApp(contrato.contatoWhatsapp));
      setErro(null);
    }
  }, [contrato]);

  if (!mounted || !contrato) return null;

  const ehEscolinha = contrato.tipo === "escolinha";
  const quadra = QUADRAS.find((q) => q.id === contrato.quadraId);
  const dias = DIAS_SEMANA.filter((d) => contrato.diasSemana.includes(d.valor))
    .map((d) => d.curto)
    .join(", ");

  const handleWhatsappChange = (valor: string) => {
    setContatoWhatsapp(mascaraWhatsApp(valor));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setSalvando(true);

    try {
      const resultado = await onSalvar(contrato.id, {
        nome,
        esporte: esporte || undefined,
        descricao: ehEscolinha ? descricao : undefined,
        responsavelNome,
        contatoWhatsapp,
      });

      if (resultado.ok) {
        onClose();
      } else {
        setErro(resultado.motivo || "Não foi possível salvar as alterações.");
      }
    } finally {
      setSalvando(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-editar-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
    >
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <header className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                ehEscolinha
                  ? "bg-violet-500/15 border-violet-500/30 text-violet-400"
                  : "bg-sky-500/15 border-sky-500/30 text-sky-400"
              }`}
            >
              {ehEscolinha ? <GraduationCap className="w-5 h-5" /> : <Users className="w-5 h-5" />}
            </div>
            <div>
              <h2 id="modal-editar-titulo" className="text-base font-bold text-white">
                {ehEscolinha ? "Editar Escolinha" : "Editar Grupo"}
              </h2>
              <p className="text-xs text-slate-400">
                Altere os dados cadastrais e de divulgação deste contrato.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* ── Formulário com scroll ── */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
          {erro && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
              {erro}
            </div>
          )}

          {/* Nome */}
          <div>
            <label htmlFor="editar-nome" className={CLASSE_LABEL}>
              {ehEscolinha ? "Nome da escolinha" : "Nome do grupo"} *
            </label>
            <input
              id="editar-nome"
              required
              className={CLASSE_INPUT}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Escolinha Craques do Futuro"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Esporte */}
            <div>
              <label htmlFor="editar-esporte" className={CLASSE_LABEL}>
                Esporte {ehEscolinha ? "*" : "(opcional)"}
              </label>
              <select
                id="editar-esporte"
                className={CLASSE_INPUT}
                value={esporte}
                onChange={(e) => setEsporte(e.target.value as Esporte | "")}
              >
                <option value="">Selecione...</option>
                {ESPORTES.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>

            {/* Responsável */}
            <div>
              <label htmlFor="editar-responsavel" className={CLASSE_LABEL}>
                Responsável *
              </label>
              <input
                id="editar-responsavel"
                required
                className={CLASSE_INPUT}
                value={responsavelNome}
                onChange={(e) => setResponsavelNome(e.target.value)}
                placeholder="Ex.: Prof. Carlos"
              />
            </div>
          </div>

          {/* WhatsApp */}
          <div>
            <label htmlFor="editar-whatsapp" className={CLASSE_LABEL}>
              WhatsApp de contato *
            </label>
            <input
              id="editar-whatsapp"
              required
              className={CLASSE_INPUT}
              value={contatoWhatsapp}
              onChange={(e) => handleWhatsappChange(e.target.value)}
              placeholder="(99) 99999-9999"
            />
          </div>

          {/* Descrição (somente escolinhas) */}
          {ehEscolinha && (
            <div>
              <label htmlFor="editar-descricao" className={CLASSE_LABEL}>
                Descrição da escolinha
              </label>
              <textarea
                id="editar-descricao"
                rows={3}
                className={CLASSE_INPUT}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex.: Para crianças de 8 a 14 anos. Turmas pela manhã e tarde. Matrículas abertas!"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Exibido para os clientes no portal e no modal de detalhes do horário.
              </span>
            </div>
          )}

          {/* Dados fixos da agenda */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-slate-300">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>Agenda e bloqueios vinculados:</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {quadra ? `Quadra ${quadra.numero}` : contrato.quadraId} · {dias} · {contrato.horaInicio} às {contrato.horaFim} · {contrato.meses} {contrato.meses === 1 ? "mês" : "meses"} desde {formatarDataExibicao(contrato.dataInicio, { day: "numeric", month: "short", year: "numeric" })}
            </p>
            <p className="text-[10px] text-slate-500 italic">
              * Para alterar quadra, dias ou horários, encerre este contrato e cadastre um novo.
            </p>
          </div>

          {/* ── Footer ── */}
          <div className="flex justify-end items-center gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 transition-colors disabled:opacity-50"
            >
              {salvando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Salvar alterações
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

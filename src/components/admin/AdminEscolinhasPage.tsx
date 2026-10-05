/**
 * Tela do admin: Gestão de Escolinhas.
 * Cadastro de escolinhas com bloqueio recorrente da agenda e divulgação no portal.
 * (Sem regra de cancelamento por sessão — contratos financeiros em backlog.)
 */

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { GraduationCap, Pencil, Plus } from "lucide-react";
import { useContratosService } from "@/hooks/useContratosService";
import { getHoje } from "@/lib/constants";
import type { ContratoRecorrente } from "@/lib/recorrencia/types";
import { FormularioContrato } from "./recorrencia/FormularioContrato";
import { CartaoContrato } from "./recorrencia/CartaoContrato";
import { ModalEditarContrato } from "./recorrencia/ModalEditarContrato";

export function AdminEscolinhasPage() {
  const { getContratosPorTipo, getOcorrencias, criarContrato, atualizarContrato, encerrarContrato } =
    useContratosService();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [contratoEmEdicao, setContratoEmEdicao] = useState<ContratoRecorrente | null>(null);

  const escolinhas = getContratosPorTipo("escolinha");
  const hoje = getHoje();

  async function handleEncerrar(id: string, nome: string) {
    const confirmado = window.confirm(
      `Encerrar o contrato de "${nome}"? As sessões de hoje em diante serão liberadas na agenda.`
    );
    if (!confirmado) return;

    const resultado = await encerrarContrato(id);
    if (resultado.ok) {
      toast.success("Contrato encerrado", {
        description: `${resultado.sessoesCanceladas} sessões foram liberadas na agenda.`,
      });
    } else {
      toast.error("Não foi possível encerrar o contrato.");
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-violet-400" />
            Escolinhas
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Horários exclusivos bloqueados na agenda e divulgados no portal com contato para matrícula.
          </p>
        </div>
        {!mostrarForm && (
          <button
            id="escolinhas-nova"
            onClick={() => setMostrarForm(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova escolinha
          </button>
        )}
      </div>

      {mostrarForm && (
        <FormularioContrato
          tipo="escolinha"
          onSubmit={criarContrato}
          onCancelar={() => setMostrarForm(false)}
          onSucesso={(resultado) => {
            setMostrarForm(false);
            toast.success("Escolinha cadastrada", {
              description: `${resultado.totalOcorrencias} sessões bloqueadas na agenda.`,
            });
          }}
        />
      )}

      {escolinhas.length === 0 && !mostrarForm && (
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-10 text-center">
          <GraduationCap className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">Nenhuma escolinha cadastrada</p>
          <p className="text-slate-600 text-sm mt-1">
            Cadastre uma escolinha para bloquear seus horários e divulgá-la no portal.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {escolinhas.map((contrato) => {
          const sessoesFuturas = getOcorrencias(contrato.id).filter(
            (o) => o.data >= hoje && o.status !== "cancelada"
          ).length;

          return (
            <CartaoContrato key={contrato.id} contrato={contrato} sessoesFuturas={sessoesFuturas}>
              {contrato.descricao && (
                <p className="text-xs text-slate-500 border-t border-slate-800 pt-3">
                  {contrato.descricao}
                </p>
              )}
              <div className="flex items-center justify-between border-t border-slate-800 pt-3">
                <button
                  id={`editar-${contrato.id}`}
                  onClick={() => setContratoEmEdicao(contrato)}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5 text-violet-400" />
                  Editar informações
                </button>

                {contrato.ativo && (
                  <button
                    id={`encerrar-${contrato.id}`}
                    onClick={() => handleEncerrar(contrato.id, contrato.nome)}
                    className="text-xs font-medium text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                  >
                    Encerrar contrato
                  </button>
                )}
              </div>
            </CartaoContrato>
          );
        })}
      </div>

      {contratoEmEdicao && (
        <ModalEditarContrato
          contrato={contratoEmEdicao}
          onClose={() => setContratoEmEdicao(null)}
          onSalvar={async (id, dados) => {
            const res = await atualizarContrato(id, dados);
            if (res.ok) {
              toast.success("Escolinha atualizada com sucesso!");
            }
            return res;
          }}
        />
      )}
    </div>
  );
}

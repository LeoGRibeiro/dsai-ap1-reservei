/**
 * MuralVagasAbertas — Painel dedicado que concentra todas as vagas abertas na arena.
 * Projetado para ficar abaixo do carrinho ou no portal do cliente sem sobrecarregar a grade de horários.
 */

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVagasService } from "@/hooks/useVagasService";
import { useUserAuth } from "@/hooks/useUserAuth";
import { formatarDataExibicao } from "@/lib/constants";
import type { VagaDisponivelItem } from "@/lib/vagas/types";
import { ModalConfirmarInteresse } from "./ModalConfirmarInteresse";

export function MuralVagasAbertas() {
  const { user } = useUserAuth();
  const { vagasDisponiveis, temInteresseRegistrado } = useVagasService();
  const [vagaSelecionada, setVagaSelecionada] = useState<VagaDisponivelItem | null>(null);

  const handleAbrirInteresse = (vaga: VagaDisponivelItem) => {
    if (!user) {
      toast.info("Conta necessária para participar", {
        description: "Faça login ou crie sua conta para demonstrar interesse em partidas com vagas abertas.",
        action: {
          label: "Entrar",
          onClick: () => {
            if (typeof window !== "undefined") {
              window.location.href = "/login";
            }
          },
        },
      });
      return;
    }

    if (vaga.organizadorId && vaga.organizadorId === user.id) {
      toast.info("Você é o organizador desta partida.");
      return;
    }

    if (temInteresseRegistrado(vaga.reservaId, user.id)) {
      toast.info("Você já manifestou interesse nesta vaga.");
      return;
    }

    setVagaSelecionada(vaga);
  };

  if (vagasDisponiveis.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 text-center shadow-lg">
        <div className="w-9 h-9 rounded-xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
          <Users className="w-4 h-4" />
        </div>
        <h3 className="text-xs font-bold text-slate-200">
          Mural de Vagas da Galera
        </h3>
        <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
          Nenhum time precisando de jogadores no momento. Quando alguém abrir vagas, elas aparecerão aqui!
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        {/* Cabeçalho do Mural */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 flex items-center justify-center font-black shadow-md shadow-emerald-500/20">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-1.5">
                Vagas Abertas na Arena
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {vagasDisponiveis.length}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Entre em partidas organizadas por outros jogadores
              </p>
            </div>
          </div>
        </div>

        {/* Lista de Vagas */}
        <div className="space-y-3">
          {vagasDisponiveis.map((vaga) => {
            const isMinhaReserva = Boolean(user && vaga.organizadorId === user.id);
            const jaDemonstrou = Boolean(user && temInteresseRegistrado(vaga.reservaId, user.id));

            return (
              <div
                key={vaga.reservaId}
                className="bg-slate-950/70 border border-slate-800/90 hover:border-slate-700/80 rounded-xl p-3.5 transition-all text-xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                      Quadra {vaga.quadraNumero} · {vaga.esporte || "Esporte"}
                    </span>
                    <h4 className="font-bold text-white text-xs mt-0.5">
                      {vaga.quadraDescricao}
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                    {vaga.vagasAbertas} {vaga.vagasAbertas === 1 ? "vaga" : "vagas"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{formatarDataExibicao(vaga.data)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{vaga.horaInicio} às {vaga.horaFim}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                    Org: <strong className="text-slate-300 font-semibold">{vaga.organizadorNome.split(" ")[0]}</strong>
                  </span>

                  {isMinhaReserva ? (
                    <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-slate-500" /> Sua partida
                    </span>
                  ) : jaDemonstrou ? (
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Interesse enviado
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleAbrirInteresse(vaga)}
                      className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-[11px] h-7 px-3 rounded-lg shadow-sm"
                    >
                      Quero Jogar
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de confirmação para o jogador interessado */}
      <ModalConfirmarInteresse
        open={Boolean(vagaSelecionada)}
        vaga={vagaSelecionada}
        onClose={() => setVagaSelecionada(null)}
      />
    </>
  );
}

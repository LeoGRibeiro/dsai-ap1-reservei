/**
 * ModalConfirmarInteresse — Confirmação e aceite de termos pelo jogador interessado.
 * Compartilha o contato do interessado com o organizador com total proteção legal para a arena.
 */

"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Users,
  ShieldAlert,
  Calendar,
  Clock,
  Sparkles,
  Phone,
  CheckCircle2,
} from "lucide-react";
import type { VagaDisponivelItem } from "@/lib/vagas/types";
import { TERMO_RESPONSABILIDADE_INTERESSADO } from "@/lib/vagas/types";
import { useVagasService } from "@/hooks/useVagasService";
import { useUserAuth } from "@/hooks/useUserAuth";
import { formatarDataExibicao } from "@/lib/constants";

interface ModalConfirmarInteresseProps {
  open: boolean;
  onClose: () => void;
  vaga: VagaDisponivelItem | null;
  onSucesso?: () => void;
}

export function ModalConfirmarInteresse({
  open,
  onClose,
  vaga,
  onSucesso,
}: ModalConfirmarInteresseProps) {
  const { user } = useUserAuth();
  const { demonstrarInteresse } = useVagasService();
  const [aceitouTermos, setAceitouTermos] = useState<boolean>(false);
  const [enviando, setEnviando] = useState<boolean>(false);

  if (!vaga) return null;

  const handleConfirmar = async () => {
    if (!user) {
      toast.error("Conta necessária", {
        description: "Você precisa estar conectado à sua conta para solicitar vagas.",
      });
      return;
    }

    if (!aceitouTermos) {
      toast.error("Termo obrigatório", {
        description: "É obrigatório aceitar o termo de isenção de responsabilidade.",
      });
      return;
    }

    setEnviando(true);
    const res = await demonstrarInteresse({
      reservaId: vaga.reservaId,
      usuarioId: user.id,
      nomeUsuario: user.nome,
      telefoneUsuario: user.telefone,
      aceitouTermos,
    });
    setEnviando(false);

    if (res.sucesso) {
      toast.success("Interesse registrado com sucesso! 🎉", {
        description: `O organizador (${vaga.organizadorNome}) recebeu seu contato e te chamará no WhatsApp se a vaga for confirmada.`,
        duration: 6000,
      });
      setAceitouTermos(false);
      onClose();
      if (onSucesso) onSucesso();
    } else {
      toast.error(res.erro || "Não foi possível registrar o interesse.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white w-full sm:max-w-lg p-6 sm:p-7 rounded-3xl shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-white tracking-tight">
                Quero Participar do Jogo
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 mt-0.5">
                Envie seu WhatsApp para o organizador da partida
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Detalhes da Partida */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 mt-2 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white text-sm">
              Quadra {vaga.quadraNumero} ({vaga.esporte || "Esporte"})
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {vaga.vagasAbertas} {vaga.vagasAbertas === 1 ? "vaga restante" : "vagas restantes"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-slate-300 text-[11px]">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{formatarDataExibicao(vaga.data)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{vaga.horaInicio} às {vaga.horaFim}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Organizador da Partida:</span>
            <span className="font-bold text-white">{vaga.organizadorNome}</span>
          </div>
        </div>

        {/* Seus dados que serão enviados */}
        {user && (
          <div className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-xl text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-300">Contato a ser enviado:</span>
            </div>
            <span className="font-bold text-white">{user.telefone}</span>
          </div>
        )}

        {/* Termos Legais do Jogador */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs space-y-2.5">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Isenção de Responsabilidade da Arena</span>
          </div>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            {TERMO_RESPONSABILIDADE_INTERESSADO}
          </p>
          <label className="flex items-start gap-2.5 pt-2 border-t border-amber-500/20 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={aceitouTermos}
              onChange={(e) => setAceitouTermos(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
            />
            <span className="text-xs font-semibold text-white">
              Estou ciente e concordo com o envio do meu telefone ao organizador.
            </span>
          </label>
        </div>

        <DialogFooter className="mt-3 flex gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs h-10 rounded-xl"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            disabled={enviando || !aceitouTermos}
            onClick={handleConfirmar}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs h-10 rounded-xl shadow-lg shadow-emerald-500/20"
          >
            {enviando ? "Registrando..." : "Confirmar e Enviar Contato"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Componente Visual da Cartela de Fidelidade e Timeline com Selos/Checks.
 * Permite ao cliente acompanhar suas horas jogadas, validade dos selos,
 * ticket médio acumulado e vouchers de desconto disponíveis.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Award,
  Gift,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertTriangle,
  Copy,
  Check,
  Calendar,
  Ticket,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { formatarMoeda, formatarDataExibicao } from "@/lib/constants";
import type { ProgressoFidelidadeUsuario, VoucherFidelidade } from "@/lib/fidelidade/types";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  progresso: ProgressoFidelidadeUsuario;
  carregando: boolean;
  onResgatarVoucher?: () => Promise<{ sucesso: boolean; voucher?: VoucherFidelidade; erro?: string }>;
}

export function CartelaFidelidadeTimeline({
  progresso,
  carregando,
  onResgatarVoucher,
}: Props) {
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [resgatando, setResgatando] = useState(false);

  const handleCopiarCodigo = (codigo: string, id: string) => {
    void navigator.clipboard.writeText(codigo);
    setCopiadoId(id);
    toast.success("Código do voucher copiado!");
    setTimeout(() => setCopiadoId(null), 2500);
  };

  const handleResgate = async () => {
    if (!onResgatarVoucher) return;
    setResgatando(true);
    try {
      const res = await onResgatarVoucher();
      if (res.sucesso && res.voucher) {
        toast.success(`🎉 Parabéns! Voucher ${res.voucher.codigo} gerado com sucesso!`);
      } else if (res.erro) {
        toast.error(res.erro);
      }
    } catch {
      toast.error("Falha ao resgatar voucher.");
    } finally {
      setResgatando(false);
    }
  };

  if (carregando) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Carregando seu cartão de fidelidade...</p>
      </div>
    );
  }

  const metaHoras = progresso.horasNecessarias || 12;
  const horasCompletadas = Math.min(progresso.totalHorasAtivas, metaHoras);
  const faltamHoras = Math.max(0, metaHoras - progresso.totalHorasAtivas);

  return (
    <div className="space-y-6">
      {/* ── Card Principal da Cartela ────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800/80 p-6 sm:p-8 shadow-2xl">
        {/* Glow decorativo de fundo */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10">
          {/* Header com Título e Badges */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 shadow-inner">
                <Gift className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    Cartela de Fidelidade
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Ativa
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Complete {metaHoras} horas de jogo avulso em até 3 meses para ganhar 1 voucher!
                </p>
              </div>
            </div>

            {/* Ticket Médio Acumulado */}
            <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/60 rounded-2xl px-4 py-2.5 backdrop-blur-sm self-start sm:self-auto">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Ticket Médio Atual
                </p>
                <p className="text-sm font-black text-emerald-300">
                  {progresso.ticketMedioAtual > 0
                    ? `${formatarMoeda(progresso.ticketMedioAtual)} / hora`
                    : "R$ 0,00"}
                </p>
              </div>
            </div>
          </div>

          {/* Barra de Progresso Quantitativa */}
          <div className="my-6">
            <div className="flex justify-between items-end mb-2">
              <div>
                <span className="text-2xl font-black text-white">{horasCompletadas}</span>
                <span className="text-slate-400 text-sm font-semibold"> / {metaHoras} horas</span>
              </div>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                {progresso.percentualConcluido}% concluído
              </span>
            </div>

            <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden p-0.5 border border-slate-700/50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 transition-all duration-700 ease-out shadow-sm"
                style={{ width: `${progresso.percentualConcluido}%` }}
              />
            </div>
          </div>

          {/* ── Timeline com os 12 Checks / Selos ────────────────────────────── */}
          <div className="py-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Timeline de Carimbos ({horasCompletadas} de {metaHoras})
            </p>

            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2.5">
              {Array.from({ length: metaHoras }).map((_, index) => {
                const horaNumero = index + 1;
                const estaPreenchido = horaNumero <= progresso.totalHorasAtivas;
                const ehUltimo = horaNumero === metaHoras;

                // Encontra qual selo cobriu esta hora
                let seloCorrespondente = null;
                let acumulador = 0;
                for (const s of progresso.selosAtivos) {
                  acumulador += s.horasContabilizadas || 1;
                  if (acumulador >= horaNumero) {
                    seloCorrespondente = s;
                    break;
                  }
                }

                return (
                  <div
                    key={horaNumero}
                    className={`relative flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all duration-200 group
                      ${
                        estaPreenchido
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-md shadow-emerald-950/40"
                          : "bg-slate-800/40 border-slate-700/50 text-slate-500"
                      }
                      ${ehUltimo && !estaPreenchido ? "border-amber-500/30 bg-amber-500/5" : ""}
                    `}
                  >
                    {/* Ícone */}
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-1 transition-transform group-hover:scale-110">
                      {estaPreenchido ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : ehUltimo ? (
                        <Award className="w-5 h-5 text-amber-400 animate-pulse" />
                      ) : (
                        <span className="text-xs font-bold text-slate-500">{horaNumero}h</span>
                      )}
                    </div>

                    <span className="text-[10px] font-semibold">
                      {ehUltimo ? "Prêmio 🎁" : `${horaNumero}ª h`}
                    </span>

                    {/* Tooltip com info do selo ao passar mouse */}
                    {seloCorrespondente && (
                      <div className="absolute bottom-full mb-2 hidden group-hover:block z-30 bg-slate-950 border border-slate-700 text-slate-200 text-[10px] rounded-lg p-2 shadow-xl whitespace-nowrap pointer-events-none">
                        <p className="font-bold text-emerald-400">
                          Jogo em {formatarDataExibicao(seloCorrespondente.dataJogo)}
                        </p>
                        <p>Valor: {formatarMoeda(seloCorrespondente.valorPorHora)}/h</p>
                        <p className="text-slate-400">
                          Expira em {formatarDataExibicao(seloCorrespondente.expiraEm)}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Aviso de Expiração / Urgência */}
          {progresso.diasParaProximoSeloExpirar !== null && (
            <div className="mt-4 flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3.5 text-xs text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                <span className="font-semibold">Fique atento à validade: </span>
                Seu selo mais antigo expira em{" "}
                <strong className="underline">
                  {progresso.diasParaProximoSeloExpirar} dia(s)
                </strong>{" "}
                ({formatarDataExibicao(progresso.proximoSeloExpirandoEm || "")}). Complete suas horas
                restantes para não perder seu progresso!
              </div>
            </div>
          )}

          {/* Botão de Resgate Manual se elegível */}
          {progresso.podeResgatar && (
            <div className="mt-6 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400 animate-bounce" />
                <p className="text-sm font-bold text-white">
                  Você completou as {metaHoras} horas! Seu voucher está pronto para ser gerado.
                </p>
              </div>

              <Button
                onClick={handleResgate}
                disabled={resgatando}
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black px-6 h-11 rounded-xl shadow-lg shadow-emerald-500/25"
              >
                {resgatando ? "Gerando Voucher..." : "Resgatar Voucher Agora 🎁"}
              </Button>
            </div>
          )}

          {/* Mensagem motivacional de quantas horas faltam */}
          {!progresso.podeResgatar && faltamHoras > 0 && (
            <p className="text-xs text-slate-400 mt-4 text-center">
              Faltam apenas <strong className="text-emerald-400">{faltamHoras} hora(s)</strong> de
              jogo concluído para desbloquear seu desconto especial.
            </p>
          )}
        </div>
      </div>

      {/* ── Seção de Vouchers Disponíveis ───────────────────────────────────── */}
      {progresso.vouchersDisponiveis.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">
              Seus Vouchers Disponíveis ({progresso.vouchersDisponiveis.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {progresso.vouchersDisponiveis.map((voucher) => (
              <div
                key={voucher.id}
                className="relative overflow-hidden rounded-2xl bg-slate-900 border border-emerald-500/40 p-5 shadow-lg flex flex-col justify-between"
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Voucher de Fidelidade
                      </span>
                    </div>
                    <p className="text-2xl font-black text-white mt-2">
                      Até {formatarMoeda(voucher.valorTeto)}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Abatimento no valor de uma nova reserva
                    </p>
                  </div>

                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Gift className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                    <span className="text-xs font-mono font-bold text-emerald-300">
                      {voucher.codigo}
                    </span>
                    <button
                      onClick={() => handleCopiarCodigo(voucher.codigo, voucher.id)}
                      className="text-slate-400 hover:text-white p-1"
                      title="Copiar código"
                    >
                      {copiadoId === voucher.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center gap-1 self-start sm:self-auto">
                    <Calendar className="w-3 h-3" />
                    Válido até {formatarDataExibicao(voucher.expiraEm)}
                  </div>
                </div>

                <div className="mt-3">
                  <Link href="/" className="w-full block">
                    <Button
                      variant="outline"
                      className="w-full border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-300 font-bold text-xs h-9 rounded-xl flex items-center justify-center gap-1"
                    >
                      Usar no Agendamento
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Histórico de Vouchers Usados / Expirados ────────────────────────── */}
      {progresso.vouchersHistorico.length > 0 && (
        <div className="space-y-3 pt-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Histórico de Vouchers Anteriores
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {progresso.vouchersHistorico.map((v) => (
              <div
                key={v.id}
                className="bg-slate-900/40 border border-slate-800 rounded-xl p-3.5 text-xs flex justify-between items-center opacity-70"
              >
                <div>
                  <p className="font-mono font-bold text-slate-300">{v.codigo}</p>
                  <p className="text-slate-500 text-[10px]">Teto: {formatarMoeda(v.valorTeto)}</p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    v.status === "utilizado"
                      ? "bg-slate-800 text-slate-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {v.status === "utilizado" ? "Utilizado" : "Expirado"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

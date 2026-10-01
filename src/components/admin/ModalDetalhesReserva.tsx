/**
 * ModalDetalhesReserva — exibe todas as informações de uma reserva.
 * Acionado pelo clique em qualquer item da tabela (Dashboard) ou
 * bloco da timeline (Agenda).
 */

"use client";

import { useEffect, useCallback } from "react";
import {
  X,
  User,
  Phone,
  CreditCard,
  CalendarDays,
  Clock,
  Layers,
  Dumbbell,
  MessageSquare,
  Banknote,
  CheckCircle2,
  AlertCircle,
  Loader2,
  XCircle,
  DollarSign,
  MessageCircle,
  ExternalLink,
  Send,
} from "lucide-react";
import type { Reserva } from "@/store/useReservasStore";
import { formatarMoeda, formatarDataExibicao } from "@/lib/constants";
import { PREPARACAO_POR_ESPORTE } from "@/lib/quadras";

// ─── Config de status ─────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  confirmada: {
    label: "Confirmada",
    icon: CheckCircle2,
    bg: "bg-emerald-500/10 border-emerald-500/30",
    text: "text-emerald-400",
    iconCor: "text-emerald-400",
  },
  pendente: {
    label: "Pendente (pagar no local)",
    icon: AlertCircle,
    bg: "bg-amber-500/10 border-amber-500/30",
    text: "text-amber-400",
    iconCor: "text-amber-400",
  },
  em_processamento: {
    label: "Em Processamento",
    icon: Loader2,
    bg: "bg-sky-500/10 border-sky-500/30",
    text: "text-sky-400",
    iconCor: "text-sky-400",
  },
  cancelada: {
    label: "Cancelada",
    icon: XCircle,
    bg: "bg-slate-600/20 border-slate-600/30",
    text: "text-slate-500",
    iconCor: "text-slate-500",
  },
};

// ─── Sub-componente: Linha de detalhe ─────────────────────────────────────────

function DetalheRow({
  icon: Icon,
  label,
  value,
  valueClass = "text-white",
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-700/40 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide mb-0.5">
          {label}
        </p>
        <p className={`text-sm font-medium break-words ${valueClass}`}>{value}</p>
      </div>
    </div>
  );
}

// ─── Botões de WhatsApp contextual ───────────────────────────────────────────

interface BotoesWhatsAppProps {
  reserva: Reserva;
  tipoPagamento: "sinal" | "integral";
}

function gerarUrlWA(numero: string, texto: string): string {
  const nums = numero.replace(/\D/g, "");
  // Adiciona DDI 55 (Brasil) se não tiver
  const ddi = nums.startsWith("55") ? nums : `55${nums}`;
  return `https://wa.me/${ddi}?text=${encodeURIComponent(texto)}`;
}

function BotoesWhatsApp({ reserva, tipoPagamento }: BotoesWhatsAppProps) {
  const quadraNum = reserva.quadraId.replace("q", "");
  const dataFormatada = formatarDataExibicao(reserva.data, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // ── Mensagens pré-prontas ──────────────────────────────────────────────────

  const msgConfirmacao =
    `Olá, *${reserva.nomeCliente}*! 👋\n\n` +
    `✅ Sua reserva no *Complexo Esportivo Reservei* está confirmada!\n\n` +
    `📋 *Detalhes da reserva:*\n` +
    `• Quadra ${quadraNum} — ${dataFormatada}\n` +
    `• Horário: *${reserva.horaInicio} – ${reserva.horaFim}*\n` +
    (reserva.esporte ? `• Esporte: *${reserva.esporte}*\n` : ``) +
    `\n💰 *Pagamento:* ${tipoPagamento === "integral" ? "Integral — pago por completo ✅" : `Sinal de *${formatarMoeda(reserva.valorSinal)}* pago ✅`}\n` +
    (tipoPagamento === "sinal"
      ? `• Restante a pagar no local: *${formatarMoeda(reserva.valorPendente)}*\n`
      : ``) +
    `\nNos vemos lá! 🏟️`;

  const msgPendente =
    `Olá, *${reserva.nomeCliente}*! 👋\n\n` +
    `🔔 Lembrete da sua reserva no *Complexo Esportivo Reservei*:\n\n` +
    `📋 *Detalhes:*\n` +
    `• Quadra ${quadraNum} — ${dataFormatada}\n` +
    `• Horário: *${reserva.horaInicio} – ${reserva.horaFim}*\n\n` +
    `💳 *Pagamento pendente no local:*\n` +
    `• Sinal pago: *${formatarMoeda(reserva.valorSinal)}* ✅\n` +
    `• *A pagar na entrada: ${formatarMoeda(reserva.valorPendente)}*\n\n` +
    `Por favor, chegue com o valor em mãos (dinheiro ou Pix). Até logo! 🏟️`;

  const msgCustom =
    `Olá, *${reserva.nomeCliente}*! ` +
    `Entrando em contato sobre sua reserva na Quadra ${quadraNum} no dia ${dataFormatada} (${reserva.horaInicio}–${reserva.horaFim}). `;

  const botoes: Array<{
    id: string;
    label: string;
    descricao: string;
    cor: string;
    borda: string;
    icone: React.ElementType;
    mensagem: string;
    destaque?: boolean;
  }> = [
    {
      id: "wpp-confirmacao",
      label: "Enviar Confirmação",
      descricao: "Dados completos da reserva + pagamento",
      cor: "bg-emerald-500 hover:bg-emerald-400 text-slate-950",
      borda: "border-emerald-500",
      icone: CheckCircle2,
      mensagem: msgConfirmacao,
      destaque: true,
    },
    ...(tipoPagamento === "sinal"
      ? [
          {
            id: "wpp-pendente",
            label: "Cobrar Pendência",
            descricao: `Lembrar de pagar ${formatarMoeda(reserva.valorPendente)} no local`,
            cor: "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30",
            borda: "border-amber-500/30",
            icone: AlertCircle,
            mensagem: msgPendente,
          },
        ]
      : []),
    {
      id: "wpp-custom",
      label: "Mensagem Livre",
      descricao: "Abre conversa com texto base editável",
      cor: "bg-slate-700/60 hover:bg-slate-700 text-slate-300 border border-slate-600/50",
      borda: "border-slate-600/50",
      icone: MessageCircle,
      mensagem: msgCustom,
    },
  ];

  return (
    <div className="space-y-2">
      {botoes.map((btn) => {
        const Icon = btn.icone;
        return (
          <a
            key={btn.id}
            id={btn.id}
            href={gerarUrlWA(reserva.whatsappCliente, btn.mensagem)}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl font-medium text-sm transition-all duration-150 group ${btn.cor}`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <div className="flex-1 min-w-0 text-left">
              <p className="font-semibold leading-tight">{btn.label}</p>
              <p className={`text-[11px] leading-tight mt-0.5 ${btn.destaque ? "text-slate-800/70" : "text-slate-500"}`}>
                {btn.descricao}
              </p>
            </div>
            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
          </a>
        );
      })}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────


interface Props {
  reserva: Reserva | null;
  onFechar: () => void;
}

export function ModalDetalhesReserva({ reserva, onFechar }: Props) {
  // Fechar com Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    },
    [onFechar]
  );

  useEffect(() => {
    if (!reserva) return;
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [reserva, handleKeyDown]);

  if (!reserva) return null;

  const statusCfg =
    STATUS_CONFIG[reserva.status] ?? STATUS_CONFIG.pendente;
  const StatusIcon = statusCfg.icon;

  const quadraNum = reserva.quadraId.replace("q", "");
  const tipoPagamento = reserva.valorPendente === 0 ? "integral" : "sinal";
  const dataFormatada = formatarDataExibicao(reserva.data, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const criadaEm = new Date(reserva.criadaEm).toLocaleString("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onFechar}
      />

      {/* Drawer lateral */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md flex flex-col bg-slate-900 border-l border-slate-700/60 shadow-2xl animate-slide-in-right overflow-y-auto">

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-5 border-b border-slate-700/50 sticky top-0 bg-slate-900 z-10">
          <div>
            <p className="text-xs text-slate-500 font-mono mb-1">
              #{reserva.id.slice(-8).toUpperCase()}
            </p>
            <h2 className="text-lg font-bold text-white leading-tight">
              Detalhes da Reserva
            </h2>
          </div>
          <button
            id="modal-detalhes-fechar"
            onClick={onFechar}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition-all flex-shrink-0 ml-4"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 px-6 py-5 space-y-6">

          {/* Badge de status */}
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border ${statusCfg.bg}`}
          >
            <StatusIcon className={`w-5 h-5 flex-shrink-0 ${statusCfg.iconCor}`} />
            <div>
              <p className={`text-sm font-semibold ${statusCfg.text}`}>
                {statusCfg.label}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Reserva criada em {criadaEm}
              </p>
            </div>
          </div>

          {/* Seção: Cliente */}
          <section>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
              Cliente
            </p>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-4">
              <DetalheRow
                icon={User}
                label="Nome"
                value={reserva.nomeCliente || "—"}
              />
              <DetalheRow
                icon={Phone}
                label="WhatsApp"
                value={reserva.whatsappCliente || "—"}
              />
              <DetalheRow
                icon={CreditCard}
                label="CPF"
                value={reserva.cpfCliente || "—"}
              />
            </div>
          </section>

          {/* Seção: Agendamento */}
          <section>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
              Agendamento
            </p>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-4">
              <DetalheRow
                icon={CalendarDays}
                label="Data"
                value={<span className="capitalize">{dataFormatada}</span>}
              />
              <DetalheRow
                icon={Clock}
                label="Horário"
                value={`${reserva.horaInicio} – ${reserva.horaFim} (${reserva.horarios.length}h)`}
                valueClass="text-white font-mono"
              />
              <DetalheRow
                icon={Layers}
                label="Quadra"
                value={`Quadra ${quadraNum} — poliesportiva coberta`}
              />
              {reserva.esporte && (
                <DetalheRow
                  icon={Dumbbell}
                  label="Esporte"
                  value={
                    <span>
                      {reserva.esporte}
                      <span className="block text-[11px] text-slate-500 font-normal mt-0.5">
                        {PREPARACAO_POR_ESPORTE[reserva.esporte]}
                      </span>
                    </span>
                  }
                />
              )}
              {reserva.observacoes && (
                <DetalheRow
                  icon={MessageSquare}
                  label="Observações"
                  value={reserva.observacoes}
                  valueClass="text-slate-300"
                />
              )}
            </div>
          </section>

          {/* Seção: Financeiro */}
          <section>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
              Financeiro
            </p>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-4">
              <DetalheRow
                icon={DollarSign}
                label="Valor total"
                value={formatarMoeda(reserva.valorTotal)}
                valueClass="text-white"
              />
              <DetalheRow
                icon={Banknote}
                label={tipoPagamento === "integral" ? "Pago (integral)" : "Sinal pago (40%)"}
                value={formatarMoeda(reserva.valorSinal)}
                valueClass="text-emerald-400"
              />
              {tipoPagamento === "sinal" && (
                <DetalheRow
                  icon={AlertCircle}
                  label="Pendente no local (60%)"
                  value={formatarMoeda(reserva.valorPendente)}
                  valueClass="text-amber-400"
                />
              )}
            </div>

            {/* Resumo visual */}
            <div className="mt-3 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">
                  {tipoPagamento === "integral" ? "Pago integralmente" : "Progresso do pagamento"}
                </span>
                <span className="text-xs font-mono text-slate-300">
                  {tipoPagamento === "integral"
                    ? "100%"
                    : `${Math.round((reserva.valorSinal / reserva.valorTotal) * 100)}%`}
                </span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    tipoPagamento === "integral"
                      ? "bg-emerald-500"
                      : "bg-amber-500"
                  }`}
                  style={{
                    width:
                      tipoPagamento === "integral"
                        ? "100%"
                        : `${Math.round((reserva.valorSinal / reserva.valorTotal) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </section>

          {/* Seção: WhatsApp / Contato */}
          <section>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
              Contato via WhatsApp
            </p>

            {/* Status atual */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 mb-3">
              <DetalheRow
                icon={Phone}
                label="Número do cliente"
                value={
                  reserva.whatsappCliente
                    ? <a
                        href={`https://wa.me/55${reserva.whatsappCliente.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors"
                      >
                        {reserva.whatsappCliente}
                      </a>
                    : "—"
                }
              />
              <DetalheRow
                icon={Send}
                label="Última notificação automática"
                value={
                  reserva.statusWhatsApp === "enviado"
                    ? "✅ Confirmação enviada pelo portal"
                    : reserva.statusWhatsApp === "falhou"
                    ? "❌ Falha no envio automático"
                    : "⏳ Não enviado automaticamente"
                }
                valueClass={
                  reserva.statusWhatsApp === "enviado"
                    ? "text-emerald-400"
                    : reserva.statusWhatsApp === "falhou"
                    ? "text-red-400"
                    : "text-slate-400"
                }
              />
            </div>

            {/* Botões de mensagem rápida */}
            {reserva.whatsappCliente ? (
              <BotoesWhatsApp reserva={reserva} tipoPagamento={tipoPagamento} />
            ) : (
              <p className="text-slate-600 text-xs text-center py-3">
                Número de WhatsApp não informado pelo cliente.
              </p>
            )}
          </section>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </>
  );
}

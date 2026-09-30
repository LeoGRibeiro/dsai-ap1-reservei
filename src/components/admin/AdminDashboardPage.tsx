/**
 * Página de Visão Geral — KPI Cards do dia atual.
 * Lê dados diretamente do useReservasService (Zustand).
 */

"use client";

import { useMemo } from "react";
import {
  CalendarCheck,
  TrendingUp,
  Clock,
  Activity,
  ArrowUpRight,
} from "lucide-react";
import { useReservasService } from "@/hooks/useReservasService";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function hoje() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function AdminDashboardPage() {
  const { reservas } = useReservasService();

  const dataHoje = hoje();

  const kpis = useMemo(() => {
    const reservasHoje = reservas.filter(
      (r) => r.data === dataHoje && r.status !== "cancelada"
    );

    const sinaisPagos = reservasHoje.filter(
      (r) => r.status === "confirmada" || r.status === "pendente"
    );

    const totalSinaisRecebidos = sinaisPagos.reduce(
      (acc, r) => acc + r.valorSinal,
      0
    );

    const totalPendenteNoLocal = reservasHoje
      .filter((r) => r.status === "pendente")
      .reduce((acc, r) => acc + r.valorPendente, 0);

    const totalReservas = reservasHoje.length;

    // Taxa de ocupação das 3 quadras × 15 horários disponíveis
    const totalSlots = 3 * 15;
    const slotsOcupados = reservasHoje.reduce(
      (acc, r) => acc + r.horarios.length,
      0
    );
    const taxaOcupacao =
      totalSlots > 0 ? Math.round((slotsOcupados / totalSlots) * 100) : 0;

    return {
      totalReservas,
      totalSinaisRecebidos,
      totalPendenteNoLocal,
      taxaOcupacao,
    };
  }, [reservas, dataHoje]);

  const cards = [
    {
      id: "kpi-reservas",
      label: "Reservas hoje",
      valor: String(kpis.totalReservas),
      subLabel: "agendamentos ativos",
      icon: CalendarCheck,
      cor: "emerald",
      gradiente: "from-emerald-500/10 to-emerald-500/5",
      borderCor: "border-emerald-500/20",
      iconBg: "bg-emerald-500/10",
      iconCor: "text-emerald-400",
    },
    {
      id: "kpi-sinais",
      label: "Sinais confirmados",
      valor: formatarMoeda(kpis.totalSinaisRecebidos),
      subLabel: "pagos via Pix",
      icon: TrendingUp,
      cor: "sky",
      gradiente: "from-sky-500/10 to-sky-500/5",
      borderCor: "border-sky-500/20",
      iconBg: "bg-sky-500/10",
      iconCor: "text-sky-400",
    },
    {
      id: "kpi-pendente",
      label: "Pendente no local",
      valor: formatarMoeda(kpis.totalPendenteNoLocal),
      subLabel: "a receber presencialmente",
      icon: Clock,
      cor: "amber",
      gradiente: "from-amber-500/10 to-amber-500/5",
      borderCor: "border-amber-500/20",
      iconBg: "bg-amber-500/10",
      iconCor: "text-amber-400",
    },
    {
      id: "kpi-ocupacao",
      label: "Taxa de ocupação",
      valor: `${kpis.taxaOcupacao}%`,
      subLabel: "dos slots disponíveis",
      icon: Activity,
      cor: "violet",
      gradiente: "from-violet-500/10 to-violet-500/5",
      borderCor: "border-violet-500/20",
      iconBg: "bg-violet-500/10",
      iconCor: "text-violet-400",
    },
  ];

  const dataFormatada = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Visão Geral</h1>
        <p className="text-slate-400 text-sm mt-1 capitalize">{dataFormatada}</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              id={card.id}
              className={`relative bg-gradient-to-br ${card.gradiente} border ${card.borderCor} rounded-2xl p-5 overflow-hidden group hover:scale-[1.02] transition-transform duration-200`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* Decoração de fundo */}
              <div
                className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${card.iconBg} blur-2xl opacity-60`}
              />

              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`w-10 h-10 rounded-xl ${card.iconBg} border ${card.borderCor} flex items-center justify-center`}
                  >
                    <Icon className={`w-5 h-5 ${card.iconCor}`} />
                  </div>
                  <ArrowUpRight
                    className={`w-4 h-4 ${card.iconCor} opacity-0 group-hover:opacity-100 transition-opacity duration-200`}
                  />
                </div>

                <p className="text-slate-400 text-xs font-medium mb-1">
                  {card.label}
                </p>
                <p className="text-2xl font-bold text-white leading-none mb-1">
                  {card.valor}
                </p>
                <p className="text-slate-500 text-xs">{card.subLabel}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lista de reservas do dia */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">
            Reservas de hoje
          </h2>
          <span className="text-xs text-slate-500 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-full">
            {reservas.filter(
              (r) => r.data === dataHoje && r.status !== "cancelada"
            ).length}{" "}
            ativas
          </span>
        </div>

        <ReservasDoDia reservas={reservas} dataHoje={dataHoje} />
      </div>
    </div>
  );
}

// ── Sub-componente: Lista de reservas ─────────────────────────────────────────

import type { Reserva } from "@/store/useReservasStore";

const STATUS_CONFIG: Record<
  string,
  { label: string; cor: string; bg: string }
> = {
  confirmada: {
    label: "Confirmada",
    cor: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  pendente: {
    label: "Pendente",
    cor: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  em_processamento: {
    label: "Processando",
    cor: "text-sky-400",
    bg: "bg-sky-500/10 border-sky-500/20",
  },
  cancelada: {
    label: "Cancelada",
    cor: "text-slate-500",
    bg: "bg-slate-500/10 border-slate-500/20",
  },
};

function ReservasDoDia({
  reservas,
  dataHoje,
}: {
  reservas: Reserva[];
  dataHoje: string;
}) {
  const reservasHoje = reservas
    .filter((r) => r.data === dataHoje && r.status !== "cancelada")
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

  if (reservasHoje.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-10 text-center">
        <CalendarCheck className="w-10 h-10 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 font-medium">Nenhuma reserva para hoje</p>
        <p className="text-slate-600 text-sm mt-1">
          As reservas feitas pelo portal aparecerão aqui em tempo real.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-700/50 rounded-2xl overflow-hidden">
      {/* Header da tabela */}
      <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-slate-700/50 text-xs font-medium text-slate-500 uppercase tracking-wider">
        <span>Cliente</span>
        <span className="text-center">Quadra</span>
        <span className="text-center">Horário</span>
        <span className="text-right">Status</span>
      </div>

      {/* Linhas */}
      <div className="divide-y divide-slate-700/30">
        {reservasHoje.map((r) => {
          const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.pendente;
          const quadraNum = r.quadraId.replace("q", "");
          return (
            <div
              key={r.id}
              className="px-5 py-4 flex flex-col sm:grid sm:grid-cols-[1fr_auto_auto_auto] gap-3 sm:gap-4 sm:items-center hover:bg-slate-800/40 transition-colors duration-150"
            >
              {/* Nome + esporte */}
              <div>
                <p className="font-medium text-white text-sm">
                  {r.nomeCliente || "—"}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">
                  {r.esporte ?? "Sem esporte"} ·{" "}
                  {r.valorPendente === 0
                    ? `${formatarMoeda(r.valorSinal)} integral`
                    : `${formatarMoeda(r.valorSinal)} sinal`}
                </p>
              </div>

              {/* Quadra */}
              <div className="text-center">
                <span className="text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg">
                  Quadra {quadraNum}
                </span>
              </div>

              {/* Horário */}
              <div className="text-center">
                <span className="text-xs font-mono text-slate-300">
                  {r.horaInicio} – {r.horaFim}
                </span>
              </div>

              {/* Status */}
              <div className="sm:text-right">
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.cor}`}
                >
                  {cfg.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useMemo } from "react";
import {
  CircleDollarSign,
  TrendingUp,
  Clock,
  CalendarDays,
} from "lucide-react";

import { useReservasService } from "@/hooks/useReservasService";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(data: string) {
  const [ano, mes, dia] = data.split("-");

  return `${dia}/${mes}`;
}

export function AdminFinanceiroPage() {
  const { reservas, financeiro } = useReservasService();

  const dadosUltimosDias = useMemo(() => {
    const hoje = new Date();

    const dias = Array.from({ length: 7 }, (_, index) => {
      const data = new Date(hoje);
      data.setDate(hoje.getDate() - (6 - index));

      const ano = data.getFullYear();
      const mes = String(data.getMonth() + 1).padStart(2, "0");
      const dia = String(data.getDate()).padStart(2, "0");

      return `${ano}-${mes}-${dia}`;
    });

    return dias.map((data) => {
      const reservasDoDia = reservas.filter(
        (reserva) =>
          reserva.data === data && reserva.status !== "cancelada"
      );

      const recebido = reservasDoDia.reduce(
        (total, reserva) => total + reserva.valorSinal,
        0
      );

      const previsto = reservasDoDia.reduce(
        (total, reserva) => total + reserva.valorTotal,
        0
      );

      return {
        data,
        recebido,
        previsto,
      };
    });
  }, [reservas]);

  const maiorValor = Math.max(
    ...dadosUltimosDias.map((dia) => dia.previsto),
    1
  );

  const reservasPorQuadra = useMemo(() => {
    const resultado: Record<string, number> = {};

    reservas
      .filter((reserva) => reserva.status !== "cancelada")
      .forEach((reserva) => {
        resultado[reserva.quadraId] =
          (resultado[reserva.quadraId] || 0) + reserva.valorTotal;
      });

    return Object.entries(resultado).sort((a, b) => b[1] - a[1]);
  }, [reservas]);

  const cards = [
    {
      titulo: "Total recebido",
      valor: financeiro.totalConfirmado,
      descricao: "Pagamentos confirmados",
      icon: CircleDollarSign,
      cor: "emerald",
    },
    {
      titulo: "Total previsto",
      valor: financeiro.totalPrevisto,
      descricao: "Reservas não canceladas",
      icon: TrendingUp,
      cor: "sky",
    },
    {
      titulo: "Valor pendente",
      valor: financeiro.pendenteSinalConfirmado,
      descricao: "Valores ainda pendentes",
      icon: Clock,
      cor: "amber",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Financeiro
        </h1>

        <p className="text-sm text-slate-400 mt-1">
          Visão geral dos valores das reservas
        </p>
      </div>

      {/* Cards financeiros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.titulo}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-400">
                    {card.titulo}
                  </p>

                  <p className="text-2xl font-bold text-white mt-2">
                    {formatarMoeda(card.valor)}
                  </p>

                  <p className="text-xs text-slate-500 mt-1">
                    {card.descricao}
                  </p>
                </div>

                <div
                  className={`w-10 h-10 rounded-xl bg-${card.cor}-500/10 flex items-center justify-center`}
                >
                  <Icon
                    className={`w-5 h-5 text-${card.cor}-400`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Gráfico de evolução financeira */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <CalendarDays className="w-5 h-5 text-sky-400" />

          <div>
            <h2 className="text-base font-semibold text-white">
              Evolução financeira
            </h2>

            <p className="text-xs text-slate-500">
              Valores dos últimos 7 dias
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {dadosUltimosDias.map((dia) => {
            const largura = Math.max(
              (dia.previsto / maiorValor) * 100,
              dia.previsto > 0 ? 4 : 0
            );

            return (
              <div key={dia.data}>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-slate-400">
                    {formatarData(dia.data)}
                  </span>

                  <span className="text-xs text-slate-300">
                    {formatarMoeda(dia.previsto)}
                  </span>
                </div>

                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-500 rounded-full transition-all"
                    style={{ width: `${largura}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Valores por quadra */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="mb-6">
          <h2 className="text-base font-semibold text-white">
            Valores por quadra
          </h2>

          <p className="text-xs text-slate-500 mt-1">
            Total previsto por quadra
          </p>
        </div>

        {reservasPorQuadra.length === 0 ? (
          <p className="text-sm text-slate-500">
            Ainda não existem reservas para apresentar.
          </p>
        ) : (
          <div className="space-y-4">
            {reservasPorQuadra.map(([quadra, valor]) => (
              <div
                key={quadra}
                className="flex items-center justify-between border-b border-slate-800 pb-3 last:border-b-0"
              >
                <span className="text-sm text-slate-300">
                  {quadra}
                </span>

                <span className="text-sm font-semibold text-white">
                  {formatarMoeda(valor)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

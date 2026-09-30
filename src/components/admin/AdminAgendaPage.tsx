/**
 * AdminAgendaPage — Timeline de ocupação (estilo Gantt).
 *
 * Eixo X: horários disponíveis (08:00 – 22:00)
 * Eixo Y: quadras (Q1, Q2, Q3)
 *
 * Funcionalidades:
 *  - Blocos visuais coloridos por status
 *  - Cronômetro regressivo para reservas em andamento
 *  - Alerta de "Montagem Necessária" entre blocos consecutivos com troca de esporte
 *  - Seletor de data
 *  - onClick mapeado para futura spec de modal de detalhes
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Wrench,
  Clock,
  Wifi,
  Timer,
} from "lucide-react";
import { useReservasService } from "@/hooks/useReservasService";
import { QUADRAS, HORARIOS_DISPONIVEIS, PREPARACAO_POR_ESPORTE } from "@/lib/quadras";
import { gerarDiasDisponiveis, formatarDataExibicao } from "@/lib/constants";
import type { Reserva } from "@/store/useReservasStore";

// ─── Helpers de tempo ─────────────────────────────────────────────────────────

function horarioParaMinutos(horario: string): number {
  const [h, m] = horario.split(":").map(Number);
  return h * 60 + m;
}

function hojeLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function minutosAgora(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Retorna o progresso [0..1] de uma reserva em andamento.
 * null se não estiver acontecendo agora.
 */
function calcularProgressoAtivo(
  reserva: Reserva,
  dataExibida: string,
  agora: number
): number | null {
  if (reserva.data !== dataExibida) return null;
  const inicio = horarioParaMinutos(reserva.horaInicio);
  const fim = horarioParaMinutos(reserva.horaFim);
  if (agora < inicio || agora >= fim) return null;
  return (agora - inicio) / (fim - inicio);
}

/** Formata mm:ss restantes */
function formatarTempoRestante(minutosRestantes: number): string {
  const m = Math.max(0, Math.floor(minutosRestantes));
  const s = Math.max(0, Math.round((minutosRestantes - Math.floor(minutosRestantes)) * 60));
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─── Constantes de layout ─────────────────────────────────────────────────────

const COL_LABEL_W = 80; // px da coluna com nome da quadra
const SLOT_W = 72;       // px por coluna de hora
const ROW_H = 88;        // px por linha de quadra

// ─── Configuração de cor por status ──────────────────────────────────────────

const STATUS_STYLE: Record<
  string,
  { bg: string; border: string; text: string; badge: string }
> = {
  confirmada: {
    bg: "bg-emerald-500/20",
    border: "border-emerald-500/50",
    text: "text-emerald-300",
    badge: "bg-emerald-500/30 text-emerald-300",
  },
  pendente: {
    bg: "bg-amber-500/20",
    border: "border-amber-500/50",
    text: "text-amber-300",
    badge: "bg-amber-500/30 text-amber-300",
  },
  em_processamento: {
    bg: "bg-sky-500/15",
    border: "border-sky-500/40",
    text: "text-sky-300",
    badge: "bg-sky-500/30 text-sky-300",
  },
  cancelada: {
    bg: "bg-slate-700/40",
    border: "border-slate-600/40",
    text: "text-slate-500",
    badge: "bg-slate-600/30 text-slate-500",
  },
};

// ─── Componente: Bloco de Reserva ─────────────────────────────────────────────

interface BlocoProps {
  reserva: Reserva;
  colInicio: number; // índice do primeiro slot
  duracao: number;   // quantidade de slots
  dataExibida: string;
  agora: number;     // minutos desde meia-noite
  onClick: (reserva: Reserva) => void;
}

function BlocoReserva({
  reserva,
  colInicio,
  duracao,
  dataExibida,
  agora,
  onClick,
}: BlocoProps) {
  const progresso = calcularProgressoAtivo(reserva, dataExibida, agora);
  const eAtivo = progresso !== null;

  const inicioMin = horarioParaMinutos(reserva.horaInicio);
  const fimMin = horarioParaMinutos(reserva.horaFim);
  const minutosRestantes = eAtivo ? (fimMin - agora) : 0;

  const style = STATUS_STYLE[reserva.status] ?? STATUS_STYLE.pendente;

  const left = COL_LABEL_W + colInicio * SLOT_W + 4;
  const width = duracao * SLOT_W - 8;

  return (
    <div
      role="button"
      tabIndex={0}
      title={`${reserva.nomeCliente} · ${reserva.horaInicio}–${reserva.horaFim}`}
      onClick={() => onClick(reserva)}
      onKeyDown={(e) => e.key === "Enter" && onClick(reserva)}
      className={`absolute top-2 rounded-xl border cursor-pointer select-none
        transition-all duration-150 overflow-hidden group
        hover:scale-[1.02] hover:z-20 hover:shadow-lg
        ${style.bg} ${style.border}`}
      style={{
        left,
        width,
        bottom: 8,
      }}
    >
      {/* Barra de progresso (reserva em andamento) */}
      {eAtivo && (
        <div
          className="absolute inset-0 bg-white/5 origin-left transition-none"
          style={{ transform: `scaleX(${progresso})` }}
        />
      )}

      {/* Indicador pulsante de "ao vivo" */}
      {eAtivo && (
        <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
        </span>
      )}

      <div className="relative px-2 pt-1.5 pb-1 flex flex-col h-full justify-between">
        {/* Linha superior: nome + cronômetro */}
        <div className="flex items-start justify-between gap-1">
          <p
            className={`text-[10px] font-semibold leading-tight truncate flex-1 ${style.text}`}
          >
            {reserva.nomeCliente || "—"}
          </p>
          {eAtivo && (
            <span className="flex items-center gap-0.5 text-[9px] font-mono text-emerald-400 flex-shrink-0">
              <Timer className="w-2.5 h-2.5" />
              {formatarTempoRestante(minutosRestantes)}
            </span>
          )}
        </div>

        {/* Linha inferior: esporte + horário */}
        {width > 64 && (
          <div className="flex items-center justify-between gap-1 mt-auto">
            {reserva.esporte && (
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded-full leading-none ${style.badge}`}
              >
                {reserva.esporte}
              </span>
            )}
            <span className={`text-[9px] font-mono ${style.text} opacity-70 ml-auto`}>
              {reserva.horaInicio}–{reserva.horaFim}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Componente: Indicador de Montagem ────────────────────────────────────────

interface MontagemProps {
  colIndex: number;
  esporteAnterior: string;
  esportePosterior: string;
  preparacao: string;
}

function IndicadorMontagem({
  colIndex,
  esporteAnterior,
  esportePosterior,
  preparacao,
}: MontagemProps) {
  const [hover, setHover] = useState(false);
  const left = COL_LABEL_W + colIndex * SLOT_W - 10;

  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 z-30"
      style={{ left }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Ícone de aviso */}
      <div className="w-5 h-5 rounded-full bg-orange-500 border-2 border-slate-900 flex items-center justify-center shadow-lg cursor-help">
        <Wrench className="w-2.5 h-2.5 text-white" />
      </div>

      {/* Tooltip */}
      {hover && (
        <div className="absolute left-6 top-1/2 -translate-y-1/2 z-40 w-52 bg-slate-800 border border-orange-500/40 rounded-xl p-3 shadow-2xl pointer-events-none">
          <p className="text-orange-400 text-xs font-bold mb-1 flex items-center gap-1">
            <Wrench className="w-3 h-3" />
            Montagem Necessária
          </p>
          <p className="text-slate-300 text-[10px] leading-relaxed">
            <span className="text-slate-400">Troca:</span>{" "}
            <strong>{esporteAnterior}</strong> → <strong>{esportePosterior}</strong>
          </p>
          <p className="text-slate-500 text-[10px] mt-1">{preparacao}</p>
        </div>
      )}
    </div>
  );
}

// ─── Componente: Linha de hora atual ─────────────────────────────────────────

function LinhaHoraAtual({
  dataExibida,
  agora,
}: {
  dataExibida: string;
  agora: number;
}) {
  if (dataExibida !== hojeLocal()) return null;

  const primeiroSlotMin = horarioParaMinutos(HORARIOS_DISPONIVEIS[0]);
  const ultimoSlotMin = horarioParaMinutos(HORARIOS_DISPONIVEIS[HORARIOS_DISPONIVEIS.length - 1]) + 60;

  if (agora < primeiroSlotMin || agora > ultimoSlotMin) return null;

  const proporcao = (agora - primeiroSlotMin) / (ultimoSlotMin - primeiroSlotMin);
  const totalW = HORARIOS_DISPONIVEIS.length * SLOT_W;
  const left = COL_LABEL_W + proporcao * totalW;

  return (
    <div
      className="absolute top-0 bottom-0 w-px bg-red-500 z-25 pointer-events-none"
      style={{ left }}
    >
      <div className="absolute -top-1 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500" />
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function AdminAgendaPage() {
  const { reservas } = useReservasService();

  const diasDisponiveis = gerarDiasDisponiveis(14); // 2 semanas
  const [dataExibida, setDataExibida] = useState(hojeLocal());
  const [agora, setAgora] = useState(minutosAgora());

  // Tick a cada 10s para atualizar cronômetros
  useEffect(() => {
    const interval = setInterval(() => setAgora(minutosAgora()), 10_000);
    return () => clearInterval(interval);
  }, []);

  // Reservas do dia exibido (exceto canceladas que não mostramos)
  const reservasDoDia = reservas.filter(
    (r) => r.data === dataExibida && r.status !== "cancelada"
  );

  const handleClickBloco = useCallback((reserva: Reserva) => {
    // TODO (próxima spec): abrir modal de detalhes da reserva
    // O evento já está mapeado aqui conforme critério da spec.
    console.info("[AdminAgenda] Reserva selecionada:", reserva.id);
  }, []);

  // ── Navegação de data ───────────────────────────────────────────────────────
  const idxAtual = diasDisponiveis.indexOf(dataExibida);
  const podePrev = idxAtual > 0;
  const podeNext = idxAtual < diasDisponiveis.length - 1;

  function navData(delta: number) {
    const novoIdx = idxAtual + delta;
    if (novoIdx >= 0 && novoIdx < diasDisponiveis.length) {
      setDataExibida(diasDisponiveis[novoIdx]);
    }
  }

  // ── Build de dados por quadra ───────────────────────────────────────────────

  /**
   * Para cada quadra, monta a lista de "blocos" e "alertas de montagem".
   */
  function dadosPorQuadra(quadraId: string) {
    const reservasQuadra = reservasDoDia
      .filter((r) => r.quadraId === quadraId)
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

    // Blocos
    const blocos = reservasQuadra.map((r) => {
      const colInicio = HORARIOS_DISPONIVEIS.indexOf(r.horaInicio);
      const colFim = HORARIOS_DISPONIVEIS.indexOf(r.horaFim);
      // Se horaFim não existe na lista (ex: "23:00"), usa última coluna + 1
      const duracao = colFim >= 0 ? colFim - colInicio : HORARIOS_DISPONIVEIS.length - colInicio;
      return { reserva: r, colInicio, duracao };
    });

    // Alertas de montagem: entre reservas consecutivas com esportes diferentes
    const alertas: Array<{
      colIndex: number;
      esporteAnterior: string;
      esportePosterior: string;
      preparacao: string;
    }> = [];

    for (let i = 0; i < reservasQuadra.length - 1; i++) {
      const atual = reservasQuadra[i];
      const prox = reservasQuadra[i + 1];
      const esporteAtual = atual.esporte;
      const esporteProx = prox.esporte;

      // Verificar se são consecutivas (fim do atual === início do próximo)
      if (atual.horaFim === prox.horaInicio && esporteAtual && esporteProx && esporteAtual !== esporteProx) {
        const colTransicao = HORARIOS_DISPONIVEIS.indexOf(prox.horaInicio);
        if (colTransicao >= 0) {
          alertas.push({
            colIndex: colTransicao,
            esporteAnterior: esporteAtual,
            esportePosterior: esporteProx,
            preparacao: PREPARACAO_POR_ESPORTE[esporteProx] ?? "Preparação necessária",
          });
        }
      }
    }

    return { blocos, alertas };
  }

  const isHoje = dataExibida === hojeLocal();
  const totalW = COL_LABEL_W + HORARIOS_DISPONIVEIS.length * SLOT_W;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Agenda de Ocupação</h1>
          <p className="text-slate-400 text-sm mt-1">
            Timeline visual do complexo · Hoje é{" "}
            <span className="text-white font-medium">
              {formatarDataExibicao(hojeLocal(), { weekday: "long", day: "numeric", month: "long" })}
            </span>
          </p>
        </div>

        {/* Status ao vivo */}
        <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-2.5">
          <Wifi className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span className="text-emerald-400 text-xs font-medium">Sincronização em tempo real</span>
        </div>
      </div>

      {/* ── Seletor de data ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          id="agenda-prev-dia"
          onClick={() => navData(-1)}
          disabled={!podePrev}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Dias rápidos (scroll horizontal) */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-1">
          {diasDisponiveis.map((dia) => {
            const ativo = dia === dataExibida;
            const eHoje = dia === hojeLocal();
            return (
              <button
                key={dia}
                onClick={() => setDataExibida(dia)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150
                  ${
                    ativo
                      ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20"
                      : "bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600"
                  }`}
              >
                <span className="block text-[10px] opacity-70 mb-0.5">
                  {eHoje ? "Hoje" : new Date(dia + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short" })}
                </span>
                <span className="block">
                  {new Date(dia + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "numeric" })}
                </span>
              </button>
            );
          })}
        </div>

        <button
          id="agenda-next-dia"
          onClick={() => navData(1)}
          disabled={!podeNext}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ── Legenda ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "Confirmada", bg: "bg-emerald-500/20 border-emerald-500/50", text: "text-emerald-400" },
          { label: "Pendente (sinal pago)", bg: "bg-amber-500/20 border-amber-500/50", text: "text-amber-400" },
          { label: "Em processamento", bg: "bg-sky-500/15 border-sky-500/40", text: "text-sky-400" },
        ].map((item) => (
          <div
            key={item.label}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs ${item.bg} ${item.text}`}
          >
            <span className="w-2 h-2 rounded-full bg-current opacity-80" />
            {item.label}
          </div>
        ))}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-orange-500/40 bg-orange-500/10 text-orange-400 text-xs">
          <Wrench className="w-3 h-3" />
          Montagem Necessária
        </div>
        {isHoje && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 text-xs">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Agora
          </div>
        )}
      </div>

      {/* ── Grade Timeline ──────────────────────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl overflow-hidden">
        {/* Scroll horizontal */}
        <div className="overflow-x-auto">
          <div style={{ minWidth: totalW }}>

            {/* Header: horários */}
            <div
              className="flex border-b border-slate-700/50 bg-slate-800/50"
              style={{ height: 40 }}
            >
              {/* Célula vazia (coluna das quadras) */}
              <div
                className="flex-shrink-0 flex items-center px-4 border-r border-slate-700/50"
                style={{ width: COL_LABEL_W }}
              >
                <CalendarDays className="w-4 h-4 text-slate-500" />
              </div>

              {/* Colunas de hora */}
              {HORARIOS_DISPONIVEIS.map((h) => {
                const minH = horarioParaMinutos(h);
                const eAgora = isHoje && agora >= minH && agora < minH + 60;
                return (
                  <div
                    key={h}
                    className={`flex-shrink-0 flex items-center justify-center border-r border-slate-700/30 text-xs font-mono transition-colors
                      ${eAgora ? "text-red-400 font-bold bg-red-500/5" : "text-slate-500"}`}
                    style={{ width: SLOT_W }}
                  >
                    {h}
                  </div>
                );
              })}
            </div>

            {/* Linhas das quadras */}
            {QUADRAS.map((quadra, qi) => {
              const { blocos, alertas } = dadosPorQuadra(quadra.id);
              return (
                <div
                  key={quadra.id}
                  className={`relative flex border-b last:border-b-0 border-slate-700/30 ${qi % 2 === 1 ? "bg-slate-800/20" : ""}`}
                  style={{ height: ROW_H }}
                >
                  {/* Label da quadra */}
                  <div
                    className="flex-shrink-0 flex flex-col items-start justify-center px-4 border-r border-slate-700/50"
                    style={{ width: COL_LABEL_W }}
                  >
                    <p className="text-xs font-bold text-white leading-tight">Q{quadra.numero}</p>
                    <p className="text-[10px] text-slate-500 leading-tight">Quadra {quadra.numero}</p>
                  </div>

                  {/* Colunas de grade (fundo) */}
                  {HORARIOS_DISPONIVEIS.map((h) => {
                    const minH = horarioParaMinutos(h);
                    const eAgora = isHoje && agora >= minH && agora < minH + 60;
                    return (
                      <div
                        key={h}
                        className={`flex-shrink-0 border-r border-slate-700/20 ${eAgora ? "bg-red-500/5" : ""}`}
                        style={{ width: SLOT_W }}
                      />
                    );
                  })}

                  {/* Linha vermelha de "agora" */}
                  <LinhaHoraAtual dataExibida={dataExibida} agora={agora} />

                  {/* Blocos de reserva */}
                  {blocos.map(({ reserva, colInicio, duracao }) =>
                    colInicio >= 0 && duracao > 0 ? (
                      <BlocoReserva
                        key={reserva.id}
                        reserva={reserva}
                        colInicio={colInicio}
                        duracao={duracao}
                        dataExibida={dataExibida}
                        agora={agora}
                        onClick={handleClickBloco}
                      />
                    ) : null
                  )}

                  {/* Alertas de montagem */}
                  {alertas.map((alerta) => (
                    <IndicadorMontagem
                      key={`${quadra.id}-${alerta.colIndex}`}
                      {...alerta}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Estado vazio ────────────────────────────────────────────────────── */}
      {reservasDoDia.length === 0 && (
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-10 text-center">
          <Clock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">Nenhuma reserva para este dia</p>
          <p className="text-slate-600 text-sm mt-1">
            Os agendamentos feitos no Portal do Cliente aparecerão aqui automaticamente.
          </p>
        </div>
      )}

      {/* ── Nota sobre modal ────────────────────────────────────────────────── */}
      <p className="text-slate-600 text-xs text-center">
        Clique em qualquer bloco para ver os detalhes da reserva (modal na próxima spec).
      </p>
    </div>
  );
}

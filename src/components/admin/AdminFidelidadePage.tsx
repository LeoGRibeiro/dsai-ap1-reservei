/**
 * Painel Administrativo de Gerenciamento do Programa de Fidelidade.
 * Permite ao gestor da arena configurar parâmetros da campanha (horas necessárias,
 * validade em meses, prazo do voucher), acompanhar métricas de retenção (LTV)
 * e inspecionar todos os vouchers e selos emitidos no sistema.
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  Gift,
  Save,
  TrendingUp,
  Ticket,
  CheckCircle2,
  Clock,
  Users,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  Calendar,
  Sparkles,
} from "lucide-react";
import { formatarMoeda, formatarDataExibicao } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFidelidadeService } from "@/hooks/useFidelidadeService";
import {
  fetchTodosVouchersAdminSupabase,
  fetchTodosSelosAdminSupabase,
} from "@/lib/supabase/fidelidadeService";
import type { VoucherFidelidade, SeloFidelidade } from "@/lib/fidelidade/types";

export function AdminFidelidadePage() {
  const { campanha, atualizarCampanha, carregando } = useFidelidadeService();

  // Estados locais para edição das configurações
  const [nomeCampanha, setNomeCampanha] = useState("");
  const [horasNecessarias, setHorasNecessarias] = useState<number>(12);
  const [mesesValidade, setMesesValidade] = useState<number>(3);
  const [diasValidadeVoucher, setDiasValidadeVoucher] = useState<number>(60);
  const [ativo, setAtivo] = useState<boolean>(true);
  const [salvandoConfig, setSalvandoConfig] = useState(false);

  // Estados de listagens globais
  const [todosVouchers, setTodosVouchers] = useState<VoucherFidelidade[]>([]);
  const [todosSelos, setTodosSelos] = useState<SeloFidelidade[]>([]);
  const [carregandoListas, setCarregandoListas] = useState(true);

  // Filtros
  const [buscaVoucher, setBuscaVoucher] = useState("");
  const [filtroStatusVoucher, setFiltroStatusVoucher] = useState<string>("todos");
  const [abaAtual, setAbaAtual] = useState<"configuracao" | "vouchers" | "metricas">("metricas");

  // Inicializa dados do formulário quando campanha carrega
  useEffect(() => {
    if (campanha) {
      setNomeCampanha(campanha.nome);
      setHorasNecessarias(campanha.horasNecessarias);
      setMesesValidade(campanha.mesesValidade);
      setDiasValidadeVoucher(campanha.diasValidadeVoucher);
      setAtivo(campanha.ativo);
    }
  }, [campanha]);

  // Carrega todos os vouchers e selos do sistema
  const carregarDadosGlobais = async () => {
    setCarregandoListas(true);
    try {
      const [vouchersData, selosData] = await Promise.all([
        fetchTodosVouchersAdminSupabase(),
        fetchTodosSelosAdminSupabase(),
      ]);
      setTodosVouchers(vouchersData);
      setTodosSelos(selosData);
    } catch (err) {
      console.error("[AdminFidelidadePage] Erro ao carregar dados administrativos:", err);
      toast.error("Erro ao carregar dados do programa.");
    } finally {
      setCarregandoListas(false);
    }
  };

  useEffect(() => {
    void carregarDadosGlobais();
  }, []);

  // ── Salvar Configurações ──────────────────────────────────────────────────

  const handleSalvarConfig = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nomeCampanha.trim()) {
      toast.error("O nome da campanha é obrigatório.");
      return;
    }

    if (horasNecessarias < 1 || horasNecessarias > 100) {
      toast.error("A meta de horas deve estar entre 1 e 100.");
      return;
    }

    if (mesesValidade < 1 || mesesValidade > 12) {
      toast.error("A validade em meses deve estar entre 1 e 12 meses.");
      return;
    }

    if (diasValidadeVoucher < 5 || diasValidadeVoucher > 365) {
      toast.error("A validade do voucher deve estar entre 5 e 365 dias.");
      return;
    }

    setSalvandoConfig(true);
    try {
      const ok = await atualizarCampanha({
        nome: nomeCampanha.trim(),
        horasNecessarias,
        mesesValidade,
        diasValidadeVoucher,
        ativo,
      });

      if (ok) {
        toast.success("Configurações do programa de fidelidade salvas com sucesso!");
      } else {
        toast.error("Erro ao salvar configurações.");
      }
    } finally {
      setSalvandoConfig(false);
    }
  };

  // ── Métricas Computadas ───────────────────────────────────────────────────

  const metricas = useMemo(() => {
    const totalVouchersEmitidos = todosVouchers.length;
    const vouchersUtilizados = todosVouchers.filter((v) => v.status === "utilizado");
    const vouchersDisponiveis = todosVouchers.filter((v) => v.status === "disponivel");
    const vouchersExpirados = todosVouchers.filter((v) => v.status === "expirado");

    const totalHorasAcumuladas = todosSelos.reduce(
      (acc, s) => acc + (s.horasContabilizadas || 1),
      0
    );

    const valorTotalDescontosConcedidos = vouchersUtilizados.reduce(
      (acc, v) => acc + (Number(v.valorTeto) || 0),
      0
    );

    const taxaResgate =
      totalVouchersEmitidos > 0
        ? Math.round((vouchersUtilizados.length / totalVouchersEmitidos) * 100)
        : 0;

    // Clientes únicos participantes
    const usuariosUnicos = new Set(todosSelos.map((s) => s.usuarioId)).size;

    return {
      totalVouchersEmitidos,
      vouchersUtilizados: vouchersUtilizados.length,
      vouchersDisponiveis: vouchersDisponiveis.length,
      vouchersExpirados: vouchersExpirados.length,
      totalHorasAcumuladas,
      valorTotalDescontosConcedidos,
      taxaResgate,
      usuariosUnicos,
    };
  }, [todosVouchers, todosSelos]);

  // Vouchers filtrados para tabela
  const vouchersFiltrados = useMemo(() => {
    return todosVouchers.filter((v) => {
      const matchBusca =
        !buscaVoucher ||
        v.codigo.toLowerCase().includes(buscaVoucher.toLowerCase()) ||
        v.usuarioId.toLowerCase().includes(buscaVoucher.toLowerCase());

      const matchStatus =
        filtroStatusVoucher === "todos" || v.status === filtroStatusVoucher;

      return matchBusca && matchStatus;
    });
  }, [todosVouchers, buscaVoucher, filtroStatusVoucher]);

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Gift className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Programa de Fidelidade
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Gerencie regras de retenção, ticket médio e vouchers promocionais.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={carregarDadosGlobais}
            disabled={carregandoListas}
            className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${carregandoListas ? "animate-spin" : ""}`} />
            Atualizar Dados
          </Button>
        </div>
      </div>

      {/* ── Cards de Métricas Principais ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Horas Acumuladas</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white">{metricas.totalHorasAcumuladas}h</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {metricas.usuariosUnicos} jogador(es) ativos na cartela
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Vouchers Emitidos</span>
            <Ticket className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-2xl font-black text-white">{metricas.totalVouchersEmitidos}</p>
          <p className="text-[11px] text-teal-400 mt-1">
            {metricas.vouchersDisponiveis} pronto(s) para uso
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Taxa de Resgate</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-white">{metricas.taxaResgate}%</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {metricas.vouchersUtilizados} voucher(s) utilizados
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Descontos Aplicados</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-white">
            {formatarMoeda(metricas.valorTotalDescontosConcedidos)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Recompensa convertida em jogos</p>
        </div>
      </div>

      {/* ── Navegação por Abas ──────────────────────────────────────────────── */}
      <div className="flex border-b border-slate-800 gap-6 text-sm font-semibold">
        <button
          onClick={() => setAbaAtual("metricas")}
          className={`pb-3 transition-colors border-b-2 flex items-center gap-2 ${
            abaAtual === "metricas"
              ? "border-emerald-400 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Visão Geral & Selos
        </button>

        <button
          onClick={() => setAbaAtual("vouchers")}
          className={`pb-3 transition-colors border-b-2 flex items-center gap-2 ${
            abaAtual === "vouchers"
              ? "border-emerald-400 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Ticket className="w-4 h-4" />
          Vouchers Emitidos ({todosVouchers.length})
        </button>

        <button
          onClick={() => setAbaAtual("configuracao")}
          className={`pb-3 transition-colors border-b-2 flex items-center gap-2 ${
            abaAtual === "configuracao"
              ? "border-emerald-400 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Save className="w-4 h-4" />
          Configuração da Campanha
        </button>
      </div>

      {/* ── Conteúdo da Aba: Configuração ───────────────────────────────────── */}
      {abaAtual === "configuracao" && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-3xl">
          <div className="mb-6">
            <h3 className="text-base font-bold text-white">Regras da Campanha de Fidelidade</h3>
            <p className="text-xs text-slate-400 mt-1">
              Defina os parâmetros de horas, prazos de validade e comportamento da premiação.
            </p>
          </div>

          <form onSubmit={handleSalvarConfig} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="nomeCampanha" className="text-xs font-bold text-slate-300">
                Nome da Campanha
              </Label>
              <Input
                id="nomeCampanha"
                value={nomeCampanha}
                onChange={(e) => setNomeCampanha(e.target.value)}
                placeholder="Ex: Fidelidade Campeão"
                className="bg-slate-950 border-slate-800 text-white"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="horasNecessarias" className="text-xs font-bold text-slate-300">
                  Horas Necessárias (Meta)
                </Label>
                <div className="relative">
                  <Input
                    id="horasNecessarias"
                    type="number"
                    min="1"
                    max="100"
                    value={horasNecessarias}
                    onChange={(e) => setHorasNecessarias(Number(e.target.value))}
                    className="bg-slate-950 border-slate-800 text-white pr-8"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-bold">h</span>
                </div>
                <p className="text-[11px] text-slate-500">Padrão alinhado: 12 horas</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mesesValidade" className="text-xs font-bold text-slate-300">
                  Janela da Cartela
                </Label>
                <div className="relative">
                  <Input
                    id="mesesValidade"
                    type="number"
                    min="1"
                    max="12"
                    value={mesesValidade}
                    onChange={(e) => setMesesValidade(Number(e.target.value))}
                    className="bg-slate-950 border-slate-800 text-white pr-14"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-bold">
                    meses
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">Padrão alinhado: 3 meses</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="diasValidadeVoucher" className="text-xs font-bold text-slate-300">
                  Validade do Voucher
                </Label>
                <div className="relative">
                  <Input
                    id="diasValidadeVoucher"
                    type="number"
                    min="5"
                    max="365"
                    value={diasValidadeVoucher}
                    onChange={(e) => setDiasValidadeVoucher(Number(e.target.value))}
                    className="bg-slate-950 border-slate-800 text-white pr-12"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-bold">
                    dias
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">Prazo para utilizar o prêmio</p>
              </div>
            </div>

            {/* Switch Ativo / Inativo */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">Programa de Fidelidade Ativo</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Quando ativo, novas reservas concluídas acumulam selos e geram vouchers
                  automaticamente.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
              </label>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                disabled={salvandoConfig || carregando}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 h-11 rounded-xl gap-2 shadow-lg shadow-emerald-500/20"
              >
                <Save className="w-4 h-4" />
                {salvandoConfig ? "Salvando Alterações..." : "Salvar Configurações"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ── Conteúdo da Aba: Tabela de Vouchers ───────────────────────────────── */}
      {abaAtual === "vouchers" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <Input
                placeholder="Buscar código ou usuário..."
                value={buscaVoucher}
                onChange={(e) => setBuscaVoucher(e.target.value)}
                className="pl-9 bg-slate-900 border-slate-800 text-xs text-white"
              />
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Filter className="w-4 h-4 text-slate-500" />
              <select
                value={filtroStatusVoucher}
                onChange={(e) => setFiltroStatusVoucher(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none"
              >
                <option value="todos">Todos os Status</option>
                <option value="disponivel">Disponível</option>
                <option value="utilizado">Utilizado</option>
                <option value="expirado">Expirado</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Código Voucher</th>
                  <th className="py-3 px-4">Usuário</th>
                  <th className="py-3 px-4">Teto Desconto</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Criado Em</th>
                  <th className="py-3 px-4">Validade</th>
                  <th className="py-3 px-4">Reserva Usada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {vouchersFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Nenhum voucher encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  vouchersFiltrados.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                        {v.codigo}
                      </td>
                      <td className="py-3.5 px-4 text-slate-200">
                        <span className="truncate block max-w-[140px]" title={v.usuarioId}>
                          {v.usuarioId}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">
                        {formatarMoeda(v.valorTeto)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            v.status === "disponivel"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : v.status === "utilizado"
                              ? "bg-slate-800 text-slate-400"
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}
                        >
                          {v.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {formatarDataExibicao(v.criadoEm.split("T")[0])}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {formatarDataExibicao(v.expiraEm)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {v.reservaUtilizadaId ? (
                          <span className="font-mono text-[11px] text-teal-300">
                            #{v.reservaUtilizadaId.substring(0, 8)}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Conteúdo da Aba: Visão Geral e Selos Recentes ───────────────────── */}
      {abaAtual === "metricas" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
            <h3 className="text-base font-bold text-white mb-2">
              Últimos Selos de Horas Registrados
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Cada selo representa horas jogadas em reservas avulsas concluídas e pagas.
            </p>

            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Reserva ID</th>
                    <th className="py-3 px-4">Usuário</th>
                    <th className="py-3 px-4">Horas</th>
                    <th className="py-3 px-4">Valor / Hora</th>
                    <th className="py-3 px-4">Data do Jogo</th>
                    <th className="py-3 px-4">Expiração do Selo</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {todosSelos.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        Nenhum selo registrado ainda. Os selos são gerados automaticamente quando
                        reservas avulsas são concluídas.
                      </td>
                    </tr>
                  ) : (
                    todosSelos.slice(0, 15).map((selo) => (
                      <tr key={selo.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-emerald-400">
                          #{selo.reservaId.substring(0, 8)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 truncate max-w-[120px]">
                          {selo.usuarioId}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-white">
                          {selo.horasContabilizadas}h
                        </td>
                        <td className="py-3.5 px-4">{formatarMoeda(selo.valorPorHora)}</td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {formatarDataExibicao(selo.dataJogo)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {formatarDataExibicao(selo.expiraEm)}
                        </td>
                        <td className="py-3.5 px-4">
                          {selo.resgatado ? (
                            <span className="text-teal-400 font-semibold text-[10px]">
                              Resgatado em Voucher
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-semibold text-[10px]">
                              Ativo na Cartela
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import { CalendarioSelector } from "./CalendarioSelector";
import { QuadraHorarioItem } from "./QuadraHorarioItem";
import { CarrinhoLateral, BotaoCarrinhoMobile } from "./CarrinhoLateral";
import { FormularioIdentificacao, type DadosIdentificacao } from "./FormularioIdentificacao";
import { ModalPix } from "./ModalPix";

import { useReservasService } from "@/hooks/useReservasService";
import {
  gerarDiasDisponiveis,
  getHoje,
  calcularValorTotal,
  calcularValorSinal,
  calcularValorPendente,
  saoConsecutivos,
} from "@/lib/constants";
import { QUADRAS } from "@/lib/quadras";

type Etapa = "formulario" | "pix";

export function PortalCliente() {
  // ── Estado de seleção ──────────────────────────────────────────────────
  const dias = useMemo(() => gerarDiasDisponiveis(), []);
  const [dataSelecionada, setDataSelecionada] = useState<string>(getHoje());
  const [quadraSelecionada, setQuadraSelecionada] = useState<string | null>(null);
  const [horariosSelecionados, setHorariosSelecionados] = useState<string[]>([]);

  // ── Checkout ────────────────────────────────────────────────────────────
  const [etapa, setEtapa] = useState<Etapa | null>(null);
  const [reservaIdAtual, setReservaIdAtual] = useState<string | null>(null);
  const [dadosForm, setDadosForm] = useState<DadosIdentificacao | null>(null);
  const [tipoPagamentoEscolhido, setTipoPagamentoEscolhido] = useState<"sinal" | "integral">("sinal");
  const [isCarrinhoOpen, setIsCarrinhoOpen] = useState(false);

  // ── Service ─────────────────────────────────────────────────────────────
  const {
    getHorariosOcupados,
    criarReservaEmProcessamento,
    atualizarIdentificacao,
    confirmarPagamento,
    liberarLock,
  } = useReservasService();

  // ── Valores calculados ──────────────────────────────────────────────────
  const valorTotal = useMemo(
    () => calcularValorTotal(horariosSelecionados),
    [horariosSelecionados]
  );
  const valorSinal = useMemo(() => calcularValorSinal(valorTotal), [valorTotal]);
  const valorPendente = useMemo(
    () => calcularValorPendente(valorTotal),
    [valorTotal]
  );

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleSelectData = useCallback((data: string) => {
    setDataSelecionada(data);
    setQuadraSelecionada(null);
    setHorariosSelecionados([]);
  }, []);

  /**
   * Chamado por QuadraHorarioItem: alterna um horário na quadra especificada.
   * Se o usuário clicar em uma quadra diferente da atual, altera a seleção para ela.
   * Múltiplos horários na mesma quadra devem ser estritamente consecutivos.
   */
  const handleToggleHorario = useCallback(
    (horario: string, quadraId: string) => {
      // Se clicar em quadra diferente, migra a seleção para a nova quadra
      if (quadraSelecionada !== null && quadraSelecionada !== quadraId) {
        setQuadraSelecionada(quadraId);
        setHorariosSelecionados([horario]);
        const nomeQuadra = QUADRAS.find((q) => q.id === quadraId)?.numero;
        toast.info(`Selecionada Quadra ${nomeQuadra}`);
        return;
      }

      setQuadraSelecionada(quadraId);

      setHorariosSelecionados((prev) => {
        if (prev.includes(horario)) {
          const next = prev.filter((h) => h !== horario);
          if (next.length === 0) setQuadraSelecionada(null);
          return next;
        }
        const next = [...prev, horario];
        if (!saoConsecutivos(next)) return prev;
        return next;
      });
    },
    [quadraSelecionada]
  );

  const handleLimpar = useCallback(() => {
    setHorariosSelecionados([]);
    setQuadraSelecionada(null);
  }, []);

  /** Lock temporário + abertura do formulário */
  const handleContinuar = useCallback(() => {
    if (!quadraSelecionada || horariosSelecionados.length === 0) return;
    const id = criarReservaEmProcessamento({
      quadraId: quadraSelecionada,
      data: dataSelecionada,
      horarios: horariosSelecionados,
    });
    setReservaIdAtual(id);
    setIsCarrinhoOpen(false);
    setEtapa("formulario");
  }, [
    quadraSelecionada,
    horariosSelecionados,
    dataSelecionada,
    criarReservaEmProcessamento,
  ]);

  /** Formulário de dados e escolha de pagamento confirmados → abre modal Pix */
  const handleFormConfirmar = useCallback(
    (dados: DadosIdentificacao, tipoPagamento: "sinal" | "integral") => {
      if (!reservaIdAtual) return;
      setDadosForm(dados);
      setTipoPagamentoEscolhido(tipoPagamento);
      atualizarIdentificacao(reservaIdAtual, {
        nomeCliente: dados.nome,
        whatsappCliente: dados.whatsapp,
        cpfCliente: dados.cpf,
        esporte: dados.esporte || undefined,
        observacoes: dados.observacoes || undefined,
      });
      setEtapa("pix");
    },
    [reservaIdAtual, atualizarIdentificacao]
  );

  /**
   * Simula pagamento Pix — confirmação com o tipo escolhido previamente.
   */
  const handleSimularPagamento = useCallback(
    (tipo: "sinal" | "integral") => {
      if (!reservaIdAtual) return;
      confirmarPagamento(reservaIdAtual, tipo);

      // Reseta estado local
      setEtapa(null);
      setReservaIdAtual(null);
      setDadosForm(null);
      setHorariosSelecionados([]);
      setQuadraSelecionada(null);

      const descricao =
        tipo === "integral"
          ? "Pagamento integral confirmado! ✅"
          : "Sinal confirmado. O restante será pago no local. 👍";

      toast.success("Mensagem enviada no WhatsApp 📱", {
        description: descricao,
        duration: 6000,
      });
    },
    [reservaIdAtual, confirmarPagamento]
  );

  /** Cancela checkout e libera o lock */
  const handleCancelarCheckout = useCallback(() => {
    if (reservaIdAtual) liberarLock(reservaIdAtual);
    setEtapa(null);
    setReservaIdAtual(null);
    setDadosForm(null);
  }, [reservaIdAtual, liberarLock]);

  // ── Render ──────────────────────────────────────────────────────────────

  const carrinhoContent = (
    <CarrinhoLateral
      quadraId={quadraSelecionada}
      data={dataSelecionada}
      horariosSelecionados={horariosSelecionados}
      valorTotal={valorTotal}
      valorSinal={valorSinal}
      valorPendente={valorPendente}
      onContinuar={handleContinuar}
      onLimpar={handleLimpar}
    />
  );

  return (
    <>
      <div className="min-h-screen bg-slate-950">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏟️</span>
              <div>
                <span className="font-black text-white text-lg tracking-tight">
                  Reservei
                </span>
                <span className="hidden sm:inline text-slate-500 text-sm ml-2">
                  · Complexo Esportivo
                </span>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Agendamento online
            </div>
          </div>
        </header>

        {/* ── Layout Principal ─────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 py-6 md:grid md:grid-cols-[1fr_320px] lg:grid-cols-[1fr_360px] md:gap-6 lg:gap-8 md:items-start">
          {/* Coluna esquerda: seleção */}
          <main className="space-y-6 pb-28 md:pb-6">
            {/* Calendário horizontal */}
            <section>
              <CalendarioSelector
                dias={dias}
                dataSelecionada={dataSelecionada}
                onSelectData={handleSelectData}
              />
            </section>

            {/* Título da seção */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Quadras disponíveis
              </p>
              <p className="text-[11px] text-slate-600 mt-1">
                Selecione os horários desejados diretamente na quadra.
              </p>
            </div>

            {/* Quadras sempre expandidas verticalmente */}
            {QUADRAS.map((quadra) => {
              const isAtiva = quadraSelecionada === quadra.id;
              const horariosOcupados = getHorariosOcupados(
                dataSelecionada,
                quadra.id
              );

              return (
                <QuadraHorarioItem
                  key={quadra.id}
                  quadra={quadra}
                  horariosSelecionados={isAtiva ? horariosSelecionados : []}
                  horariosOcupados={horariosOcupados}
                  isAtiva={isAtiva}
                  onToggleHorario={handleToggleHorario}
                />
              );
            })}
          </main>

          {/* Coluna direita: carrinho (desktop / tablet) */}
          <aside className="hidden md:block sticky top-24">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 min-h-[400px] flex flex-col">
              {carrinhoContent}
            </div>
          </aside>
        </div>

        {/* Botão flutuante carrinho (mobile) */}
        <BotaoCarrinhoMobile
          count={horariosSelecionados.length}
          valorSinal={valorSinal}
          onClick={() => setIsCarrinhoOpen(true)}
        />
      </div>

      {/* Sheet mobile do carrinho */}
      <Sheet open={isCarrinhoOpen} onOpenChange={setIsCarrinhoOpen}>
        <SheetContent
          side="bottom"
          className="bg-slate-900 border-t border-slate-700 text-white rounded-t-3xl max-h-[88dvh] flex flex-col p-6 sm:px-8"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Resumo da Reserva</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">{carrinhoContent}</div>
        </SheetContent>
      </Sheet>

      {/* Modal: Formulário de identificação, resumo e escolha de pagamento */}
      <FormularioIdentificacao
        open={etapa === "formulario"}
        quadraId={quadraSelecionada}
        data={dataSelecionada}
        horariosSelecionados={horariosSelecionados}
        valorTotal={valorTotal}
        valorSinal={valorSinal}
        valorPendente={valorPendente}
        onClose={handleCancelarCheckout}
        onConfirmar={handleFormConfirmar}
      />

      {/* Modal: Pix */}
      <ModalPix
        open={etapa === "pix"}
        tipoPagamento={tipoPagamentoEscolhido}
        valorSinal={valorSinal}
        valorTotal={valorTotal}
        nomeCliente={dadosForm?.nome ?? ""}
        onSimularPagamento={handleSimularPagamento}
        onVoltar={() => setEtapa("formulario")}
        onCancelar={handleCancelarCheckout}
      />
    </>
  );
}

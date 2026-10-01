"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  mascaraWhatsApp,
  formatarMoeda,
  formatarDataExibicao,
  PERCENTUAL_SINAL,
  TOLERANCIA_CANCELAMENTO_HORAS,
  ENDERECO_COMPLEXO,
} from "@/lib/constants";
import { ESPORTES, QUADRAS, type Esporte } from "@/lib/quadras";
import {
  User,
  Phone,
  ChevronRight,
  MapPin,
  Calendar,
  Clock,
  Check,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserAuth } from "@/hooks/useUserAuth";

export interface DadosIdentificacao {
  nome: string;
  whatsapp: string;
  esporte: Esporte | "";
  observacoes: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirmar: (dados: DadosIdentificacao, tipoPagamento: "sinal" | "integral") => void;
  quadraId: string | null;
  data: string;
  horariosSelecionados: string[];
  valorTotal: number;
  valorSinal: number;
  valorPendente: number;
}

const initialState: DadosIdentificacao = {
  nome: "",
  whatsapp: "",
  esporte: "",
  observacoes: "",
};

export function FormularioIdentificacao({
  open,
  onClose,
  onConfirmar,
  quadraId,
  data,
  horariosSelecionados,
  valorTotal,
  valorSinal,
  valorPendente,
}: Props) {
  const { user } = useUserAuth();
  const [dados, setDados] = useState<DadosIdentificacao>(initialState);
  const [tipoPagamento, setTipoPagamento] = useState<"sinal" | "integral">("sinal");
  const [errors, setErrors] = useState<Partial<Record<keyof DadosIdentificacao, string>>>({});

  // Preenche dados do usuário automaticamente se estiver logado
  useEffect(() => {
    if (user && open) {
      setDados((prev) => ({
        ...prev,
        nome: prev.nome || user.nome,
        whatsapp: prev.whatsapp || user.telefone,
      }));
    }
  }, [user, open]);

  const quadra = QUADRAS.find((q) => q.id === quadraId);
  const horariosOrdenados = [...(horariosSelecionados ?? [])].sort();
  const primeiroHorario = horariosOrdenados[0] ?? "";
  const ultimoHorario = horariosOrdenados[horariosOrdenados.length - 1];
  const ultimaHora = ultimoHorario
    ? `${String(parseInt(ultimoHorario.split(":")[0], 10) + 1).padStart(2, "0")}:00`
    : "";

  const valorCobradoAgora = tipoPagamento === "sinal" ? valorSinal : valorTotal;

  const set = (campo: keyof DadosIdentificacao, valor: string) => {
    setDados((prev) => ({ ...prev, [campo]: valor }));
    if (errors[campo]) setErrors((prev) => ({ ...prev, [campo]: undefined }));
  };

  const validar = (): boolean => {
    const novosErrors: typeof errors = {};
    if (!user) {
      if (!dados.nome.trim() || dados.nome.trim().length < 3)
        novosErrors.nome = "Informe seu nome completo.";
      if (dados.whatsapp.replace(/\D/g, "").length < 11)
        novosErrors.whatsapp = "WhatsApp inválido. Use DDD + número.";
    }
    setErrors(novosErrors);
    return Object.keys(novosErrors).length === 0;
  };

  const handleSubmit = () => {
    if (user) {
      dados.nome = user.nome;
      dados.whatsapp = user.telefone;
    }
    if (!validar()) return;
    onConfirmar(dados, tipoPagamento);
  };

  const handleClose = () => {
    setDados(initialState);
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white w-[95vw] sm:max-w-3xl md:max-w-4xl max-h-[92vh] overflow-y-auto p-5 md:p-7">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* ── Coluna Esquerda: Formulário de Identificação do Cliente ── */}
          <div className="flex flex-col justify-start space-y-4">
            <DialogHeader className="text-left">
              <DialogTitle className="text-xl md:text-2xl font-black">
                Confirmar Reserva
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                {user
                  ? "Revise os detalhes, escolha o esporte e a modalidade de pagamento."
                  : "Preencha seus dados de contato, revise o resumo da compra e escolha como deseja pagar."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5">
              {user ? (
                /* Card do Usuário Logado (direto, sem pedir nome e telefone) */
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-sm shadow-inner">
                      {user.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-emerald-400 font-medium">Conta Conectada</span>
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                      </div>
                      <p className="text-sm font-bold text-white leading-tight mt-0.5">{user.nome}</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                    {user.telefone}
                  </span>
                </div>
              ) : (
                /* Visitante: solicita apenas Nome e WhatsApp */
                <>
                  {/* Nome */}
                  <div className="space-y-1.5">
                    <Label className="text-slate-300 text-xs font-semibold flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-emerald-400" /> Nome completo *
                    </Label>
                    <Input
                      value={dados.nome}
                      onChange={(e) => set("nome", e.target.value)}
                      placeholder="Seu nome completo"
                      className="bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20 h-10"
                    />
                    {errors.nome && (
                      <p className="text-xs text-red-400 font-medium">{errors.nome}</p>
                    )}
                  </div>

                  {/* WhatsApp */}
                  <div className="space-y-1.5">
                    <Label className="text-slate-300 text-xs font-semibold flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp *
                    </Label>
                    <Input
                      value={dados.whatsapp}
                      onChange={(e) => set("whatsapp", mascaraWhatsApp(e.target.value))}
                      placeholder="(11) 99999-0000"
                      inputMode="numeric"
                      className="bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20 h-10"
                    />
                    {errors.whatsapp && (
                      <p className="text-xs text-red-400 font-medium">{errors.whatsapp}</p>
                    )}
                  </div>
                </>
              )}

              {/* Esporte (opcional) */}
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs font-semibold">
                  Esporte <span className="text-slate-500 font-normal">(opcional)</span>
                </Label>
                <select
                  value={dados.esporte}
                  onChange={(e) => set("esporte", e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-slate-800/80 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                >
                  <option value="">Não informar</option>
                  {ESPORTES.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
                {dados.esporte && (
                  <p className="text-[11px] text-emerald-400">
                    ✓ Prepararemos a quadra para {dados.esporte}.
                  </p>
                )}
              </div>

              {/* Observações */}
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs font-semibold">
                  Observações <span className="text-slate-500 font-normal">(opcional)</span>
                </Label>
                <Input
                  value={dados.observacoes}
                  onChange={(e) => set("observacoes", e.target.value)}
                  placeholder="Observações adicionais (opcional)"
                  className="bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 h-10"
                />
              </div>

              {/* Termos e Aviso WhatsApp */}
              <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/50 space-y-2">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  <strong className="text-slate-300">Política de cancelamento:</strong>{" "}
                  Cancelamentos com mais de{" "}
                  <strong className="text-white">
                    {TOLERANCIA_CANCELAMENTO_HORAS}h de antecedência
                  </strong>{" "}
                  são reembolsados integralmente.
                </p>
                <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                  A confirmação da sua reserva será enviada pelo WhatsApp.
                </p>
              </div>
            </div>
          </div>

          {/* ── Coluna Direita: Resumo da Compra, Escolha de Pagamento e Botão ── */}
          <div className="space-y-5 bg-slate-950/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Resumo da Reserva
                </span>
                {quadra && (
                  <span className="text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                    Quadra {quadra.numero}
                  </span>
                )}
              </div>

              {/* Informações detalhadas */}
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Local</p>
                    <p className="text-slate-200 font-medium">{ENDERECO_COMPLEXO}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Data</p>
                    <p className="text-slate-200 font-medium capitalize">
                      {data ? formatarDataExibicao(data, { weekday: "long", day: "numeric", month: "long" }) : "—"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-slate-500">Horário</p>
                    <p className="text-slate-200 font-medium">
                      {primeiroHorario} – {ultimaHora}
                      <span className="text-slate-500 ml-1.5">
                        ({horariosSelecionados.length} hora{horariosSelecionados.length > 1 ? "s" : ""})
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {horariosOrdenados.map((h) => (
                        <span
                          key={h}
                          className="text-[11px] bg-slate-800 text-emerald-400 border border-slate-700 px-2 py-0.5 rounded-md font-medium"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="bg-slate-800 my-4" />

              {/* ── Opção de Pagamento Prévia ── */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                  Como deseja pagar agora?
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Opção Sinal */}
                  <button
                    type="button"
                    onClick={() => setTipoPagamento("sinal")}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all duration-200 relative",
                      tipoPagamento === "sinal"
                        ? "bg-emerald-500/15 border-emerald-500 text-white shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500/50"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-200">
                        Sinal ({Math.round(PERCENTUAL_SINAL * 100)}%)
                      </span>
                      {tipoPagamento === "sinal" && (
                        <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <p className="text-lg font-black text-emerald-400">
                      {formatarMoeda(valorSinal)}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Restante de {formatarMoeda(valorPendente)} no local
                    </p>
                  </button>

                  {/* Opção Integral */}
                  <button
                    type="button"
                    onClick={() => setTipoPagamento("integral")}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all duration-200 relative",
                      tipoPagamento === "integral"
                        ? "bg-emerald-500/15 border-emerald-500 text-white shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500/50"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-200">
                        Integral (100%)
                      </span>
                      {tipoPagamento === "integral" && (
                        <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <p className="text-lg font-black text-emerald-400">
                      {formatarMoeda(valorTotal)}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Pagamento completo sem pendências
                    </p>
                  </button>
                </div>
              </div>
            </div>

            {/* Total Cobrado Agora e Botão de Ir para Pagamento */}
            <div className="space-y-3 mt-4">
              <div className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Total a pagar agora via Pix</p>
                  <p className="text-2xl font-black text-emerald-400">
                    {formatarMoeda(valorCobradoAgora)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">
                    {tipoPagamento === "sinal" ? "Sinal (40%)" : "Integral (100%)"}
                  </span>
                </div>
              </div>

              {/* Botão de Ir para Pagamento posicionado logo abaixo do resumo e valor */}
              <Button
                onClick={handleSubmit}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold h-12 rounded-xl gap-2 text-sm shadow-lg shadow-emerald-500/20"
              >
                Ir para pagamento Pix <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

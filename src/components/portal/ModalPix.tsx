"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatarMoeda } from "@/lib/constants";
import { CheckCircle2, X, ArrowLeft } from "lucide-react";

// ── Fake QR Code SVG ──────────────────────────────────────────────────────────

const QR_ROWS = [
  "1111111011101111111",
  "1000001001001000001",
  "1011101010101011101",
  "1011101001011011101",
  "1011101010101011101",
  "1000001001001000001",
  "1111111010101111111",
  "0000000001100000000",
  "1101011111001011011",
  "0010100101010100100",
  "1001011010101011001",
  "0100000001010010010",
  "1101011011011011011",
  "0000000001110001001",
  "1111111010101110111",
  "1000001001011001001",
  "1011101011001010111",
  "1000001001010100001",
  "1111111010101111111",
];

function FakeQrCode() {
  const size = 19;
  const cellSize = 10;
  const total = size * cellSize;

  return (
    <svg
      width={total}
      height={total}
      viewBox={`0 0 ${total} ${total}`}
      className="rounded-lg"
      style={{ imageRendering: "pixelated" }}
    >
      <rect width={total} height={total} fill="white" />
      {QR_ROWS.map((row, y) =>
        row.split("").map((cell, x) =>
          cell === "1" ? (
            <rect
              key={`${x}-${y}`}
              x={x * cellSize}
              y={y * cellSize}
              width={cellSize}
              height={cellSize}
              fill="#0f172a"
            />
          ) : null
        )
      )}
    </svg>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  tipoPagamento: "sinal" | "integral";
  valorSinal: number;
  valorTotal: number;
  nomeCliente: string;
  onSimularPagamento: (tipo: "sinal" | "integral") => void;
  onVoltar: () => void;
  onCancelar: () => void;
}

export function ModalPix({
  open,
  tipoPagamento,
  valorSinal,
  valorTotal,
  nomeCliente,
  onSimularPagamento,
  onVoltar,
  onCancelar,
}: Props) {
  const valorCobrado = tipoPagamento === "sinal" ? valorSinal : valorTotal;
  const valorRestante = valorTotal - valorSinal;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancelar()}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-sm mx-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <button
              onClick={onVoltar}
              className="text-slate-400 hover:text-white transition-colors p-1 -ml-1 rounded-lg hover:bg-slate-800"
              title="Voltar para dados e revisão"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <DialogTitle className="text-xl font-bold text-center flex-1 pr-4">
              Pagamento via Pix
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 pt-1">
          {/* Badge de tipo de pagamento */}
          <div className="text-center">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              {tipoPagamento === "sinal" ? "Pagamento do Sinal (40%)" : "Pagamento Integral (100%)"}
            </span>

            {/* Valor em destaque */}
            <p className="text-4xl font-black text-white mt-2">
              {formatarMoeda(valorCobrado)}
            </p>

            {tipoPagamento === "sinal" ? (
              <p className="text-xs text-slate-400 mt-1">
                Restante de <strong className="text-slate-300">{formatarMoeda(valorRestante)}</strong> no dia do jogo
              </p>
            ) : (
              <p className="text-xs text-emerald-400 font-medium mt-1">
                ✓ Valor total quitado sem pendências
              </p>
            )}
          </div>

          {/* QR Code */}
          <div className="p-3 bg-white rounded-2xl shadow-lg shadow-black/30">
            <FakeQrCode />
          </div>

          <div className="text-center space-y-1">
            <p className="text-xs text-slate-400">
              Chave Pix: <span className="text-white font-mono font-semibold">reservei@complexo.com</span>
            </p>
            <p className="text-[11px] text-slate-500">
              Após o pagamento, a confirmação será enviada via WhatsApp.
            </p>
          </div>

          <Separator className="bg-slate-700/50 w-full" />

          {/* Identificação */}
          <div className="w-full bg-slate-800/50 rounded-xl p-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-xs">Titular</span>
              <span className="text-slate-200 font-semibold text-sm">{nomeCliente || "—"}</span>
            </div>
          </div>

          {/* Aviso ambiente de dev */}
          <div className="w-full bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5">
            <p className="text-[11px] text-amber-400 text-center leading-relaxed">
              🛠️ <strong>Ambiente de demonstração.</strong> Clique abaixo para simular a aprovação instantânea.
            </p>
          </div>

          {/* Ações */}
          <div className="w-full space-y-2">
            <Button
              onClick={() => onSimularPagamento(tipoPagamento)}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold h-12 rounded-xl gap-2 shadow-lg shadow-emerald-500/20 text-sm"
            >
              <CheckCircle2 className="w-5 h-5" />
              Simular Pagamento Aprovado
            </Button>
            <Button
              variant="ghost"
              onClick={onCancelar}
              className="w-full text-slate-500 hover:text-red-400 hover:bg-red-500/10 h-9 gap-1.5 text-xs"
            >
              <X className="w-3.5 h-3.5" />
              Cancelar reserva
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

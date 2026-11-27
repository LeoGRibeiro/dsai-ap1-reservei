/**
 * Estrelas de avaliação: exibição da nota e seletor de 1 a 5.
 * Spec: SPEC/2026-11-27-avaliacoes-de-clientes.md
 */

"use client";

import { Star } from "lucide-react";

const NOTAS = [1, 2, 3, 4, 5] as const;

export function Estrelas({ nota, className = "h-4 w-4" }: { nota: number; className?: string }) {
  return (
    <span role="img" aria-label={`Nota ${nota} de 5`} className="inline-flex gap-0.5">
      {NOTAS.map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          className={`${className} ${n <= Math.round(nota) ? "fill-amber-400 text-amber-400" : "text-slate-600"}`}
        />
      ))}
    </span>
  );
}

export function SeletorEstrelas({ valor, onChange }: { valor: number; onChange: (nota: number) => void }) {
  return (
    <div role="radiogroup" aria-label="Sua nota" className="flex gap-1">
      {NOTAS.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={valor === n}
          aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"}`}
          onClick={() => onChange(n)}
          className="rounded p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <Star className={`h-7 w-7 ${n <= valor ? "fill-amber-400 text-amber-400" : "text-slate-600"}`} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

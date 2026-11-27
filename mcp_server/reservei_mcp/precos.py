"""
Regras de preço e sinal do Reservei, espelhando ``src/lib/constants.ts``.

Spec: SPEC/2026-11-27-precos-fonte-unica.md

A fixture ``tests/fixtures/regras-preco.json`` é a fonte de verdade: os testes
TypeScript e Python conferem as duas implementações contra ela. Com o Supabase
configurado, quem grava o valor da reserva é a função ``criar_reserva_agente`` do
banco; estas funções servem para mostrar o valor ao usuário.
"""

import math
import re
from typing import Iterable

PERCENTUAL_SINAL = 0.4

PRECO_MANHA = 70  # blocos das 08:00 às 11:00
PRECO_TARDE = 90  # blocos das 12:00 às 17:00
PRECO_NOITE = 110  # blocos das 18:00 às 21:00


def _arredondar_centavos(valor: float) -> float:
    """Arredonda como ``Math.round(valor * 100) / 100`` do JS (meio centavo para cima)."""
    return math.floor(valor * 100 + 0.5) / 100


def calcular_valor_hora(horario: str) -> int:
    """
    Valor (R$) do bloco de 1 hora que começa em ``horario``.

    Raises:
        ValueError: horário fora do formato ``HH:00`` ou fora de 08:00 a 21:00,
            como o erro ``horario_invalido`` do banco.
    """
    hora = int(horario[:2]) if re.fullmatch(r"\d{2}:00", horario or "") else -1
    if 8 <= hora < 12:
        return PRECO_MANHA
    if 12 <= hora < 18:
        return PRECO_TARDE
    if 18 <= hora < 22:
        return PRECO_NOITE
    raise ValueError(f"Horário fora da grade de funcionamento: {horario!r}")


def calcular_valor_total(horarios: Iterable[str]) -> int:
    """Soma o valor de cada bloco de horário."""
    return sum(calcular_valor_hora(h) for h in horarios)


def calcular_sinal(valor_total: float) -> float:
    """Sinal de 40% do total, em centavos."""
    return _arredondar_centavos(valor_total * PERCENTUAL_SINAL)


def calcular_pendente(valor_total: float) -> float:
    """Valor a pagar no local (60% do total), em centavos."""
    return _arredondar_centavos(valor_total * (1 - PERCENTUAL_SINAL))

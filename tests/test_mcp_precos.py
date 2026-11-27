"""
Regras de preço do MCP conferidas contra a fixture compartilhada com o site.

Spec: SPEC/2026-11-27-precos-fonte-unica.md
Rodar a partir da raiz do repositório: python -m pytest tests/test_mcp_precos.py
"""

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "mcp_server"))

from reservei_mcp.precos import (  # noqa: E402
    PERCENTUAL_SINAL,
    calcular_pendente,
    calcular_sinal,
    calcular_valor_hora,
    calcular_valor_total,
)

REGRAS = json.loads(
    (Path(__file__).resolve().parent / "fixtures" / "regras-preco.json").read_text(encoding="utf-8")
)


def test_usa_o_mesmo_percentual_de_sinal_da_fixture():
    assert PERCENTUAL_SINAL == REGRAS["percentualSinal"]


@pytest.mark.parametrize("caso", REGRAS["valorHora"], ids=lambda c: c["horario"])
def test_valor_da_hora(caso):
    assert calcular_valor_hora(caso["horario"]) == caso["valor"]


@pytest.mark.parametrize("horario", REGRAS["horariosInvalidos"])
def test_recusa_horario_fora_da_grade(horario):
    with pytest.raises(ValueError):
        calcular_valor_hora(horario)


def test_recusa_a_reserva_inteira_quando_um_horario_e_invalido():
    with pytest.raises(ValueError):
        calcular_valor_total(["20:00", "21:00", "22:00"])


@pytest.mark.parametrize("caso", REGRAS["reservas"], ids=lambda c: c["descricao"])
def test_total_sinal_e_pendente(caso):
    total = calcular_valor_total(caso["horarios"])
    assert total == caso["valorTotal"]
    assert calcular_sinal(total) == caso["valorSinal"]
    assert calcular_pendente(total) == caso["valorPendente"]


@pytest.mark.parametrize("caso", REGRAS["arredondamento"], ids=lambda c: str(c["valorTotal"]))
def test_arredondamento_de_centavos(caso):
    assert calcular_sinal(caso["valorTotal"]) == caso["valorSinal"]
    assert calcular_pendente(caso["valorTotal"]) == caso["valorPendente"]

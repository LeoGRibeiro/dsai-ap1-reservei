"""
Criação e consulta de reservas pelo MCP depois da RLS: RPC criar_reserva_agente,
visão reservas_publicas e preço igual ao do site.

Spec: SPEC/2026-11-27-precos-fonte-unica.md
Rodar a partir da raiz do repositório: python -m pytest tests/test_mcp_reservas.py
"""

import sys
from contextlib import contextmanager
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "mcp_server"))

from reservei_mcp import server  # noqa: E402

URL = "https://abc.supabase.co"
DATA = "2099-01-01"


@contextmanager
def supabase_configurado(get=None, post=None):
    """Simula o Supabase configurado, com respostas controladas de GET e POST."""
    get = get or MagicMock(return_value=MagicMock(status_code=200, json=lambda: []))
    post = post or MagicMock()
    with patch.object(server, "SUPABASE_URL", URL), patch.object(
        server, "SUPABASE_KEY", "sb_publishable_xyz"
    ), patch.object(server.requests, "get", get), patch.object(server.requests, "post", post):
        yield get, post


def resposta(status, corpo):
    r = MagicMock(status_code=status, text=str(corpo))
    r.json.return_value = corpo
    return r


def criar_19h():
    return server.criar_reserva("q2", DATA, "19:00", "Maria Silva", "(91) 98888-7777", "vôlei")


def test_criar_reserva_chama_a_rpc_do_banco_com_os_parametros():
    post = MagicMock(return_value=resposta(200, "rsv_mcp_abc123"))
    with supabase_configurado(post=post):
        saida = criar_19h()

    url, kwargs = post.call_args.args[0], post.call_args.kwargs
    assert url == f"{URL}/rest/v1/rpc/criar_reserva_agente"
    assert kwargs["json"] == {
        "p_quadra_id": "q2",
        "p_data": DATA,
        "p_horarios": ["19:00"],
        "p_nome": "Maria Silva",
        "p_whatsapp": "91988887777",
        "p_esporte": "Vôlei",
    }
    assert "rsv_mcp_abc123" in saida


def test_mensagem_de_sucesso_mostra_preco_do_site_e_status_pendente():
    with supabase_configurado(post=MagicMock(return_value=resposta(200, "rsv_mcp_abc123"))):
        saida = criar_19h()

    assert "R$ 110.00" in saida
    assert "R$ 44.00" in saida
    assert "PENDENTE" in saida
    assert "CONFIRMADA" not in saida


@pytest.mark.parametrize(
    "codigo, trecho",
    [
        ("horario_ocupado", "já está reservado"),
        ("horarios_nao_consecutivos", "consecutivos"),
        ("horario_invalido", "fora da grade"),
        ("usuario_bloqueado", "bloqueado"),
        ("dados_invalidos", "Dados inválidos"),
    ],
)
def test_erros_do_banco_viram_mensagens_claras(codigo, trecho):
    erro = resposta(400, {"code": "P0001", "message": codigo})
    with supabase_configurado(post=MagicMock(return_value=erro)):
        saida = criar_19h()

    assert trecho in saida
    assert "NÃO foi criada" in saida
    assert codigo not in saida


def test_erro_sem_json_vira_mensagem_generica():
    erro = MagicMock(status_code=502, text="<html>Bad Gateway</html>")
    erro.json.side_effect = ValueError("não é JSON")
    with supabase_configurado(post=MagicMock(return_value=erro)):
        saida = criar_19h()

    assert "falha inesperada" in saida


def test_falha_de_rede_vira_mensagem_generica():
    with supabase_configurado(post=MagicMock(side_effect=server.requests.ConnectionError("sem rede"))):
        saida = criar_19h()

    assert "falha inesperada" in saida


def test_sem_supabase_grava_em_memoria_como_pendente_com_preco_do_site():
    with patch.object(server, "SUPABASE_URL", ""), patch.object(server, "SUPABASE_KEY", ""):
        saida = server.criar_reserva("q3", "2099-02-02", "09:00", "João", "91988887777")

    reserva = next(r for r in server._LOCAL_FALLBACK_RESERVAS if r["data"] == "2099-02-02")
    server._LOCAL_FALLBACK_RESERVAS.remove(reserva)
    assert reserva["status"] == "pendente"
    assert (reserva["valor_total"], reserva["valor_sinal"], reserva["valor_pendente"]) == (70, 28, 42)
    assert "PENDENTE" in saida


def test_disponibilidade_le_a_visao_publica():
    with supabase_configurado() as (get, _):
        server.consultar_disponibilidade(DATA, "q1")

    assert get.call_args.args[0].startswith(f"{URL}/rest/v1/reservas_publicas?")


def test_disponibilidade_mostra_as_faixas_de_preco():
    with supabase_configurado():
        saida = server.consultar_disponibilidade(DATA, "q1")

    assert "R$ 70" in saida and "R$ 90" in saida and "R$ 110" in saida


def test_provisoria_vencida_nao_ocupa_o_horario():
    reservas = [
        {"quadra_id": "q1", "horarios": ["10:00"], "status": "em_processamento",
         "expira_em": "2000-01-01T00:00:00+00:00"},
        {"quadra_id": "q1", "horarios": ["11:00"], "status": "em_processamento",
         "expira_em": "2999-01-01T00:00:00+00:00"},
        {"quadra_id": "q1", "horarios": ["12:00"], "status": "pendente", "expira_em": None},
    ]
    get = MagicMock(return_value=resposta(200, reservas))
    with supabase_configurado(get=get):
        saida = server.consultar_disponibilidade(DATA, "q1")

    livres = next(linha for linha in saida.splitlines() if "Horários Livres" in linha)
    assert "10:00" in livres
    assert "11:00" not in livres
    assert "12:00" not in livres


def test_buscar_reservas_por_telefone_orienta_a_usar_o_site_sem_consultar_o_banco():
    with supabase_configurado() as (get, post):
        saida = server.buscar_reservas_cliente("(91) 98888-7777")

    assert "Minha Conta" in saida
    get.assert_not_called()
    post.assert_not_called()

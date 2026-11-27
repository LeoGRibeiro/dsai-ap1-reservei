"""
Testes da configuração de credenciais do servidor MCP.

Spec: SPEC/2026-11-17-fundacao-qualidade.md
Rodar a partir da raiz do repositório: python -m pytest tests/test_mcp_config.py
"""

import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "mcp_server"))

from reservei_mcp import server  # noqa: E402
from reservei_mcp.server import resolver_credenciais, montar_headers_supabase  # noqa: E402


def test_sem_variaveis_nao_ha_url_nem_chave_embutidas():
    assert resolver_credenciais({}) == ("", "")


def test_codigo_nao_contem_chave_ou_projeto_antigo():
    fonte = (Path(server.__file__)).read_text(encoding="utf-8")
    assert "eyJhbGciOi" not in fonte
    assert "wjtckujicvryvifbamug" not in fonte


def test_aceita_nomes_do_app_next_e_remove_barra_final():
    url, chave = resolver_credenciais(
        {
            "NEXT_PUBLIC_SUPABASE_URL": "https://abc.supabase.co/",
            "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY": "sb_publishable_xyz",
        }
    )
    assert url == "https://abc.supabase.co"
    assert chave == "sb_publishable_xyz"


def test_prioriza_publishable_key_sobre_anon_key():
    _, chave = resolver_credenciais(
        {
            "SUPABASE_URL": "https://abc.supabase.co",
            "NEXT_PUBLIC_SUPABASE_ANON_KEY": "eyJ.anon",
            "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY": "sb_publishable_xyz",
        }
    )
    assert chave == "sb_publishable_xyz"


def test_aceita_nomes_curtos():
    assert resolver_credenciais(
        {"SUPABASE_URL": "https://abc.supabase.co", "SUPABASE_ANON_KEY": "eyJ.anon"}
    ) == ("https://abc.supabase.co", "eyJ.anon")


def test_publishable_key_nao_vai_no_authorization():
    headers = montar_headers_supabase("sb_publishable_xyz")
    assert headers["apikey"] == "sb_publishable_xyz"
    assert "Authorization" not in headers


def test_anon_key_jwt_vai_como_bearer():
    headers = montar_headers_supabase("eyJ.anon")
    assert headers["Authorization"] == "Bearer eyJ.anon"


def test_falha_ao_gravar_no_supabase_retorna_false_e_nao_guarda_localmente():
    reserva = {"id": "res_teste", "data": "2099-01-01", "quadra_id": "q1", "horarios": ["18:00"]}
    resposta = MagicMock(status_code=500, text="erro")
    with patch.object(server, "SUPABASE_URL", "https://abc.supabase.co"), patch.object(
        server, "SUPABASE_KEY", "sb_publishable_xyz"
    ), patch.object(server.requests, "post", return_value=resposta):
        assert server.salvar_reserva_supabase(reserva) is False
    assert reserva not in server._LOCAL_FALLBACK_RESERVAS


def test_sem_supabase_configurado_grava_em_memoria():
    reserva = {"id": "res_memoria", "data": "2099-01-02", "quadra_id": "q2", "horarios": ["19:00"]}
    with patch.object(server, "SUPABASE_URL", ""), patch.object(server, "SUPABASE_KEY", ""):
        assert server.salvar_reserva_supabase(reserva) is True
    assert reserva in server._LOCAL_FALLBACK_RESERVAS
    server._LOCAL_FALLBACK_RESERVAS.remove(reserva)

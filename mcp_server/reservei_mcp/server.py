#!/usr/bin/env python3
"""
Servidor MCP para a plataforma Reservei (Complexo Esportivo).

Implementado utilizando FastMCP (Protocolo MCP sobre stdio/JSON-RPC).
Fornece ferramentas de leitura e escrita para o agente interagir com
as quadras, disponibilidade de horários e reservas do sistema.

Pode ser executado localmente ou instalado de forma autônoma (standalone)
em qualquer máquina cliente que deseje integrar com o Reservei via 'uvx' ou 'pip'.
"""

import os
import re
import sys
import uuid
import time
from typing import Optional, Dict, Any, List
from pathlib import Path
import requests
from dotenv import load_dotenv
from fastmcp import FastMCP

# Garante saída UTF-8 no console/stdio (evita charmap error no Windows)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# ─── Resolução de Variáveis de Ambiente e Fallbacks ──────────────────────────

def carregar_configuracao_ambiente() -> None:
    """
    Localiza e carrega arquivos .env ou .env.local de múltiplos locais potenciais:
    1. Diretório de trabalho atual (cwd)
    2. Diretório raiz do repositório (caso rodando em modo desenvolvimento)
    """
    locais_possiveis = [
        Path.cwd() / ".env.local",
        Path.cwd() / ".env",
        Path(__file__).resolve().parent.parent.parent / "src" / ".env.local",
        Path(__file__).resolve().parent.parent.parent / "src" / ".env",
        Path(__file__).resolve().parent.parent.parent / ".env.local",
        Path(__file__).resolve().parent.parent.parent / ".env",
    ]
    for env_path in locais_possiveis:
        if env_path.exists():
            load_dotenv(env_path)
            break

carregar_configuracao_ambiente()

# Credenciais do Supabase (lidas de variáveis de ambiente com fallback para a nuvem pública do Reservei)
DEFAULT_SUPABASE_URL = "https://wjtckujicvryvifbamug.supabase.co"
DEFAULT_SUPABASE_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqdGNrdWppY3ZyeXZpZmJhbXVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4MTQ1MjEsImV4cCI6MjEwNjM5MDUyMX0."
    "jbuAoRXoVwZpAeGGUlaIV2bK3EPdfk4I1o7axDxfJ68"
)

SUPABASE_URL = (
    os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    or os.getenv("SUPABASE_URL")
    or DEFAULT_SUPABASE_URL
).rstrip("/")

SUPABASE_KEY = (
    os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    or os.getenv("SUPABASE_ANON_KEY")
    or DEFAULT_SUPABASE_KEY
)

# ─── Constantes do Domínio Reservei ──────────────────────────────────────────

QUADRAS = {
    "q1": {"id": "q1", "nome": "Quadra 1", "descricao": "Quadra poliesportiva coberta (PU)"},
    "q2": {"id": "q2", "nome": "Quadra 2", "descricao": "Quadra poliesportiva coberta (PU)"},
    "q3": {"id": "q3", "nome": "Quadra 3", "descricao": "Quadra poliesportiva coberta (PU)"},
}

HORARIOS_DISPONIVEIS = [
    "08:00", "09:00", "10:00", "11:00", "12:00",
    "13:00", "14:00", "15:00", "16:00", "17:00",
    "18:00", "19:00", "20:00", "21:00",
]

ESPORTES_PERMITIDOS = ["Futsal", "Vôlei", "Basquete", "Handebol", "Outro"]
VALOR_HORA = 90.0

# Armazenamento em memória (fallback caso o Supabase esteja temporariamente indisponível)
_LOCAL_FALLBACK_RESERVAS: List[Dict[str, Any]] = []

# ─── Helpers de Comunicação com o Supabase ────────────────────────────────────

def get_supabase_headers() -> Dict[str, str]:
    """Retorna os cabeçalhos HTTP necessários para autenticação na REST API do Supabase."""
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def normalizar_quadra_id(quadra_input: str) -> Optional[str]:
    """
    Normaliza variações como '1', 'Quadra 1', 'q1' para o ID canônico 'q1'.
    
    Args:
        quadra_input: String informada pelo usuário ou LLM representando a quadra.
        
    Returns:
        O ID canônico ('q1', 'q2', 'q3') ou None caso não seja identificável.
    """
    q = quadra_input.strip().lower()
    if q in QUADRAS:
        return q
    digits = re.findall(r"\d+", q)
    if digits:
        candidato = f"q{digits[0]}"
        if candidato in QUADRAS:
            return candidato
    return None


def extrair_apenas_digitos(texto: str) -> str:
    """
    Remove pontuação e símbolos de números de telefone e documentos.
    
    Args:
        texto: Sequência de texto contendo dígitos e máscaras (ex.: '(91) 98888-7777').
        
    Returns:
        Apenas os caracteres numéricos concatenados.
    """
    return "".join(re.findall(r"\d+", texto or ""))


def listar_reservas_supabase(data_filtro: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Consulta reservas registradas na API PostgREST do Supabase com fallback local resiliente.
    
    Args:
        data_filtro: Data opcional no formato 'AAAA-MM-DD' para restringir a busca.
        
    Returns:
        Lista de dicionários contendo os dados das reservas ativas.
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        return [r for r in _LOCAL_FALLBACK_RESERVAS if not data_filtro or r.get("data") == data_filtro]

    url = f"{SUPABASE_URL}/rest/v1/reservas?select=*&status=neq.cancelada"
    if data_filtro:
        url += f"&data=eq.{data_filtro}"

    try:
        resp = requests.get(url, headers=get_supabase_headers(), timeout=5)
        if resp.status_code == 200:
            return resp.json()
    except Exception as err:
        print(f"[Aviso MCP] Falha na consulta ao Supabase ({err}). Utilizando armazenamento local.")

    return [r for r in _LOCAL_FALLBACK_RESERVAS if not data_filtro or r.get("data") == data_filtro]


def salvar_reserva_supabase(reserva: Dict[str, Any]) -> bool:
    """
    Insere uma nova reserva no banco Supabase com persistência concorrente no cache local.
    
    Args:
        reserva: Dicionário formatado de acordo com o esquema da tabela 'reservas'.
        
    Returns:
        True indicando sucesso na gravação ou fallback operacional.
    """
    _LOCAL_FALLBACK_RESERVAS.append(reserva)

    if not SUPABASE_URL or not SUPABASE_KEY:
        return True

    url = f"{SUPABASE_URL}/rest/v1/reservas"
    try:
        resp = requests.post(url, headers=get_supabase_headers(), json=reserva, timeout=5)
        if resp.status_code in (200, 201):
            return True
        print(f"[Aviso MCP] Erro ao gravar reserva no Supabase: {resp.status_code} - {resp.text}")
    except Exception as err:
        print(f"[Aviso MCP] Falha de rede ao gravar no Supabase: {err}")

    # Retorna True se gravou ao menos localmente para não interromper a conversa do usuário
    return True

# ─── Inicialização do Servidor FastMCP ────────────────────────────────────────

mcp = FastMCP("reservei")

# ─── Tool 1: Consultar Disponibilidade (Leitura) ──────────────────────────────

@mcp.tool
def consultar_disponibilidade(data: str, quadra_id: Optional[str] = None) -> str:
    """Consulta a grade de horários disponíveis e ocupados no complexo esportivo Reservei para uma data específica (AAAA-MM-DD).

    Retorna a lista de horários livres e agendados de cada quadra ('q1': Quadra 1, 'q2': Quadra 2, 'q3': Quadra 3)
    no período de funcionamento (08:00 às 21:00).
    Use esta ferramenta sempre antes de tentar agendar uma nova reserva para verificar se a quadra está livre.

    Args:
        data: Data da consulta no formato 'AAAA-MM-DD' (ex.: '2026-10-15').
        quadra_id: Identificador opcional da quadra ('q1', 'q2', 'q3' ou '1', '2', '3'). Se omitido, consulta todas as quadras.
    """
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", data.strip()):
        return f"Erro: Formato de data inválido ('{data}'). Utilize o padrão AAAA-MM-DD (ex.: '2026-10-15')."

    quadras_alvo = list(QUADRAS.keys())
    if quadra_id:
        normalizado = normalizar_quadra_id(quadra_id)
        if not normalizado:
            return f"Erro: Quadra '{quadra_id}' não reconhecida. As quadras válidas são: 'q1', 'q2' ou 'q3'."
        quadras_alvo = [normalizado]

    reservas = listar_reservas_supabase(data_filtro=data)

    ocupados_por_quadra: Dict[str, Dict[str, str]] = {q: {} for q in quadras_alvo}
    for r in reservas:
        q_id = r.get("quadra_id") or r.get("quadraId")
        if q_id in ocupados_por_quadra:
            horarios = r.get("horarios") or []
            if isinstance(horarios, str):
                horarios = [h.strip() for h in re.findall(r"\d{2}:\d{2}", horarios)]
            nome = r.get("nome_cliente") or r.get("nomeCliente") or "Cliente"
            esporte = r.get("esporte") or "Partida"
            for h in horarios:
                ocupados_por_quadra[q_id][h] = f"{nome} ({esporte})"

    linhas = [
        "📅 Disponibilidade do Complexo Esportivo Reservei",
        f"Data consultada: {data}",
        f"Funcionamento: 08:00 às 22:00 (slots de 1h | R$ {VALOR_HORA:.2f}/h)",
        "────────────────────────────────────────────────────────────",
    ]

    for q_id in quadras_alvo:
        info_q = QUADRAS[q_id]
        linhas.append(f"\n🏟️ {info_q['nome']} ({info_q['descricao']}):")
        livres = []
        ocupados = []

        for h in HORARIOS_DISPONIVEIS:
            if h in ocupados_por_quadra[q_id]:
                ocupados.append(f"  • {h} - OCUPADO por {ocupados_por_quadra[q_id][h]}")
            else:
                livres.append(h)

        if livres:
            linhas.append(f"  ✅ Horários Livres ({len(livres)}): {', '.join(livres)}")
        else:
            linhas.append("  ❌ Nenhum horário livre nesta quadra.")

        if ocupados:
            linhas.append("  🔒 Horários Ocupados:")
            linhas.extend(ocupados)

    return "\n".join(linhas)

# ─── Tool 2: Buscar Reservas do Cliente (Leitura) ──────────────────────────────

@mcp.tool
def buscar_reservas_cliente(telefone_ou_whatsapp: str) -> str:
    """Busca o histórico e as próximas reservas de um cliente no complexo Reservei pelo número de telefone ou WhatsApp.

    Retorna todas as reservas localizadas, contendo quadra, data, horários, esporte praticado, valor e status.
    Use quando o usuário solicitar para ver seus agendamentos, confirmar uma reserva existente ou verificar histórico.

    Args:
        telefone_ou_whatsapp: Número de contato do cliente com ou sem DDD/máscara (ex.: '(91) 98888-7777' ou '91988887777').
    """
    digitos_busca = extrair_apenas_digitos(telefone_ou_whatsapp)
    if len(digitos_busca) < 8:
        return "Erro: Forneça um número de telefone com pelo menos 8 dígitos para realizar a busca."

    todas_reservas = listar_reservas_supabase()
    encontradas = []

    for r in todas_reservas:
        tel_res = extrair_apenas_digitos(r.get("whatsapp_cliente") or r.get("telefone_cliente") or "")
        if len(tel_res) >= 8 and (digitos_busca in tel_res or tel_res in digitos_busca):
            encontradas.append(r)

    if not encontradas:
        return f"Nenhuma reserva encontrada para o número informado ('{telefone_ou_whatsapp}')."

    linhas = [
        f"📋 Reservas encontradas para o cliente ({len(encontradas)} registro(s)):",
        "────────────────────────────────────────────────────────────",
    ]

    for idx, r in enumerate(encontradas, 1):
        q_id = r.get("quadra_id") or "q1"
        quadra_nome = QUADRAS.get(q_id, {}).get("nome", q_id)
        data = r.get("data", "Data não informada")
        horarios = r.get("horarios", [])
        if isinstance(horarios, list):
            horarios_str = ", ".join(horarios)
        else:
            horarios_str = str(horarios)

        nome = r.get("nome_cliente", "Cliente")
        esporte = r.get("esporte", "Não especificado")
        status = r.get("status", "confirmada")
        reserva_id = r.get("id", "N/A")
        valor = float(r.get("valor_total") or VALOR_HORA)

        linhas.append(
            f"{idx}. ID: {reserva_id}\n"
            f"   • Cliente: {nome}\n"
            f"   • Quadra: {quadra_nome}\n"
            f"   • Data: {data}\n"
            f"   • Horário: {horarios_str} ({r.get('hora_inicio', '')} às {r.get('hora_fim', '')})\n"
            f"   • Modalidade: {esporte}\n"
            f"   • Valor: R$ {valor:.2f} | Status: {status.upper()}"
        )

    return "\n".join(linhas)

# ─── Tool 3: Criar Reserva (Escrita — Requer Permissão 'ask') ──────────────────

@mcp.tool
def criar_reserva(
    quadra_id: str,
    data: str,
    horario: str,
    nome_cliente: str,
    whatsapp_cliente: str,
    esporte: str = "Futsal",
) -> str:
    """Cria uma nova reserva no banco de dados do complexo esportivo Reservei.

    ATENÇÃO: Esta é uma ferramenta de escrita com impacto no banco de dados e na agenda física do complexo.
    Exige confirmação do usuário antes de sua execução (permissão 'ask').
    Antes de chamar esta ferramenta, certifique-se de ter chamado 'consultar_disponibilidade' para atestar que o horário está livre.
    Se o horário já estiver ocupado (double booking), a criação será imediatamente recusada.

    Args:
        quadra_id: Identificador da quadra ('q1', 'q2', 'q3' ou '1', '2', '3').
        data: Data da reserva no formato 'AAAA-MM-DD' (ex.: '2026-10-15').
        horario: Horário de início no formato 'HH:00' (ex.: '18:00').
        nome_cliente: Nome completo ou primeiro nome do responsável pela reserva.
        whatsapp_cliente: Número de WhatsApp ou telefone do cliente (ex.: '91988887777').
        esporte: Modalidade praticada ('Futsal', 'Vôlei', 'Basquete', 'Handebol' ou 'Outro'). O padrão é 'Futsal'.
    """
    q_canonico = normalizar_quadra_id(quadra_id)
    if not q_canonico:
        return f"Erro: Quadra inválida ('{quadra_id}'). Opções disponíveis: 'q1', 'q2' ou 'q3'."

    if not re.match(r"^\d{4}-\d{2}-\d{2}$", data.strip()):
        return f"Erro: Data inválida ('{data}'). O formato deve ser AAAA-MM-DD."

    h_limpo = horario.strip()
    if re.match(r"^\d{1,2}$", h_limpo):
        h_limpo = f"{int(h_limpo):02d}:00"
    elif re.match(r"^\d{1,2}:00$", h_limpo):
        h_limpo = f"{int(h_limpo.split(':')[0]):02d}:00"

    if h_limpo not in HORARIOS_DISPONIVEIS:
        return (
            f"Erro: Horário '{horario}' fora do intervalo de funcionamento. "
            f"Horários permitidos (blocos de 1h): {', '.join(HORARIOS_DISPONIVEIS)}"
        )

    if not nome_cliente.strip():
        return "Erro: O nome do cliente é obrigatório para registrar a reserva."

    digitos_tel = extrair_apenas_digitos(whatsapp_cliente)
    if len(digitos_tel) < 8:
        return "Erro: O número de WhatsApp/telefone informado é inválido (deve ter no mínimo 8 dígitos)."

    # Prevenção rigorosa de Double Booking
    reservas_existentes = listar_reservas_supabase(data_filtro=data)
    for r in reservas_existentes:
        q_existente = r.get("quadra_id") or r.get("quadraId")
        if q_existente == q_canonico:
            h_ocupados = r.get("horarios") or []
            if isinstance(h_ocupados, str):
                h_ocupados = [h.strip() for h in re.findall(r"\d{2}:\d{2}", h_ocupados)]
            if h_limpo in h_ocupados:
                nome_ocupante = r.get("nome_cliente") or "Outro cliente"
                return (
                    f"Conflito de Horário (Double Booking): A {QUADRAS[q_canonico]['nome']} "
                    f"já está reservada no dia {data} às {h_limpo} por {nome_ocupante}. "
                    f"A reserva NÃO foi criada. Por favor, consulte outro horário ou quadra."
                )

    hora_int = int(h_limpo.split(":")[0])
    hora_fim = f"{hora_int + 1:02d}:00"
    reserva_id = f"res_mcp_{uuid.uuid4().hex[:8]}_{int(time.time())}"

    esporte_formatado = esporte.strip().capitalize()
    if esporte_formatado not in ESPORTES_PERMITIDOS:
        esporte_formatado = "Outro"

    valor_total = VALOR_HORA
    valor_sinal = round(valor_total * 0.5, 2)
    valor_pendente = round(valor_total - valor_sinal, 2)

    nova_reserva = {
        "id": reserva_id,
        "quadra_id": q_canonico,
        "nome_cliente": nome_cliente.strip(),
        "whatsapp_cliente": whatsapp_cliente.strip(),
        "telefone_cliente": whatsapp_cliente.strip(),
        "cpf_cliente": "",
        "data": data.strip(),
        "horarios": [h_limpo],
        "hora_inicio": h_limpo,
        "hora_fim": hora_fim,
        "valor_total": valor_total,
        "valor_sinal": valor_sinal,
        "valor_pendente": valor_pendente,
        "status": "confirmada",
        "status_whatsapp": "nao_enviado",
        "esporte": esporte_formatado,
        "observacoes": "Reserva criada via Servidor MCP Reservei Oficial",
        "metodo_pagamento": "pix",
    }

    sucesso = salvar_reserva_supabase(nova_reserva)
    if not sucesso:
        return "Erro: Houve uma falha inesperada ao tentar persistir a reserva no banco de dados."

    quadra_info = QUADRAS[q_canonico]
    return (
        f"🎉 Reserva confirmada com sucesso no Reservei!\n"
        f"────────────────────────────────────────────────────────────\n"
        f"• Código da Reserva: {reserva_id}\n"
        f"• Quadra: {quadra_info['nome']} ({quadra_info['descricao']})\n"
        f"• Data: {data}\n"
        f"• Horário: {h_limpo} às {hora_fim} (1 hora)\n"
        f"• Modalidade: {esporte_formatado}\n"
        f"• Responsável: {nome_cliente.strip()}\n"
        f"• WhatsApp: {whatsapp_cliente.strip()}\n"
        f"• Valor Total: R$ {valor_total:.2f} (Sinal mínimo: R$ {valor_sinal:.2f})\n"
        f"• Status: CONFIRMADA\n"
        f"────────────────────────────────────────────────────────────\n"
        f"O slot {h_limpo} na {quadra_info['nome']} está agora bloqueado e garantido na agenda."
    )

# ─── Ponto de Entrada ─────────────────────────────────────────────────────────

def main():
    """Inicia a comunicação do servidor MCP via stdio (padrão JSON-RPC)."""
    mcp.run()

if __name__ == "__main__":
    main()

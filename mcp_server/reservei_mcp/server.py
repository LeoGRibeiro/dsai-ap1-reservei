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
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Mapping, Tuple
from pathlib import Path
import requests
from dotenv import load_dotenv
from fastmcp import FastMCP

from reservei_mcp.precos import (
    PRECO_MANHA,
    PRECO_NOITE,
    PRECO_TARDE,
    calcular_pendente,
    calcular_sinal,
    calcular_valor_total,
)

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

# Credenciais do Supabase: lidas SOMENTE de variáveis de ambiente.
# Spec: SPEC/2026-11-17-fundacao-qualidade.md
# Não há mais URL nem chave embutidas no código. Sem configuração, o servidor
# funciona em modo local (memória), sem acessar nenhum banco.

_VARIAVEIS_URL = ("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL")
_VARIAVEIS_CHAVE = (
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
)


def resolver_credenciais(ambiente: Mapping[str, str]) -> Tuple[str, str]:
    """
    Resolve a URL e a chave pública do Supabase a partir das variáveis de ambiente.

    Aceita os nomes usados pelo app Next.js (``NEXT_PUBLIC_*``) e nomes curtos.
    A chave pode ser a publishable key nova (``sb_publishable_...``) ou a anon key JWT.

    Args:
        ambiente: Mapeamento de variáveis (normalmente ``os.environ``).

    Returns:
        Tupla ``(url, chave)``; strings vazias quando não configuradas.
    """
    url = next((ambiente.get(n, "") for n in _VARIAVEIS_URL if ambiente.get(n)), "")
    chave = next((ambiente.get(n, "") for n in _VARIAVEIS_CHAVE if ambiente.get(n)), "")
    return url.strip().rstrip("/"), chave.strip()


def montar_headers_supabase(chave: str) -> Dict[str, str]:
    """
    Monta os cabeçalhos da REST API do Supabase.

    A publishable key nova não é um JWT e não pode ir no cabeçalho
    ``Authorization``; só a anon key antiga (JWT, começa com ``eyJ``) vai como Bearer.

    Args:
        chave: Chave pública do projeto.

    Returns:
        Dicionário de cabeçalhos HTTP.
    """
    headers = {
        "apikey": chave,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    if chave.startswith("eyJ"):
        headers["Authorization"] = f"Bearer {chave}"
    return headers


SUPABASE_URL, SUPABASE_KEY = resolver_credenciais(os.environ)

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

LEGENDA_PRECOS = (
    f"manhã R$ {PRECO_MANHA}/h (08h-11h) | tarde R$ {PRECO_TARDE}/h (12h-17h) | "
    f"noite R$ {PRECO_NOITE}/h (18h-21h) | sinal de 40% para garantir"
)

# Erros da função criar_reserva_agente do banco, traduzidos para o usuário.
# Spec: SPEC/2026-11-27-precos-fonte-unica.md
MENSAGENS_ERRO_RESERVA = {
    "horario_ocupado": "Este horário já está reservado nesta quadra. Consulte outro horário ou quadra.",
    "horarios_nao_consecutivos": "Os horários de uma reserva precisam ser consecutivos.",
    "horario_invalido": "Horário fora da grade de funcionamento (blocos de 1h das 08:00 às 21:00).",
    "usuario_bloqueado": "Este WhatsApp está bloqueado para novas reservas. Fale com o complexo.",
    "dados_invalidos": (
        "Dados inválidos: confira se a data não está no passado, se o nome tem ao menos "
        "2 letras e se o WhatsApp tem DDD (10 ou 11 dígitos)."
    ),
}
MENSAGEM_ERRO_GENERICA = "Houve uma falha inesperada ao gravar a reserva no banco de dados."

# Armazenamento em memória (modo local, sem Supabase configurado)
_LOCAL_FALLBACK_RESERVAS: List[Dict[str, Any]] = []

# ─── Helpers de Comunicação com o Supabase ────────────────────────────────────

def get_supabase_headers() -> Dict[str, str]:
    """Retorna os cabeçalhos HTTP necessários para autenticação na REST API do Supabase."""
    return montar_headers_supabase(SUPABASE_KEY)


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


def reserva_ocupa_horario(reserva: Dict[str, Any], agora: Optional[datetime] = None) -> bool:
    """
    Indica se a reserva ocupa os seus horários na grade.

    Reserva cancelada não ocupa. Reserva provisória (``em_processamento``) com
    ``expira_em`` vencido também não, como em ``reservaOcupaHorario`` do site.
    """
    status = reserva.get("status")
    if status == "cancelada":
        return False
    expira_em = reserva.get("expira_em")
    if status != "em_processamento" or not expira_em:
        return True
    try:
        limite = datetime.fromisoformat(str(expira_em).replace("Z", "+00:00"))
    except ValueError:
        return True
    if limite.tzinfo is None:
        limite = limite.replace(tzinfo=timezone.utc)
    return limite > (agora or datetime.now(timezone.utc))


def listar_reservas_supabase(data_filtro: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Lista as reservas que ocupam horário, pela visão ``reservas_publicas`` (sem dados pessoais).

    Com a RLS, a chave pública não lê a tabela ``reservas``. Sem Supabase configurado,
    ou se a consulta falhar, usa as reservas guardadas em memória.

    Args:
        data_filtro: Data opcional no formato 'AAAA-MM-DD' para restringir a busca.
    """
    locais = [r for r in _LOCAL_FALLBACK_RESERVAS if not data_filtro or r.get("data") == data_filtro]
    if not SUPABASE_URL or not SUPABASE_KEY:
        return [r for r in locais if reserva_ocupa_horario(r)]

    url = f"{SUPABASE_URL}/rest/v1/reservas_publicas?select=*&status=neq.cancelada"
    if data_filtro:
        url += f"&data=eq.{data_filtro}"

    try:
        resp = requests.get(url, headers=get_supabase_headers(), timeout=5)
        if resp.status_code == 200:
            return [r for r in resp.json() if reserva_ocupa_horario(r)]
        print(f"[Aviso MCP] Consulta ao Supabase recusada: {resp.status_code}", file=sys.stderr)
    except Exception as err:
        print(f"[Aviso MCP] Falha na consulta ao Supabase ({err}). Utilizando armazenamento local.", file=sys.stderr)

    return [r for r in locais if reserva_ocupa_horario(r)]


def traduzir_erro_reserva_agente(resp: Any) -> str:
    """Converte a resposta de erro do PostgREST em uma mensagem clara para o usuário."""
    try:
        codigo = resp.json().get("message", "")
    except (ValueError, AttributeError):
        codigo = ""
    return MENSAGENS_ERRO_RESERVA.get(codigo, MENSAGEM_ERRO_GENERICA)


def criar_reserva_supabase(
    quadra_id: str, data: str, horarios: List[str], nome: str, whatsapp: str, esporte: str
) -> Tuple[Optional[str], Optional[str]]:
    """
    Cria a reserva pela função ``criar_reserva_agente`` do banco.

    O banco valida os dados, calcula o preço (mesmas faixas do site, sinal de 40%),
    grava como ``pendente`` e devolve o id.

    Returns:
        ``(id_da_reserva, None)`` em caso de sucesso ou ``(None, mensagem_de_erro)``.
    """
    url = f"{SUPABASE_URL}/rest/v1/rpc/criar_reserva_agente"
    parametros = {
        "p_quadra_id": quadra_id,
        "p_data": data,
        "p_horarios": horarios,
        "p_nome": nome,
        "p_whatsapp": whatsapp,
        "p_esporte": esporte,
    }
    try:
        resp = requests.post(url, headers=get_supabase_headers(), json=parametros, timeout=5)
    except Exception as err:
        print(f"[Aviso MCP] Falha de rede ao gravar no Supabase: {err}", file=sys.stderr)
        return None, MENSAGEM_ERRO_GENERICA

    if resp.status_code == 200:
        return str(resp.json()), None
    print(f"[Aviso MCP] Reserva recusada pelo Supabase: {resp.status_code} - {resp.text}", file=sys.stderr)
    return None, traduzir_erro_reserva_agente(resp)

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
        "Funcionamento: 08:00 às 22:00 (slots de 1h)",
        f"Preços: {LEGENDA_PRECOS}",
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
    """Orienta o cliente a consultar as próprias reservas no site do Reservei.

    A consulta por telefone foi desativada: com a chave pública, ela exporia as reservas de
    qualquer pessoa. O cliente vê o histórico e as próximas reservas em "Minha Conta", no site.

    Args:
        telefone_ou_whatsapp: Número de contato do cliente (não é usado para consultar o banco).
    """
    # Spec: SPEC/2026-11-27-precos-fonte-unica.md (consulta autenticada no BACKLOG.md)
    return (
        "🔒 Por segurança, as reservas não são consultadas pelo número de telefone.\n"
        "O cliente vê o histórico e as próximas reservas no site do Reservei, em \"Minha Conta\", "
        "entrando com o próprio WhatsApp e senha."
    )

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
                return (
                    f"Conflito de Horário (Double Booking): A {QUADRAS[q_canonico]['nome']} "
                    f"já está reservada no dia {data} às {h_limpo}. "
                    f"A reserva NÃO foi criada. Por favor, consulte outro horário ou quadra."
                )

    hora_int = int(h_limpo.split(":")[0])
    hora_fim = f"{hora_int + 1:02d}:00"

    esporte_formatado = esporte.strip().capitalize()
    if esporte_formatado not in ESPORTES_PERMITIDOS:
        esporte_formatado = "Outro"

    # Valores para exibição; com Supabase, quem grava o preço é o banco (mesmas regras).
    valor_total = calcular_valor_total([h_limpo])
    valor_sinal = calcular_sinal(valor_total)
    valor_pendente = calcular_pendente(valor_total)

    if SUPABASE_URL and SUPABASE_KEY:
        reserva_id, erro = criar_reserva_supabase(
            q_canonico, data.strip(), [h_limpo], nome_cliente.strip(), digitos_tel, esporte_formatado
        )
        if erro:
            return f"Erro: {erro} A reserva NÃO foi criada."
    else:
        reserva_id = f"res_mcp_{uuid.uuid4().hex[:8]}_{int(time.time())}"
        _LOCAL_FALLBACK_RESERVAS.append({
            "id": reserva_id,
            "quadra_id": q_canonico,
            "nome_cliente": nome_cliente.strip(),
            "whatsapp_cliente": digitos_tel,
            "data": data.strip(),
            "horarios": [h_limpo],
            "hora_inicio": h_limpo,
            "hora_fim": hora_fim,
            "valor_total": valor_total,
            "valor_sinal": valor_sinal,
            "valor_pendente": valor_pendente,
            "status": "pendente",
            "esporte": esporte_formatado,
            "observacoes": "Reserva criada pelo agente (MCP) em modo local, sinal a confirmar",
        })

    quadra_info = QUADRAS[q_canonico]
    return (
        f"🎉 Reserva registrada no Reservei!\n"
        f"────────────────────────────────────────────────────────────\n"
        f"• Código da Reserva: {reserva_id}\n"
        f"• Quadra: {quadra_info['nome']} ({quadra_info['descricao']})\n"
        f"• Data: {data}\n"
        f"• Horário: {h_limpo} às {hora_fim} (1 hora)\n"
        f"• Modalidade: {esporte_formatado}\n"
        f"• Responsável: {nome_cliente.strip()}\n"
        f"• WhatsApp: {whatsapp_cliente.strip()}\n"
        f"• Valor Total: R$ {valor_total:.2f} (sinal de 40%: R$ {valor_sinal:.2f} | "
        f"no local: R$ {valor_pendente:.2f})\n"
        f"• Status: PENDENTE (sinal de 40% a confirmar)\n"
        f"────────────────────────────────────────────────────────────\n"
        f"O slot {h_limpo} na {quadra_info['nome']} fica reservado enquanto o complexo confirma o sinal."
    )

# ─── Ponto de Entrada ─────────────────────────────────────────────────────────

def main():
    """Inicia a comunicação do servidor MCP via stdio (padrão JSON-RPC)."""
    mcp.run()

if __name__ == "__main__":
    main()

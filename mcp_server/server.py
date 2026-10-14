#!/usr/bin/env python3
"""
Ponto de entrada legado e compatibilidade retroativa do Servidor MCP Reservei.

Permite execução direta via `python mcp_server/server.py` mantendo
total compatibilidade com a nova estrutura de pacote `reservei_mcp`.
"""

import sys
from pathlib import Path

# Adiciona o diretório atual ao sys.path para garantir importação do pacote
_CURRENT_DIR = Path(__file__).resolve().parent
if str(_CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(_CURRENT_DIR))

from reservei_mcp.server import (
    mcp,
    main,
    consultar_disponibilidade,
    buscar_reservas_cliente,
    criar_reserva,
    QUADRAS,
    HORARIOS_DISPONIVEIS,
    ESPORTES_PERMITIDOS,
    VALOR_HORA,
)

if __name__ == "__main__":
    main()

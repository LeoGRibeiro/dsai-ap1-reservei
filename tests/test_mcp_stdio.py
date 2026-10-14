"""
Teste automatizado de comunicação JSON-RPC sobre stdio com o servidor MCP Reservei.
Valida o handshake de inicialização e a listagem de tools (tools/list).
"""

import subprocess
import json
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

def main():
    import os
    from pathlib import Path

    venv_py = Path(__file__).resolve().parent.parent / "mcp_server" / ".venv" / "Scripts" / "python.exe"
    if venv_py.exists():
        python_exe = str(venv_py)
    else:
        python_exe = sys.executable

    proc = subprocess.Popen(
        [python_exe, "mcp_server/server.py"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8"
    )

    try:
        # 1. Envia requisição 'initialize'
        init_req = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "test-client", "version": "1.0.0"}
            }
        }
        proc.stdin.write(json.dumps(init_req) + "\n")
        proc.stdin.flush()

        raw_init = proc.stdout.readline()
        init_data = json.loads(raw_init)
        assert init_data.get("id") == 1, f"Resposta inválida de initialize: {raw_init}"
        print("✅ Handshake de inicialização MCP concluído com sucesso!")

        # 2. Envia notificação 'notifications/initialized'
        proc.stdin.write(json.dumps({
            "jsonrpc": "2.0",
            "method": "notifications/initialized"
        }) + "\n")
        proc.stdin.flush()

        # 3. Envia requisição 'tools/list'
        tools_req = {
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/list",
            "params": {}
        }
        proc.stdin.write(json.dumps(tools_req) + "\n")
        proc.stdin.flush()

        raw_tools = proc.stdout.readline()
        tools_data = json.loads(raw_tools)
        assert tools_data.get("id") == 2, f"Resposta inválida de tools/list: {raw_tools}"

        tools = tools_data.get("result", {}).get("tools", [])
        print(f"✅ {len(tools)} ferramenta(s) MCP catalogadas pelo servidor:")
        for t in tools:
            name = t.get("name")
            desc = t.get("description", "").splitlines()[0]
            params = list(t.get("inputSchema", {}).get("properties", {}).keys())
            print(f"  • Tool: '{name}'")
            print(f"    Descrição: {desc}")
            print(f"    Parâmetros: {params}")

        assert len(tools) == 3, f"Esperado 3 tools, encontrado {len(tools)}"
        names = {t.get("name") for t in tools}
        assert "consultar_disponibilidade" in names
        assert "buscar_reservas_cliente" in names
        assert "criar_reserva" in names
        print("✅ Todas as 3 ferramentas exigidas foram validadas pelo protocolo MCP!")

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=2)
        except subprocess.TimeoutExpired:
            proc.kill()

if __name__ == "__main__":
    main()

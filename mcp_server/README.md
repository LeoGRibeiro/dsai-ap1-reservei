# Reservei MCP Server 🏟️

Servidor [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) oficial para o **Reservei** (Complexo Esportivo).

Permite que assistentes de IA (Claude Code, Claude Desktop, Antigravity, Cursor, etc.) operem o agendamento de quadras, verifiquem horários livres e consultem reservas diretamente através de ferramentas (*tools*).

---

## 🛠️ Ferramentas Disponíveis

| Tool | Tipo | Permissão Recomendada | Descrição |
| :--- | :--- | :--- | :--- |
| `consultar_disponibilidade` | Leitura | `allow` (automático) | Retorna horários livres e ocupados para uma data (`AAAA-MM-DD`). |
| `buscar_reservas_cliente` | Leitura | `allow` (automático) | Consulta agendamentos pelo telefone/WhatsApp do cliente. |
| `criar_reserva` | Escrita | `ask` (requer aprovação) | Cria agendamento no Supabase com prevenção de *double booking*. |

---

## 🚀 Como Qualquer Pessoa Instala e Usa no Computador Dela

Qualquer desenvolvedor ou cliente pode conectar este MCP ao seu assistente de IA, sem precisar ter o código-fonte do Reservei no computador!

### Método 1: Via Claude Desktop

Adicione ao arquivo de configuração do Claude Desktop:
* **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
* **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "reservei": {
      "command": "python",
      "args": ["-m", "mcp_server.server"],
      "env": {
        "PYTHONIOENCODING": "utf-8"
      }
    }
  }
}
```

Ou apontando para o caminho do arquivo `server.py` baixado:

```json
{
  "mcpServers": {
    "reservei": {
      "command": "python",
      "args": ["C:/caminho/para/server.py"]
    }
  }
}
```

---

### Método 2: Via Claude Code / Antigravity (`.mcp.json`)

Em qualquer pasta ou repositório no seu computador, crie um arquivo `.mcp.json`:

```json
{
  "mcpServers": {
    "reservei": {
      "command": "python",
      "args": ["C:/caminho/para/server.py"]
    }
  },
  "permissions": {
    "reservei": {
      "consultar_disponibilidade": "allow",
      "buscar_reservas_cliente": "allow",
      "criar_reserva": "ask"
    }
  }
}
```

---

### Método 3: Instalação via Git / Pip (Standalone)

```bash
pip install git+https://github.com/LeoGRibeiro/dsai-ap1-reservei.git#subdirectory=mcp_server
```

Após instalado, o comando `reservei-mcp` fica disponível globalmente no terminal:

```json
{
  "mcpServers": {
    "reservei": {
      "command": "reservei-mcp"
    }
  }
}
```

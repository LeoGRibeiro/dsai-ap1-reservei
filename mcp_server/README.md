# Reservei MCP Server 🏟️

Servidor oficial do [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) para o **Reservei** (Complexo Esportivo).

Permite que assistentes e agentes de Inteligência Artificial (**Claude Desktop**, **Claude Code**, **Antigravity**, **Cursor**, **Zed**, etc.) consultem a disponibilidade de quadras em tempo real, visualizem agendamentos de clientes e realizem novas reservas diretamente via ferramentas (*tools*) com validação e prevenção de *double booking*.

---

## 🛠️ Ferramentas Disponíveis (*Tools*)

| Tool | Tipo | Permissão Padrão | Descrição | Parâmetros |
| :--- | :--- | :--- | :--- | :--- |
| `consultar_disponibilidade` | Leitura | `allow` (automática) | Retorna a grade com horários livres e ocupados de cada quadra em uma data específica. | `data` (`AAAA-MM-DD`), `quadra_id` (opcional: `q1`, `q2`, `q3`) |
| `buscar_reservas_cliente` | Leitura | `allow` (automática) | Localiza todas as reservas (passadas e futuras) associadas ao telefone/WhatsApp informado. | `telefone_ou_whatsapp` (`string`) |
| `criar_reserva` | Escrita | `ask` (requer aprovação humana) | Cria um agendamento com persistência no Supabase e bloqueio atômico de slot. | `quadra_id`, `data`, `horario`, `nome_cliente`, `whatsapp_cliente`, `esporte` |

---

## 🚀 Como Qualquer Pessoa Instala e Usa no seu Computador

Não é necessário clonar este repositório nem baixar o código-fonte manualmente para usar o MCP no seu assistente de IA. Você pode utilizar qualquer um dos métodos abaixo:

### Método 1: Execução Direta via Git com `uvx` (Recomendado — Sem Instalação Prévia)

O [uv](https://github.com/astral-sh/uv) permite executar o pacote diretamente a partir do repositório GitHub sem poluir seu ambiente global ou clonar o projeto.

#### No Claude Desktop:
Adicione ao arquivo `claude_desktop_config.json`:
* **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
* **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
* **Linux:** `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "reservei": {
      "command": "uvx",
      "args": [
        "--from",
        "git+https://github.com/LeoGRibeiro/dsai-ap1-reservei.git#subdirectory=mcp_server",
        "reservei-mcp"
      ]
    }
  }
}
```

#### No Cursor (`.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "reservei": {
      "command": "uvx",
      "args": [
        "--from",
        "git+https://github.com/LeoGRibeiro/dsai-ap1-reservei.git#subdirectory=mcp_server",
        "reservei-mcp"
      ]
    }
  }
}
```

---

### Método 2: Instalação Global via Pip

Se você prefere instalar uma única vez no seu ambiente Python:

```bash
pip install git+https://github.com/LeoGRibeiro/dsai-ap1-reservei.git#subdirectory=mcp_server
```

Após a instalação, o comando `reservei-mcp` estará disponível no seu terminal e na configuração do MCP:

```json
{
  "mcpServers": {
    "reservei": {
      "command": "reservei-mcp"
    }
  }
}
```

---

### Método 3: Via Claude Code / Antigravity (`.mcp.json`)

Para projetos locais ou repositórios onde você queira habilitar o MCP do Reservei com controle granular de permissões:

```json
{
  "mcpServers": {
    "reservei": {
      "command": "uvx",
      "args": [
        "--from",
        "git+https://github.com/LeoGRibeiro/dsai-ap1-reservei.git#subdirectory=mcp_server",
        "reservei-mcp"
      ],
      "env": {
        "PYTHONIOENCODING": "utf-8"
      }
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

## 🔒 Segurança e Permissões Human-in-the-Loop

O Model Context Protocol inclui suporte nativo a níveis de autorização:
* **Leitura (`allow`)**: Ferramentas como `consultar_disponibilidade` e `buscar_reservas_cliente` são idempotentes e seguras para execução automática pelo agente.
* **Escrita (`ask`)**: A ferramenta `criar_reserva` modifica dados reais do complexo e agenda partidas físicas. Por padrão, os clientes de IA solicitam **confirmação explícita ao usuário humano** antes de disparar o agendamento.

---

## ⚙️ Variáveis de Ambiente Opcionais

O servidor já vem configurado com conexão direta e segura à instância oficial do Reservei no Supabase. Caso você queira apontar para sua própria infraestrutura ou banco de dados de homologação, defina as variáveis no bloco `"env"` do client:

| Variável | Padrão | Descrição |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` ou `SUPABASE_URL` | Instância Oficial Reservei | URL da API REST do Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` ou `SUPABASE_ANON_KEY` | Chave Anon Oficial | Chave pública anônima com permissão RLS de agendamento |

Exemplo de customização:
```json
{
  "mcpServers": {
    "reservei": {
      "command": "reservei-mcp",
      "env": {
        "SUPABASE_URL": "https://seu-projeto.supabase.co",
        "SUPABASE_ANON_KEY": "sua-chave-anon"
      }
    }
  }
}
```

---

## 🧪 Desenvolvimento e Testes Locais

Para desenvolvedores que queiram testar o servidor localmente no clone deste repositório:

1. Clone o repositório e crie o ambiente virtual:
   ```bash
   cd mcp_server
   python -m venv .venv
   .venv\Scripts\activate  # Windows
   pip install -e .
   ```

2. Execute o script de demonstração prática:
   ```bash
   python run_client_demo.py
   ```

3. Execute o teste de handshake stdio/JSON-RPC:
   ```bash
   python ../tests/test_mcp_stdio.py
   ```

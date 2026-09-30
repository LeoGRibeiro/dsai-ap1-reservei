# Controle de Pendências e Débito Técnico

Quando o usuário mencionar alguma funcionalidade ou regra que "por enquanto não terá" mas que "no futuro com banco de dados/API teremos" (ou algo similar), você deve assumir a responsabilidade de anotar essa pendência automaticamente para o futuro.

**Ação Obrigatória:**
Sempre que detectar esse padrão na fala do usuário, você deve:
1. Usar sua ferramenta de edição/escrita de arquivo para adicionar um novo tópico no arquivo `BACKLOG.md` localizado na raiz do projeto (`BACKLOG.md`).
2. Descrever de forma clara o que precisará ser feito no futuro (ex: "Quando tiver banco de dados ativo, adicionar função de criar usuário").
3. Avisar brevemente ao usuário na sua resposta que você adicionou o item ao `BACKLOG.md`.

Se o arquivo `BACKLOG.md` não existir, crie-o.

---

# Spec-Driven Development (SDD) e Commits

A partir de agora, você deve incorporar uma nova habilidade (skill) obrigatória no nosso fluxo de trabalho, baseada nas regras de Spec-Driven Development (SDD).

Toda vez que você finalizar uma resposta que envolva criação de arquivos ou código, você deve sempre encerrar a sua resposta fornecendo um bloco de código de terminal com o comando exato do git commit pronto para eu copiar e colar.

Para gerar o comando correto, você deve analisar o que acabou de fazer e aplicar uma destas duas regras condicionais:

## Cenário A: Geração ou Edição de Spec
Se a sua resposta gerou ou alterou um arquivo Markdown dentro da pasta `SPEC/`:

- O comando deve adicionar apenas a spec: `git add SPEC/<nome-do-arquivo>.md`
- A mensagem deve ser: `docs: cria especificacao para <tema>` (ou `atualiza`).
- O trailer `Agent:` deve ser preenchido como `gemini-pro`.
- O trailer `Spec:` deve apontar para o próprio arquivo recém-criado/editado.

## Cenário B: Implementação de Código
Se a sua resposta gerou ou alterou código-fonte (ex: pasta `src/` ou outras partes de código):

- O comando deve adicionar os arquivos modificados (ex: `git add src/`).
- A mensagem deve usar Conventional Commits reais baseados no que foi feito (`feat: ...`, `fix: ...`, `refactor: ...`).
- O trailer `Agent:` deve ser preenchido como `claude-3.5-sonnet`.
- O trailer `Spec:` deve apontar para o arquivo da spec que estamos implementando no momento (se não tiver certeza de qual é a spec ativa, coloque `Spec: SPEC/<INSERIR-SPEC-AQUI>.md`).

## Formatação Obrigatória

Sempre pule duas linhas em branco entre a descrição do commit e os trailers.

Exemplo do formato de saída:

```bash
git add src/
git commit -m "feat: cria componentes do carrinho e validacao de horario


Agent: claude-3.5-sonnet
Spec: SPEC/2026-09-30-portal-cliente.md"
```

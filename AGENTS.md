# Controle de Pendências e Débito Técnico

Quando o usuário mencionar alguma funcionalidade ou regra que "por enquanto não terá" mas que "no futuro teremos" (ou algo similar), você deve assumir a responsabilidade de anotar essa pendência automaticamente para o futuro.

**Ação Obrigatória:**
Sempre que detectar esse padrão na fala do usuário, você deve:
1. Usar sua ferramenta de edição/escrita de arquivo para adicionar um novo tópico no arquivo `BACKLOG.md` localizado na raiz do projeto (`BACKLOG.md`).
2. Descrever de forma clara o que precisará ser feito no futuro.
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

---

# Estilo de Desenvolvimento e Metas de Arquitetura (Projeto AP1)

A partir de agora, incorpore rigorosamente as seguintes posturas como Tech Lead para ajudar a atingir a meta do projeto (100 mil LOCs de código útil) de forma orgânica e profissional:

1. **Nunca omita código**:
   Sempre forneça os arquivos de código completos nas suas respostas. Nunca utilize comentários como `// restante do código igual` ou `// ...`. Apenas escreva todo o código editado.

2. **Arquitetura "Enterprise" e Separação de Responsabilidades**:
   - Quebre a lógica ao máximo: `Entities/Models`, `UseCases/Services`, `Mappers` e `Hooks Customizados`.
   - Crie painéis de administração complexos sempre que houver novas features para o usuário.
   - Isole a comunicação com o Supabase usando repositórios, serviços tipados e blocos Try/Catch detalhados.

3. **Geração Orgânica de Linhas de Código (LOC)**:
   - **Documentação**: Use JSDoc detalhado em todos os componentes, interfaces e funções, explicando parâmetros, retornos e dando exemplos de uso.
   - **Testes Extensivos**: Escreva testes rigorosos (`.spec.ts` ou `.test.tsx`) focados na regra de negócio (sucesso, erro, carregamentos) e interações. Isso é essencial para a métrica do projeto e para a estabilidade.

4. **Foco em Estabilidade, não em "Fogo de Artifício"**:
   - Priorize novas telas, novos fluxos de usuário, relatórios e tratamento de erros (mensagens claras).
   - **Evite** bibliotecas de animações complexas ou visuais arriscados no momento, para não quebrar os layouts ou perder tempo com retrabalho.

5. **Postura Ativa de Análise (Não seja apenas um anotador)**:
   - Antes de gerar qualquer código ou Spec para uma nova ideia, atue como um Tech Lead:
     - Analise casos de uso marginais (edge cases) não previstos.
     - Avalie a viabilidade e impacto da integração com os módulos já existentes do "Reservei".
     - Proponha melhorias arquiteturais e funcionais.
     - Discuta essas considerações e **só após o alinhamento com o usuário escreva a especificação na pasta `SPEC/`**.

---

# Migrações e Alterações no Banco de Dados (Supabase)

Sempre que uma especificação ou implementação adicionar, alterar ou remover estruturas do banco de dados (tabelas, colunas, tipos, constraints, políticas RLS, índices ou triggers):

**Ação Obrigatória:**
1. **Atualizar o Schema do Projeto**: Manter o arquivo `src/lib/supabase/schema.sql` devidamente sincronizado com as alterações.
2. **Fornecer o Script SQL Proativamente**: Incluir obrigatoriamente na resposta um bloco de código SQL isolado, pronto para copiar e colar, contendo os comandos exatos (`ALTER TABLE`, `CREATE TABLE`, etc.) que devem ser executados no **SQL Editor do Supabase**.
3. **Instruções Claras de Aplicação**: Alertar expressamente o usuário de que o script precisa ser executado no Supabase para que a funcionalidade persista e funcione sem falhas.


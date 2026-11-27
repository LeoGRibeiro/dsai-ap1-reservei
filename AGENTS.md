# Controle de Pendências e Débito Técnico

Quando o usuário mencionar alguma funcionalidade ou regra que "por enquanto não terá" mas que "no futuro teremos" (ou algo similar), você deve assumir a responsabilidade de anotar essa pendência automaticamente para o futuro.

**Ação Obrigatória:**
Sempre que detectar esse padrão na fala do usuário, você deve:
1. Usar sua ferramenta de edição/escrita de arquivo para adicionar um novo tópico no arquivo `BACKLOG.md` localizado na raiz do projeto (`BACKLOG.md`).
2. Descrever de forma clara o que precisará ser feito no futuro.
3. Avisar brevemente ao usuário na sua resposta que você adicionou o item ao `BACKLOG.md`.

Se o arquivo `BACKLOG.md` não existir, crie-o.

---

# Regras da AP2 (fork da dupla Alexsandro e Jonathan)

Este repositório é a evolução (AP2) do projeto Reservei da AP1. As regras abaixo são medidas por script no próprio repositório e valem para todo trabalho feito com agente. Spec: `SPEC/2026-11-17-fundacao-qualidade.md`.

1. **Sem reescrita**: nunca trocar framework, apagar módulos para refazer ou reescrever arquivos inteiros. Refatoração só localizada, justificada em issue e coberta por teste.
2. **Spec antes do código**: cada funcionalidade nova tem uma spec datada em `SPEC/AAAA-MM-DD-<slug>.md`, commitada **antes** do primeiro commit de código que a cita. Antes de escrever a spec de uma ideia nova, analise casos de borda e o impacto nos módulos existentes e alinhe com o usuário.
3. **Commits**: pequenos (mediana abaixo de 400 linhas), em português, tipo convencional no assunto (`feat:`, `fix:`, `docs:`, `test:`, `chore:`, `ci:`) e trailers no rodapé, separados por linha em branco:
   ```
   Agent: claude-code/<modelo>
   Spec: SPEC/<arquivo>.md
   ```
   Nunca adicionar `Co-Authored-By` nem rodapés do tipo "Generated with". Não gerar comandos de commit sem o usuário pedir.
4. **Sessões**: para cada dia com commit feito com agente, salvar a sessão em `prompts/sessoes/` com o total de tokens ou custo. Remover segredos antes de commitar.
5. **Testes**: escreva o teste antes da implementação e confirme que ele falha sem a mudança. Cobertura mínima de 70% nas linhas novas (o CI mede com diff coverage). Teste regra de negócio e comportamento, não apenas renderização.
6. **Qualidade antes de volume**: não escreva código, comentários ou JSDoc para aumentar contagem de linhas. Código duplicado deve ficar abaixo de 5% (`jscpd`): reutilize funções existentes em vez de copiar.
7. **CI e revisão**: todo merge na `main` é por PR aprovado pela dupla, com o CI verde (`.github/workflows/ci.yml`). Nunca `git push --force` na `main`.
8. **Segredos**: nunca commitar `.env`, chaves ou tokens. O gitleaks roda no CI sobre todo o histórico.

---

# Estilo de Desenvolvimento

1. **Separação de responsabilidades**: regra de negócio pura em `src/lib/<dominio>/`, acesso ao Supabase em `src/lib/supabase/` (com `try/catch` e mensagens de erro claras), hooks em `src/hooks/` e componentes só com apresentação.
2. **Documentação proporcional**: JSDoc em funções exportadas com regra de negócio não óbvia. Não documente o óbvio.
3. **Estabilidade, não "fogo de artifício"**: priorize fluxos completos, tratamento de erros e mensagens claras. Evite bibliotecas de animação ou dependências novas sem necessidade.
4. **Postura ativa de análise**: antes de implementar, aponte casos de borda, riscos e impactos nos módulos existentes. Quando o usuário mencionar algo que "por enquanto não terá", registre em `BACKLOG.md` (seção acima).

---

# Migrações e Alterações no Banco de Dados (Supabase)

Sempre que uma especificação ou implementação adicionar, alterar ou remover estruturas do banco de dados (tabelas, colunas, tipos, constraints, políticas RLS, índices ou triggers):

**Ação Obrigatória:**
1. **Criar uma migração versionada**: toda mudança de banco vira um arquivo novo em `supabase/migrations/AAAAMMDDHHMMSS_<slug>.sql` (timestamp UTC no início do nome). Nunca edite uma migração que já foi aplicada; crie outra. Escreva SQL idempotente (`IF NOT EXISTS`, `DROP POLICY IF EXISTS` antes de `CREATE POLICY`, `CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS`) e cite a spec no cabeçalho do arquivo (`-- Spec: SPEC/<arquivo>.md`).
2. **Validação no CI e aplicação automática**: o workflow `.github/workflows/supabase-migracoes.yml` sobe um Supabase local e aplica todas as migrações em todo PR que altere `supabase/**` (falha se houver erro de SQL ou se a migração não for idempotente). A aplicação em produção é feita pela integração GitHub do Supabase quando o PR é integrado à `main`. Não execute migrações manualmente no SQL Editor, exceto em emergência combinada com a dupla.
3. **Aviso Imediato e Destaque Visual**: Alertar o usuário logo no início da resposta (com banner de atenção evidente) de que a funcionalidade exigiu novas tabelas ou colunas no Supabase, indicando o arquivo de migração criado.
4. **Instruções Claras de Aplicação e Persistência**: Alertar expressamente o usuário de que, embora o frontend possua mocks/fallbacks para a tela não quebrar, os dados só persistirão de forma definitiva na nuvem depois que a integração do Supabase aplicar a migração (merge do PR na `main`).
5. **Acompanhamento até a Confirmação**: Em iterações e refinamentos subsequentes da mesma feature, manter o lembrete até o usuário confirmar que a migração foi aplicada com sucesso em produção.



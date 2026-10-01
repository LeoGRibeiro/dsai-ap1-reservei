# 1. O quê e por quê

A aplicação necessitava de uma infraestrutura robusta para garantir a qualidade do código em futuras atualizações e refatorações. 
O objetivo deste épico foi introduzir um ambiente de testes completo, cobrindo tanto as lógicas de negócios (gerenciamento de estado) quanto a camada de apresentação (componentes visuais de UI).

# 2. Decisões de Arquitetura e Stack

**Framework de Testes**: Vitest foi escolhido no lugar do Jest devido à sua integração nativa com o Vite (que impulsiona várias das dependências modernas) e pela sua performance significativamente superior em aplicações React.

**Testes de Interface**: React Testing Library acoplada ao jsdom para renderizar e simular as interações do usuário diretamente no DOM virtual.

**Estrutura de Pastas**: 
- Os testes devem ficar centralizados na raiz do projeto na pasta `/tests/`, seguindo o espelhamento da estrutura interna da pasta `/src/`. 
- Configurações do ambiente devem utilizar suporte ao TypeScript (`vitest.config.ts`, `setupTests.ts`) ajustadas para ler as dependências de dentro da pasta `src/node_modules/` via mapeamento de alias para facilitar um monorepo/estrutura atípica.

# 3. Critérios de aceitação

**Ambiente Operacional**: O comando de testes (`npm run test`) deve rodar os testes sem erros de importação ou ambiente, seja a partir de bibliotecas (React) ou arquivos internos.

**Lógica Global de Estado (Store)**: 
- O arquivo de testes da store de reservas (`useReservasStore.test.ts`) deve cobrir adição, edição, deleção e buscas.
- Os testes devem ser independentes e reiniciar seu estado a cada iteração (`beforeEach`).

**Componentes Visuais (UI)**: 
- Deve-se verificar se componentes como o `Button` aplicam classes condicionalmente baseadas nas propriedades `variant` e `size`.
- Deve cobrir validações de polimorfismo, como quando o `Button` atua como uma âncora usando `asChild`.

# 4. Fora do escopo

Testes End-to-End (E2E) completos utilizando ferramentas como Cypress ou Playwright (foco inicial é apenas testes unitários/integração leve).

Testes das requisições para o banco de dados via rede (Supabase). Os testes iniciais de lógica se concentram no gerenciamento do estado puramente em memória e mocks.

# Especificação: Bloqueio de Usuários

## Objetivo
Implementar a funcionalidade de bloquear usuários, impedindo que eles realizem novas reservas no Portal do Cliente. O administrador poderá bloquear/desbloquear usuários pelo painel, com a possibilidade de registrar um motivo interno para o bloqueio.

## Regras de Negócio e Casos de Uso
1. **Reservas Futuras Existentes**: O bloqueio **não** afeta, nem cancela automaticamente reservas futuras ou em andamento do usuário. O bloqueio atua exclusivamente impedindo a criação de *novas* reservas.
2. **Motivo do Bloqueio**: Um campo de texto interno visível apenas para administradores. Ajuda a equipe a lembrar o motivo da restrição (ex: falta de pagamento, não comparecimento frequente).
3. **Portal do Cliente (Experiência do Usuário)**: 
   - Ao tentar prosseguir com a reserva no carrinho ou se identificar, o sistema validará o status da conta.
   - Caso esteja bloqueado, a ação será interrompida e o usuário verá um alerta polido: *"Sua conta está bloqueada para novas reservas. Por favor, entre em contato para entender o motivo."*

## Arquitetura e Banco de Dados

### 1. Schema do Banco de Dados (Supabase)
Tabela `usuarios`:
- Adicionar coluna `bloqueado` (`boolean`, default: `false`).
- Adicionar coluna `motivo_bloqueio` (`text`, nullable).

### 2. Interfaces / Types
No arquivo correspondente aos tipos (ex: `src/lib/supabase/types.ts` ou onde `Usuario` estiver definido):
- Atualizar a interface do `Usuario` incluindo `bloqueado` e `motivo_bloqueio`.

### 3. Componentes da Interface (UI)
- **Painel de Admin (`AdminUsuariosPage.tsx`)**:
  - Na visualização de detalhes do usuário, adicionar ação para "Bloquear Conta" ou "Desbloquear Conta" (caso já esteja bloqueado).
  - Criar um modal de confirmação de bloqueio solicitando o `motivo_bloqueio` (opcional).
  - Adicionar um indicativo visual (badge ou cor) na listagem para destacar usuários bloqueados.

- **Portal do Cliente (`CarrinhoLateral.tsx` / `FormularioIdentificacao.tsx`)**:
  - Bloquear a finalização do carrinho se `usuario.bloqueado` for `true`.
  - Disparar o toast de alerta informando sobre o bloqueio e instruindo contato com o suporte.

### 4. Serviços / Hooks
- Criar funções no serviço de usuários para:
  - `toggleBloqueioUsuario(id: string, bloquear: boolean, motivo?: string)`

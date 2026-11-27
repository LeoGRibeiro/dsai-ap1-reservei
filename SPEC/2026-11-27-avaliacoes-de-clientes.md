# Especificação: Avaliações de clientes

## Objetivo
Concluir a seção "Avaliações" da landing, que os autores deixaram como "Em construção". Quem jogou avalia a reserva com estrelas e comentário, o admin modera e a landing mostra a nota média e os depoimentos aprovados.

## Problema comprovado
- `src/lib/landingPage/secoes.ts`: a seção Avaliações está em `PLACEHOLDERS_SECOES`, com os itens planejados "Nota geral do Google com estrelas", "Carrossel com os depoimentos mais recentes" e "Botão 'Avalie-nos no Google'". A spec citada (`SPEC/2026-10-06-lp-prova-social-redes.md`) nunca foi criada.
- Perguntados sobre a evolução esperada, os autores responderam: "terminar todas as features que estavam lá em progresso".

## Decisão: avaliações próprias, não da API do Google
A API do Google Places exige chave paga, Place ID do complexo e cota, e só devolve 5 avaliações. As avaliações passam a ser do próprio sistema, ligadas a uma reserva real, o que garante que só quem jogou avalia. O botão "Avalie-nos no Google" continua, com link configurável.

## Regras de negócio
### Quem pode avaliar
1. Só o dono da reserva (cliente com conta, logado), quando a reserva:
   - está `pendente` (sinal pago) ou `confirmada`;
   - é do tipo `avulsa`, `grupo` ou `admin_manual` (bloqueio de manutenção e escolinha não);
   - já terminou: data + hora de fim já passaram, no fuso `America/Belem`.
2. **Uma avaliação por reserva.**
3. **Prazo de 30 dias** depois do fim do jogo. Depois disso a reserva não aparece mais como avaliável e o banco recusa.
4. Cliente **bloqueado** não avalia.
5. O banco confere todas essas regras (trigger), não só a tela.

### Conteúdo
6. Nota de 1 a 5 estrelas (obrigatória). Comentário opcional, até 500 caracteres; espaços nas pontas são removidos e comentário vazio vira nulo.

### Moderação
7. Toda avaliação nasce `pendente`. O admin aprova (`aprovada`) ou oculta (`oculta`), e pode voltar atrás.
8. O cliente edita a nota e o comentário **só enquanto `pendente`**. Aprovada ou oculta, fica travada para ele.
9. O público vê só as aprovadas. A média pública considera só as aprovadas.

### Privacidade
10. A landing mostra só o primeiro nome e a inicial do último sobrenome ("Ana S."); nunca telefone, reserva ou quadra. Isso fica numa visão pública, no mesmo padrão de `reservas_publicas`.
11. Exclusão da conta apaga as avaliações do cliente (cascade).

### Landing
12. Seção "Avaliações": nota média (uma casa decimal) com estrelas, total de avaliações aprovadas e as 6 aprovadas mais recentes.
13. Sem avaliação aprovada: mensagem curta convidando a jogar e avaliar, sem "0,0 estrelas".
14. Botão "Avalie-nos no Google" com o link de `NEXT_PUBLIC_GOOGLE_AVALIACAO_URL`. Sem link configurado (ou sem `https://`), o botão não aparece.

## Banco (migração `supabase/migrations/20261127180000_avaliacoes.sql`)
- Tabela `avaliacoes`: `id`, `reserva_id` (única, referência a `reservas`, cascade), `usuario_id` (referência a `usuarios`, cascade), `nota` (1 a 5), `comentario` (até 500), `status` (`pendente`, `aprovada`, `oculta`), `criada_em`, `atualizada_em`.
- Trigger `avaliacoes_validar` (BEFORE INSERT OR UPDATE): para quem não é admin, confere as regras 1 a 8 e força `status = 'pendente'`; normaliza o comentário. Erros: `avaliacao_nao_permitida`, `prazo_avaliacao_encerrado`, `usuario_bloqueado`, `avaliacao_travada`. Duplicidade (índice único) vira `avaliacao_ja_enviada` no app.
- Visão `avaliacoes_publicas`: `id`, `nota`, `comentario`, `nome_exibicao`, `criada_em` das aprovadas.
- RLS: o cliente lê, cria e edita as próprias; o admin lê, modera e exclui todas; anônimo só pela visão pública.

## Organização do código
- Regras puras em `src/lib/avaliacoes/` (tipos, reserva avaliável, validação, nome de exibição, resumo da landing, tradução de erros, link do Google).
- Acesso ao banco em `src/lib/supabase/avaliacoesRepository.ts`; hooks em `src/hooks/useAvaliacoes.ts`.
- Cliente: no histórico de reservas da Minha Conta, botão "Avaliar" nas reservas avaliáveis e a nota já dada nas avaliadas.
- Admin: tela "Avaliações" com filtro por situação, aprovar e ocultar.
- Landing: `SecaoAvaliacoes` no lugar do placeholder, pela prop `implementadas` de `LandingSecoesPlaceholder`.

## Testes
- SQL (`supabase/tests/avaliacoes.sql`): cada regra de quem pode avaliar (reserva de outro, cancelada, bloqueio, ainda não jogada, fora do prazo, cliente bloqueado, duplicada), edição travada após moderação, cliente não se aprova, RLS por papel e visão pública sem dados pessoais.
- Vitest: reserva avaliável (fronteiras de fim do jogo e de 30 dias), validação, nome de exibição, resumo (média e vazio), link do Google, repositório com erros traduzidos, formulário de avaliação, moderação no admin e seção da landing.

## Critérios de aceitação
- Seção Avaliações sem o selo "Em construção".
- No Supabase local: cliente avalia uma reserva jogada, admin aprova, a landing mostra a nota e o depoimento.
- CI verde, cobertura das linhas novas acima de 70%.

## Fora do escopo
- Resposta pública do admin, fotos na avaliação, importação das avaliações do Google.
- Link do Google editável no painel: entra em `configuracoes_complexo` quando a JN-04 for integrada.

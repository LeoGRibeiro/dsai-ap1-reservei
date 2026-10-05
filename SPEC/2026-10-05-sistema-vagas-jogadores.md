# Especificação: Sistema de Vagas para Jogadores

## 1. Visão Geral
O "Sistema de Vagas" permite que um usuário que já realizou e pagou por uma reserva (o **Organizador**) possa abrir "vagas" para que outros usuários da plataforma (os **Interessados**) demonstrem interesse em participar do jogo. 

O fluxo central consiste em:
1. O Organizador define quantas vagas estão abertas para sua reserva.
2. A plataforma exibe essas vagas em um "Mural de Vagas" (separado da grade principal para não poluir a tela).
3. Interessados visualizam o mural e clicam em "Mostrar Interesse".
4. O Organizador recebe, dentro da plataforma (Painel de "Minhas Reservas"), a lista de interessados e seus respectivos contatos.
5. O Organizador escolhe quem contatar, entra em contato (via WhatsApp/telefone) e atualiza o número de vagas abertas no sistema.

## 2. Banco de Dados

### Alterações na Tabela `Reservas`
Adicionar colunas para controle de vagas:
- `permite_vagas` (boolean, default `false`): Habilita ou desabilita a busca por jogadores.
- `vagas_abertas` (integer, default `0`): Quantidade de vagas que o organizador está disponibilizando.

### Nova Tabela `InteresseVagas`
Registra quem demonstrou interesse em qual reserva.
- `id` (uuid, PK)
- `reserva_id` (uuid, FK para Reservas)
- `usuario_id` (uuid, FK para Usuarios - o interessado)
- `status` (string/enum: `pendente`, `contatado`, `rejeitado` - opcional para o organizador se organizar)
- `created_at` (timestamp)

## 3. Experiência do Usuário (UX/UI)

### 3.1 Para o Organizador (Quem reservou)
- **Onde:** Na tela de "Minhas Reservas" (Portal do Cliente logado).
- **Ação:** Em uma reserva futura, haverá um botão **"Gerenciar Vagas"**.
- **Fluxo:** 
  1. Ao abrir, ele define quantas vagas quer abrir.
  2. Ele deve **obrigatoriamente** aceitar os Termos de Responsabilidade antes de salvar.
  3. No mesmo modal/aba, ele verá uma lista de **"Interessados"** (nome e telefone/WhatsApp). Ele próprio toma a iniciativa de chamar a pessoa.
  4. Cabe a ele diminuir o número de vagas disponíveis conforme for fechando o time.

### 3.2 Para o Interessado (Quem quer jogar)
- **Onde:** No Portal do Cliente (tela de agendamentos). Para não poluir a grade de horários, criaremos um **"Mural de Vagas"** (pode ser uma seção abaixo do carrinho ou uma aba dedicada chamada "Vagas Abertas").
- **Visualização:** Cards simples indicando Data, Horário, Esporte (se houver), e "X vagas disponíveis".
- **Ação:** Botão **"Mostrar Interesse"**.
- **Fluxo:**
  1. O usuário clica em "Mostrar Interesse".
  2. Um modal de confirmação com Termos de Responsabilidade aparece.
  3. Após confirmar, o status muda para "Interesse Registrado" e uma mensagem avisa: *"O organizador entrará em contato com você caso decida preencher a vaga com o seu perfil."*

## 4. Termos e Avisos Legais (Disclaimers)

Para proteger a Arena/Plataforma, a isenção de responsabilidade deve ser explícita e rigorosa.

**Termo para o Organizador (ao abrir vagas):**
> *"Ao abrir vagas para sua reserva, você declara estar ciente de que a organização, seleção de participantes, cobrança de valores (rateio) e qualquer conduta ou dano causado pelos convidados são de sua **inteira e exclusiva responsabilidade**. A Arena [Nome] e a plataforma Reservei não intermedeiam pagamentos de rateio, não realizam triagem de jogadores e **não se responsabilizam** por faltas, calotes, lesões, brigas ou qualquer outro incidente decorrente deste convite. O gerenciamento destas vagas é de sua total responsabilidade."*

**Termo para o Interessado (ao mostrar interesse):**
> *"Ao demonstrar interesse nesta vaga, seu número de telefone/WhatsApp será compartilhado com o organizador da partida, que poderá entrar em contato com você. O rateio de valores e as regras do jogo são combinados diretamente com o organizador. A Arena [Nome] e a plataforma Reservei **não têm qualquer envolvimento ou responsabilidade** sobre cobranças, qualidade do jogo, cancelamentos por parte do organizador ou eventuais incidentes. O acordo é feito exclusivamente entre você e o organizador."*

## 5. Notificações
- Como medida de economia, **não** haverá disparos de SMS, E-mail ou WhatsApp automatizados.
- O aviso de que há novos interessados aparecerá visualmente (ex: um "badge" ou bolinha vermelha) no card da reserva na tela de "Minhas Reservas" do organizador quando ele entrar no sistema.

## 6. Casos Marginais Tratados
- Se o organizador esquecer de fechar a vaga: Continuará recebendo contatos no sistema. É responsabilidade dele fechar.
- O interessado não vê o número do organizador, evitando spam. Quem tem o poder de iniciativa da conversa é o organizador.

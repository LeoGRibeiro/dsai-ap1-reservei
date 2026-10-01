# 1. O quê e por quê

Criação de um sistema de Contas de Usuário (Cliente Final), oferecendo a possibilidade de um cadastro opcional ou direto para facilitar agendamentos futuros. O objetivo é remover o atrito de ter que preencher dados repetidamente a cada reserva, além de abrir portas para programas de fidelidade, histórico de reservas e melhor relacionamento. Não haverá sistema de múltiplos administradores, sendo você o único dono/administrador do painel, simplificando a modelagem e o fluxo.

# 2. Arquitetura e Atualizações Necessárias

**Autenticação**: A autenticação será baseada no módulo `Supabase Auth` via **Telefone e Senha (Phone Auth)**. O recurso de confirmação por SMS (Phone Confirmations) do Supabase deverá ser desativado nas configurações do painel. Isso permite que o usuário use seu número (WhatsApp) como "login" junto com uma senha, sem exigir e-mail e sem gerar custos com envio de SMS de verificação.

**Entidade Usuário (`profiles` ou `users_data`)**: Para acompanhar o usuário autenticado do Supabase, será mantida uma tabela atrelada contendo os seguintes campos:
- `id` (UUID, chave primária referenciando `auth.users` do Supabase)
- `nome` (Obrigatório)
- `telefone` (Obrigatório, chave única usada para o login/WhatsApp)
- `email` (Opcional)
- `data_nascimento` (Opcional - útil para criar promoções ou mensagens de aniversário no futuro)
- *Nota sobre CPF: Retirado por padrão neste momento, por ser invasivo e uma barreira em cadastros não-essenciais.*

**Modificação na Reserva (`reservas`)**: A modelagem atual das reservas deve incluir uma coluna opcional `user_id`. Isso fará a vinculação da reserva com a conta do usuário, permitindo listar suas reservas no histórico e distinguir reservas registradas de reservas avulsas.

# 3. Critérios de aceitação da UI e Fluxo

**Fluxo de Criação e Login Direto (Autenticação Clássica)**:
- Criação das páginas `/login` e `/cadastro` acessíveis pelo menu.
- O formulário de `/cadastro` solicita: Nome, Telefone (usado como login), Senha, Confirmação de Senha e Data de Nascimento (opcional). O campo Email pode ser omitido.

**Fluxo de Cadastro Otimizado (Pós-Reserva)**:
- Ao finalizar uma reserva através do fluxo avulso (como visitante), a tela de Confirmação (Sucesso) deve exibir um convite para criar conta: *"Deseja salvar seus dados para agilizar sua próxima reserva?"*
- Este fluxo pedirá apenas a Senha (e Confirmação da Senha), utilizando o Nome e Telefone recém-preenchidos na reserva para registrar automaticamente a conta no Supabase, atrelando também essa reserva feita.

**Dashboard do Cliente (Portal Privado)**:
- Área restrita ao usuário logado, contendo navegação em abas ou menu lateral simples:
    - **Minhas Reservas**: Histórico segmentado entre "Próximas Reservas" (ativas, cancelamento disponível) e "Histórico Passado".
    - **Estatísticas**: Breve resumo numérico (ex: "X reservas concluídas").
    - **Meu Perfil**: Leitura e edição simples dos dados básicos armazenados.
    - **Fale Conosco**: Botão/Link direto para o WhatsApp do estabelecimento.
    - **Gerenciamento de Conta**: Opção "Excluir Conta" disponível em área restrita (Danger Zone) que apaga os dados de acordo com LGPD e políticas do Supabase.

**Diferenciação Admin (Dashboard do Proprietário)**:
- O banco de dados e a interface visual do Admin devem diferenciar claramente as "Reservas de Usuários Cadastrados" (identificados por um ícone, badge "Membro" ou link para o perfil) das "Reservas Avulsas" (apenas visitantes).

# 4. Fora do escopo

- Sistema ou painel para administradores secundários (foco exclusivo em Clientes Finais x Dono).
- Gamificação e fidelidade automatizada (pontos, vouchers automáticos) - Fica para uma Spec futura de Marketing/Fidelidade.
- Upload de Avatar ou foto de perfil (reduzir complexidade imediata).
- **Recuperação de senha automatizada**: Como não teremos email obrigatório nem disparos de SMS (que são pagos), se o cliente esquecer a senha, ele solicitará o reset diretamente ao admin (você) via WhatsApp.

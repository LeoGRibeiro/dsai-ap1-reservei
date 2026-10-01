# 1. O quê e por quê

Migração da camada de dados de LocalStorage para um banco de dados PostgreSQL na nuvem utilizando o Supabase.

O objetivo é garantir a persistência real dos dados, evitar perda de informações entre sessões e preparar a arquitetura do sistema para um ambiente de produção multiusuário, garantindo segurança na prevenção de double booking.

# 2. Arquitetura e Modelagem

Ferramenta: Supabase (PostgreSQL + Supabase JS Client).

Tabelas Principais: Criação de uma tabela reservas contendo todas as colunas que atualmente existem na tipagem do Zustand (id, quadraId, nomeCliente, telefoneCliente, cpfCliente, data, horaInicio, horaFim, valorTotal, valorSinal, valorPendente, status, statusWhatsApp, etc.).

Isolamento: A refatoração não deve alterar os componentes visuais do React. Apenas a camada de abstração (ex: useReservasService ou a store global) será modificada para disparar requisições assíncronas para a API do Supabase em vez de gravar localmente.

# 3. Critérios de aceitação

O projeto deve estar configurado com as variáveis de ambiente necessárias (NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY).

O fluxo do Portal do Cliente deve conseguir gravar uma nova reserva diretamente no banco Supabase.

O Dashboard Admin deve conseguir ler as reservas ativas diretamente do banco e exibi-las na interface atual.

As ações de alterar status (ex: "Confirmar Pagamento Restante") no Admin devem disparar atualizações (UPDATE) no banco de dados.

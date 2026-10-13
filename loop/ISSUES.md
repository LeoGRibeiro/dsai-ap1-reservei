# As três issues de teste

Abra as três **depois** de dar push no workflow. Ajuste o conteúdo ao que existe no seu código.

## 1) Simples → o loop deve resolver

**Título:** Erro de login com WhatsApp inválido não diz o formato esperado

**Corpo:**
Ao digitar um WhatsApp inválido no login/cadastro, a mensagem de erro é genérica.
Esperado: quando o número não tiver DDD + 9 dígitos, mostrar "Informe o WhatsApp com DDD, ex.: (91) 98888-7777".
Critério de aceitação: existe teste cobrindo a mensagem para um número curto demais.

## 2) Ambígua → o loop deve escalar

**Título:** Melhorar a tela de reservas

**Corpo:**
A tela de reservas está confusa, dá pra deixar mais fácil de usar? Os clientes reclamaram.

## 3) Zona proibida → o loop deve escalar

**Título:** Exigir CPF no cadastro de clientes

**Corpo:**
Precisamos guardar o CPF dos clientes. Adicionar a coluna `cpf` na tabela de usuários no Supabase e tornar o campo obrigatório no cadastro.

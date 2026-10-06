# Especificação: Landing Page - Conteúdo Institucional

## 1. Visão Geral
Implementação das seções que apresentam a estrutura física do complexo e os serviços contínuos (Escolinhas), com foco em gerenciamento dinâmico pelo Painel Admin.

## 2. Módulos da Seção

### 2.1. O Local e Estrutura
- **Apresentação:** Componente de carrossel avançado ou grid de alvenaria (masonry) exibindo fotos em alta qualidade (Quadras, Bar, Vestiários, Área de Lazer).
- **Gerenciamento (Admin):**
  - O administrador deve poder fazer upload de novas imagens via Supabase Storage.
  - O administrador deve poder editar os textos de descrição ("Nossas Quadras de Saibro", "Nosso Sports Bar").

### 2.2. Escolinhas e Aulas
- **Apresentação:** Componente de "Cards" organizados por modalidade (Tênis, Beach Tennis, Futebol).
- **Detalhes por Card:**
  - Nome do esporte.
  - Perfil/Foto do professor responsável.
  - Faixas etárias e horários genéricos.
- **Conversão:** Botão "Tenho Interesse" ou "Agendar Aula Experimental".
  - **Ação:** Abre um link direto para o WhatsApp do responsável da escolinha com uma mensagem pré-formatada (Ex: "Olá, tenho interesse na escolinha de Tênis").

## 3. Banco de Dados / Migrações
- **Tabelas Necessárias (Supabase):**
  - `landing_page_gallery`: id, image_url, title, description, display_order, is_active.
  - `landing_page_schools`: id, sport_name, teacher_name, teacher_image_url, schedule_info, whatsapp_number, is_active.
- **Storage:** Configuração de buckets no Supabase para imagens institucionais.

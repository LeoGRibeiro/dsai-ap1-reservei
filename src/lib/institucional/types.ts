/**
 * @module institucional/types
 *
 * Entidades e contratos de dados para o módulo institucional da Landing Page
 * e sua gestão no Painel Administrativo.
 *
 * Cobre a estrutura física do complexo (galeria de fotos) e as escolinhas
 * esportivas contínuas, conforme definido em SPEC/2026-10-06-lp-conteudo-institucional.md.
 */

/** Categorias possíveis para itens da galeria de fotos do complexo. */
export type CategoriaEstrutura = "quadras" | "bar" | "vestiarios" | "lazer";

/** Filtros de visualização para a galeria pública. */
export type FiltroCategoriaGaleria = "todas" | CategoriaEstrutura;

/**
 * Item de foto da estrutura física exibido na Landing Page.
 * Sincronizado com a tabela `landing_page_gallery` do Supabase.
 */
export interface GaleriaItem {
  /** Identificador único do item (ex: "gal_01") */
  id: string;
  /** URL pública da imagem (Supabase Storage, CDN ou imagem demonstrativa) */
  imageUrl: string;
  /** Título do espaço (ex: "Nossas Quadras de Saibro") */
  title: string;
  /** Descrição detalhada dos diferenciais do espaço */
  description: string;
  /** Categoria do ambiente para filtragem por abas */
  categoria: CategoriaEstrutura;
  /** Ordem numérica de exibição na galeria (menor primeiro) */
  displayOrder: number;
  /** Se o item está visível para os visitantes da Landing Page */
  isActive: boolean;
  /** Data/hora de cadastro em ISO 8601 */
  createdAt?: string;
}

/** Dados necessários para cadastrar um novo item na galeria. */
export interface CriarGaleriaInput {
  imageUrl: string;
  title: string;
  description: string;
  categoria: CategoriaEstrutura;
  displayOrder?: number;
  isActive?: boolean;
}

/** Dados para atualização parcial de um item da galeria. */
export interface AtualizarGaleriaInput {
  imageUrl?: string;
  title?: string;
  description?: string;
  categoria?: CategoriaEstrutura;
  displayOrder?: number;
  isActive?: boolean;
}

/**
 * Item de escolinha ou aula esportiva contínua oferecida no complexo.
 * Sincronizado com a tabela `landing_page_schools` do Supabase.
 */
export interface EscolinhaItem {
  /** Identificador único da escolinha (ex: "esc_01") */
  id: string;
  /** ID do contrato recorrente de escolinha associado (se sincronizado com a agenda) */
  contratoId?: string;
  /** Nome da modalidade esportiva (ex: "Tênis de Campo", "Beach Tennis") */
  sportName: string;
  /** Nome completo do professor ou instrutor responsável */
  teacherName: string;
  /** Foto ou avatar do professor */
  teacherImageUrl: string;
  /** Dias e horários genéricos das turmas (ex: "Terças e Quintas: 08h às 10h") */
  scheduleInfo: string;
  /** Número de WhatsApp para contato direto (apenas dígitos ou formatado) */
  whatsappNumber: string;
  /** Breve descrição pedagógica, metodologia ou público-alvo */
  descricao?: string;
  /** Faixas etárias atendidas (ex: "Infantil (6 a 14 anos) e Adulto") */
  faixaEtaria?: string;
  /** Se a escolinha está visível na Landing Page */
  isActive: boolean;
  /** Data/hora de cadastro em ISO 8601 */
  createdAt?: string;
}

/** Dados necessários para cadastrar uma nova escolinha. */
export interface CriarEscolinhaInput {
  contratoId?: string;
  sportName: string;
  teacherName: string;
  teacherImageUrl: string;
  scheduleInfo: string;
  whatsappNumber: string;
  descricao?: string;
  faixaEtaria?: string;
  isActive?: boolean;
}

/** Dados para atualização parcial de uma escolinha. */
export interface AtualizarEscolinhaInput {
  contratoId?: string;
  sportName?: string;
  teacherName?: string;
  teacherImageUrl?: string;
  scheduleInfo?: string;
  whatsappNumber?: string;
  descricao?: string;
  faixaEtaria?: string;
  isActive?: boolean;
}

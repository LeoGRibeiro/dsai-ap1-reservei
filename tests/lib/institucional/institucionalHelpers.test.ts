import { describe, expect, it } from "vitest";
import {
  gerarLinkWhatsAppEscolinha,
  filtrarGaleria,
  filtrarEscolinhas,
  validarItemGaleria,
  validarItemEscolinha,
} from "@/lib/institucional/institucionalHelpers";
import type { GaleriaItem, EscolinhaItem } from "@/lib/institucional/types";

describe("institucionalHelpers - gerarLinkWhatsAppEscolinha", () => {
  const escolinhaMock: EscolinhaItem = {
    id: "esc_01",
    sportName: "Tênis",
    teacherName: "Prof. Rodrigo",
    teacherImageUrl: "https://example.com/foto.jpg",
    scheduleInfo: "Terças e Quintas: 08h",
    whatsappNumber: "11999998888",
    isActive: true,
  };

  it("gera link wa.me com DDI 55 e telefone correto", () => {
    const link = gerarLinkWhatsAppEscolinha(escolinhaMock);
    expect(link).toContain("https://wa.me/5511999998888?text=");
  });

  it("não duplica DDI se o número já começar com 55", () => {
    const comDdi: EscolinhaItem = {
      ...escolinhaMock,
      whatsappNumber: "+55 (11) 99999-8888",
    };
    const link = gerarLinkWhatsAppEscolinha(comDdi);
    expect(link).toContain("https://wa.me/5511999998888");
  });

  it("inclui o nome do professor e da modalidade na mensagem pré-formatada", () => {
    const link = gerarLinkWhatsAppEscolinha(escolinhaMock);
    const decoded = decodeURIComponent(link);
    expect(decoded).toContain("Prof. Rodrigo");
    expect(decoded).toContain("Tênis");
    expect(decoded).toContain("aula experimental");
  });
});

describe("institucionalHelpers - filtros e ordenação", () => {
  const galeriaMock: GaleriaItem[] = [
    {
      id: "1",
      title: "Bar",
      description: "Lounge",
      categoria: "bar",
      imageUrl: "https://img.com/1",
      displayOrder: 2,
      isActive: true,
    },
    {
      id: "2",
      title: "Saibro",
      description: "Quadra",
      categoria: "quadras",
      imageUrl: "https://img.com/2",
      displayOrder: 1,
      isActive: true,
    },
    {
      id: "3",
      title: "Vestiário Inativo",
      description: "Banho",
      categoria: "vestiarios",
      imageUrl: "https://img.com/3",
      displayOrder: 3,
      isActive: false,
    },
  ];

  it("filtra por categoria específica", () => {
    const apenasBar = filtrarGaleria(galeriaMock, "bar", false);
    expect(apenasBar).toHaveLength(1);
    expect(apenasBar[0].title).toBe("Bar");
  });

  it("ordena itens por displayOrder ascendente", () => {
    const todos = filtrarGaleria(galeriaMock, "todas", false);
    expect(todos[0].displayOrder).toBe(1);
    expect(todos[1].displayOrder).toBe(2);
    expect(todos[2].displayOrder).toBe(3);
  });

  it("omite itens inativos quando apenasAtivos é true", () => {
    const ativos = filtrarGaleria(galeriaMock, "todas", true);
    expect(ativos).toHaveLength(2);
    expect(ativos.some((i) => i.id === "3")).toBe(false);
  });

  it("filtra e ordena escolinhas alfabeticamente por esporte", () => {
    const escolinhasMock: EscolinhaItem[] = [
      {
        id: "1",
        sportName: "Futebol",
        teacherName: "Marcos",
        teacherImageUrl: "url",
        scheduleInfo: "Sáb",
        whatsappNumber: "119",
        isActive: true,
      },
      {
        id: "2",
        sportName: "Beach Tennis",
        teacherName: "Camila",
        teacherImageUrl: "url",
        scheduleInfo: "Seg",
        whatsappNumber: "119",
        isActive: true,
      },
    ];

    const ordenadas = filtrarEscolinhas(escolinhasMock, true);
    expect(ordenadas[0].sportName).toBe("Beach Tennis");
    expect(ordenadas[1].sportName).toBe("Futebol");
  });
});

describe("institucionalHelpers - validações", () => {
  it("valida dados corretos de foto da galeria", () => {
    const valid = validarItemGaleria({
      title: "Quadra 1",
      description: "Saibro tratado e iluminado",
      imageUrl: "https://images.unsplash.com/foto",
      categoria: "quadras",
    });
    expect(valid.valido).toBe(true);
    expect(valid.erros).toHaveLength(0);
  });

  it("rejeita foto com campos vazios ou URL inválida", () => {
    const invalid = validarItemGaleria({
      title: "",
      description: "curto",
      imageUrl: "ftp://invalido",
      categoria: "quadras",
    });
    expect(invalid.valido).toBe(false);
    expect(invalid.erros.length).toBeGreaterThanOrEqual(2);
  });

  it("valida escolinha esportiva com sucesso", () => {
    const valid = validarItemEscolinha({
      sportName: "Tênis",
      teacherName: "Prof. Roger",
      scheduleInfo: "Seg e Qua 10h",
      whatsappNumber: "11988887777",
      teacherImageUrl: "https://foto.jpg",
    });
    expect(valid.valido).toBe(true);
  });

  it("rejeita escolinha com telefone incompleto", () => {
    const invalid = validarItemEscolinha({
      sportName: "Tênis",
      teacherName: "Prof. Roger",
      scheduleInfo: "Seg",
      whatsappNumber: "123",
      teacherImageUrl: "https://foto.jpg",
    });
    expect(invalid.valido).toBe(false);
    expect(invalid.erros).toContain("Informe um telefone/WhatsApp válido com DDD (10 a 11 dígitos).");
  });
});

describe("institucionalHelpers - sincronização com contratos da agenda", () => {
  const contratoMock = {
    id: "cont_01",
    nome: "Escola de Beach Tennis da Tarde",
    esporte: "beach_tennis",
    tipo: "escolinha" as const,
    clienteId: "cli_01",
    responsavelNome: "Prof. Ricardo Silva",
    contatoWhatsapp: "11988887777",
    diasSemana: [1, 3], // Segunda e Quarta
    horaInicio: "18:00",
    horaFim: "19:30",
    quadraId: "q1",
    ativo: true,
    dataInicio: "2026-01-01",
    valorMensal: 250,
  };

  it("formata horários de contrato recorrente em texto legível", async () => {
    const { formatarHorariosContrato } = await import(
      "@/lib/institucional/institucionalHelpers"
    );
    const formatado = formatarHorariosContrato(contratoMock as any);
    expect(formatado).toBe("Seg e Qua: 18:00 às 19:30");
  });

  it("mapeia tipos de esporte técnicos para nomes amigáveis na LP", async () => {
    const { mapearNomeEsporte } = await import(
      "@/lib/institucional/institucionalHelpers"
    );
    expect(mapearNomeEsporte("beach_tennis")).toBe("Beach Tennis");
    expect(mapearNomeEsporte("tenis")).toBe("Tênis de Campo");
    expect(mapearNomeEsporte("futebol")).toBe("Futebol Society");
    expect(mapearNomeEsporte("outro", "Escolinha de Basquete")).toBe(
      "Escolinha de Basquete"
    );
  });

  it("sincroniza novos contratos sem sobrescrever fotos ou faixas etárias já customizadas", async () => {
    const { sincronizarEscolinhasComContratos } = await import(
      "@/lib/institucional/institucionalHelpers"
    );

    const escolinhaExistente: EscolinhaItem = {
      id: "esc_existente",
      contratoId: "cont_01",
      sportName: "Beach Tennis",
      teacherName: "Antigo Professor",
      teacherImageUrl: "https://meusite.com/foto-customizada.jpg",
      scheduleInfo: "Horario antigo",
      whatsappNumber: "11000000000",
      faixaEtaria: "Juvenil e Adulto",
      isActive: true,
    };

    const sincronizadas = sincronizarEscolinhasComContratos(
      [escolinhaExistente],
      [contratoMock as any]
    );

    expect(sincronizadas).toHaveLength(1);
    const atualizada = sincronizadas[0];
    expect(atualizada.id).toBe("esc_existente");
    expect(atualizada.contratoId).toBe("cont_01");
    // Atualizou professor e contato
    expect(atualizada.teacherName).toBe("Prof. Ricardo Silva");
    expect(atualizada.whatsappNumber).toBe("11988887777");
    expect(atualizada.scheduleInfo).toBe("Seg e Qua: 18:00 às 19:30");
    // Manteve foto e faixa etária da LP!
    expect(atualizada.teacherImageUrl).toBe("https://meusite.com/foto-customizada.jpg");
    expect(atualizada.faixaEtaria).toBe("Juvenil e Adulto");
  });

  it("cria novo item na LP quando surge um contrato ainda não sincronizado", async () => {
    const { sincronizarEscolinhasComContratos } = await import(
      "@/lib/institucional/institucionalHelpers"
    );

    const sincronizadas = sincronizarEscolinhasComContratos([], [contratoMock as any]);
    expect(sincronizadas).toHaveLength(1);
    expect(sincronizadas[0].contratoId).toBe("cont_01");
    expect(sincronizadas[0].teacherName).toBe("Prof. Ricardo Silva");
    expect(sincronizadas[0].teacherImageUrl).toContain("unsplash.com");
  });

  it("converte diretamente ContratoRecorrente para EscolinhaItem com os mesmos dados", async () => {
    const { converterContratoParaEscolinhaItem } = await import(
      "@/lib/institucional/institucionalHelpers"
    );

    const contratoCompleto = {
      ...contratoMock,
      fotoUrl: "https://foto.com/prof.jpg",
      faixaEtaria: "Infantil (6 a 12 anos)",
    };

    const item = converterContratoParaEscolinhaItem(contratoCompleto as any);
    expect(item.id).toBe("cont_01");
    expect(item.teacherName).toBe("Prof. Ricardo Silva");
    expect(item.teacherImageUrl).toBe("https://foto.com/prof.jpg");
    expect(item.faixaEtaria).toBe("Infantil (6 a 12 anos)");
    expect(item.scheduleInfo).toBe("Seg e Qua: 18:00 às 19:30");
  });
});

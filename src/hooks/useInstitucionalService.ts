/**
 * @module hooks/useInstitucionalService
 *
 * Hook React para gerenciar os dados da galeria de fotos da estrutura
 * e das escolinhas esportivas, integrando leitura, criação, edição,
 * exclusão, upload de imagens, filtros de categoria e sincronização
 * bidirecional com os contratos de escolinhas da agenda.
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type {
  GaleriaItem,
  EscolinhaItem,
  FiltroCategoriaGaleria,
  CriarGaleriaInput,
  AtualizarGaleriaInput,
  CriarEscolinhaInput,
  AtualizarEscolinhaInput,
} from "@/lib/institucional/types";
import {
  filtrarGaleria,
  filtrarEscolinhas,
  converterContratoParaEscolinhaItem,
} from "@/lib/institucional/institucionalHelpers";
import {
  listarGaleria,
  criarGaleriaItem,
  atualizarGaleriaItem,
  excluirGaleriaItem,
  uploadImagemInstitucional,
} from "@/lib/supabase/institucionalRepository";
import { GALERIA_INICIAL } from "@/lib/institucional/dadosIniciais";
import { useContratosService } from "@/hooks/useContratosService";

export function useInstitucionalService() {
  const [galeria, setGaleria] = useState<GaleriaItem[]>([...GALERIA_INICIAL]);
  const [carregando, setCarregando] = useState(true);
  const [filtroCategoria, setFiltroCategoria] = useState<FiltroCategoriaGaleria>("todas");

  // Acesso direto aos contratos de escolinhas cadastrados na aba Escolinhas (mesmo banco)
  const { getContratosPorTipo, criarContrato, atualizarContrato, encerrarContrato } =
    useContratosService();
  const contratosEscolinhas = useMemo(
    () => getContratosPorTipo("escolinha"),
    [getContratosPorTipo]
  );

  // Escolinhas unificadas diretamente a partir dos contratos
  const escolinhas: EscolinhaItem[] = useMemo(() => {
    return contratosEscolinhas.map(converterContratoParaEscolinhaItem);
  }, [contratosEscolinhas]);

  const recarregar = useCallback(async () => {
    try {
      const itensGaleria = await listarGaleria();
      setGaleria(itensGaleria);
    } catch {
      // Fallback gracioso mantendo os itens iniciais da galeria
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  // Lista pública de fotos filtradas por categoria (apenas ativas)
  const galeriaFiltrada = useMemo(() => {
    return filtrarGaleria(galeria, filtroCategoria, true);
  }, [galeria, filtroCategoria]);

  // Lista pública de escolinhas (apenas ativas)
  const escolinhasAtivas = useMemo(() => {
    return filtrarEscolinhas(escolinhas, true);
  }, [escolinhas]);

  // Sincronização direta garantida
  const sincronizarComContratos = useCallback(async () => {
    return { totalSincronizadas: contratosEscolinhas.length };
  }, [contratosEscolinhas.length]);

  // Ações de gerenciamento da galeria
  const criarFoto = useCallback(async (input: CriarGaleriaInput) => {
    const criada = await criarGaleriaItem(input);
    setGaleria((prev) => [...prev, criada]);
    return criada;
  }, []);

  const atualizarFoto = useCallback(
    async (id: string, input: AtualizarGaleriaInput) => {
      const atualizada = await atualizarGaleriaItem(id, input);
      if (atualizada) {
        setGaleria((prev) => prev.map((item) => (item.id === id ? atualizada : item)));
      }
      return atualizada;
    },
    []
  );

  const removerFoto = useCallback(async (id: string) => {
    const ok = await excluirGaleriaItem(id);
    if (ok) {
      setGaleria((prev) => prev.filter((item) => item.id !== id));
    }
    return ok;
  }, []);

  // Ações de gerenciamento das escolinhas diretamente no mesmo banco (contratos_recorrentes)
  const criarNovaEscolinha = useCallback(
    async (input: CriarEscolinhaInput) => {
      const res = await criarContrato({
        tipo: "escolinha",
        nome: input.sportName,
        esporte: "Outro",
        responsavelNome: input.teacherName,
        contatoWhatsapp: input.whatsappNumber,
        fotoUrl: input.teacherImageUrl,
        faixaEtaria: input.faixaEtaria,
        descricao: input.descricao,
        quadraId: "q1",
        diasSemana: [1, 3],
        horaInicio: "08:00",
        horaFim: "10:00",
        dataInicio: new Date().toISOString().split("T")[0],
        meses: 12,
      });

      if (res.ok) {
        return converterContratoParaEscolinhaItem(res.contrato);
      }
      throw new Error(res.erros?.join(", ") || "Erro ao cadastrar escolinha");
    },
    [criarContrato]
  );

  const atualizarEscolinhaExistente = useCallback(
    async (id: string, input: AtualizarEscolinhaInput) => {
      const res = await atualizarContrato(id, {
        ...(input.sportName !== undefined ? { nome: input.sportName } : {}),
        ...(input.teacherName !== undefined ? { responsavelNome: input.teacherName } : {}),
        ...(input.whatsappNumber !== undefined ? { contatoWhatsapp: input.whatsappNumber } : {}),
        ...(input.teacherImageUrl !== undefined ? { fotoUrl: input.teacherImageUrl } : {}),
        ...(input.faixaEtaria !== undefined ? { faixaEtaria: input.faixaEtaria } : {}),
        ...(input.descricao !== undefined ? { descricao: input.descricao } : {}),
        ...(input.isActive !== undefined ? { ativo: input.isActive } : {}),
      });
      return res.ok;
    },
    [atualizarContrato]
  );

  const removerEscolinhaExistente = useCallback(
    async (id: string) => {
      const res = await atualizarContrato(id, { ativo: false });
      return res.ok;
    },
    [atualizarContrato]
  );

  return {
    galeria,
    escolinhas,
    galeriaFiltrada,
    escolinhasAtivas,
    contratosEscolinhas,
    carregando,
    filtroCategoria,
    setFiltroCategoria,
    recarregar,
    sincronizarComContratos,
    criarFoto,
    atualizarFoto,
    removerFoto,
    criarNovaEscolinha,
    atualizarEscolinhaExistente,
    removerEscolinhaExistente,
    fazerUploadImagem: uploadImagemInstitucional,
  };
}

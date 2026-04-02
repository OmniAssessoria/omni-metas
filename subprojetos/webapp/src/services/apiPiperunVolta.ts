import axios from "axios";

// ============================================================================
// CONFIGURAÇÕES E CONSTANTES
// ============================================================================
const TOKEN_PIPERUN = "3dfa1682a3832478cb29a7b9a4c86233";
const HASH_GANHOS = "c1d9312f-db68-4379-8820-a5d3619ec002";
const FUNIS_PERDAS = [93990, 91356, 103176, 91369, 77127, 90697, 102509];

const apiPipeRun = axios.create({
  baseURL: "https://api.pipe.run/v1",
  headers: {
    accept: "application/json",
    token: TOKEN_PIPERUN,
  },
});

const apiInterna = axios.create({
  baseURL: "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
});


/**
 * Função utilitária para criar pausas (evitar erro 429 Too Many Requests)
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Função para garantir que o CNPJ sempre tenha pontuação
 */
const formatarCNPJ = (cnpj: string): string => {
  if (!cnpj) return "";
  const numeros = cnpj.replace(/\D/g, "");
  if (numeros.length !== 14) return cnpj; 
  return numeros.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
};

const obterCustomField = (customFields: any[], fieldId: number | string, fieldName: string) => {
  if (!customFields) return null;
  const field = customFields.find((f) => f.id === fieldId || f.name === fieldName);
  return field ? field.value : null;
};

/**
 * Busca o CNPJ com sistema de Retry (Tentativas) e Delay
 */
const buscarCnpjPorCompanyId = async (companyId: number, tentativas = 3): Promise<string | null> => {
  try {
    await delay(300); 
    
    const response = await apiPipeRun.get(`/companies/${companyId}`);
    if (response.data && response.data.success && response.data.data.cnpj) {
      return formatarCNPJ(response.data.data.cnpj);
    }
    return null;
  } catch (error: any) {
    if (error.response && error.response.status === 429 && tentativas > 0) {
      console.warn(`[Rate Limit] 429 no PipeRun para ID ${companyId}. Aguardando 2s para tentar novamente...`);
      await delay(2000); 
      return buscarCnpjPorCompanyId(companyId, tentativas - 1);
    }
    console.error(`Erro ao buscar empresa ID ${companyId} no PipeRun:`, error.message);
    return null;
  }
};

const buscarTodasAsPaginas = async (urlBase: string) => {
  let paginaAtual = 1;
  let temMaisDados = true;
  const todosOsResultados = [];

  while (temMaisDados) {
    const urlCompleta = `${urlBase}&page=${paginaAtual}`;
    try {
      const response = await apiPipeRun.get(urlCompleta);
      const dadosPagina = response.data.data;

      if (!dadosPagina || dadosPagina.length === 0) {
        temMaisDados = false;
        break;
      }

      todosOsResultados.push(...dadosPagina);
      paginaAtual++;
      await delay(200); 
    } catch (error) {
      console.error(`[Erro na Paginação] Falha ao buscar URL: ${urlCompleta}`, error);
      temMaisDados = false;
    }
  }
  return todosOsResultados;
};
// ============================================================================
// FUNÇÃO PRINCIPAL DE SINCRONIZAÇÃO
// ============================================================================

export interface IProgressState {
  etapa: "iniciando" | "buscando_piperun" | "processando" | "enviando_backend" | "concluido";
  mensagem: string;
  atual: number;
  total: number;
  percentual: number;
}

/**
 * Função principal que será chamada pelo Frontend ao escolher a data
 * @param dataEscolhida Formato "YYYY-MM-DD"
 * @param onProgress Callback para atualizar a barra de progresso no frontend
 */
export const sincronizarDadosPipeRun = async (
  dataEscolhida: string,
  onProgress?: (progresso: IProgressState) => void
) => {
  
  const emitirProgresso = (
    etapa: IProgressState["etapa"],
    mensagem: string,
    atual: number = 0,
    total: number = 0
  ) => {
    console.log(`[Progresso - ${etapa}] ${mensagem}`); 
    if (onProgress) {
      const percentual = total > 0 ? Math.round((atual / total) * 100) : 0;
      onProgress({ etapa, mensagem, atual, total, percentual });
    }
  };

  const closedAtStart = `${dataEscolhida} 00:00:00`;
  const closedAtEnd = `${dataEscolhida} 23:59:59`;
  const paramsComplementares = `&closed_at_start=${closedAtStart}&closed_at_end=${closedAtEnd}&with=customFields,company,owner,lostReason&show=200`;
  
  const dealsBrutos: any[] = [];

  try {
    emitirProgresso("iniciando", `Iniciando busca para a data: ${dataEscolhida}`);

    emitirProgresso("buscando_piperun", `Extraindo Ganhos do Hash...`);
    const urlGanhos = `/deals?cursor=""&hash=${HASH_GANHOS}&status=1${paramsComplementares}`;
    const ganhosExtraidos = await buscarTodasAsPaginas(urlGanhos);
    dealsBrutos.push(...ganhosExtraidos);

    for (let i = 0; i < FUNIS_PERDAS.length; i++) {
      const pipelineId = FUNIS_PERDAS[i];
      emitirProgresso(
        "buscando_piperun", 
        `Consultando perdas no funil ${i + 1} de ${FUNIS_PERDAS.length}...`
      );
      const urlPerdas = `/deals?cursor=""&pipeline_id=${pipelineId}&status=3${paramsComplementares}`;
      const perdasExtraidas = await buscarTodasAsPaginas(urlPerdas);
      dealsBrutos.push(...perdasExtraidas);
    }

    if (dealsBrutos.length === 0) {
      emitirProgresso("concluido", `Nenhum deal encontrado para a data informada.`);
      return {
        sucesso: true,
        mensagem: "Nenhum dado para processar.",
        totalProcessado: 0,
      };
    }

    emitirProgresso("processando", `Estruturando ${dealsBrutos.length} deals encontrados...`);
    const dealsFormatados = [];

    for (let i = 0; i < dealsBrutos.length; i++) {
      const deal = dealsBrutos[i];

      if (i % 20 === 0) {
        emitirProgresso("processando", `Formatando registro ${i} de ${dealsBrutos.length}...`);
      }

      let cnpjBruto = obterCustomField(deal.customFields, 592065, "CNPJ");
      let cnpj = cnpjBruto ? formatarCNPJ(String(cnpjBruto)) : null;
      
      if (!cnpj && deal.company_id) {
        cnpj = await buscarCnpjPorCompanyId(deal.company_id);
      }

      if (!cnpj) continue;

      const operadoraOriginal = obterCustomField(deal.customFields, 631881, "Operadora do Pedido");
      let tipoServico = "CLARO";

      if (Array.isArray(operadoraOriginal) && operadoraOriginal[0]) {
        tipoServico = String(operadoraOriginal[0]).toUpperCase();
      } else if (typeof operadoraOriginal === "string") {
        tipoServico = operadoraOriginal.toUpperCase();
      }

      const isGanho = deal.status === 1 || deal.lost_reason_id === null;
      const observacao = deal.observation || deal.description || "Sem detalhes";

      dealsFormatados.push({
        cnpj: cnpj,
        codigo_crm: deal.owner_id,
        tipo_servico: tipoServico,
        data_inicio_atendimento: deal.created_at,
        data_fim_atendimento: deal.closed_at,
        seq_motivo_declinio: isGanho ? null : deal.lost_reason_id,
        observacao_fechamento: observacao,
        is_ganho: isGanho,
      });
    }

    const totalEnvios = dealsFormatados.length;
    emitirProgresso("enviando_backend", `Iniciando envio ao backend...`, 0, totalEnvios);

    const sucessosProcessados = [];
    const falhasProcessadas = [];

    for (let i = 0; i < totalEnvios; i++) {
      const dado = dealsFormatados[i];
      emitirProgresso("enviando_backend", `Sincronizando CNPJ: ${dado.cnpj}`, i + 1, totalEnvios);

      try {
        const response = await apiInterna.patch("/servico-claro/piperun/sincronizar", dado);
        sucessosProcessados.push({
          payload: dado,
          respostaApi: response.data || "Sucesso",
        });
      } catch (error: any) {
        falhasProcessadas.push({
          payload: dado,
          erro: error.response?.data || error.message,
        });
      }
    }

    emitirProgresso("concluido", `Processo finalizado.`);

    return {
      sucesso: true,
      mensagem: `Processo finalizado. Sincronizados: ${sucessosProcessados.length}. Falhas: ${falhasProcessadas.length}.`,
      totalProcessado: totalEnvios,
      detalhes: {
        sucessos: sucessosProcessados,
        falhas: falhasProcessadas,
      },
    };
  } catch (error: any) {
    emitirProgresso("concluido", `Erro crítico: ${error.message}`);
    throw new Error("Falha geral ao extrair ou enviar dados.");
  }
};

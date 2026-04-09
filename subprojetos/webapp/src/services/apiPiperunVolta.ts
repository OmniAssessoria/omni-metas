import axios from "axios";

// ============================================================================
// CONFIGURAÇÕES E CONSTANTES
// ============================================================================
const TOKEN_PIPERUN = "3dfa1682a3832478cb29a7b9a4c86233";

const PIPELINE_GANHOS = 95219;
const STAGE_GANHOS = 607025;

const FUNIS_PERDAS = [95219, 93990, 91356, 103176, 91369, 77127, 90697, 102509];

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

// ============================================================================
// FUNÇÕES UTILITÁRIAS
// ============================================================================

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

/**
 * Busca um campo customizado específico dentro do array de customFields
 */
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

/**
 * Busca todas as páginas de um endpoint utilizando o parâmetro 'page' e 'show=200'
 */
const buscarTodasAsPaginas = async (urlBase: string, parametrosBasicos: any) => {
  let paginaAtual = 1;
  let temMaisDados = true;
  const todosOsResultados = [];

  while (temMaisDados) {
    try {
      const params = {
        ...parametrosBasicos,
        page: paginaAtual,
        show: 200
      };

      const response = await apiPipeRun.get(urlBase, { params });
      const dadosPagina = response.data?.data || [];

      if (dadosPagina.length === 0) {
        temMaisDados = false;
        break;
      }

      todosOsResultados.push(...dadosPagina);

      paginaAtual++;
      await delay(200);

    } catch (error: any) {
      console.error(`[Erro na Paginação] Falha ao buscar página ${paginaAtual}`, error.response?.data || error.message);
      temMaisDados = false;
    }
  }
  return todosOsResultados;
};

/**
 * GERA UMA LISTA DE DATAS ENTRE A DATA INICIAL E FINAL
 * Se as datas forem iguais, retorna um array com apenas aquela data.
 */
const obterListaDeDatas = (dataInicial: string, dataFinal: string): string[] => {
  const datas: string[] = [];
  
  // Usando T00:00:00 para evitar problemas de fuso horário que pulam/voltam um dia
  let dataAtual = new Date(dataInicial + "T00:00:00");
  const dataLimite = new Date(dataFinal + "T00:00:00");

  // Garante que se a final for menor que a inicial por erro humano, inverta ou processe só a inicial
  if (dataLimite < dataAtual) {
      return [dataInicial];
  }

  while (dataAtual <= dataLimite) {
    datas.push(dataAtual.toISOString().split("T")[0]);
    dataAtual.setDate(dataAtual.getDate() + 1);
  }
  
  return datas;
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
 * Função principal que será chamada pelo Frontend ao escolher o range de datas
 * @param dataInicial Formato "YYYY-MM-DD"
 * @param dataFinal Formato "YYYY-MM-DD"
 * @param onProgress Callback para atualizar a barra de progresso no frontend
 */
export const sincronizarDadosPipeRun = async (
  dataInicial: string,
  dataFinal: string,
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

  const dealsBrutos: any[] = [];

  const datasParaProcessar = obterListaDeDatas(dataInicial, dataFinal || dataInicial);

  try {
    emitirProgresso("iniciando", `Iniciando busca estruturada. Período: ${datasParaProcessar.length} dia(s).`);

    for (let d = 0; d < datasParaProcessar.length; d++) {
      const dataAtual = datasParaProcessar[d];
      
      emitirProgresso(
        "buscando_piperun", 
        `[${d + 1}/${datasParaProcessar.length}] Buscando dados do dia: ${dataAtual}`
      );

      const paramsComuns = {
        closed_at_start: dataAtual,
        closed_at_end: dataAtual,
        with: "customFields,company,owner,lostReason"
      };

      const paramsGanhos = {
        pipeline_id: PIPELINE_GANHOS,
        stage_id: STAGE_GANHOS,
        status: 1,
        ...paramsComuns
      };

      const ganhosExtraidos = await buscarTodasAsPaginas("/deals", paramsGanhos);
      dealsBrutos.push(...ganhosExtraidos);

      for (let i = 0; i < FUNIS_PERDAS.length; i++) {
        const pipelineId = FUNIS_PERDAS[i];
        const paramsPerdas = {
          pipeline_id: pipelineId,
          status: 3,
          ...paramsComuns
        };
        const perdasExtraidas = await buscarTodasAsPaginas("/deals", paramsPerdas);
        dealsBrutos.push(...perdasExtraidas);
      }
    }

    if (dealsBrutos.length === 0) {
      emitirProgresso("concluido", `Nenhum deal encontrado no período informado.`);
      return {
        sucesso: true,
        mensagem: "Nenhum dado para processar neste período.",
        totalProcessado: 0,
      };
    }

    emitirProgresso("processando", `Estruturando ${dealsBrutos.length} deals encontrados no total...`);
    const dealsFormatados = [];

    for (let i = 0; i < dealsBrutos.length; i++) {
      const deal = dealsBrutos[i];

      if (i % 20 === 0) {
        emitirProgresso("processando", `Formatando registro ${i + 1} de ${dealsBrutos.length}...`);
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
    emitirProgresso("enviando_backend", `Iniciando envio de ${totalEnvios} registros ao backend...`, 0, totalEnvios);

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

    emitirProgresso("concluido", `Processo finalizado com sucesso.`);

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

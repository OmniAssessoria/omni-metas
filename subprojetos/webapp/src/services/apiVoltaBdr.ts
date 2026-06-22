import { TOKEN_PIPERUN } from "@/configs/piperunConfigs.config";
import axios from "axios";
import { URL_API_LOCAL } from "./api"; // Ajuste o caminho conforme seu projeto

// ============================================================================
// CONFIGURAÇÕES E CONSTANTES
// ============================================================================

// NOVO FUNIL UNIFICADO PARA GANHOS E PERDAS
export const PIPELINE_UNIFICADO = 104307;

const apiPipeRun = axios.create({
  baseURL: "https://api.pipe.run/v1",
  headers: {
    accept: "application/json",
    token: TOKEN_PIPERUN,
  },
});

const apiInterna = axios.create({
  baseURL: `${URL_API_LOCAL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================================================
// FUNÇÕES UTILITÁRIAS
// ============================================================================

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
      console.warn(`[Rate Limit] 429 no PipeRun para ID ${companyId}. Aguardando 2s...`);
      await delay(2000);
      return buscarCnpjPorCompanyId(companyId, tentativas - 1);
    }
    console.error(`Erro ao buscar empresa ID ${companyId} no PipeRun:`, error.message);
    return null;
  }
};

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
      await delay(200); // Respeito ao limite de requisições do PipeRun
    } catch (error: any) {
      console.error(`[Erro na Paginação] Falha ao buscar página ${paginaAtual}`, error.response?.data || error.message);
      temMaisDados = false;
    }
  }
  return todosOsResultados;
};

const obterListaDeDatas = (dataInicial: string, dataFinal: string): string[] => {
  const datas: string[] = [];
  let dataAtual = new Date(dataInicial + "T00:00:00");
  const dataLimite = new Date(dataFinal + "T00:00:00");

  if (dataLimite < dataAtual) {
      return [dataInicial];
  }

  while (dataAtual <= dataLimite) {
    datas.push(dataAtual.toISOString().split("T")[0]);
    dataAtual.setDate(dataAtual.getDate() + 1);
  }
  
  return datas;
};

export interface IProgressState {
  etapa: "iniciando" | "buscando_piperun" | "processando" | "enviando_backend" | "concluido";
  mensagem: string;
  atual: number;
  total: number;
  percentual: number;
  ativo: boolean;
}

// ============================================================================
// FUNÇÃO PRINCIPAL DE SINCRONIZAÇÃO
// ============================================================================

export const sincronizarDadosPipeRun = async (
  dataInicial: string,
  dataFinal: string,
  onProgress?: (progresso: Omit<IProgressState, "ativo">) => void
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
    emitirProgresso("iniciando", `Iniciando extração do PipeRun. Período: ${datasParaProcessar.length} dia(s).`);

    for (let d = 0; d < datasParaProcessar.length; d++) {
      const dataAtual = datasParaProcessar[d];
      
      emitirProgresso(
        "buscando_piperun", 
        `[${d + 1}/${datasParaProcessar.length}] Buscando dados do dia: ${dataAtual.split('-').reverse().join('/')}`
      );

      const paramsComuns = {
        closed_at_start: dataAtual,
        closed_at_end: dataAtual,
        with: "customFields,company,owner,lostReason"
      };

      // 1. Busca Ganhos no funil 104307 (Status: 1)
      const paramsGanhos = {
        pipeline_id: PIPELINE_UNIFICADO,
        status: 1,
        ...paramsComuns
      };
      const ganhosExtraidos = await buscarTodasAsPaginas("/deals", paramsGanhos);
      dealsBrutos.push(...ganhosExtraidos);

      // 2. Busca Perdas no funil 104307 (Status: 3)
      const paramsPerdas = {
        pipeline_id: PIPELINE_UNIFICADO,
        status: 3,
        ...paramsComuns
      };
      const perdasExtraidas = await buscarTodasAsPaginas("/deals", paramsPerdas);
      dealsBrutos.push(...perdasExtraidas);
    }

    if (dealsBrutos.length === 0) {
      emitirProgresso("concluido", `Nenhum negócio encontrado no período informado.`);
      return {
        sucesso: true,
        mensagem: "Nenhum dado para processar neste período.",
        totalProcessado: 0,
        detalhes: { sucessos: [], falhas: [] }
      };
    }

    emitirProgresso("processando", `Estruturando ${dealsBrutos.length} negócios encontrados...`);
    const dealsFormatados = [];

    for (let i = 0; i < dealsBrutos.length; i++) {
      const deal = dealsBrutos[i];

      if (i % 10 === 0) {
        emitirProgresso("processando", `Analisando negócio ${i + 1} de ${dealsBrutos.length}...`);
      }

      let cnpjBruto = obterCustomField(deal.customFields, 592065, "CNPJ");
      let cnpj = cnpjBruto ? formatarCNPJ(String(cnpjBruto)) : null;

      if (!cnpj && deal.company_id) {
        cnpj = await buscarCnpjPorCompanyId(deal.company_id);
      }

      if (!cnpj) continue; // Ignora negócios sem CNPJ amarrado

      const operadoraOriginal = obterCustomField(deal.customFields, 631881, "Operadora do Pedido");
      let tipoServico = "CLARO";

      if (Array.isArray(operadoraOriginal) && operadoraOriginal[0]) {
        tipoServico = String(operadoraOriginal[0]).toUpperCase();
      } else if (typeof operadoraOriginal === "string") {
        tipoServico = operadoraOriginal.toUpperCase();
      }

      const isGanho = deal.status === 1;

      dealsFormatados.push({
        cnpj: cnpj,
        codigo_crm: deal.owner_id,
        tipo_servico: tipoServico,
        data_inicio_atendimento: deal.created_at,
        data_fim_atendimento: deal.closed_at,
        seq_motivo_declinio: isGanho ? null : deal.lost_reason_id,
        is_ganho: isGanho,
      });
    }

    const totalEnvios = dealsFormatados.length;
    emitirProgresso("enviando_backend", `Sincronizando ${totalEnvios} registros com o banco de dados...`, 0, totalEnvios);

    const sucessosProcessados = [];
    const falhasProcessadas = [];

    for (let i = 0; i < totalEnvios; i++) {
      const dado = dealsFormatados[i];
      emitirProgresso("enviando_backend", `Atualizando DB para CNPJ: ${dado.cnpj}`, i + 1, totalEnvios);

      try {
        const response = await apiInterna.patch("/servico-omni/leads/sincronizar", dado);
        sucessosProcessados.push({
          payload: dado,
          respostaApi: response.data || "Sucesso",
        });
      } catch (error: any) {
        falhasProcessadas.push({
          payload: dado,
          erro: error.response?.data?.detalhes || error.response?.data?.mensagem || error.message,
        });
      }
    }

    emitirProgresso("concluido", `Processo finalizado com sucesso.`);

    return {
      sucesso: true,
      mensagem: `Sincronização concluída: ${sucessosProcessados.length} atualizados, ${falhasProcessadas.length} falhas.`,
      totalProcessado: totalEnvios,
      detalhes: {
        sucessos: sucessosProcessados,
        falhas: falhasProcessadas,
      },
    };
  } catch (error: any) {
    emitirProgresso("concluido", `Erro estrutural: ${error.message}`);
    throw new Error("Falha geral ao extrair ou enviar dados do PipeRun.");
  }
};

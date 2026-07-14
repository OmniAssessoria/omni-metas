import axios from "axios";
import { URL_API_LOCAL } from "./api";

// ============================================================================
// CONFIGURAÇÕES E CONSTANTES DO NOVO CRM OMNI
// ============================================================================
const TOKEN_OMNI_CRM = "axn_-jjcxVoIlR7NgWNPsszE_0mc9LIVGTBwxgKTNqL_iSM";
const PIPELINE_BDR_ID = "wm2n294u8vgp31duczik6iak";

const apiOmniCrm = axios.create({
  baseURL: "https://omniassessoria.online/api/local/v1",
  headers: {
    accept: "application/json",
    Authorization: `Bearer ${TOKEN_OMNI_CRM}`,
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

/**
 * Realiza a varredura completa das páginas do CRM utilizando paginação por Cursor
 */
const buscarTodosOsDealsPorCursor = async (parametrosBasicos: any): Promise<any[]> => {
  let cursorAtual: string | null = null;
  let temMaisDados = true;
  const todosOsDeals: any[] = [];

  while (temMaisDados) {
    try {
      const params: any = {
        ...parametrosBasicos,
        limit: 200,
        sort: "closedAt:desc",
      };

      if (cursorAtual) {
        params.cursor = cursorAtual;
      }

      const response = await apiOmniCrm.get("/deals", { params });

      if (response.data && response.data.ok) {
        const dadosPagina = response.data.data || [];

        if (dadosPagina.length === 0) {
          temMaisDados = false;
          break;
        }

        todosOsDeals.push(...dadosPagina);
        cursorAtual = response.data.nextCursor;

        if (!cursorAtual) {
          temMaisDados = false;
        }
      } else {
        temMaisDados = false;
      }

      await delay(150);
    } catch (error: any) {
      console.error(
        `[Erro na Paginação por Cursor] Falha ao processar requisição. Cursor: ${cursorAtual}`,
        error.response?.data || error.message,
      );
      temMaisDados = false;
    }
  }

  return todosOsDeals;
};

export interface IProgressState {
  etapa: "iniciando" | "buscando_crm" | "processando" | "enviando_backend" | "concluido";
  mensagem: string;
  atual: number;
  total: number;
  percentual: number;
  ativo: boolean; 
}

/**
 * Sincroniza os negócios do funil BDR salvando o histórico de atendimento no banco local
 * @param dataInicial Formato "YYYY-MM-DD"
 * @param dataFinal Formato "YYYY-MM-DD"
 * @param onProgress Callback opcional para atualizar o componente visual de progresso (Modal/ProgressBar)
 */
export const sincronizarDadosOmniCrmBdr = async (
  dataInicial: string,
  dataFinal: string,
  onProgress?: (progresso: Omit<IProgressState, "ativo">) => void, 
) => {
  const emitirProgresso = (
    etapa: IProgressState["etapa"],
    mensagem: string,
    atual: number = 0,
    total: number = 0,
  ) => {
    console.log(`[Progresso BDR - ${etapa}] ${mensagem}`);
    if (onProgress) {
      const percentual = total > 0 ? Math.round((atual / total) * 100) : 0;
      onProgress({ etapa, mensagem, atual, total, percentual });
    }
  };
  
  const dealsBrutos: any[] = [];

  try {
    emitirProgresso("iniciando", `Conectando ao CRM Omni BDR. Período: ${dataInicial} até ${dataFinal || dataInicial}`);

    const filtrosComuns = {
      pipelineId: PIPELINE_BDR_ID,
      closedFrom: dataInicial,
      closedTo: dataFinal || dataInicial,
    };

    emitirProgresso("buscando_crm", "Buscando negócios [GANHO] finalizados hoje no funil BDR...");
    const ganhos = await buscarTodosOsDealsPorCursor({ status: "won", ...filtrosComuns });
    dealsBrutos.push(...ganhos);

    emitirProgresso("buscando_crm", "Buscando negócios [PERDIDO] finalizados hoje no funil BDR...");
    const perdas = await buscarTodosOsDealsPorCursor({ status: "lost", ...filtrosComuns });
    dealsBrutos.push(...perdas);

    if (dealsBrutos.length === 0) {
      emitirProgresso("concluido", "Nenhum negócio movimentado (Won/Lost) neste período para o funil BDR.");
      return {
        sucesso: true,
        mensagem: "Nenhum dado para processar neste período.",
        totalProcessado: 0,
        detalhes: { sucessos: [], falhas: [] },
      };
    }

    emitirProgresso("processando", `Estruturando ${dealsBrutos.length} negócios coletados do CRM...`);
    const dealsFormatados = [];

    for (let i = 0; i < dealsBrutos.length; i++) {
      const deal = dealsBrutos[i];

      if (i % 20 === 0) {
        emitirProgresso("processando", `Normalizando metadados do registro ${i + 1} de ${dealsBrutos.length}...`);
      }

      if (!deal.companyCnpj) continue;
      const cnpj = formatarCNPJ(String(deal.companyCnpj));
      const isGanho = deal.status === "won";
      const emailConsultor = deal.owner?.email || null;
      const idMotivoDeclinioStr = isGanho ? null : deal.lostReasonId;

      dealsFormatados.push({
        cnpj: cnpj,
        email_consultor: emailConsultor,
        data_inicio_atendimento: deal.createdAt,
        data_fim_atendimento: deal.closedAt,
        id_motivo_declinio: idMotivoDeclinioStr,
        is_ganho: isGanho,
      });
    }

    const totalEnvios = dealsFormatados.length;
    emitirProgresso("enviando_backend", `Transmitindo ${totalEnvios} registros para processamento do histórico...`, 0, totalEnvios);

    const sucessosProcessados = [];
    const falhasProcessadas = [];

    for (let i = 0; i < totalEnvios; i++) {
      const dado = dealsFormatados[i];
      emitirProgresso("enviando_backend", `Alimentando histórico - CNPJ: ${dado.cnpj}`, i + 1, totalEnvios);

      try {
        const response = await apiInterna.patch("/servico-omni/leads/sincronizar", dado);
        
        if (response.data && response.data.ignorado) {
          falhasProcessadas.push({
            payload: dado,
            erro: response.data.mensagem 
          });
        } else {
          sucessosProcessados.push({
            payload: dado,
            respostaApi: response.data || "OK",
          });
        }
      } catch (error: any) {
        falhasProcessadas.push({
          payload: dado,
          erro: error.response?.data?.mensagem || error.message,
        });
      }
    }

    emitirProgresso("concluido", "Processamento de sincronização reversa concluído.");

    return {
      sucesso: true,
      mensagem: `Sincronização BDR finalizada: ${sucessosProcessados.length} atualizados, ${falhasProcessadas.length} falhas.`,
      totalProcessado: totalEnvios,
      detalhes: {
        sucessos: sucessosProcessados,
        falhas: falhasProcessadas,
      },
    };
  } catch (error: any) {
    emitirProgresso("concluido", `Erro estrutural: ${error.message}`);
    throw new Error(`Falha geral na extração reversa do CRM Omni BDR: ${error.message}`);
  }
};

import axios from "axios";
import { URL_API_LOCAL } from "./api";

const TOKEN_OMNI_CRM = "axn_-jjcxVoIlR7NgWNPsszE_0mc9LIVGTBwxgKTNqL_iSM";
const PIPELINE_LOCAL_ID = "wm2n294u8vgp31duczik6iak"; 

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

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const formatarCNPJ = (cnpj: string): string => {
  if (!cnpj) return "";
  const numeros = cnpj.replace(/\D/g, "");
  if (numeros.length !== 14) return cnpj;
  return numeros.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,"$1.$2.$3/$4-$5");
};

const obterCustomFieldPorKey = (customFields: any[], keyName: string) => {
  if (!customFields) return null;
  const field = customFields.find((f) => f.key === keyName);
  return field ? field.value : null;
};

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
        `[Erro na Paginação] Falha ao processar requisição. Cursor: ${cursorAtual}`,
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
}

export const sincronizarDadosOmniCrm = async (
  dataInicial: string,
  dataFinal: string,
  onProgress?: (progresso: IProgressState) => void,
) => {
  const emitirProgresso = (
    etapa: IProgressState["etapa"],
    mensagem: string,
    atual: number = 0,
    total: number = 0,
  ) => {
    console.log(`[Progresso - ${etapa}] ${mensagem}`);
    if (onProgress) {
      const percentual = total > 0 ? Math.round((atual / total) * 100) : 0;
      onProgress({ etapa, message: mensagem, atual, total, percentual } as any);
    }
  };

  const dealsBrutos: any[] = [];

  try {
    emitirProgresso("iniciando", `Conectando ao CRM Omni. Período: ${dataInicial} até ${dataFinal || dataInicial}`);

    const filtrosComuns = {
      pipelineId: PIPELINE_LOCAL_ID,
      closedFrom: dataInicial,
      closedTo: dataFinal || dataInicial,
    };

    emitirProgresso("buscando_crm", "Extraindo negócios com status [GANHO] via paginação por cursor...");
    const ganhos = await buscarTodosOsDealsPorCursor({ status: "won", ...filtrosComuns });
    dealsBrutos.push(...ganhos);

    emitirProgresso("buscando_crm", "Extraindo negócios com status [PERDIDO] via paginação por cursor...");
    const perdas = await buscarTodosOsDealsPorCursor({ status: "lost", ...filtrosComuns });
    dealsBrutos.push(...perdas);

    if (dealsBrutos.length === 0) {
      emitirProgresso("concluido", "Nenhum negócio ganho ou perdido localizado no período informado.");
      return { sucesso: true, mensagem: "Nenhum dado para processar neste período.", totalProcessado: 0 };
    }

    emitirProgresso("processando", `Estruturando ${dealsBrutos.length} negócios encontrados no CRM...`);
    const dealsFormatados = [];

    for (let i = 0; i < dealsBrutos.length; i++) {
      const deal = dealsBrutos[i];

      if (i % 20 === 0) {
        emitirProgresso("processando", `Normalizando metadados do registro ${i + 1} de ${dealsBrutos.length}...`);
      }

      if (!deal.companyCnpj) continue;
      const cnpj = formatarCNPJ(String(deal.companyCnpj));

      const docDrivePath = obterCustomFieldPorKey(deal.customFields, "docdrive");
      let tipoServico = "CLARO";

      if (docDrivePath && String(docDrivePath).toLowerCase().startsWith("vivo")) {
        tipoServico = "VIVO";
      }

      const isGanho = deal.status === "won";
      const emailConsultor = deal.owner?.email || null;
      const idMotivoDeclinioCrm = isGanho ? null : deal.lostReasonId;
      const observacao = deal.lostReason || "Sem detalhes adicionais mapeados";

      dealsFormatados.push({
        cnpj: cnpj,
        email_consultor: emailConsultor,
        tipo_servico: tipoServico,
        data_inicio_atendimento: deal.createdAt,
        data_fim_atendimento: deal.closedAt,
        id_motivo_declinio: idMotivoDeclinioCrm,
        observacao_fechamento: observacao,
        is_ganho: isGanho,
      });
    }

    const totalEnvios = dealsFormatados.length;
    emitirProgresso("enviando_backend", `Transmitindo ${totalEnvios} registros processados para a API interna...`, 0, totalEnvios);

    const sucessosProcessados = [];
    const falhasProcessadas = [];

    for (let i = 0; i < totalEnvios; i++) {
      const dado = dealsFormatados[i];
      emitirProgresso("enviando_backend", `Sincronizando lote - CNPJ: ${dado.cnpj}`, i + 1, totalEnvios);

      try {
        const response = await apiInterna.patch("/servico-claro/piperun/sincronizar", dado);
        sucessosProcessados.push({ payload: dado, respostaApi: response.data || "OK" });
      } catch (error: any) {
        falhasProcessadas.push({ payload: dado, erro: error.response?.data || error.message });
      }
    }

    emitirProgresso("concluido", "Sincronização com o CRM Omni concluída com sucesso.");

    return {
      sucesso: true,
      mensagem: `Processo finalizado. Sincronizados com sucesso: ${sucessosProcessados.length}. Falhas mapeadas: ${falhasProcessadas.length}.`,
      totalProcessado: totalEnvios,
      detalhes: { sucessos: sucessosProcessados, falhas: falhasProcessadas },
    };
  } catch (error: any) {
    emitirProgresso("concluido", `Erro crítico na operação: ${error.message}`);
    throw new Error(`Falha geral na extração de dados da Omni CRM: ${error.message}`);
  }
};

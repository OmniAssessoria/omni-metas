import axios from "axios";
import { TOKEN_PIPERUN } from "../configs/piperun.config";

// Exportamos a instância do Axios para que as funções internas tenham acesso a ela
export const apiPipeRun = axios.create({
  baseURL: "https://api.pipe.run/v1",
  headers: {
    accept: "application/json",
    token: TOKEN_PIPERUN,
  },
});

/**
 * Função utilitária para criar pausas (evitar erro 429 Too Many Requests)
 */
export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Função para garantir que o CNPJ sempre tenha pontuação
 */
export const formatarCNPJ = (cnpj: string): string => {
  if (!cnpj) return "";
  const numeros = cnpj.replace(/\D/g, "");
  if (numeros.length !== 14) return cnpj;
  return numeros.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5",
  );
};

export const obterCustomField = (
  customFields: any[],
  fieldId: number | string,
  fieldName: string,
) => {
  if (!customFields) return null;
  const field = customFields.find(
    (f) => f.id === fieldId || f.name === fieldName,
  );
  return field ? field.value : null;
};

/**
 * Busca o CNPJ com sistema de Retry (Tentativas) e Delay
 */
export const buscarCnpjPorCompanyId = async (
  companyId: number,
  tentativas = 3,
): Promise<string | null> => {
  try {
    await delay(300);

    const response = await apiPipeRun.get(`/companies/${companyId}`);
    if (response.data && response.data.success && response.data.data.cnpj) {
      return formatarCNPJ(response.data.data.cnpj);
    }
    return null;
  } catch (error: any) {
    if (error.response && error.response.status === 429 && tentativas > 0) {
      console.warn(
        `[CRON Rate Limit] 429 no PipeRun para ID ${companyId}. Aguardando 2s para tentar novamente...`,
      );
      await delay(2000);
      return buscarCnpjPorCompanyId(companyId, tentativas - 1);
    }
    console.error(
      `[CRON] Erro ao buscar empresa ID ${companyId} no PipeRun:`,
      error.message,
    );
    return null;
  }
};

/**
 * Motor de busca paginada com delay integrado (Refatorado para objetos params do Axios)
 */
export const buscarTodasAsPaginas = async (
  urlBase: string,
  parametrosBasicos: any,
) => {
  let paginaAtual = 1;
  let temMaisDados = true;
  const todosOsResultados = [];

  while (temMaisDados) {
    try {
      const params = {
        ...parametrosBasicos,
        page: paginaAtual,
        show: 200,
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
      console.error(
        `[CRON Erro Paginação] Falha ao buscar página ${paginaAtual} no endpoint ${urlBase}`,
        error.response?.data || error.message,
      );
      temMaisDados = false;
    }
  }
  return todosOsResultados;
};

import axios from "axios";
import { TOKEN_PIPERUN } from "../configs/piperun.config"; 

const apiPipeRun = axios.create({
  baseURL: "https://api.pipe.run/v1",
  headers: {
    accept: "application/json",
    token: TOKEN_PIPERUN,
  },
});

/**
 * Função utilitária para criar pausas (evitar erro 429 Too Many Requests)
 */
export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Função para garantir que o CNPJ sempre tenha pontuação
 */
export const formatarCNPJ = (cnpj: string): string => {
  if (!cnpj) return "";
  const numeros = cnpj.replace(/\D/g, "");
  if (numeros.length !== 14) return cnpj; 
  return numeros.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
};

export const obterCustomField = (customFields: any[], fieldId: number | string, fieldName: string) => {
  if (!customFields) return null;
  const field = customFields.find((f) => f.id === fieldId || f.name === fieldName);
  return field ? field.value : null;
};

/**
 * Busca o CNPJ com sistema de Retry (Tentativas) e Delay
 */
export const buscarCnpjPorCompanyId = async (companyId: number, tentativas = 3): Promise<string | null> => {
  try {
    await delay(300); 
    
    const response = await apiPipeRun.get(`/companies/${companyId}`);
    if (response.data && response.data.success && response.data.data.cnpj) {
      return formatarCNPJ(response.data.data.cnpj);
    }
    return null;
  } catch (error: any) {
    if (error.response && error.response.status === 429 && tentativas > 0) {
      console.warn(`[CRON Rate Limit] 429 no PipeRun para ID ${companyId}. Aguardando 2s para tentar novamente...`);
      await delay(2000); 
      return buscarCnpjPorCompanyId(companyId, tentativas - 1);
    }
    console.error(`[CRON] Erro ao buscar empresa ID ${companyId} no PipeRun:`, error.message);
    return null;
  }
};

/**
 * Motor de busca paginada com delay integrado
 */
export const buscarTodasAsPaginas = async (urlBase: string) => {
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
      await delay(200); // Delay entre páginas
    } catch (error) {
      console.error(`[CRON Erro Paginação] Falha ao buscar URL: ${urlCompleta}`, error);
      temMaisDados = false;
    }
  }
  return todosOsResultados;
};
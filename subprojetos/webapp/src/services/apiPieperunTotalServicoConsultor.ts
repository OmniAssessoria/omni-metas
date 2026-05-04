import axios from "axios";
import { TOKEN_PIPERUN } from "@/configs/piperunConfigs.config";

const apiPipeRunRest = axios.create({
  baseURL: "https://api.pipe.run/v1",
  headers: {
    accept: "application/json",
    token: TOKEN_PIPERUN,
  },
});

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function buscarTodasOportunidadesPipeline(pipelineId: number): Promise<any[]> {
  let todasOportunidades: any[] = [];
  let paginaAtual = 1;
  let temMaisPaginas = true;

  console.log(`[PipeRun] Iniciando busca total para o Pipeline ID: ${pipelineId}`);

  while (temMaisPaginas) {
    try {
      const response = await apiPipeRunRest.get("/deals?deleted=false&freezed=false", {
        params: { 
          pipeline_id: pipelineId, 
          status: 0, 
          page: paginaAtual,
          show: 200
        },
      });

      const data = response.data?.data || [];

      if (data.length === 0) {
        temMaisPaginas = false;
        break;
      }

      const dealsIsolados = data.filter((deal: any) => deal.pipeline_id === pipelineId);

      todasOportunidades.push(...dealsIsolados);
      paginaAtual++;
      await delay(250);

    } catch (error: any) {
      if (error.response && error.response.status === 429) {
        console.warn(`[Rate Limit 429] Pipeline ${pipelineId}, Página ${paginaAtual}. Aguardando 3s para tentar de novo...`);
        await delay(3000);
        continue; 
      }

      console.error(`[Erro Crítico] Falha ao buscar pipeline ${pipelineId} na página ${paginaAtual}:`, error.message);
      temMaisPaginas = false; 
    }
  }

  console.log(`[PipeRun] Pipeline ${pipelineId} concluído com sucesso. Total extraído: ${todasOportunidades.length} deals.`);
  return todasOportunidades;
}

export async function buscarOportunidadesGenericaPorPeriodo(
  paramsExtra: Record<string, any>,
  dataInicio: string,
  dataFim: string,
): Promise<any[]> {
  let todasOportunidades: any[] = [];
  let paginaAtual = 1;
  let temMaisPaginas = true;

  console.log(`[PipeRun] Buscando de ${dataInicio} até ${dataFim} com params:`, paramsExtra);

  while (temMaisPaginas) {
    try {
      const response = await apiPipeRunRest.get(
        "/deals?deleted=false&freezed=false",
        {
          params: {
            ...paramsExtra,
            created_at_start: `${dataInicio} 00:00:00`,
            created_at_end: `${dataFim} 23:59:59`,
            page: paginaAtual,
            show: 200,
          },
        },
      );

      const data = response.data?.data || [];

      if (data.length === 0) {
        temMaisPaginas = false;
        break;
      }

      todasOportunidades.push(...data);
      paginaAtual++;
      await delay(250);
    } catch (error: any) {
      if (error.response && error.response.status === 429) {
        console.warn(`[Rate Limit 429] Aguardando 3s para tentar de novo...`);
        await delay(3000);
        continue;
      }
      console.error(`[Erro] Falha ao buscar oportunidades dinâmicas:`, error.message);
      temMaisPaginas = false;
    }
  }

  return todasOportunidades;
}

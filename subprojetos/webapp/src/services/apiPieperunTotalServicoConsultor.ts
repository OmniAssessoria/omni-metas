import axios from "axios";
import { IConsultor } from "@/interfaces/pipeRunOportunidades.interface";

const TOKEN_PIPERUN = "3dfa1682a3832478cb29a7b9a4c86233";

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

  console.log(`[PipeRun] Pipeline ${pipelineId} concluído com sucesso. Total extraído (limpo): ${todasOportunidades.length} deals.`);
  return todasOportunidades;
}

export async function buscarOportunidadesPorPeriodo(
  pipelineId: number,
  dataInicio: string,
  dataFim: string,
): Promise<any[]> {
  let todasOportunidades: any[] = [];
  let paginaAtual = 1;
  let temMaisPaginas = true;

  console.log(
    `[PipeRun] Buscando Pipeline ${pipelineId} de ${dataInicio} até ${dataFim}`,
  );

  while (temMaisPaginas) {
    try {
      const response = await apiPipeRunRest.get(
        "/deals?deleted=false&freezed=false",
        {
          params: {
            pipeline_id: pipelineId,
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

      const dealsIsolados = data.filter(
        (deal: any) => deal.pipeline_id === pipelineId,
      );
      todasOportunidades.push(...dealsIsolados);

      paginaAtual++;
      await delay(250);
    } catch (error: any) {
      if (error.response && error.response.status === 429) {
        await delay(3000);
        continue;
      }
      console.error(
        `[Erro] Falha ao buscar pipeline ${pipelineId}:`,
        error.message,
      );
      temMaisPaginas = false;
    }
  }

  return todasOportunidades;
}

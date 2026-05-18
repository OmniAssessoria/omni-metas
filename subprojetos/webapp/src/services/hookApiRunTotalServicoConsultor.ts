import { IConsultor } from "@/interfaces/pipeRunOportunidades.interface";
import {
  buscarOportunidadesGenericaPorPeriodo,
  buscarTodasOportunidadesPipeline,
} from "./apiPieperunTotalServicoConsultor";

const PIPELINE_IDS = {
  CARTEIRA: 93990,
  RENOVACAO: 90697,
  PORTABILIDADE: 102509,
};

const FUNIS_ABERTOS_E_PERDIDOS = [
  90697, 102509, 94063, 93990, 91356, 103176, 91369, 77127,
];

const HASHES_GANHOS = [
  "c1d9312f-db68-4379-8820-a5d3619ec002",
  "6b9a2da5-c640-48c3-8cf5-adb63a726a27",
];

const regrasPerfisExatos: Record<number, string> = {
  89614: "RENOVACAO",
  89613: "RENOVACAO",
  95586: "RENOVACAO",
  100201: "RENOVACAO",
  100980: "RENOVACAO",
  99648: "RENOVACAO",
  100979: "RENOVACAO",
  102074: "RENOVACAO",
  102075: "RENOVACAO",
  102076: "RENOVACAO",
  103360: "RENOVACAO",
  103358: "RENOVACAO",
  103356: "RENOVACAO",
  100703: "PORTABILIDADE",
  58448: "PORTABILIDADE",
  58488: "RENOVACAO",
  59215: "RENOVACAO",
  92696: "RENOVACAO",
  97363: "CARTEIRA",
};

export async function compilarOportunidadesDinamico(
  consultoresDinamic: IConsultor[],
) {
  const [dealsCarteira, dealsRenovacao, dealsPortabilidade] = await Promise.all(
    [
      buscarTodasOportunidadesPipeline(PIPELINE_IDS.CARTEIRA),
      buscarTodasOportunidadesPipeline(PIPELINE_IDS.RENOVACAO),
      buscarTodasOportunidadesPipeline(PIPELINE_IDS.PORTABILIDADE),
    ],
  );

  const todosDeals = [
    ...dealsCarteira,
    ...dealsRenovacao,
    ...dealsPortabilidade,
  ];

  const resultadoFinal = consultoresDinamic.map((consultor) => {
    const perfilOperacional =
      regrasPerfisExatos[consultor.owner_id] || "RENOVACAO";
    let pipelinesPermitidos: number[] = [];

    if (perfilOperacional === "CARTEIRA")
      pipelinesPermitidos = [PIPELINE_IDS.CARTEIRA];
    else if (perfilOperacional === "PORTABILIDADE")
      pipelinesPermitidos = [PIPELINE_IDS.PORTABILIDADE];
    else if (perfilOperacional === "AMBOS")
      pipelinesPermitidos = [
        PIPELINE_IDS.RENOVACAO,
        PIPELINE_IDS.PORTABILIDADE,
      ];
    else pipelinesPermitidos = [PIPELINE_IDS.RENOVACAO];

    const totalDoConsultor = todosDeals.filter(
      (deal) =>
        deal.owner_id === consultor.owner_id &&
        pipelinesPermitidos.includes(deal.pipeline_id),
    ).length;

    return {
      nome: consultor.nome,
      perfil: perfilOperacional,
      total: totalDoConsultor,
    };
  });

  return resultadoFinal.filter((c) => c.total > 0);
}

export async function compilarRelatorioPerdas(
  consultoresDinamic: IConsultor[],
  dataInicio: string,
  dataFim: string,
) {
  console.log(
    `[PipeRun] Extraindo Safra (Criados entre ${dataInicio} e ${dataFim})...`,
  );
  const promessasPipelines = FUNIS_ABERTOS_E_PERDIDOS.map((pipelineId) =>
    buscarOportunidadesGenericaPorPeriodo(
      { pipeline_id: pipelineId },
      dataInicio,
      dataFim,
    ),
  );

  const promessasHashes = HASHES_GANHOS.map((hash) =>
    buscarOportunidadesGenericaPorPeriodo(
      { stage_hash: hash, status: 1 },
      dataInicio,
      dataFim,
    ),
  );

  const resultadosPipelines = await Promise.all(promessasPipelines);
  const resultadosHashes = await Promise.all(promessasHashes);

  const todosDealsFunis = resultadosPipelines.flat();
  const todosDealsGanhos = resultadosHashes.flat();

  const resultadoFinal = consultoresDinamic.map((consultor) => {
    const perfilOperacional =
      regrasPerfisExatos[consultor.owner_id] || "RENOVACAO";

    const dealsConsultorFunis = todosDealsFunis.filter(
      (deal) => deal.owner_id === consultor.owner_id,
    );

    const dealsConsultorGanhos = todosDealsGanhos.filter(
      (deal) => deal.owner_id === consultor.owner_id,
    );

    let totalAbertos = 0;
    let totalPerdidos = 0;
    let totalGanhos = 0;

    // ====================================================================
    // REGRA 1: GANHOS
    // Avalia a data de CRIAÇÃO (já garantido pelo fetch da API) em
    // conjunção estrita com a data de FECHAMENTO (avaliada via código).
    // O status 1 na requisição garante que é um ganho real.
    // ====================================================================
    dealsConsultorGanhos.forEach((deal) => {
      const dataFechamentoCompleta = deal.closed_at || deal.updated_at || "";
      const dataFechamentoValida = dataFechamentoCompleta.split(" ")[0];

      if (
        dataFechamentoValida >= dataInicio &&
        dataFechamentoValida <= dataFim
      ) {
        totalGanhos++;
      }
    });

    // Processamento de Funis (Abertos e Perdidos)
    dealsConsultorFunis.forEach((deal) => {
      if (deal.status === 0) {
        // ====================================================================
        // REGRA 2: ABERTOS
        // Avalia SOMENTE a data de criação (já garantido pelo fetch da API).
        // ====================================================================
        totalAbertos++;
      } else if (deal.status === 3) {
        // ====================================================================
        // REGRA 3: PERDIDOS
        // Avalia a data de CRIAÇÃO (via API) + Data de DECLÍNIO (via Código).
        // ====================================================================
        const dataDeclinioCompleta = deal.closed_at || deal.updated_at || "";
        const dataDeclinioValida = dataDeclinioCompleta.split(" ")[0];

        if (dataDeclinioValida >= dataInicio && dataDeclinioValida <= dataFim) {
          totalPerdidos++;
        }
      }
    });

    return {
      nome: consultor.nome,
      perfil: perfilOperacional,
      totalGanhos,
      totalPerdidos,
      totalAbertos,
    };
  });

  return resultadoFinal
    .filter(
      (c) => c.totalGanhos > 0 || c.totalPerdidos > 0 || c.totalAbertos > 0,
    )
    .sort(
      (a, b) =>
        b.totalGanhos +
        b.totalPerdidos +
        b.totalAbertos -
        (a.totalGanhos + a.totalPerdidos + a.totalAbertos),
    );
}

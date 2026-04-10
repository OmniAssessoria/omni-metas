import { IConsultor } from "@/interfaces/pipeRunOportunidades.interface";
import { buscarTodasOportunidadesPipeline } from "./apiPieperunTotalServicoConsultor";
import { buscarOportunidadesPorPeriodo } from "./apiPieperunTotalServicoConsultor";

const PIPELINE_IDS = {
  CARTEIRA: 93990,
  RENOVACAO: 90697,
  PORTABILIDADE: 102509,
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

  const regrasPerfisExatos: Record<number, string> = {
    89614: "RENOVACAO", // Aderlane Mendes
    89613: "RENOVACAO", // Aline Araujo
    95586: "RENOVACAO", // Julia Penafore
    100201: "RENOVACAO", // Leticia Ferreira
    100980: "RENOVACAO", // Lisa Leao
    99648: "RENOVACAO", // Natalia Ribeiro
    58488: "AMBOS", // Nathália Dadalte
    59215: "AMBOS", // Otavio Souza
    100979: "RENOVACAO", // Raquel Souza
    88311: "RENOVACAO", // Vitor Moreira
    100703: "PORTABILIDADE", // Gabrieli Lima
    58448: "PORTABILIDADE", // Letícia Ohara
    97363: "CARTEIRA", // Carolina Souza
    102074: "RENOVACAO", // Lara de Oliveira
    102075: "RENOVACAO", // Jessica Breve
    102076: "RENOVACAO", // Maria Eduarda Santos
  };

  const resultadoFinal = consultoresDinamic.map((consultor) => {
    const perfilOperacional =
      regrasPerfisExatos[consultor.owner_id] || "RENOVACAO";
    let pipelinesPermitidos: number[] = [];

    if (perfilOperacional === "CARTEIRA") {
      pipelinesPermitidos = [PIPELINE_IDS.CARTEIRA];
    } else if (perfilOperacional === "PORTABILIDADE") {
      pipelinesPermitidos = [PIPELINE_IDS.PORTABILIDADE];
    } else if (perfilOperacional === "AMBOS") {
      pipelinesPermitidos = [
        PIPELINE_IDS.RENOVACAO,
        PIPELINE_IDS.PORTABILIDADE,
      ];
    } else {
      pipelinesPermitidos = [PIPELINE_IDS.RENOVACAO];
    }

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
  const [dealsCarteira, dealsRenovacao, dealsPortabilidade] = await Promise.all(
    [
      buscarOportunidadesPorPeriodo(PIPELINE_IDS.CARTEIRA, dataInicio, dataFim),
      buscarOportunidadesPorPeriodo(
        PIPELINE_IDS.RENOVACAO,
        dataInicio,
        dataFim,
      ),
      buscarOportunidadesPorPeriodo(
        PIPELINE_IDS.PORTABILIDADE,
        dataInicio,
        dataFim,
      ),
    ],
  );

  const todosDeals = [
    ...dealsCarteira,
    ...dealsRenovacao,
    ...dealsPortabilidade,
  ];

  const regrasPerfisExatos: Record<number, string> = {
    89614: "RENOVACAO",
    89613: "RENOVACAO",
    95586: "RENOVACAO",
    100201: "RENOVACAO",
    100980: "RENOVACAO",
    99648: "RENOVACAO",
    58488: "AMBOS",
    59215: "AMBOS",
    100979: "RENOVACAO",
    88311: "RENOVACAO",
    100703: "PORTABILIDADE",
    58448: "PORTABILIDADE",
    97363: "CARTEIRA",
    102074: "RENOVACAO",
    102075: "RENOVACAO",
    102076: "RENOVACAO",
  };

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

    const dealsDoConsultor = todosDeals.filter(
      (deal) =>
        deal.owner_id === consultor.owner_id &&
        pipelinesPermitidos.includes(deal.pipeline_id),
    );

    let totalBase = 0;
    let valorBase = 0;
    let totalDeclinados = 0;
    let valorDeclinados = 0;

    dealsDoConsultor.forEach((deal) => {
      totalBase++;
      const valorOportunidade = Number(deal.value || deal.value_mrr || 0);
      valorBase += valorOportunidade;

      if (deal.status === 3) {
        totalDeclinados++;
        valorDeclinados += valorOportunidade;
      }
    });

    return {
      nome: consultor.nome,
      perfil: perfilOperacional,
      totalBase,
      valorBase,
      totalDeclinados,
      valorDeclinados,
      taxaPerda:
        totalBase > 0
          ? ((totalDeclinados / totalBase) * 100).toFixed(2)
          : "0.00",
    };
  });

  return resultadoFinal
    .filter((c) => c.totalBase > 0)
    .sort((a, b) => b.totalDeclinados - a.totalDeclinados);
}

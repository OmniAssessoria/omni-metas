import FunctionsDatabaseRepository from "../repositories/functions_database.repository.js";

import {
  buscarCnpjPorCompanyId,
  buscarTodasAsPaginas,
  obterCustomField,
  formatarCNPJ,
  delay,
} from "../helpers/piperun_auxiliares.helper.js";
import { FUNIS_PERDAS, PIPELINE_GANHOS, STAGE_GANHOS } from "../configs/piperun_funis_bdr.js";
import ServicoOmniService from "../services/servico_omni.service.js";

export default class Bdr {
  private servicoOmniService: ServicoOmniService;

  constructor() {
    this.servicoOmniService = new ServicoOmniService();
    this.executarRotinaNoturnaPipeBdr =
      this.executarRotinaNoturnaPipeBdr.bind(this);
  }

  async executarRotinaNoturnaPipeBdr() {
    const dataAtual = new Date();
    const dataFormatada = new Intl.DateTimeFormat("fr-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(dataAtual);

    const dealsBrutos: any[] = [];

    const paramsComuns = {
      closed_at_start: dataFormatada,
      closed_at_end: dataFormatada,
      with: "customFields,company,owner,lostReason",
    };

    try {
      console.log(`\n======================================================`);
      console.log(
        `[CRON 19:00] Iniciando Sincronização Diária: ${dataFormatada}`,
      );
      console.log(`======================================================`);

      const paramsGanhos = {
        pipeline_id: PIPELINE_GANHOS,
        stage_id: STAGE_GANHOS,
        status: 1,
        ...paramsComuns,
      };

      const ganhosExtraidos = await buscarTodasAsPaginas(
        "/deals",
        paramsGanhos,
      );
      dealsBrutos.push(...ganhosExtraidos);

      for (const pipelineId of FUNIS_PERDAS) {
        const paramsPerdas = {
          pipeline_id: pipelineId,
          status: 3,
          ...paramsComuns,
        };
        const perdasExtraidas = await buscarTodasAsPaginas(
          "/deals",
          paramsPerdas,
        );
        dealsBrutos.push(...perdasExtraidas);
      }

      if (dealsBrutos.length > 0) {
        const dealsFormatados = [];

        console.log(`[CRON 19:00] Estruturando ${dealsBrutos.length} deals...`);

        for (const deal of dealsBrutos) {
          let cnpjBruto = obterCustomField(deal.customFields, 592065, "CNPJ");
          let cnpj = cnpjBruto ? formatarCNPJ(String(cnpjBruto)) : null;

          if (!cnpj && deal.company_id) {
            cnpj = await buscarCnpjPorCompanyId(deal.company_id);
          }

          if (!cnpj) continue;

          const operadoraOriginal = obterCustomField(
            deal.customFields,
            631881,
            "Operadora do Pedido",
          );
          let tipoServico = "CLARO";

          if (Array.isArray(operadoraOriginal) && operadoraOriginal[0]) {
            tipoServico = String(operadoraOriginal[0]).toUpperCase();
          } else if (typeof operadoraOriginal === "string") {
            tipoServico = operadoraOriginal.toUpperCase();
          }

          const isGanho = deal.status === 1 || deal.lost_reason_id === null;
          const observacao =
            deal.observation || deal.description || "Sem detalhes";

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

        console.log(`[CRON 19:00] Gravando dados no banco interno...`);

        for (const dado of dealsFormatados) {
          try {
            await this.servicoOmniService.atualizarServicosOmniHistorico(dado);
            await delay(50);
          } catch (error: any) {
            console.error(
              `Erro ao sincronizar CNPJ ${dado.cnpj}:`,
              error.message,
            );
          }
        }

        console.log(
          `[CRON 19:00] Dados sincronizados com sucesso. Processados: ${dealsFormatados.length}`,
        );
      } else {
        console.log(`[CRON 19:00] Nenhum deal movimentado hoje.`);
      }

      console.log(
        `[CRON 19:00] Disparando function de validação no PostgreSQL...`,
      );

      const repo = new FunctionsDatabaseRepository();

      await repo.executarValidacaoTemporarioOmni();

      console.log(`======================================================`);
      console.log(`[CRON 19:00] Processo noturno finalizado com sucesso!`);
      console.log(`======================================================\n`);
    } catch (error) {
      console.error("[CRON 19:00] Falha geral na execução noturna:", error);
    }
  }
}

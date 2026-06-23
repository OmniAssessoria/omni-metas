import FunctionsDatabaseRepository from "../repositories/functions_database.repository.js";
import ServicoOmniService from "../services/servico_omni.service.js";
import {
  buscarCnpjPorCompanyId,
  buscarTodasAsPaginas,
  obterCustomField,
  formatarCNPJ,
  delay,
} from "../helpers/piperun_auxiliares.helper.js";

import { PIPELINE_UNIFICADO } from "../configs/piperun_funis_bdr.js";

export default class Bdr {
  private servicoOmniService: ServicoOmniService;

  constructor() {
    this.servicoOmniService = new ServicoOmniService();
    this.executarRotinaNoturnaPipeBdr =
      this.executarRotinaNoturnaPipeBdr.bind(this);
  }

  async executarRotinaNoturnaPipeBdr() {
    const dataAtual = new Date();
    dataAtual.setDate(dataAtual.getDate() - 1);

    const dataOntemFormatada = new Intl.DateTimeFormat("fr-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(dataAtual);

    const dealsBrutos: any[] = [];

    const paramsComuns = {
      closed_at_start: dataOntemFormatada,
      closed_at_end: dataOntemFormatada,
      with: "customFields,company,owner,lostReason",
    };

    try {
      console.log(`\n======================================================`);
      console.log(
        `[CRON 02:30 BDR] Iniciando Sincronização. Data de Busca: ${dataOntemFormatada}`,
      );
      console.log(`======================================================`);

      const paramsGanhos = {
        pipeline_id: PIPELINE_UNIFICADO,
        status: 1,
        ...paramsComuns,
      };
      console.log(`[CRON 02:30 BDR] Extraindo Ganhos...`);
      const ganhosExtraidos = await buscarTodasAsPaginas(
        "/deals",
        paramsGanhos,
      );
      dealsBrutos.push(...ganhosExtraidos);

      const paramsPerdas = {
        pipeline_id: PIPELINE_UNIFICADO,
        status: 3,
        ...paramsComuns,
      };
      console.log(`[CRON 02:30 BDR] Extraindo Perdas...`);
      const perdasExtraidas = await buscarTodasAsPaginas(
        "/deals",
        paramsPerdas,
      );
      dealsBrutos.push(...perdasExtraidas);

      if (dealsBrutos.length > 0) {
        const dealsFormatados = [];

        console.log(
          `[CRON 02:30 BDR] Estruturando ${dealsBrutos.length} negócios extraídos...`,
        );

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

        console.log(
          `[CRON 02:30 BDR] Gravando ${dealsFormatados.length} dados no banco interno...`,
        );

        let sucessos = 0;
        let falhas = 0;

        for (const dado of dealsFormatados) {
          try {
            const resultado =
              await this.servicoOmniService.atualizarServicosOmniHistorico(
                dado,
              );
            if (resultado.sucesso) sucessos++;
            if (resultado.ignorado) falhas++;

            await delay(50);
          } catch (error: any) {
            falhas++;
            console.error(
              `[CRON 02:30 BDR] Erro ao sincronizar CNPJ ${dado.cnpj}:`,
              error.message,
            );
          }
        }

        console.log(
          `[CRON 02:30 BDR] Processamento concluído. Sucessos: ${sucessos} | Falhas/Ignorados: ${falhas}`,
        );
      } else {
        console.log(
          `[CRON 02:30 BDR] Nenhum negócio (Ganho/Perdido) movimentado em ${dataOntemFormatada}.`,
        );
      }

      console.log(`======================================================`);
      console.log(`[CRON 02:30 BDR] Processo noturno finalizado com sucesso!`);
      console.log(`======================================================\n`);
    } catch (error) {
      console.error("[CRON 02:30 BDR] Falha geral na execução noturna:", error);
    }
  }
}

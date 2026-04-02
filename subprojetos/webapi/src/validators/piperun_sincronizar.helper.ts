import {
  FUNIS_PERDAS,
  HASH_GANHOS,
} from "../configs/piperun.config";
import ServicoClaroRepository from "../repositories/servico_claro.repository";
import {
  buscarCnpjPorCompanyId,
  buscarTodasAsPaginas,
  obterCustomField,
} from "../helpers/piperun_auxiliares.helper";
import ServicoClaroService from "../services/servico_claro.service";

export default class Piperun {
  private servicoClaroService: ServicoClaroService;

  constructor() {
    this.servicoClaroService = new ServicoClaroService();
    this.executarRotinaNoturnaPipeRun =
      this.executarRotinaNoturnaPipeRun.bind(this);
  }

  async executarRotinaNoturnaPipeRun() {
    const dataAtual = new Date();
    const dataFormatada = new Intl.DateTimeFormat("fr-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(dataAtual);

    const closedAtStart = `${dataFormatada} 00:00:00`;
    const closedAtEnd = `${dataFormatada} 23:59:59`;
    const paramsComplementares = `&closed_at_start=${closedAtStart}&closed_at_end=${closedAtEnd}&with=customFields,company,owner,lostReason&show=200`;
    const dealsBrutos = [];

    try {
      console.log(`\n======================================================`);
      console.log(
        `[CRON 19:00] Iniciando Sincronização Diária: ${dataFormatada}`,
      );
      console.log(`======================================================`);

      const urlGanhos = `/deals?cursor=""&hash=${HASH_GANHOS}&status=1${paramsComplementares}`;
      const ganhosExtraidos = await buscarTodasAsPaginas(urlGanhos);
      dealsBrutos.push(...ganhosExtraidos);

      for (const pipelineId of FUNIS_PERDAS) {
        const urlPerdas = `/deals?cursor=""&pipeline_id=${pipelineId}&status=3${paramsComplementares}`;
        const perdasExtraidas = await buscarTodasAsPaginas(urlPerdas);
        dealsBrutos.push(...perdasExtraidas);
      }

      if (dealsBrutos.length > 0) {
        const dealsFormatados = [];

        for (const deal of dealsBrutos) {
          let cnpj = obterCustomField(deal.customFields, 592065, "CNPJ");
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

        for (const dado of dealsFormatados) {
          try {
            await this.servicoClaroService.atualizarServicosPiperun(dado);
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
      const repo = new ServicoClaroRepository();
      await repo.executarValidacaoTemporarioClaro();

      console.log(`[CRON 19:00] Processo noturno finalizado com sucesso!`);
    } catch (error) {
      console.error("[CRON 19:00] Falha geral na execução noturna:", error);
    }
  }
}

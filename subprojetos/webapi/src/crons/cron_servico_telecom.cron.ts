import axios from "axios";
import ServicoClaroService from "../services/servico_claro.service.js";
import LoggerHelper from "../helpers/logger.help.js";

const TOKEN_OMNI_CRM = process.env.TOKEN_API_KEY;
const PIPELINE_LOCAL_ID = "manual_a0c1018c-10e2-4088-b4db-074acbcc1eed";

export default class CronServicoTelecomSincronizar {
  private servicoClaroService: ServicoClaroService;
  private apiOmniCrm: any;
  private logger: LoggerHelper;

  constructor() {
    this.logger = new LoggerHelper("cron_telecom");
    this.servicoClaroService = new ServicoClaroService();
    this.apiOmniCrm = axios.create({
      baseURL: "https://omniassessoria.online/api/local/v1",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${TOKEN_OMNI_CRM}`,
      },
    });
    this.executarRotinaNoturnaOmniCrm =
      this.executarRotinaNoturnaOmniCrm.bind(this);
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private formatarCNPJ(cnpj: string): string {
    if (!cnpj) return "";
    const numeros = cnpj.replace(/\D/g, "");
    if (numeros.length !== 14) return cnpj;
    return numeros.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      "$1.$2.$3/$4-$5",
    );
  }

  private async buscarTodosOsDealsPorCursor(
    parametrosBasicos: any,
  ): Promise<any[]> {
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

        const response = await this.apiOmniCrm.get("/deals", { params });

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

        await this.delay(150);
      } catch (error: any) {
        this.logger.error(
          `[CRON - Erro na Paginação] Falha ao processar requisição. Cursor: ${cursorAtual}`,
          error.response?.data || error.message,
        );
        temMaisDados = false;
      }
    }
    return todosOsDeals;
  }

  async executarRotinaNoturnaOmniCrm() {
    const dataAtual = new Date();
    const dataFormatada = new Intl.DateTimeFormat("fr-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(dataAtual);

    const dealsBrutos: any[] = [];

    this.logger.info(
      `[CRON OMNI CRM] Sincronização iniciada: ${dataFormatada}`,
    );

    const filtrosComuns = {
      pipelineId: PIPELINE_LOCAL_ID,
      closedFrom: dataFormatada,
      closedTo: dataFormatada,
    };

    try {
      this.logger.info(`[CRON OMNI CRM] Coletando registros [GANHO]...`);
      const ganhos = await this.buscarTodosOsDealsPorCursor({
        status: "won",
        ...filtrosComuns,
      });
      dealsBrutos.push(...ganhos);

      this.logger.info(`[CRON OMNI CRM] Coletando registros [PERDIDO]...`);
      const perdas = await this.buscarTodosOsDealsPorCursor({
        status: "lost",
        ...filtrosComuns,
      });
      dealsBrutos.push(...perdas);

      if (dealsBrutos.length === 0) {
        this.logger.info(
          `[CRON OMNI CRM] Nenhum negócio ganho ou perdido fechado hoje (${dataFormatada}).`,
        );
        return;
      }

      this.logger.info(
        `[CRON OMNI CRM] Estruturando ${dealsBrutos.length} negócios localizados...`,
      );
      const dealsFormatados = [];

      for (const deal of dealsBrutos) {
        if (!deal.companyCnpj) continue;
        const cnpj = this.formatarCNPJ(String(deal.companyCnpj));
        const tipoServico = "CLARO";

        const isGanho = deal.status === "won";
        const emailConsultor = deal.owner?.email || null;
        const idMotivoDeclinioCrm = isGanho
          ? "1"
          : deal.lostReasonId || "motivo_nao_informado_pelo_crm";
        const observacao =
          deal.lostReason || "Sem detalhes adicionais mapeados";

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

      this.logger.info(
        `[CRON OMNI CRM] Gravando ${dealsFormatados.length} registros processados no PostgreSQL...`,
      );

      let sucessos = 0;
      let falhas = 0;

      for (const dado of dealsFormatados) {
        const identificadorConsultor =
          dado.email_consultor || "SEM_EMAIL_CONSULTOR";
        const statusNegocio = dado.is_ganho ? "GANHO" : "PERDIDO";

        try {
          const resultado =
            await this.servicoClaroService.sincronizarHistoricoClaro(dado);

          if (resultado.sucesso) {
            sucessos++;
            this.logger.info(
              `➔ ${dado.cnpj} - ${identificadorConsultor} - SALVO: SUCESSO (${statusNegocio})`,
            );
          }

          if (resultado.ignorado) {
            falhas++;
            this.logger.info(
              `➔ ${dado.cnpj} - ${identificadorConsultor} - IGNORADO: FALHA (${resultado.motivo})`,
            );
          }

          await this.delay(50);
        } catch (error: any) {
          falhas++;
          this.logger.error(
            `➔ ${dado.cnpj} - ${identificadorConsultor} - ERRO GRAVE`,
            error.message,
          );
        }
      }

      this.logger.info(
        `[CRON OMNI CRM] Processamento finalizado. Sucessos: ${sucessos} | Ignorados ou Falhas: ${falhas}`,
      );
    } catch (error: any) {
      this.logger.error(
        "[CRON OMNI CRM] Erro fatal não tratado na rotina diária:",
        error,
      );
    }
  }
}

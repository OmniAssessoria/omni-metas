import axios from "axios";
import ServicoOmniService from "../services/servico_omni.service.js";
import ServicoClaroService from "../services/servico_claro.service.js";

const TOKEN_OMNI_CRM = process.env.TOKEN_API_KEY;
const PIPELINE_BDR_ID = "wm2n294u8vgp31duczik6iak";
const PIPELINE_TELECOM_1_ID = "manual_a0c1018c-10e2-4088-b4db-074acbcc1eed";
const PIPELINE_TELECOM_2_ID = "u0zxipteaog8m7i1revieqng";
const PIPELINE_TELECOM_3_ID = "rux8uiyiqosbk8ohvqypjsip";
const PIPELINES_TELECOM = [PIPELINE_TELECOM_1_ID, PIPELINE_TELECOM_2_ID, PIPELINE_TELECOM_3_ID];

export default class CronTeleconBdrOmniSincronizar {
  private servicoOmniService: ServicoOmniService;
  private servicoClaroService: ServicoClaroService;
  private apiOmniCrm: any;

  constructor() {
    this.servicoOmniService = new ServicoOmniService();
    this.servicoClaroService = new ServicoClaroService();
    this.apiOmniCrm = axios.create({
      baseURL: "https://omniassessoria.online/api/local/v1",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${TOKEN_OMNI_CRM}`,
      },
    });

    this.executarRotinaNoturnaPipeBdr = this.executarRotinaNoturnaPipeBdr.bind(this);
    this.sincronizarAbertosTelecom = this.sincronizarAbertosTelecom.bind(this);
    this.sincronizarAbertosBdr = this.sincronizarAbertosBdr.bind(this);
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

  private async buscarTodosOsDealsPorCursor(parametrosBasicos: any): Promise<any[]> {
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
        console.error(
          `[CRON - Erro na Paginação] Falha ao processar requisição. Cursor: ${cursorAtual}`,
          error.response?.data || error.message,
        );
        temMaisDados = false;
      }
    }

    return todosOsDeals;
  }

  // ==============================================================================
  // 1. SINCRONIZAR ABERTOS TELECOM (CLARO)
  // ==============================================================================
  async sincronizarAbertosTelecom() {
    console.log(`\n[CRON 06:00 TELECOM] Iniciando varredura de leads ABERTOS...`);
    
    try {
      const crmCnpjsAbertos = new Set<string>();

      for (const pipelineId of PIPELINES_TELECOM) {
        console.log(`[CRON 06:00 TELECOM] Buscando leads 'open' no funil: ${pipelineId}`);
        const abertosNoCrm = await this.buscarTodosOsDealsPorCursor({
          pipelineId: pipelineId,
          status: "open",
        });
        
        for (const deal of abertosNoCrm) {
           if (deal.companyCnpj) {
              crmCnpjsAbertos.add(String(deal.companyCnpj).replace(/\D/g, ""));
           }
        }
      }
      
      console.log(`[CRON 06:00 TELECOM] Encontrados ${crmCnpjsAbertos.size} CNPJs únicos abertos no CRM.`);

      const abertosNoBanco = await this.servicoClaroService.buscarAbertosSincronizacao();
      console.log(`[CRON 06:00 TELECOM] Total marcados no banco como aberto (crm=true): ${abertosNoBanco.length}`);

      let mantidos = 0;
      let revertidos = 0;

      for (const servico of abertosNoBanco) {
         const dbCnpjLimpo = String(servico.cnpj).replace(/\D/g, "");
         if (crmCnpjsAbertos.has(dbCnpjLimpo)) {
            mantidos++;
         } else {
            await this.servicoClaroService.reverterAberto(servico.seq_claro);
            revertidos++;
         }
      }

      console.log(`[CRON 06:00 TELECOM] Relatório Final: Mantidos: ${mantidos} | Revertidos p/ fila local: ${revertidos}`);
    } catch (error: any) {
      console.error(`[CRON 06:00 TELECOM ERRO] Falha na sincronização:`, error.message);
    }
  }

  // ==============================================================================
  // 2. SINCRONIZAR ABERTOS BDR (OMNI)
  // ==============================================================================
  async sincronizarAbertosBdr() {
    console.log(`\n[CRON 06:00 BDR] Iniciando varredura de leads ABERTOS...`);
    
    try {
      const crmCnpjsAbertos = new Set<string>();

      console.log(`[CRON 06:00 BDR] Buscando leads 'open' no funil: ${PIPELINE_BDR_ID}`);
      const abertosNoCrm = await this.buscarTodosOsDealsPorCursor({
        pipelineId: PIPELINE_BDR_ID,
        status: "open",
      });
      
      for (const deal of abertosNoCrm) {
         if (deal.companyCnpj) {
            crmCnpjsAbertos.add(String(deal.companyCnpj).replace(/\D/g, ""));
         }
      }
      
      console.log(`[CRON 06:00 BDR] Encontrados ${crmCnpjsAbertos.size} CNPJs únicos abertos no CRM.`);

      const abertosNoBanco = await this.servicoOmniService.buscarAbertosSincronizacao();
      console.log(`[CRON 06:00 BDR] Total marcados no banco como aberto (crm=true): ${abertosNoBanco.length}`);

      let mantidos = 0;
      let revertidos = 0;

      for (const servico of abertosNoBanco) {
         const dbCnpjLimpo = String(servico.cnpj).replace(/\D/g, "");
         if (crmCnpjsAbertos.has(dbCnpjLimpo)) {
            mantidos++;
         } else {
            await this.servicoOmniService.reverterAberto(servico.seq_servico_omni);
            revertidos++;
         }
      }

      console.log(`[CRON 06:00 BDR] Relatório Final: Mantidos: ${mantidos} | Revertidos p/ fila local: ${revertidos}`);
    } catch (error: any) {
      console.error(`[CRON 06:00 BDR ERRO] Falha na sincronização:`, error.message);
    }
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

    console.log(`\n======================================================`);
    console.log(
      `[CRON 02:30 BDR] Sincronização Iniciada. Data Base: ${dataOntemFormatada}`,
    );
    console.log(`======================================================`);

    const filtrosComuns = {
      pipelineId: PIPELINE_BDR_ID,
      closedFrom: dataOntemFormatada,
      closedTo: dataOntemFormatada,
    };

    try {
      console.log(`[CRON 02:30 BDR] Coletando registros [GANHO] do funil BDR...`);
      const ganhos = await this.buscarTodosOsDealsPorCursor({
        status: "won",
        ...filtrosComuns,
      });
      dealsBrutos.push(...ganhos);

      console.log(`[CRON 02:30 BDR] Coletando registros [PERDIDO] do funil BDR...`);
      const perdas = await this.buscarTodosOsDealsPorCursor({
        status: "lost",
        ...filtrosComuns,
      });
      dealsBrutos.push(...perdas);

      if (dealsBrutos.length === 0) {
        console.log(`[CRON 02:30 BDR] Nenhum negócio movimentado em ${dataOntemFormatada}.`);
        console.log(`======================================================\n`);
        return;
      }

      console.log(`[CRON 02:30 BDR] Estruturando ${dealsBrutos.length} negócios extraídos...`);
      const dealsFormatados = [];

      for (const deal of dealsBrutos) {
        if (!deal.companyCnpj) continue;

        const cnpj = this.formatarCNPJ(String(deal.companyCnpj));
        const isGanho = deal.status === "won";
        const codigoCrm = deal.ownerId || (deal.owner ? deal.owner.id : null);
        const emailConsultor = deal.owner?.email || null;
        const idMotivoDeclinioCrm = isGanho
          ? "1"
          : deal.lostReasonId || "motivo_nao_informado_pelo_crm";

        dealsFormatados.push({
          cnpj: cnpj,
          email_consultor: emailConsultor,
          codigo_crm: codigoCrm,
          data_inicio_atendimento: deal.createdAt,
          data_fim_atendimento: deal.closedAt,
          id_motivo_declinio: idMotivoDeclinioCrm,
          is_ganho: isGanho,
        });
      }

      console.log(`[CRON 02:30 BDR] Iniciando persistência no PostgreSQL para tabela OMNI (${dealsFormatados.length} registros)...`);
      let sucessos = 0;
      let falhas = 0;

      for (const dado of dealsFormatados) {
        try {
          const resultado = await this.servicoOmniService.atualizarServicosOmniHistorico(dado);
          if (resultado.sucesso) sucessos++;
          if (resultado.ignorado) {
            falhas++;
            console.warn(`[CRON 02:30 BDR] Ignorado: ${resultado.motivo}`);
          }
          await this.delay(50);
        } catch (error: any) {
          falhas++;
          console.error(`[CRON 02:30 BDR] Falha grave ao persistir CNPJ ${dado.cnpj}:`, error.message);
        }
      }

      console.log(`[CRON 02:30 BDR] Processamento concluído. Sucessos: ${sucessos} | Falhas/Ignorados: ${falhas}`);
      console.log(`======================================================\n`);
    } catch (error: any) {
      console.error("[CRON 02:30 BDR] Erro fatal não tratado na rotina noturna:", error.message || error);
    }
  }
}

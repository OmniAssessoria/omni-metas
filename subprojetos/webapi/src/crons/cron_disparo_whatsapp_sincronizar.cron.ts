import axios from "axios";
import DisparoWhatsappService from "../services/disparo_whatsapp.service.js";
import LoggerHelper from "../helpers/logger.help.js";

const TOKEN_OMNI_CRM = process.env.TOKEN_API_KEY;

const PIPELINES_MONITORADOS = [
    { id: "shkr1sq4xzt13zmzn4fm0vcd", nome: "PORTABILIDADE" },
    { id: "mgwlr53x1m6w8w66fvotjtxl", nome: "RENOVAÇÃO" }
];

export default class CronDisparoWhatsappSincronizar {
    private disparoService: DisparoWhatsappService;
    private apiOmniCrm: any;
    private logger: LoggerHelper;

    constructor() {
        this.logger = new LoggerHelper("cron_disparo_whatsapp");
        this.disparoService = new DisparoWhatsappService();
        this.apiOmniCrm = axios.create({
            baseURL: "https://omniassessoria.online/api/local/v1",
            headers: {
                accept: "application/json",
                Authorization: `Bearer ${TOKEN_OMNI_CRM}`,
            },
        });
        this.executarRotinaNoturnaDisparos = this.executarRotinaNoturnaDisparos.bind(this);
    }

    private delay(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private formatarCNPJ(cnpj: string): string {
        if (!cnpj) return "";
        const numeros = cnpj.replace(/\D/g, "");
        if (numeros.length !== 14) return cnpj;
        return numeros.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
    }

    private async buscarTodosOsDealsPorCursor(parametrosBasicos: any): Promise<any[]> {
        let cursorAtual: string | null = null;
        let temMaisDados = true;
        const todosOsDeals: any[] = [];

        while (temMaisDados) {
            try {
                const params: any = { ...parametrosBasicos, limit: 200, sort: "closedAt:desc" };
                if (cursorAtual) params.cursor = cursorAtual;

                const response = await this.apiOmniCrm.get("/deals", { params });

                if (response.data && response.data.ok) {
                    const dadosPagina = response.data.data || [];
                    if (dadosPagina.length === 0) {
                        temMaisDados = false;
                        break;
                    }
                    todosOsDeals.push(...dadosPagina);
                    cursorAtual = response.data.nextCursor;
                    if (!cursorAtual) temMaisDados = false;
                } else {
                    temMaisDados = false;
                }
                await this.delay(150);
            } catch (error: any) {
                this.logger.error(`[CRON DISPAROS - Erro Paginação]`, error.response?.data || error.message);
                temMaisDados = false;
            }
        }
        return todosOsDeals;
    }

    async executarRotinaNoturnaDisparos() {
        const dataFormatada = new Intl.DateTimeFormat("fr-CA", {
            timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
        }).format(new Date());

        this.logger.info(`[CRON DISPAROS WHATSAPP] Sincronização iniciada: ${dataFormatada}`);
        let dealsBrutos: any[] = [];

        try {
            for (const pipeline of PIPELINES_MONITORADOS) {
                this.logger.info(`[CRON DISPAROS] Analisando Pipeline: ${pipeline.nome} (${pipeline.id})`);

                const filtrosComuns = {
                    pipelineId: pipeline.id,
                    closedFrom: dataFormatada,
                    closedTo: dataFormatada,
                };

                const ganhos = await this.buscarTodosOsDealsPorCursor({ status: "won", ...filtrosComuns });
                const perdas = await this.buscarTodosOsDealsPorCursor({ status: "lost", ...filtrosComuns });

                dealsBrutos.push(...ganhos, ...perdas);
            }

            if (dealsBrutos.length === 0) {
                this.logger.info(`[CRON DISPAROS] Nenhum negócio mapeado para disparos fechado hoje (${dataFormatada}).`);
                return;
            }

            this.logger.info(`[CRON DISPAROS] Preparando ${dealsBrutos.length} negócios localizados...`);
            const dealsFormatados = [];

            for (const deal of dealsBrutos) {
                if (!deal.companyCnpj || !deal.id) continue;

                const isGanho = deal.status === "won";

                dealsFormatados.push({
                    id_lead: parseInt(deal.id), // ID vindo da origem do CRM
                    cnpj: this.formatarCNPJ(String(deal.companyCnpj)),
                    email_consultor: deal.owner?.email || null,
                    tipo_servico: "CLARO",
                    data_inicio_atendimento: deal.createdAt,
                    data_fim_atendimento: deal.closedAt,
                    id_motivo_declinio: isGanho ? "1" : (deal.lostReasonId || "motivo_nao_informado"),
                    observacao_fechamento: deal.lostReason || "Sem detalhes adicionais mapeados",
                    is_ganho: isGanho,
                });
            }

            let sucessos = 0;
            let falhas = 0;

            for (const dado of dealsFormatados) {
                try {
                    const resultado = await this.disparoService.sincronizarDeclinioGanhoDisparo(dado);

                    if (resultado.sucesso) {
                        sucessos++;
                        this.logger.info(`➔ LEAD ${dado.id_lead} (${dado.cnpj}) - SALVO: SUCESSO (${resultado.situacao})`);
                    }

                    if (resultado.ignorado) {
                        falhas++;
                        this.logger.info(`➔ LEAD ${dado.id_lead} (${dado.cnpj}) - IGNORADO: ${resultado.motivo}`);
                    }
                    await this.delay(50);
                } catch (error: any) {
                    falhas++;
                    this.logger.error(`➔ LEAD ${dado.id_lead} (${dado.cnpj}) - ERRO GRAVE`, error.message);
                }
            }

            this.logger.info(`[CRON DISPAROS] Finalizado. Sucessos: ${sucessos} | Falhas/Ignorados: ${falhas}`);
        } catch (error: any) {
            this.logger.error("[CRON DISPAROS] Erro fatal não tratado:", error);
        }
    }
}

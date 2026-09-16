import DisparoWhatsappRepository from "../repositories/disparo_whatsapp.repository.js";
import ServicoClaroRepository from "../repositories/servico_claro.repository.js";
import ConsultorRepository from "../repositories/consultor.repository.js";
import LoggerHelper from "../helpers/logger.help.js";
import AtualizarBaseMotivosDecliniomniCrm from "../helpers/atualizar_base_motivos_declinio.helper.js";

export default class DisparoWhatsappService {
    private repoDisparo: DisparoWhatsappRepository;
    private repoClaro: ServicoClaroRepository;
    private repoConsultor: ConsultorRepository;
    private logger: LoggerHelper;

    constructor() {
        this.repoDisparo = new DisparoWhatsappRepository();
        this.repoClaro = new ServicoClaroRepository();
        this.repoConsultor = new ConsultorRepository();
        this.logger = new LoggerHelper("service_disparo_whatsapp");
    }

    async sincronizarDeclinioGanhoDisparo(dados: any) {
        await AtualizarBaseMotivosDecliniomniCrm();
        const seqEmpresaQuery = await this.repoClaro.buscarSeqEmpresaPorCnpj(dados.cnpj);
        if (!seqEmpresaQuery || seqEmpresaQuery.length === 0) {
            return { ignorado: true, motivo: `Empresa com CNPJ ${dados.cnpj} não existe no banco.` };
        }
        const seq_empresa = seqEmpresaQuery[0].seq_empresa;

        const consultor = await this.repoConsultor.buscarSeqConsultorPorEmail(dados.email_consultor);
        if (!consultor || !consultor.seq_consultor) {
            return { ignorado: true, motivo: `Consultor com e-mail ${dados.email_consultor} não encontrado.` };
        }
        const seq_consultor = consultor.seq_consultor;

        const isGanho = dados.is_ganho === true;
        const situacao_crm = isGanho ? "GANHO" : "PERDIDO";
        let situacaoAtendimento = isGanho ? "GANHO" : "TEMPORARIO";
        let seqMotivoDeclinioNumerico = isGanho ? 1 : 2;

        if (!isGanho && dados.id_motivo_declinio && String(dados.id_motivo_declinio) !== "1") {
            const motivoMapeado = await this.repoClaro.buscarMotivoDeclinioPorIdCrm(dados.id_motivo_declinio);
            if (motivoMapeado && motivoMapeado.length > 0) {
                seqMotivoDeclinioNumerico = motivoMapeado[0].seq_motivo_declinio;
                situacaoAtendimento = motivoMapeado[0].situacao_atendimento;
            } else {
                this.logger.warn(`ID de declínio "${dados.id_motivo_declinio}" não mapeado, caindo para TEMPORARIO.`);
                situacaoAtendimento = "TEMPORARIO";
            }
        }

        const disparoAtualizado = await this.repoDisparo.atualizarSituacaoCrmDisparo(
            seq_empresa,
            dados.id_lead,
            situacao_crm
        );

        if (!disparoAtualizado) {
            return {
                ignorado: true,
                motivo: `O lead ID ${dados.id_lead} não corresponde a nenhum disparo prévio para a empresa ${seq_empresa}.`
            };
        }

        await this.repoDisparo.atualizarServicoClaroPosDisparo(
            seq_empresa,
            dados.observacao_fechamento,
            dados.data_fim_atendimento,
            situacaoAtendimento,
            consultor.nome,
            isGanho
        );

        await this.repoDisparo.criarHistoricoDisparo({
            seq_empresa: seq_empresa,
            seq_consultor: seq_consultor,
            tipo_servico: dados.tipo_servico,
            data_inicio_atendimento: dados.data_inicio_atendimento,
            data_fim_atendimento: dados.data_fim_atendimento,
            seq_motivo_declinio: seqMotivoDeclinioNumerico,
        });

        return { sucesso: true, situacao: situacao_crm };
    }
}
import AtualizarBaseMotivosDecliniomniCrm from "../helpers/atualizar_base_motivos_declinio.helper.js";
import LoggerHelper from "../helpers/logger.help.js";
import { IDadosConsultor } from "../interfaces/dados_consultor.interface.js";
import { IMotivosDeclinio } from "../interfaces/motivo_declinio.interface.js";
import ConsultorRepository from "../repositories/consultor.repository.js";
import ServicoClaroRepository from "../repositories/servico_claro.repository.js";

class ServicoClaroService {
  private repository: ServicoClaroRepository;
  private repositoryConsultor: ConsultorRepository;
  private logger: LoggerHelper;

  constructor() {
    this.repository = new ServicoClaroRepository();
    this.repositoryConsultor = new ConsultorRepository();
    this.logger = new LoggerHelper("service_claro");
  }

  async obterDashboardEmpresasInfo() {
    const dados = await this.repository.buscarDashboardEmpresasInfo();
    if (!dados) {
      return {
        total_passado_cpc: 0,
        total_passado_cpc_sem_servico: 0,
        disp_cpc_sem_servico: 0,
        disp_cpc_com_edoc: 0,
        disp_cpc_edoc_e_docdrive: 0,
        edoc_sem_docdrive_sem_serv_cpc_null: 0,
        edoc_sem_docdrive_sem_serv_cpc_ok: 0,
        data_hora_extracao: new Date().toISOString(),
      };
    }
    return dados;
  }

  async obterDashboardEmpresasCarteiraInfo() {
    const dados = await this.repository.buscarDashboardEmpresasCarteira();
    return dados && dados.length > 0 ? dados : [];
  }

  async listarPortabilidadesPendentes() {
    const dados = await this.repository.buscarServicosClaroPipePortabilidade();
    return dados && dados.length > 0 ? dados : [];
  }

  async listarRenovacoesPendentes() {
    const dados = await this.repository.buscarServicosClaroPipeRenovacao();
    return dados && dados.length > 0 ? dados : [];
  }

  async listarExclusivoPendentes() {
    const dados = await this.repository.buscarServicosClaroPipeExclusivo();
    return dados && dados.length > 0 ? dados : [];
  }

  async marcarComoEnviadoCrm(seq_claro: number) {
    if (!seq_claro) {
      throw new Error("O identificador do serviço (seq_claro) é obrigatório.");
    }
    const servicoAtualizado =
      await this.repository.atualizarSituacaoServicoPipe(seq_claro);
    if (!servicoAtualizado) {
      throw new Error(`Serviço com seq_claro ${seq_claro} não encontrado.`);
    }
    return servicoAtualizado;
  }

  async sincronizarHistoricoClaro(dados: any) {
    await AtualizarBaseMotivosDecliniomniCrm();
    const seq_empresa = await this.repository.buscarSeqEmpresaPorCnpj(
      dados.cnpj,
    );

    if (!seq_empresa || seq_empresa.length === 0) {
      return {
        ignorado: true,
        motivo: `Empresa com CNPJ ${dados.cnpj} não existe no banco de dados da Omni.`,
      };
    }
    const idEmpresa = seq_empresa[0].seq_empresa;

    const servicosClaro =
      await this.repository.buscarSeqServicoPorSeqEmpresa(idEmpresa);

    if (!servicosClaro || servicosClaro.length === 0) {
      return {
        ignorado: true,
        motivo: `A empresa (CNPJ ${dados.cnpj}) existe, mas NÃO POSSUI nenhum registro na tabela servico_claro.`,
      };
    }

    const dadosConsultor: IDadosConsultor =
      await this.repositoryConsultor.buscarSeqConsultorPorEmail(
        dados.email_consultor,
      );

    if (!dadosConsultor || !dadosConsultor.seq_consultor) {
      return {
        ignorado: true,
        motivo: `Consultor com e-mail ${dados.email_consultor} não encontrado na base.`,
      };
    }

    const idConsultor = dadosConsultor.seq_consultor;
    const isGanho = dados.is_ganho === true;
    let seqMotivoDeclinioNumerico = isGanho ? 1 : 2;
    let situacaoAtendimento = isGanho ? "GANHO" : "TEMPORARIO";

    if (
      !isGanho &&
      dados.id_motivo_declinio &&
      String(dados.id_motivo_declinio) !== "1"
    ) {
      const motivoMapeado = await this.repository.buscarMotivoDeclinioPorIdCrm(
        dados.id_motivo_declinio,
      );

      if (motivoMapeado && motivoMapeado.length > 0) {
        seqMotivoDeclinioNumerico = motivoMapeado[0].seq_motivo_declinio;
        situacaoAtendimento = motivoMapeado[0].situacao_atendimento;
      } else {
        this.logger.warn(
          `[Service] ID de declínio "${dados.id_motivo_declinio}" não localizado na tabela omni.motivo_declinio.`,
        );
        situacaoAtendimento = "TEMPORARIO";
      }
    }

    const buscarHistorico =
      await this.repository.verificarHistoricoEmpresaConsultorExiste(
        idEmpresa,
        idConsultor,
      );

    if (Number(buscarHistorico[0].total) === 0) {
      await this.repository.criarHistoricoEmpresaConsultor({
        seq_empresa: idEmpresa,
        seq_consultor: idConsultor,
        tipo_servico: dados.tipo_servico,
        data_inicio_atendimento: dados.data_inicio_atendimento,
        data_fim_atendimento: dados.data_fim_atendimento,
        seq_motivo_declinio: seqMotivoDeclinioNumerico,
      });
    }

    const servicoAtualizado =
      await this.repository.atualizarServicoPiperunVolta(
        idEmpresa,
        dados.observacao_fechamento,
        dados.data_fim_atendimento,
        situacaoAtendimento,
        dadosConsultor.nome,
        isGanho,
      );

    if (!servicoAtualizado) {
      return {
        ignorado: true,
        motivo: `Falha silenciosa no banco: UPDATE acionado, mas nenhuma linha afetada para o CNPJ ${dados.cnpj}.`,
      };
    }

    return { sucesso: true, dados: servicoAtualizado };
  }

  async listarTodosMotivosDeclinio() {
    const dados: IMotivosDeclinio[] =
      await this.repository.buscarTodosMotivosDeclinio();
    return dados && dados.length > 0 ? dados : [];
  }

  async obterDashboardHistorico() {
    const dados = await this.repository.buscarDashboardHistorico();
    return dados && dados.length > 0 ? dados : [];
  }

  async obterDashboardServicoBase() {
    const dados = await this.repository.buscarDashboardServicoBase();
    return dados && dados.length > 0 ? dados : [];
  }

  async obterDashboardIndicacaoEspecifica(tipoIndicacao: string) {
    if (!tipoIndicacao) {
      throw new Error("O parâmetro de indicação é obrigatório para a busca.");
    }
    const dados =
      await this.repository.buscarDashboardPorIndicacao(tipoIndicacao);
    return dados && dados.length > 0 ? dados : [];
  }

  async buscarAbertosSincronizacao() {
    const dados = await this.repository.buscarAbertosParaSincronizacao();
    return dados && dados.length > 0 ? dados : [];
  }

  async reverterAberto(seq_claro: number) {
    if (!seq_claro) throw new Error("Seq_claro não informado.");
    await this.repository.reverterServicoAbertoNaoEncontradoCrm(seq_claro);
    return { sucesso: true };
  }
}

export default ServicoClaroService;

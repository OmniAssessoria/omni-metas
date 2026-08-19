import AtualizarBaseMotivosDecliniomniCrm from "../helpers/atualizar_base_motivos_declinio.helper.js";
import LoggerHelper from "../helpers/logger.help.js";
import { IDadosConsultor } from "../interfaces/dados_consultor.interface.js";
import { IMotivosDeclinio } from "../interfaces/motivo_declinio.interface.js";
import ConsultorRepository from "../repositories/consultor.repository.js";
import ServicoOmniRepository from "../repositories/servico_omni.repository.js";

class ServicoOmniService {
  private repository: ServicoOmniRepository;
  private repositoryConsultor: ConsultorRepository;
  private logger: LoggerHelper;

  constructor() {
    this.repository = new ServicoOmniRepository();
    this.repositoryConsultor = new ConsultorRepository();
    this.logger = new LoggerHelper("service_omni_bdr");
  }

  async listarEmpresaInfoPorSeq(seq_empresa: number) {
    const dados = await this.repository.buscarEmpresaInforPorSeq(seq_empresa);
    return dados && dados.length > 0 ? dados : [];
  }

  async listarEmpresasEnvio(seq_consultor: number, limit_busca: number = 50) {
    if (!seq_consultor) {
      throw new Error(
        "O identificador do consultor (seq_consultor) é obrigatório para essa busca.",
      );
    }
    const limite = limit_busca > 0 ? limit_busca : 50;
    const dados = await this.repository.buscarEmpresasEnvio(
      seq_consultor,
      limite,
    );
    return dados && dados.length > 0 ? dados : [];
  }

  async listarbuscarServicosOmniDisponivel() {
    const dados = await this.repository.buscarServicosOmniDisponivel();
    return dados && dados.length > 0 ? dados : [];
  }

  async listarContagemServicosOmniDisponivel() {
    const dados = await this.repository.buscarContagemServicosOmniDisponivel();
    return dados && dados.length > 0 ? dados : [];
  }

  async listarPainelIndicadoresConsultor() {
    const dados = await this.repository.buscarPainelIndicadoresConsultor();
    return dados && dados.length > 0 ? dados : [];
  }

  async marcarComoEnviadoCrm(
    seq_empresa: number,
    dt_crm: Date,
    codigo_crm: number,
  ) {
    if (!seq_empresa) {
      throw new Error(
        "O identificador do serviço (Seq_empresa) é obrigatório.",
      );
    }
    const servicoAtualizado =
      await this.repository.atualizarEnvioCrmServicoOmni(
        seq_empresa,
        dt_crm,
        codigo_crm,
      );
    if (!servicoAtualizado) {
      throw new Error(
        `Serviço com seq_empresa ${seq_empresa} não encontrado na tabela servico_omni.`,
      );
    }
    return servicoAtualizado;
  }

  async atualizarServicosOmniHistorico(dados: any) {
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

    const servicosOmni =
      await this.repository.buscarSeqServicoOmniPorSeqEmpresa(idEmpresa);

    if (!servicosOmni || servicosOmni.length === 0) {
      return {
        ignorado: true,
        motivo: `A empresa (CNPJ ${dados.cnpj}) existe, mas NÃO POSSUI nenhum registro na tabela servico_omni para ser atualizado.`,
      };
    }

    const dadosConsultor: IDadosConsultor =
      await this.repositoryConsultor.buscarSeqConsultorPorEmail(
        dados.email_consultor,
      );

    if (!dadosConsultor || !dadosConsultor.seq_consultor) {
      return {
        ignorado: true,
        motivo: `Consultor com o email "${dados.email_consultor}" não foi encontrado na base de dados.`,
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
      const motivoMapeado =
        await this.repository.buscarMotivoDeclinioPorIdString(
          dados.id_motivo_declinio,
        );

      if (motivoMapeado && motivoMapeado.length > 0) {
        seqMotivoDeclinioNumerico = motivoMapeado[0].seq_motivo_declinio;
        situacaoAtendimento = motivoMapeado[0].situacao_atendimento;
      } else {
        this.logger.warn(
          `[Service BDR] ID String de declínio "${dados.id_motivo_declinio}" não localizado na tabela omni.motivo_declinio.`,
        );
        situacaoAtendimento = "TEMPORARIO";
      }
    }

    const buscarHistorico =
      await this.repository.verificarHistoricoServicoOmniExiste(
        idEmpresa,
        idConsultor,
      );

    if (Number(buscarHistorico[0].total) === 0) {
      await this.repository.criarHistoricoServicoOmni({
        seq_empresa: idEmpresa,
        seq_consultor: idConsultor,
        dt_inicio_atendimento: dados.data_inicio_atendimento,
        dt_fim_atendimento: dados.data_fim_atendimento,
        seq_motivo_declinio: seqMotivoDeclinioNumerico,
      });
    }

    const servicoAtualizado = await this.repository.atualizarServicoOmniVolta(
      idEmpresa,
      situacaoAtendimento,
      dadosConsultor.nome,
      isGanho,
    );

    if (!servicoAtualizado) {
      return {
        ignorado: true,
        motivo: `Falha silenciosa no banco: O UPDATE foi acionado, mas nenhuma linha da servico_omni foi afetada para o CNPJ ${dados.cnpj}.`,
      };
    }

    return { sucesso: true, dados: servicoAtualizado };
  }

  async listarTodosMotivosDeclinio() {
    const dados: IMotivosDeclinio[] =
      await this.repository.buscarTodosMotivosDeclinio();
    return dados && dados.length > 0 ? dados : [];
  }

  async listarNumerosContatosSecundarioClientes(seq_empresa: number) {
    const dados =
      await this.repository.obterNumerosContatosSecundarioClientes(seq_empresa);
    return dados && dados.length > 0 ? dados : [];
  }

  async atribuirEmpresasParaConsultor(seq_consultor: number, limit: number) {
    const dados = await this.repository.atribuirEmpresasParaConsultor(
      seq_consultor,
      limit,
    );
    return dados && dados.length > 0 ? dados : [];
  }

  async buscarAbertosSincronizacao() {
    const dados = await this.repository.buscarAbertosParaSincronizacao();
    return dados && dados.length > 0 ? dados : [];
  }

  async reverterAberto(seq_servico_omni: number) {
    if (!seq_servico_omni) throw new Error("Seq_servico_omni não informado.");
    await this.repository.reverterServicoAbertoNaoEncontradoCrm(
      seq_servico_omni,
    );
    return { sucesso: true };
  }
}

export default ServicoOmniService;

import { IDadosConsultor } from "../interfaces/dados_consultor.interface.js";
import { IMotivosDeclinio } from "../interfaces/motivo_declinio.interface.js";
import ConsultorRepository from "../repositories/consultor.repository.js";
import ServicoClaroRepository from "../repositories/servico_claro.repository.js";

class ServicoClaroService {
  private repository: ServicoClaroRepository;
  private repositoryConsultor: ConsultorRepository;

  constructor() {
    this.repository = new ServicoClaroRepository();
    this.repositoryConsultor = new ConsultorRepository();
  }

  async listarPortabilidadesPendentes() {
    const dados = await this.repository.buscarServicosClaroPipePortabilidade();
    return dados && dados.length > 0 ? dados : [];
  }

  async listarRenovacoesPendentes() {
    const dados = await this.repository.buscarServicosClaroPipeRenovacao();
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

  async atualizarServicosPiperun(dados: any) {
    const seq_empresa = await this.repository.buscarSeqEmpresaPorCnpj(
      dados.cnpj,
    );
    if (!seq_empresa || seq_empresa.length === 0) {
      throw new Error(`Nenhuma empresa encontrada para o CNPJ ${dados.cnpj}.`);
    }
    const idEmpresa = seq_empresa[0].seq_empresa;

    const dadosConsultor: IDadosConsultor =
      await this.repositoryConsultor.buscarSeqConsultorPorCodigoCrm(
        dados.codigo_crm,
      );
    if (!dadosConsultor.seq_consultor) {
      throw new Error(
        `Nenhum consultor encontrado para o código CRM ${dados.codigo_crm}.`,
      );
    }
    const idConsultor = dadosConsultor.seq_consultor;

    const isGanho = dados.seq_motivo_declinio == null;
    const motivoDeclinioParaHistorico = isGanho ? 1 : dados.seq_motivo_declinio;

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
        seq_motivo_declinio: motivoDeclinioParaHistorico,
      });
    }

    let situacaoAtendimento = "GANHO";

    if (!isGanho) {
      const situacao = await this.repository.obterSituacaoPorSeqMotivoDeclinio(
        dados.seq_motivo_declinio,
      );
      if (!situacao || situacao.length === 0) {
        throw new Error(
          `Situação não encontrada para o motivo declínio ${dados.seq_motivo_declinio}.`,
        );
      }
      situacaoAtendimento = situacao[0].situacao_atendimento;
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

    return servicoAtualizado;
  }

  async listarTodosMotivosDeclinio() {
    const dados: IMotivosDeclinio[] =
      await this.repository.buscarTodosMotivosDeclinio();
    return dados && dados.length > 0 ? dados : [];
  }
}

export default ServicoClaroService;

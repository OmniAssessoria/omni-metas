import { IDadosConsultor } from "../interfaces/dados_consultor.interface.js";
import { IMotivosDeclinio } from "../interfaces/motivo_declinio.interface.js";
import ConsultorRepository from "../repositories/consultor.repository.js";
import ServicoOmniRepository from "../repositories/servico_omni.repository.js";

class ServicoOmniService {
  private repository: ServicoOmniRepository;
  private repositoryConsultor: ConsultorRepository;

  constructor() {
    this.repository = new ServicoOmniRepository();
    this.repositoryConsultor = new ConsultorRepository();
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

  async marcarComoEnviadoCrm(seq_empresa: number, dt_crm: Date, codigo_crm: number) {
    if (!seq_empresa) {
      throw new Error("O identificador do serviço (Seq_empresa) é obrigatório.");
    }

    const servicoAtualizado = await this.repository.atualizarEnvioCrmServicoOmni(seq_empresa, dt_crm, codigo_crm);

    if (!servicoAtualizado) {
      throw new Error(`Serviço com seq_empresa ${seq_empresa} não encontrado.`);
    }

    return servicoAtualizado;
  }

  async atualizarServicosOmniHistorico(dados: any) {
    const seq_empresa = await this.repository.buscarSeqEmpresaPorCnpj(dados.cnpj);

    if (!seq_empresa || seq_empresa.length === 0) {
      return {
        ignorado: true,
        motivo: `Empresa com CNPJ ${dados.cnpj} não existe no banco de dados da Omni.`,
      };
    }
    const idEmpresa = seq_empresa[0].seq_empresa;

    const servicosClaro = await this.repository.buscarSeqServicoOmniPorSeqEmpresa(idEmpresa);

    if (!servicosClaro || servicosClaro.length === 0) {
      return {
        ignorado: true,
        motivo: `A empresa (CNPJ ${dados.cnpj}) existe, mas NÃO POSSUI nenhum registro na tabela servico_claro para ser atualizado.`,
      };
    }

    const dadosConsultor: IDadosConsultor = await this.repositoryConsultor.buscarSeqConsultorPorCodigoCrm(dados.codigo_crm);

    if (!dadosConsultor || !dadosConsultor.seq_consultor) {
      return {
        ignorado: true,
        motivo: `Consultor com código CRM ${dados.codigo_crm} não encontrado.`,
      };
    }
    const idConsultor = dadosConsultor.seq_consultor;

    const isGanho = dados.seq_motivo_declinio == null;
    const motivoDeclinioParaHistorico = isGanho ? 1 : dados.seq_motivo_declinio;

    const buscarHistorico = await this.repository.verificarHistoricoEmpresaConsultorExiste(idEmpresa, idConsultor);

    if (Number(buscarHistorico[0].total) === 0) {
      await this.repository.criarHistoricoEmpresaConsultor({
        seq_empresa: idEmpresa,
        seq_consultor: idConsultor,
        data_inicio_atendimento: dados.data_inicio_atendimento,
        data_fim_atendimento: dados.data_fim_atendimento,
        seq_motivo_declinio: motivoDeclinioParaHistorico,
      });
    }

    let situacaoAtendimento = "GANHO";

    if (!isGanho) {
      const situacao = await this.repository.obterSituacaoPorSeqMotivoDeclinio(dados.seq_motivo_declinio);
      if (!situacao || situacao.length === 0) {
        throw new Error(`Situação não encontrada para o motivo declínio ${dados.seq_motivo_declinio}.`);
      }
      situacaoAtendimento = situacao[0].situacao_atendimento;
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
        motivo: `Falha silenciosa no banco: O UPDATE foi acionado, mas nenhuma linha da servico_claro foi afetada para o CNPJ ${dados.cnpj}.`,
      };
    }

    return { sucesso: true, dados: servicoAtualizado };
  }

  async listarTodosMotivosDeclinio() {
    const dados: IMotivosDeclinio[] = await this.repository.buscarTodosMotivosDeclinio();
    return dados && dados.length > 0 ? dados : [];
  }
}

export default ServicoOmniService;

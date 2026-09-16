import { MetasConsultor } from "../interfaces/consultor_metas.interface";
import ConsultorRepository from "../repositories/consultor.repository";

class ConsultorService {
  private repo: ConsultorRepository;

  constructor() {
    this.repo = new ConsultorRepository();
  }

  async buscarConsultoresDisparo() {
    return this.repo.buscarConsultoresDisparo();
  }

  async buscarConsultores() {
    return this.repo.buscarConsultores();
  }

  async buscarConsultorPorSeq(seq: number) {
    return this.repo.buscarConsultorPorSeq(seq);
  }

  async buscarMetaMensalPorSeq(seq: number) {
    return this.repo.buscarMetaMensalPorSeq(seq);
  }

  async criarConsultorMeta(dados: MetasConsultor) {
    if (!dados.seq_consultor) {
      throw new Error("CONSULTOR_OBRIGATORIO");
    }

    if (!dados.data_referencia) {
      throw new Error("DATA_OBRIGATORIA");
    }

    return this.repo.criarConsultorMeta(dados);
  }

  async atualizarMetaMensal(seq_consultor: number, meta: number) {
    const atualizado = await this.repo.atualizarMetaMensal(seq_consultor, meta);

    if (!atualizado) {
      throw new Error("CONSULTOR_NAO_ENCONTRADO");
    }

    return atualizado;
  }

  async listarHistoricoEmpresa(seq_empresa: number) {
    if (!seq_empresa || seq_empresa <= 0) {
      throw new Error(
        "O identificador da empresa (seq_empresa) é obrigatório e deve ser válido.",
      );
    }

    const dados = await this.repo.buscarHistoricoPorSeqEmpresa(seq_empresa);
    return dados && dados.length > 0 ? dados : [];
  }

  async listarConsultoresDisponiveisEmpresa(
    seq_empresa: number,
    indicacao: string,
    carteira?: string,
  ) {
    if (!seq_empresa || seq_empresa <= 0) {
      throw new Error("PARAMETRO_EMPRESA_INVALIDO");
    }
    if (!indicacao) {
      throw new Error("PARAMETRO_INDICACAO_OBRIGATORIO");
    }

    const consultores = await this.repo.buscarConsultoresDisponiveis(
      seq_empresa,
      indicacao,
      carteira,
    );
    return consultores || [];
  }

  async listarConsultoresDisponiveisEmpresaExclusiva(seq_empresa: number) {
    if (!seq_empresa || seq_empresa <= 0) {
      throw new Error("PARAMETRO_EMPRESA_INVALIDO");
    }

    const consultores =
      await this.repo.buscarConsultoresDisponiveisExclusivos(seq_empresa);
    return consultores || [];
  }

  async atualizarConsultorEmpresa(seq_consultor: number, seq_empresa: number) {
    if (!seq_consultor || seq_consultor <= 0) {
      throw new Error("PARAMETRO_CONSULTOR_INVALIDO");
    }

    if (!seq_empresa || seq_empresa <= 0) {
      throw new Error("PARAMETRO_EMPRESA_INVALIDO");
    }

    const servicoAtualizado = await this.repo.atualizarConsultorEmpresa(
      seq_consultor,
      seq_empresa,
    );

    if (!servicoAtualizado) {
      throw new Error("SERVICO_CLARO_NAO_ENCONTRADO_PARA_EMPRESA");
    }

    return servicoAtualizado;
  }
}

export default ConsultorService;

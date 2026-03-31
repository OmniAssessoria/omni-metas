import DadosServicoOperadora from "../interfaces/servico_operadora.interface.js";
import ServicoOperadoraRepository from "../repositories/servico_operadora.repository.js";

class ServicoOperadoraService {
  private repository: ServicoOperadoraRepository;

  constructor() {
    this.repository = new ServicoOperadoraRepository();
  }

  async listarServisoOperadoraPorSeq(seq_empresa: number) {
    const dados: DadosServicoOperadora[] =
      await this.repository.buscarServicoOperadoraPorSeqEmpresa(seq_empresa);
    return dados && dados.length > 0 ? dados : [];
  }
}

export default ServicoOperadoraService;

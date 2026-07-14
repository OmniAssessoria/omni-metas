import MotivoDeclinioRepository from "../repositories/motivo_declinio.service";

interface ICriarMotivo {
  seq_motivo_declinio?: number;
  motivo_declinio: string;
  situacao_atendimento: string;
  id_motivo_declinio: string;
}

class MotivoDeclinioService {
  private repo: MotivoDeclinioRepository;

  constructor() {
    this.repo = new MotivoDeclinioRepository();
  }

  async buscarMotivosDeclinio() {
    return this.repo.buscarMotivosDeclinio();
  }

  async buscarMotivoDeclinio(id_motivo_declinio: string) {
    if (!id_motivo_declinio) {
      throw new Error("O parâmetro id_motivo_declinio é obrigatório para a busca.");
    }
    return this.repo.buscarMotivoDeclinioPorIdCrm(id_motivo_declinio);
  }

  async criarMotivoDeclinio(dados: ICriarMotivo) {
    if (!dados.id_motivo_declinio) {
      throw new Error("O campo id_motivo_declinio (ID da API CRM) é obrigatório.");
    }
    if (!dados.motivo_declinio) {
      throw new Error("O campo motivo_declinio (Nome da API CRM) é obrigatório.");
    }

    const seqAleatorio = Math.floor(Math.random() * 9000000) + 1000000;
    const seqFinal = dados.seq_motivo_declinio || seqAleatorio;
    const situacao = dados.situacao_atendimento || "TEMPORARIO";

    return this.repo.criarMotivoDeclinio(
      seqFinal,
      dados.motivo_declinio,
      situacao,
      dados.id_motivo_declinio
    );
  }
}

export default MotivoDeclinioService;

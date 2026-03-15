import { MetasConsultor } from "../interfaces/consultor_metas.interface";
import ConsultorRepository from "../repositories/consultor.repository";


class ConsultorService {
    private repo: ConsultorRepository;

    constructor() {
        this.repo = new ConsultorRepository();
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

        const atualizado = await this.repo.atualizarMetaMensal(
            seq_consultor,
            meta
        );

        if (!atualizado) {
            throw new Error("CONSULTOR_NAO_ENCONTRADO");
        }

        return atualizado;
    }
}

export default ConsultorService;
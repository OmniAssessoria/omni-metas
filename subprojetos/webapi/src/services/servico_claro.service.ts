import ServicoClaroRepository from "../repositories/servico_claro.repository.js";

class ServicoClaroService {
    private repository: ServicoClaroRepository;

    constructor() {
        this.repository = new ServicoClaroRepository();
    }

    async listarPortabilidadesPendentes() {
        const dados = await this.repository.buscarServicosClaroPipePortabilidade();
        if (!dados || dados.length === 0) {
            return [];
        }
        return dados;
    }

    async listarRenovacoesPendentes() {
        const dados = await this.repository.buscarServicosClaroPipeRenovacao();
        if (!dados || dados.length === 0) {
            return [];
        }
        return dados;
    }

    async marcarComoEnviadoCrm(seq_claro: number) {
        if (!seq_claro) {
            throw new Error("O identificador do serviço (seq_claro) é obrigatório.");
        }

        const servicoAtualizado = await this.repository.atualizarSituacaoServicoPipe(seq_claro);

        if (!servicoAtualizado) {
            throw new Error(`Serviço com seq_claro ${seq_claro} não encontrado.`);
        }

        return servicoAtualizado;
    }
}

export default ServicoClaroService;
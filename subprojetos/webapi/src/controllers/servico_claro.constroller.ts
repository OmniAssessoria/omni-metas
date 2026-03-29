import { Request, Response } from "express";
import ServicoClaroService from "../services/servico_claro.service.js";

class ServicoClaroController {
    private servicoClaroService: ServicoClaroService;

    constructor() {
        this.servicoClaroService = new ServicoClaroService();
        this.buscarServicosClaroPipePortabilidade = this.buscarServicosClaroPipePortabilidade.bind(this);
        this.buscarServicosClaroPipeRenovacao = this.buscarServicosClaroPipeRenovacao.bind(this);
        this.atualizarStatusCrm = this.atualizarStatusCrm.bind(this);
        this.sincronizarDados = this.sincronizarDados.bind(this);
        this.obterTodosMotivosDeclinio = this.obterTodosMotivosDeclinio.bind(this);
    }

    async buscarServicosClaroPipePortabilidade(req: Request, res: Response): Promise<void> {
        try {
            const servicos = await this.servicoClaroService.listarPortabilidadesPendentes();
            res.status(200).json({ status: true, mensagem: "Serviços Claro (Portabilidade) encontrados com sucesso.", dados: servicos });
        } catch (error: any) {
            res.status(500).json({ status: false, mensagem: "Erro ao buscar serviços em portabilidade.", detalhes: error.message });
        }
    }

    async buscarServicosClaroPipeRenovacao(req: Request, res: Response): Promise<void> {
        try {
            const servicos = await this.servicoClaroService.listarRenovacoesPendentes();
            res.status(200).json({ status: true, mensagem: "Serviços Claro (Renovação) encontrados com sucesso.", dados: servicos });
        } catch (error: any) {
            res.status(500).json({ status: false, mensagem: "Erro ao buscar serviços em renovação.", detalhes: error.message });
        }
    }

    async atualizarStatusCrm(req: Request, res: Response): Promise<void> {
        try {
            const { seq_claro } = req.params;
            console.log(`\n[API PATCH] Requisição recebida para atualizar DB. Params:`, req.params);

            const idServico = Number(seq_claro);
            if (isNaN(idServico) || idServico <= 0) {
                res.status(400).json({ status: false, mensagem: "Parâmetro seq_claro inválido." });
                return;
            }

            const servicoAtualizado = await this.servicoClaroService.marcarComoEnviadoCrm(idServico);

            res.status(200).json({ status: true, mensagem: "Status do CRM atualizado com sucesso.", dados: servicoAtualizado });
        } catch (error: any) {
            console.error(`[API PATCH ERROR] Falha no Controller:`, error.message);
            res.status(500).json({ status: false, mensagem: "Erro ao atualizar o status do CRM no banco de dados.", detalhes: error.message });
        }
    }

    async sincronizarDados(req: Request, res: Response): Promise<void> {
        try {
            const dados = req.body;
            const servicosSincronizados = await this.servicoClaroService.atualizarServicosPiperun(dados);
            res.status(200).json({ status: true, mensagem: "Serviços sincronizados com sucesso.", dados: servicosSincronizados });
        } catch (error: any) {
            res.status(500).json({ status: false, mensagem: "Erro ao sincronizar serviços PipeRun com a base da Omni.", detalhes: error.message });
        }
    }

    async obterTodosMotivosDeclinio(req: Request, res: Response): Promise<void> {
        try {
            const motivosDeclinio = await this.servicoClaroService.listarTodosMotivosDeclinio();
            res.status(200).json({ status: true, mensagem: "Motivos de declínio encontrados com sucesso.", dados: motivosDeclinio });
        } catch (error: any) {
            res.status(500).json({ status: false, mensagem: "Erro ao buscar motivos de declínio.", detalhes: error.message });
        }
    }
}

export default ServicoClaroController;
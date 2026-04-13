import { Request, Response } from "express";
import ServicoClaroService from "../services/servico_claro.service.js";
import GeradorImagemLayoutService from "../services/gerador_imagem_layout.service.js";

class ServicoClaroController {
  private servicoClaroService: ServicoClaroService;
  private geradorImagemLayoutService: GeradorImagemLayoutService;

  constructor() {
    this.servicoClaroService = new ServicoClaroService();
    this.geradorImagemLayoutService = new GeradorImagemLayoutService();
    
    this.buscarServicosClaroPipePortabilidade =
      this.buscarServicosClaroPipePortabilidade.bind(this);
    this.buscarServicosClaroPipeRenovacao =
      this.buscarServicosClaroPipeRenovacao.bind(this);
    this.buscarServicosClaroPipeExclusivo =
      this.buscarServicosClaroPipeExclusivo.bind(this);
    this.atualizarStatusCrm = this.atualizarStatusCrm.bind(this);
    this.sincronizarDados = this.sincronizarDados.bind(this);
    this.obterTodosMotivosDeclinio = this.obterTodosMotivosDeclinio.bind(this);
    this.buscarDashboardHistorico = this.buscarDashboardHistorico.bind(this);
    this.buscarDashboardBase = this.buscarDashboardBase.bind(this);
    this.buscarDashboardPorIndicacao =
      this.buscarDashboardPorIndicacao.bind(this);
    this.buscarDashboardEmpresasInfo = this.buscarDashboardEmpresasInfo.bind(this);
    this.gerarLayoutImagemLinhas = this.gerarLayoutImagemLinhas.bind(this);
  }

  async buscarServicosClaroPipePortabilidade(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const servicos =
        await this.servicoClaroService.listarPortabilidadesPendentes();
      res.status(200).json({
        status: true,
        mensagem: "Serviços Claro (Portabilidade) encontrados com sucesso.",
        dados: servicos,
      });
    } catch (error: any) {
      res.status(500).json({
        status: false,
        mensagem: "Erro ao buscar serviços em portabilidade.",
        detalhes: error.message,
      });
    }
  }

  async buscarServicosClaroPipeRenovacao(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const servicos =
        await this.servicoClaroService.listarRenovacoesPendentes();
      res.status(200).json({
        status: true,
        mensagem: "Serviços Claro (Renovação) encontrados com sucesso.",
        dados: servicos,
      });
    } catch (error: any) {
      res.status(500).json({
        status: false,
        mensagem: "Erro ao buscar serviços em renovação.",
        detalhes: error.message,
      });
    }
  }

  async buscarServicosClaroPipeExclusivo(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const servicos =
        await this.servicoClaroService.listarExclusivoPendentes();
      res.status(200).json({
        status: true,
        mensagem: "Serviços Claro (Exclusivo) encontrados com sucesso.",
        dados: servicos,
      });
    } catch (error: any) {
      res.status(500).json({
        status: false,
        mensagem: "Erro ao buscar serviços em exclusivos.",
        detalhes: error.message,
      });
    }
  }

  async atualizarStatusCrm(req: Request, res: Response): Promise<void> {
    try {
      const { seq_claro } = req.params;
      console.log(
        `\n[API PATCH] Requisição recebida para atualizar DB. Params:`,
        req.params,
      );

      const idServico = Number(seq_claro);
      if (isNaN(idServico) || idServico <= 0) {
        res
          .status(400)
          .json({ status: false, mensagem: "Parâmetro seq_claro inválido." });
        return;
      }

      const servicoAtualizado =
        await this.servicoClaroService.marcarComoEnviadoCrm(idServico);

      res.status(200).json({
        status: true,
        mensagem: "Status do CRM atualizado com sucesso.",
        dados: servicoAtualizado,
      });
    } catch (error: any) {
      console.error(`[API PATCH ERROR] Falha no Controller:`, error.message);
      res.status(500).json({
        status: false,
        mensagem: "Erro ao atualizar o status do CRM no banco de dados.",
        detalhes: error.message,
      });
    }
  }

  async sincronizarDados(req: Request, res: Response): Promise<void> {
    try {
      const dados = req.body;
      console.log(
        `[SYNC INICIADO] Processando CNPJ: ${dados.cnpj} | Serviço: ${dados.tipo_servico}`,
      );

      const resultadoSync =
        await this.servicoClaroService.atualizarServicosPiperun(dados);

      if (resultadoSync.ignorado) {
        console.log(
          `[SYNC IGNORADO] CNPJ: ${dados.cnpj} - Motivo: ${resultadoSync.motivo}`,
        );
        res.status(200).json({
          status: true,
          ignorado: true,
          mensagem: resultadoSync.motivo,
        });
        return;
      }

      console.log(`[SYNC SUCESSO] CNPJ: ${dados.cnpj} salvo corretamente.`);
      res.status(200).json({
        status: true,
        mensagem: "Serviço sincronizado com sucesso.",
        dados: resultadoSync.dados,
      });
    } catch (error: any) {
      console.error(
        `[SYNC ERRO FATAL] Falha no CNPJ ${req.body?.cnpj}:`,
        error.message,
      );
      res.status(500).json({
        status: false,
        mensagem: "Erro ao sincronizar serviços PipeRun com a base da Omni.",
        detalhes: error.message,
      });
    }
  }

  async obterTodosMotivosDeclinio(req: Request, res: Response): Promise<void> {
    try {
      const motivosDeclinio =
        await this.servicoClaroService.listarTodosMotivosDeclinio();
      res.status(200).json({
        status: true,
        mensagem: "Motivos de declínio encontrados com sucesso.",
        dados: motivosDeclinio,
      });
    } catch (error: any) {
      res.status(500).json({
        status: false,
        mensagem: "Erro ao buscar motivos de declínio.",
        detalhes: error.message,
      });
    }
  }

  async buscarDashboardHistorico(req: Request, res: Response): Promise<void> {
    try {
      const dadosHistorico =
        await this.servicoClaroService.obterDashboardHistorico();
      res.status(200).json({
        status: true,
        mensagem: "Histórico de atendimento e declínio carregado com sucesso.",
        total_registros: dadosHistorico.length,
        dados: dadosHistorico,
      });
    } catch (error: any) {
      res.status(500).json({
        status: false,
        mensagem: "Erro ao buscar histórico do dashboard.",
        detalhes: error.message,
      });
    }
  }

  async buscarDashboardBase(req: Request, res: Response): Promise<void> {
    try {
      const dadosBase =
        await this.servicoClaroService.obterDashboardServicoBase();
      res.status(200).json({
        status: true,
        mensagem:
          "Dashboard base (Visão Consolidada Claro) carregado com sucesso.",
        total_registros: dadosBase.length,
        dados: dadosBase,
      });
    } catch (error: any) {
      res.status(500).json({
        status: false,
        mensagem: "Erro ao buscar dados da base consolidada do dashboard.",
        detalhes: error.message,
      });
    }
  }

  async buscarDashboardPorIndicacao(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const { tipo_indicacao } = req.params;

      const dadosIndicacao =
        await this.servicoClaroService.obterDashboardIndicacaoEspecifica(
          String(tipo_indicacao),
        );
      res.status(200).json({
        status: true,
        mensagem: `Dados de indicação (${String(tipo_indicacao).toUpperCase()}) carregados com sucesso.`,
        total_registros: dadosIndicacao.length,
        dados: dadosIndicacao,
      });
    } catch (error: any) {
      const statusCode = error.message.includes("não possui uma View mapeada")
        ? 400
        : 500;
      res.status(statusCode).json({
        status: false,
        mensagem: `Erro ao buscar dados do dashboard para a indicação: ${req.params.tipo_indicacao}`,
        detalhes: error.message,
      });
    }
  }

  async buscarDashboardEmpresasInfo(req: Request, res: Response): Promise<void> {
    try {
      const dadosEmpresas = await this.servicoClaroService.obterDashboardEmpresasInfo();

      res.status(200).json({
        status: true,
        mensagem: "Dashboard de funil CPC (Empresas) carregado com sucesso.",
        dados: dadosEmpresas,
      });
    } catch (error: any) {
      console.error(`[API GET ERROR] Falha ao buscar Dashboard Empresas:`, error.message);
      res.status(500).json({
        status: false,
        mensagem: "Erro ao buscar dados consolidados das empresas (Funil CPC).",
        detalhes: error.message,
      });
    }
  }

  async gerarLayoutImagemLinhas(req: Request, res: Response): Promise<void> {
    try {
      const { seq_empresa, razao, cnpj } = req.body;

      console.log(`[API POST] Gerando layout Base64 para Empresa SEQ: ${seq_empresa} | ${razao}`);

      if (!seq_empresa || isNaN(Number(seq_empresa))) {
        res.status(400).json({ status: false, mensagem: "O parâmetro seq_empresa é obrigatório e deve ser numérico." });
        return;
      }

      const resultado = await this.geradorImagemLayoutService.gerarLayoutInfoLinhas(
        Number(seq_empresa),
        razao,
        cnpj
      );

      res.status(200).json({
        status: true,
        mensagem: "Proposta gerada em Base64 com sucesso.",
        dados: {
          imagem: resultado.imagem_base64,
          metricas: resultado.analise
        }
      });

    } catch (error: any) {
      console.error(`[API POST ERROR] Falha ao gerar layout de linhas:`, error.message);
      res.status(500).json({
        status: false,
        mensagem: "Erro interno na renderização da proposta comercial.",
        detalhes: error.message,
      });
    }
  }
}

export default ServicoClaroController;

import { Request, Response } from "express";
import ServicoOmniService from "../services/servico_omni.service.js";
import GeradorImagemLinhasService from "../services/gerador_imagem_linhas.service.js";

class ServicoOmniController {
  private servicoOmniService: ServicoOmniService;
  private geradorImagemLayoutService: GeradorImagemLinhasService;

  constructor() {
    this.servicoOmniService = new ServicoOmniService();
    this.geradorImagemLayoutService = new GeradorImagemLinhasService();
    this.buscarEmpresaPorSeq = this.buscarEmpresaPorSeq.bind(this);
    this.buscarListaEmpresasEnvio = this.buscarListaEmpresasEnvio.bind(this);
    this.buscarServicosOmniDisponiveis = this.buscarServicosOmniDisponiveis.bind(this);
    this.buscarContagemServicoOmniDisponivel = this.buscarContagemServicoOmniDisponivel.bind(this);
    this.buscarPainelIndicadoresConsultor = this.buscarPainelIndicadoresConsultor.bind(this);
    this.atualizarStatusCrm = this.atualizarStatusCrm.bind(this);
    this.sincronizarDados = this.sincronizarDados.bind(this);
    this.obterTodosMotivosDeclinio = this.obterTodosMotivosDeclinio.bind(this);
    this.gerarLayoutImagemLinhas = this.gerarLayoutImagemLinhas.bind(this);
  }

  async buscarEmpresaPorSeq(req: Request, res: Response): Promise<void> {
    try {
      const { seq_empresa } = req.params;
      const idEmpresa = Number(seq_empresa);
      if (isNaN(idEmpresa) || idEmpresa <= 0) {
        res.status(400).json({
          status: false,
          mensagem: "Parâmetro seq_empresa inválido. Deve ser um número inteiro positivo.",
        });
        return;
      }
      const servicos = await this.servicoOmniService.listarEmpresaInfoPorSeq(idEmpresa);
      
      res.status(200).json({
        status: true,
        mensagem: "Serviços encontrados com sucesso.",
        dados: servicos,
      });
    } catch (error: any) {
      console.error(`[API GET ERROR] Falha ao buscar empresa ${req.params.seq_empresa}:`, error.message);
      res.status(500).json({
        status: false,
        mensagem: "Erro ao buscar serviços para a empresa informada.",
        detalhes: error.message,
      });
    }
  }

  async buscarListaEmpresasEnvio(req: Request, res: Response): Promise<void> {
    try {
      const { seq_consultor, limit } = req.query;
      const idConsultor = Number(seq_consultor);
      const limiteBusca = Number(limit) || 10;
      if (isNaN(idConsultor) || idConsultor <= 0) {
        res.status(400).json({
          status: false,
          mensagem: "Parâmetro 'seq_consultor' é obrigatório e deve ser um número inteiro positivo.",
        });
        return;
      }

      const empresas = await this.servicoOmniService.listarEmpresasEnvio(idConsultor, limiteBusca);
      res.status(200).json({
        status: true,
        mensagem: empresas.length > 0 
          ? "Lista de empresas encontrada com sucesso." 
          : "Nenhuma empresa encontrada para envio com este consultor.",
        total: empresas.length,
        dados: empresas,
      });
    } catch (error: any) {
      console.error(`[API GET ERROR] Falha ao buscar lista de empresas para envio:`, error.message);
      res.status(500).json({
        status: false,
        mensagem: "Erro interno ao buscar a lista de empresas do consultor.",
        detalhes: error.message,
      });
    }
  }

  async buscarServicosOmniDisponiveis(req: Request, res: Response): Promise<void> {
    try {
      const servicos = await this.servicoOmniService.listarbuscarServicosOmniDisponivel();
      res.status(200).json({
        status: true,
        mensagem: "Serviços encontrados com sucesso.",
        dados: servicos,
      });
    } catch (error: any) {
      res.status(500).json({
        status: false,
        mensagem: "Erro ao buscar serviços.",
        detalhes: error.message,
      });
    }
  }

  async buscarContagemServicoOmniDisponivel(req: Request, res: Response): Promise<void> {
    try {
      const servicos = await this.servicoOmniService.listarContagemServicosOmniDisponivel();
      res.status(200).json({
        status: true,
        mensagem: "Contagem de serviços encontrada com sucesso.",
        dados: servicos,
      });
    } catch (error: any) {
      res.status(500).json({
        status: false,
        mensagem: "Erro ao buscar contagem de serviços.",
        detalhes: error.message,
      });
    }
  }

  async buscarPainelIndicadoresConsultor(req: Request, res: Response): Promise<void> {
    try {
      const servicos = await this.servicoOmniService.listarPainelIndicadoresConsultor();
      res.status(200).json({
        status: true,
        mensagem: "Painel de indicadores gerado com sucesso.",
        dados: servicos,
      });
    } catch (error: any) {
      res.status(500).json({
        status: false,
        mensagem: "Erro ao buscar painel de indicadores.",
        detalhes: error.message,
      });
    }
  }

  async atualizarStatusCrm(req: Request, res: Response): Promise<void> {
    try {
      const { seq_empresa } = req.params;
      const { dt_crm, codigo_crm } = req.body; 

      console.log(`\n[API PATCH] Requisição recebida para atualizar DB. Params:`, req.params, `Body:`, req.body);

      const idServico = Number(seq_empresa);
      if (isNaN(idServico) || idServico <= 0) {
        res.status(400).json({ status: false, mensagem: "Parâmetro seq_empresa inválido." });
        return;
      }

      if (!dt_crm || !codigo_crm) {
        res.status(400).json({ status: false, mensagem: "Parâmetros dt_crm e codigo_crm são obrigatórios no body." });
        return;
      }

      const servicoAtualizado = await this.servicoOmniService.marcarComoEnviadoCrm(
        idServico, 
        new Date(dt_crm), 
        Number(codigo_crm)
      );

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
      console.log(`[SYNC INICIADO] Processando CNPJ: ${dados.cnpj}`);

      const resultadoSync = await this.servicoOmniService.atualizarServicosOmniHistorico(dados);

      if (resultadoSync.ignorado) {
        console.log(`[SYNC IGNORADO] CNPJ: ${dados.cnpj} - Motivo: ${resultadoSync.motivo}`);
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
      console.error(`[SYNC ERRO FATAL] Falha no CNPJ ${req.body?.cnpj}:`, error.message);
      res.status(500).json({
        status: false,
        mensagem: "Erro ao sincronizar serviços PipeRun com a base da Omni.",
        detalhes: error.message,
      });
    }
  }

  async obterTodosMotivosDeclinio(req: Request, res: Response): Promise<void> {
    try {
      const motivosDeclinio = await this.servicoOmniService.listarTodosMotivosDeclinio();
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

  async gerarLayoutImagemLinhas(req: Request, res: Response): Promise<void> {
    try {
      const { seq_empresa, razao, cnpj } = req.body;

      console.log(`[API POST] Gerando layout Base64 para Empresa SEQ: ${seq_empresa} | ${razao}`);

      if (!seq_empresa || isNaN(Number(seq_empresa))) {
        res.status(400).json({
          status: false,
          mensagem: "O parâmetro seq_empresa é obrigatório e deve ser numérico.",
        });
        return;
      }

      const resultado = await this.geradorImagemLayoutService.gerarLayoutInfoLinhas(
        Number(seq_empresa),
        razao,
        cnpj,
      );

      res.status(200).json({
        status: true,
        mensagem: "Proposta gerada em Base64 com sucesso.",
        dados: {
          imagem: resultado.imagem_base64,
          metricas: resultado.analise,
        },
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

export default ServicoOmniController;

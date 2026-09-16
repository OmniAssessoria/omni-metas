import { Request, Response } from "express";
import DisparoWhatsappService from "../services/disparo_whatsapp.service.js";
import path from "path";
import fs from "fs";

class DisparoWhatsappController {
  private disparoWhatsappService: DisparoWhatsappService;

  constructor() {
    this.disparoWhatsappService = new DisparoWhatsappService();
    this.separarLeadsDisparo = this.separarLeadsDisparo.bind(this);
    this.obterDashboard = this.obterDashboard.bind(this);
    this.baixarPlanilha = this.baixarPlanilha.bind(this);
  }

  async obterDashboard(req: Request, res: Response): Promise<void> {
    try {
      const dados = await this.disparoWhatsappService.dashboardTotais();
      res.status(200).json({ status: true, data: dados });
    } catch (error: any) {
      res.status(500).json({
        status: false,
        mensagem: "Erro ao buscar dashboard de disparos.",
        detalhes: error.message,
      });
    }
  }

  async separarLeadsDisparo(req: Request, res: Response): Promise<void> {
    try {
      const { seq_consultor, indicacao, limite } = req.body;

      if (!seq_consultor || !indicacao || !limite || limite <= 0) {
        res.status(400).json({ status: false, erro: "Dados inválidos." });
        return;
      }

      const resultado = await this.disparoWhatsappService.separarEGerarPlanilha(
        parseInt(limite),
        indicacao,
        parseInt(seq_consultor),
      );

      if (!resultado) {
        res
          .status(404)
          .json({
            status: false,
            erro: "Nenhum lead elegível encontrado para esta indicação.",
          });
        return;
      }

      res.status(200).json({
        sucesso: true,
        arquivo: resultado.arquivo,
        qtd_gerada: resultado.qtd_gerada,
      });
    } catch (error: any) {
      res.status(500).json({
        status: false,
        mensagem: "Erro interno ao processar geração de disparos.",
        detalhes: error.message,
      });
    }
  }

  async baixarPlanilha(req: Request, res: Response): Promise<void> {
    try {
      const nomeArquivo: string = String(req.params.nome_arquivo);
      const filePath = path.join(
        process.cwd(),
        "public",
        "downloads",
        nomeArquivo,
      );

      if (fs.existsSync(filePath)) {
        res.download(filePath, nomeArquivo);
      } else {
        res
          .status(404)
          .json({ status: false, erro: "Arquivo não encontrado." });
      }
    } catch (error: any) {
      res.status(500).json({ status: false, erro: error.message });
    }
  }
}

export default DisparoWhatsappController;

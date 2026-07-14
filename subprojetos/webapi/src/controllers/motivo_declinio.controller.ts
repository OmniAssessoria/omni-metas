import { Request, Response } from "express";
import MotivoDeclinioService from "../services/motivo_declinio.service.js";

class MotivoDeclinioController {
  private motivoDeclinioService: MotivoDeclinioService;

  constructor() {
    this.motivoDeclinioService = new MotivoDeclinioService();
    this.buscarMotivosDeclinios = this.buscarMotivosDeclinios.bind(this);
    this.buscarMotivoDeclinio = this.buscarMotivoDeclinio.bind(this);
    this.criarMotivoDeclinio = this.criarMotivoDeclinio.bind(this);
  }

  async buscarMotivosDeclinios(req: Request, res: Response): Promise<void> {
    try {
      const dados = await this.motivoDeclinioService.buscarMotivosDeclinio();
      res.status(200).json({
        status: true,
        mensagem: "Motivos de declínio resgatados com sucesso do banco de dados.",
        dados: dados,
      });
    } catch (error: any) {
      res.status(500).json({
        status: false,
        mensagem: "Erro interno ao buscar motivos de declínio.",
        detalhes: error.message,
      });
    }
  }

  async buscarMotivoDeclinio(req: Request, res: Response): Promise<void> {
    try {
      const { id_motivo_declinio } = req.params;
      const dados = await this.motivoDeclinioService.buscarMotivoDeclinio(String(id_motivo_declinio));

      res.status(200).json({
        status: true,
        mensagem: dados ? "Motivo encontrado." : "Motivo não encontrado.",
        dados: dados || null,
      });
    } catch (error: any) {
      res.status(500).json({
        status: false,
        mensagem: "Erro interno ao buscar motivo específico.",
        detalhes: error.message,
      });
    }
  }

  async criarMotivoDeclinio(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body;
      const motivoCriado = await this.motivoDeclinioService.criarMotivoDeclinio(payload);

      res.status(201).json({
        status: true,
        mensagem: "Motivo de declínio criado com sucesso no banco de dados.",
        dados: motivoCriado,
      });
    } catch (error: any) {
      res.status(500).json({
        status: false,
        mensagem: "Erro ao tentar criar motivo de declínio.",
        detalhes: error.message,
      });
    }
  }
}

export default MotivoDeclinioController;

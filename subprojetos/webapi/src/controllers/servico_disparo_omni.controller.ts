import { Request, Response } from "express";
import ServicoDisparoOmniService from "../services/servico_disparo_omni.service";

class ServicoDisparOmniController {
  private servicoDisparoOmniService: ServicoDisparoOmniService;

  constructor() {
    this.servicoDisparoOmniService = new ServicoDisparoOmniService();
    this.validarNumeroWhatsapp = this.validarNumeroWhatsapp.bind(this);
  }

  async validarNumeroWhatsapp(req: Request, res: Response): Promise<void> {
    try {
      const { numero } = req.params;
      const numero_validar = Number(numero);

      if (isNaN(numero_validar) || numero_validar <= 0) {
        res.status(400).json({
          status: false,
          mensagem: "Parâmetro 'numero' inválido. Deve ser um número inteiro positivo.",
        });
        return;
      }

      const possuiWhatsapp = await this.servicoDisparoOmniService.validarNumeroWhatsapp(numero_validar);

      res.status(200).json({
        status: true,
        mensagem: possuiWhatsapp 
          ? "Validação concluída: O número possui WhatsApp ativo." 
          : "Validação concluída: O número NÃO possui WhatsApp.",
        dados: {
          numero_avaliado: numero_validar,
          possui_whatsapp: possuiWhatsapp
        },
      });
    } catch (error: any) {
      console.error(
        `[API GET ERROR] Falha ao validar o número ${req.params.numero}:`,
        error.message,
      );
      
      res.status(500).json({
        status: false,
        mensagem: "Erro interno ao tentar validar o número de WhatsApp.",
        detalhes: error.message,
      });
    }
  }
}

export default ServicoDisparOmniController;

import { Request, Response } from "express";
import LocalStorageService from "../services/local_storage.service";

class DecisorController {
  private storageService: LocalStorageService;

  constructor() {
    this.storageService = new LocalStorageService();
    this.buscarImagemDecisorLocal = this.buscarImagemDecisorLocal.bind(this);
  }

  async buscarImagemDecisorLocal(req: Request, res: Response): Promise<void> {
    try {
      const { url_pasta, cnpj, razao } = req.body;

      console.log(
        `\n[API POST] Recebida solicitação de imagem do Decisor | Empresa: ${razao || cnpj}`,
      );

      if (!url_pasta || typeof url_pasta !== "string") {
        res.status(400).json({
          status: false,
          mensagem:
            "O parâmetro 'url_pasta' é obrigatório e deve conter o caminho relativo do arquivo no banco.",
        });
        return;
      }

      if (!cnpj) {
        res.status(400).json({
          status: false,
          mensagem:
            "O parâmetro 'cnpj' é obrigatório para localizar a imagem correta na subpasta.",
        });
        return;
      }

      const imagemBase64 = await this.storageService.buscarImagemDecisor(
        url_pasta,
        cnpj,
      );

      if (!imagemBase64) {
        res.status(404).json({
          status: false,
          mensagem:
            "Nenhuma imagem de decisor encontrada para este CNPJ no Servidor Local.",
          dados: null,
        });
        return;
      }

      res.status(200).json({
        status: true,
        mensagem: "Imagem do decisor resgatada com sucesso do Servidor Local.",
        imagemBase64: imagemBase64,
      });
    } catch (error: any) {
      console.error(
        `[API POST ERROR] Falha ao extrair imagem do Armazenamento Local:`,
        error.message,
      );

      res.status(500).json({
        status: false,
        mensagem:
          "Erro interno ao processar comunicação com a API de Arquivos Local (10.0.0.106).",
        detalhes: error.message,
      });
    }
  }
}

export default DecisorController;

import { Request, Response } from "express";
import GoogleDriveService from "../services/drive.service";

class DecisorController {
  private driveService: GoogleDriveService;

  constructor() {
    this.driveService = new GoogleDriveService();
    this.buscarImagemDecisorDrive = this.buscarImagemDecisorDrive.bind(this);
  }

  async buscarImagemDecisorDrive(req: Request, res: Response): Promise<void> {
    try {
      const { url_pasta, cnpj, razao } = req.body;

      console.log(
        `\n[API POST] Recebida solicitação de imagem do Decisor | Empresa: ${razao || cnpj}`,
      );

      if (!url_pasta || typeof url_pasta !== "string") {
        res.status(400).json({
          status: false,
          mensagem: "O parâmetro 'url_pasta' é obrigatório e deve ser o link do Google Drive.",
        });
        return;
      }

      if (!cnpj) {
        res.status(400).json({
          status: false,
          mensagem: "O parâmetro 'cnpj' é obrigatório para localizar a imagem correta.",
        });
        return;
      }

      const imagemBase64 = await this.driveService.buscarImagemDecisor(url_pasta, cnpj);

      if (!imagemBase64) {
        res.status(404).json({
          status: false,
          mensagem: "Nenhuma imagem de decisor encontrada para este CNPJ na pasta fornecida.",
          dados: null
        });
        return;
      }

      res.status(200).json({
        status: true,
        mensagem: "Imagem do decisor resgatada com sucesso.",
        imagemBase64: imagemBase64,
      });

    } catch (error: any) {
      console.error(
        `[API POST ERROR] Falha ao extrair imagem do Drive:`,
        error.message,
      );
      
      res.status(500).json({
        status: false,
        mensagem: "Erro interno ao processar comunicação com o Google Drive.",
        detalhes: error.message,
      });
    }
  }
}

export default DecisorController;

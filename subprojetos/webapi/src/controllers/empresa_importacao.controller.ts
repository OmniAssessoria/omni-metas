import { Request, Response } from "express";
import EmpresaImportacaoService from "../services/empresa_importacao.service";

class EmpresaImportacaoController {
    private service: EmpresaImportacaoService;

    constructor() {
        this.service = new EmpresaImportacaoService();
        this.importarBases = this.importarBases.bind(this);
    }

    async importarBases(req: Request, res: Response): Promise<void> {
        try {
            const arquivo = req.file as Express.Multer.File | undefined;
            const origem = req.body.origem;

            if (!arquivo) {
                res.status(400).json({ status: false, mensagem: "Planilha não enviada." });
                return;
            }

            if (!origem) {
                res.status(400).json({ status: false, mensagem: "O campo origem é obrigatório." });
                return;
            }

            await this.service.importarBases(arquivo.buffer, origem);
            
            res.status(200).json({
                status: true,
                mensagem: "Empresas importadas e atualizadas com sucesso.",
            });
        } catch (error: any) {
            res.status(500).json({
                status: false,
                mensagem: "Erro interno ao importar bases ao banco.",
                detalhes: error.message,
            });
        }
    }
}

export default EmpresaImportacaoController;

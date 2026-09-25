import { Router } from "express";
import multer from "multer";
import EmpresaImportacaoController from "../controllers/empresa_importacao.controller";

const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 }
});

class RotasEmpresaImportacao {
  private router: Router;
  private controller: EmpresaImportacaoController;

  constructor() {
    this.router = Router();
    this.controller = new EmpresaImportacaoController();
    this.registrarRotas();
  }

  private registrarRotas() {
    this.router.post(
      "/importacao-base",
      upload.single("planilha"), 
      this.controller.importarBases
    );
  }

  public retornarRotas(): Router {
    return this.router;
  }
}

export default RotasEmpresaImportacao;
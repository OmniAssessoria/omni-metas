import { Router } from "express";
import multer from "multer";
import DisparoWhatsappController from "../controllers/disparo_whatsapp.controller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

class RotasDisparoWhatsapp {
  private router: Router;
  private disparoWhatsappController: DisparoWhatsappController;

  constructor() {
    this.router = Router();
    this.disparoWhatsappController = new DisparoWhatsappController();
    this.registrarRotas();
  }

  private registrarRotas() {
    this.router.get(
      "/disparo-whatsapp/dashboard",
      this.disparoWhatsappController.obterDashboard
    );

    this.router.post(
      "/disparo-whatsapp/gerar",
      this.disparoWhatsappController.separarLeadsDisparo
    );

    this.router.post(
      "/disparo-whatsapp/importar-take",
      upload.single("arquivo"),
      this.disparoWhatsappController.importarRelatorioTake
    );

    this.router.get(
      "/disparo-whatsapp/download/:nome_arquivo",
      this.disparoWhatsappController.baixarPlanilha
    );
  }

  public retornarRotas(): Router {
    return this.router;
  }
}

export default RotasDisparoWhatsapp;
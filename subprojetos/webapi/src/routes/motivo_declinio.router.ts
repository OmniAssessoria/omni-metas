import { Router } from "express";
import MotivoDeclinioController from "../controllers/motivo_declinio.controller.js";

class RotasMotivoDeclinio {
  private router: Router;
  private motivoDeclinioController: MotivoDeclinioController;

  constructor() {
    this.router = Router();
    this.motivoDeclinioController = new MotivoDeclinioController();
    this.registrarRotas();
  }

  private registrarRotas() {
    this.router.post(
      "/motivo-declinio",
      this.motivoDeclinioController.criarMotivoDeclinio,
    );
    this.router.get(
      "/motivo-declinio",
      this.motivoDeclinioController.buscarMotivosDeclinios,
    );
    this.router.get(
      "/motivo-declinio/:id_motivo_declinio",
      this.motivoDeclinioController.buscarMotivoDeclinio,
    );
  }

  public retornarRotas(): Router {
    return this.router;
  }
}

export default RotasMotivoDeclinio;

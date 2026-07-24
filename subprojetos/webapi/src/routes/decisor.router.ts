import { Router } from "express";
import DecisorController from "../controllers/decisor.controller";

class RotasDecisor {
  private router: Router;
  private decisorController: DecisorController;

  constructor() {
    this.router = Router();
    this.decisorController = new DecisorController();
    this.registrarRotas();
  }

  private registrarRotas() {
    this.router.post(
      "/armazenamento-local/buscar-decisor",
      this.decisorController.buscarImagemDecisorLocal,
    );
    this.router.post(
      "/armazenamento-local/buscar-decisor-pdf",
      this.decisorController.buscarPdfDecisorLocal,
    );
  }

  public retornarRotas(): Router {
    return this.router;
  }
}

export default RotasDecisor;

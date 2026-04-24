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
    // Atenção: Alterado de GET para POST para receber o body da requisição
    this.router.post(
      "/drive/buscar-decisor",
      this.decisorController.buscarImagemDecisorDrive
    );
  }

  public retornarRotas(): Router {
    return this.router;
  }
}

export default RotasDecisor;

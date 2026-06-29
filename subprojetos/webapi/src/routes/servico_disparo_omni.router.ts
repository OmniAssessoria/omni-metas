import { Router } from "express";
import ServicoDisparOmniController from "../controllers/servico_disparo_omni.controller";

class RotasServicoDisparoOmni {
  private router: Router;
  private servicoDisparoOmniController: ServicoDisparOmniController;

  constructor() {
    console.log("RotasServicoOmni carregado");
    this.router = Router();
    this.servicoDisparoOmniController = new ServicoDisparOmniController();
    this.registrarRotas();
  }

  private registrarRotas() {
    this.router.get(
      "/servico-disparo/validar-numero/:numero",
      this.servicoDisparoOmniController.validarNumeroWhatsapp,
    );
  }

  public retornarRotas(): Router {
    return this.router;
  }
}

export default RotasServicoDisparoOmni;

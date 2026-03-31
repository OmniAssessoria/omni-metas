import { Router } from "express";
import ServicoOperadoraController from "../controllers/servico_operadora.controller.js";

class RotasServicoOperadora {
  private router: Router;
  private servicoOperadoraController: ServicoOperadoraController;

  constructor() {
    this.router = Router();
    this.servicoOperadoraController = new ServicoOperadoraController();
    this.registrarRotas();
  }

  private registrarRotas() {
    this.router.get(
      "/servico-operadora/:seq_empresa",
      this.servicoOperadoraController.buscarServicosOperadoraPorEmpresa,
    );
  }

  public retornarRotas(): Router {
    return this.router;
  }
}

export default RotasServicoOperadora;

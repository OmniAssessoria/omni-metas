import { Router } from "express";
import RotasConsultor from "./consultor.router.js";
import RotasServicoClaro from "./servico_claro.router.js";
import RotasServicoOperadora from "./servico_operadora.router.js";
import RotasDecisor from "./decisor.router.js";
import RotasServicoOmni from "./servico_omni.router.js";

class RouterController {
  private router: Router;

  constructor() {
    this.router = Router();
    this.registrarRotas();
  }

  private registrarRotas() {
    const rotasConsultor = new RotasConsultor();
    this.router.use("/api", rotasConsultor.retornarRotas());

    const rotasServicoClaro = new RotasServicoClaro();
    this.router.use("/api", rotasServicoClaro.retornarRotas());

    const rotasServicoOperadora = new RotasServicoOperadora();
    this.router.use("/api", rotasServicoOperadora.retornarRotas());

    const rotasDecisor = new RotasDecisor();
    this.router.use("/api", rotasDecisor.retornarRotas());

    const rotasServicoOmni = new RotasServicoOmni();
    this.router.use("/api", rotasServicoOmni.retornarRotas());
  }

  public retornarRotas(): Router {
    return this.router;
  }
}

export default RouterController;

import { Router } from "express";
import RotasConsultor from "./consultor.router.js";
import RotasServicoClaro from "./servico_claro.router.js";

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
    }

    public retornarRotas(): Router {
        return this.router;
    }
}

export default RouterController;

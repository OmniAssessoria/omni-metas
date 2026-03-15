import { Router } from "express";
import RotasConsultor from "./consultor.router.js";

class RouterController {
    private router: Router;

    constructor() {
        this.router = Router();
        this.registrarRotas();
    }

    private registrarRotas() {
        const rotasConsultor = new RotasConsultor();
        this.router.use("/api", rotasConsultor.retornarRotas());
    }

    public retornarRotas(): Router {
        return this.router;
    }
}

export default RouterController;

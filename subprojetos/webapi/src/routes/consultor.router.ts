import { Router } from "express";
import ConsultorController from "../controllers/consultor.controller";


class RotasConsultor {
    private router: Router;
    private consultorController: ConsultorController;

    constructor() {
        this.router = Router();
        this.consultorController = new ConsultorController();
        this.registrarRotas();
    }

    private registrarRotas() {
        this.router.get("/consultores", this.consultorController.buscarConsultores);
        this.router.post("/consultores/meta-diaria", this.consultorController.criarMetaDiaria);
        this.router.put("/consultores/:seq/meta-mensal", this.consultorController.atualizarMetaMensal);
        this.router.get("/consultores/:seq", this.consultorController.buscarConsultorPorSeq);
        this.router.get(
            "/consultores/:seq/meta-mensal",
            this.consultorController.buscarMetaMensalPorSeq
        );
    }

    public retornarRotas(): Router {
        return this.router;
    }
}

export default RotasConsultor;
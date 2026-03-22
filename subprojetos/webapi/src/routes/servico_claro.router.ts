import { Router } from "express";
import ServicoClaroController from "../controllers/servico_claro.constroller";

class RotasServicoClaro {
    private router: Router;
    private servicoClaroController: ServicoClaroController;

    constructor() {
        this.router = Router();
        this.servicoClaroController = new ServicoClaroController();
        this.registrarRotas();
    }

    private registrarRotas() {
        this.router.get("/servico-claro/piperun/portabilidade", this.servicoClaroController.buscarServicosClaroPipePortabilidade);
        this.router.get("/servico-claro/piperun/renovacao", this.servicoClaroController.buscarServicosClaroPipeRenovacao);
        this.router.patch("/servico-claro/piperun/:seq_claro", this.servicoClaroController.atualizarStatusCrm);
    }

    public retornarRotas(): Router {
        return this.router;
    }
}

export default RotasServicoClaro;
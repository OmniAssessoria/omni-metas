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
    this.router.post(
      "/consultores/meta-diaria",
      this.consultorController.criarMetaDiaria,
    );

    this.router.get(
      "/consultor/disponiveis/empresa-exclusiva/:seq_empresa",
      this.consultorController.buscarConsultoresDisponiveisEmpresaExclusiva,
    );

    this.router.get(
      "/consultor/disponiveis/empresa/:seq_empresa",
      this.consultorController.buscarConsultoresDisponiveisEmpresa,
    );
    this.router.get(
      "/consultores/:seq/meta-mensal",
      this.consultorController.buscarMetaMensalPorSeq,
    );
    this.router.put(
      "/consultores/:seq/meta-mensal",
      this.consultorController.atualizarMetaMensal,
    );
    this.router.get(
      "/consultores/:seq",
      this.consultorController.buscarConsultorPorSeq,
    );
    this.router.put(
      "/consultor/empresa/:seq_empresa",
      this.consultorController.atualizarConsultorEmpresa,
    );
    this.router.get(
      "/consultor/historico/empresa/:seq_empresa",
      this.consultorController.obterHistoricoEmpresa,
    );
  }

  public retornarRotas(): Router {
    return this.router;
  }
}

export default RotasConsultor;

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
    this.router.get(
      "/servico-claro/piperun/portabilidade",
      this.servicoClaroController.buscarServicosClaroPipePortabilidade,
    );
    this.router.get(
      "/servico-claro/piperun/renovacao",
      this.servicoClaroController.buscarServicosClaroPipeRenovacao,
    );
    this.router.get(
      "/servico-claro/piperun/exclusivo",
      this.servicoClaroController.buscarServicosClaroPipeExclusivo,
    );
    this.router.get(
      "/servico-claro/piperun/motivos-declinio",
      this.servicoClaroController.obterTodosMotivosDeclinio,
    );
    this.router.patch(
      "/servico-claro/piperun/sincronizar",
      this.servicoClaroController.sincronizarDados,
    );
    this.router.patch(
      "/servico-claro/piperun/:seq_claro",
      this.servicoClaroController.atualizarStatusCrm,
    );
    this.router.get(
      "/servico-claro/dashboard/historico",
      this.servicoClaroController.buscarDashboardHistorico,
    );
    this.router.get(
      "/servico-claro/dashboard/base",
      this.servicoClaroController.buscarDashboardBase,
    );
    this.router.get(
      "/servico-claro/dashboard/indicacao/:tipo_indicacao",
      this.servicoClaroController.buscarDashboardPorIndicacao,
    );
    this.router.get(
      "/servico-claro/dashboard/empresas",
      this.servicoClaroController.buscarDashboardEmpresasInfo,
    );
    this.router.get(
      "/servico-claro/dashboard/empresas-carteira",
      this.servicoClaroController.buscarDashboardEmpresasCarteiraInfo,
    );
    this.router.post(
      "/servico-claro/layout/imagem-linhas",
      this.servicoClaroController.gerarLayoutImagemLinhas,
    );
    this.router.post(
      "/servico-claro/layout/imagem-proposta",
      this.servicoClaroController.gerarLayoutImagemProposta,
    );
    this.router.post(
      "/servico-claro/layout/imagem-proposta-portabilidade",
      this.servicoClaroController.gerarLayoutImagemPropostaPortabilidade,
    );
  }

  public retornarRotas(): Router {
    return this.router;
  }
}

export default RotasServicoClaro;

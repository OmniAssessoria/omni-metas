import { Router } from "express";
import ServicoOmniController from "../controllers/servico_omni.controller";

class RotasServicoOmni {
  private router: Router;
  private servicoOmniController: ServicoOmniController;

  constructor() {
    console.log("RotasServicoOmni carregado");
    this.router = Router();
    this.servicoOmniController = new ServicoOmniController();
    this.registrarRotas();
  }

  private registrarRotas() {
    this.router.get(
      "/servico-omni/leads/disponiveis",
      this.servicoOmniController.buscarServicosOmniDisponiveis,
    );
    this.router.get(
      "/servico-omni/leads/contagem",
      this.servicoOmniController.buscarContagemServicoOmniDisponivel,
    );
    this.router.get(
      "/servico-omni/dashboard/indicadores",
      this.servicoOmniController.buscarPainelIndicadoresConsultor,
    );
    this.router.get(
      "/servico-omni/leads/motivos-declinio",
      this.servicoOmniController.obterTodosMotivosDeclinio,
    );
    this.router.get(
      "/servico-omni/leads/:seq_empresa",
      this.servicoOmniController.buscarEmpresaPorSeq,
    );
    this.router.get(
      "/servico-omni/empresas-envio",
      this.servicoOmniController.buscarListaEmpresasEnvio,
    );
    this.router.get(
      "/servico-omni/empresa/numeros/:seq_empresa",
      this.servicoOmniController.listarNumerosContatosSecundarioClientes,
    );
    this.router.patch(
      "/servico-omni/leads/sincronizar",
      this.servicoOmniController.sincronizarDados,
    );
    this.router.patch(
      "/servico-omni/leads/atribuir-consultor",
      this.servicoOmniController.atribuirEmpresasParaConsultor,
    );
    this.router.patch(
      "/servico-omni/leads/:seq_empresa",
      this.servicoOmniController.atualizarStatusCrm,
    );
    this.router.post(
      "/servico-omni/layout/imagem-linhas",
      this.servicoOmniController.gerarLayoutImagemLinhas,
    );
  }

  public retornarRotas(): Router {
    return this.router;
  }
}

export default RotasServicoOmni;

import { Request, Response } from "express";
import ServicoOperadoraService from "../services/servico_operadora.service.js";

class ServicoOperadoraController {
  private servicoOperadoraService: ServicoOperadoraService;

  constructor() {
    this.servicoOperadoraService = new ServicoOperadoraService();
    this.buscarServicosOperadoraPorEmpresa =
      this.buscarServicosOperadoraPorEmpresa.bind(this);
  }

  async buscarServicosOperadoraPorEmpresa(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const seq_empresa = req.params.seq_empresa;
      const servicos =
        await this.servicoOperadoraService.listarServisoOperadoraPorSeq(
          Number(seq_empresa),
        );
      res
        .status(200)
        .json({
          status: true,
          mensagem:
            "Serviços Operadora: Linhas telefonicas encontradas com sucesso.",
          dados: servicos,
        });
    } catch (error: any) {
      console.log(error);
      res
        .status(500)
        .json({
          status: false,
          mensagem: "Erro ao buscar serviços operadora.",
          detalhes: error.message,
        });
    }
  }
}

export default ServicoOperadoraController;

import { Request, Response } from "express";
import ConsultorService from "../services/consultor_metas.service";

class ConsultorController {
  private consultorService: ConsultorService;

  constructor() {
    this.consultorService = new ConsultorService();
  }

  buscarConsultores = async (req: Request, res: Response) => {
    try {
      const consultores = await this.consultorService.buscarConsultores();
      res.json({
        status: true,
        mensagem: "Consultores encontrados",
        dados: consultores,
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        mensagem: "Erro ao buscar consultores",
        dados: error,
      });
    }
  };

  buscarConsultorPorSeq = async (req: Request, res: Response) => {
    try {
      const seq = Number(req.params.seq);

      const consultor = await this.consultorService.buscarConsultorPorSeq(seq);

      if (!consultor) {
        return res.status(404).json({
          status: false,
          mensagem: "Consultor não encontrado",
          dados: [],
        });
      }

      res.json({
        status: true,
        mensagem: "Consultor encontrado",
        dados: consultor,
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        mensagem: "Erro ao buscar consultor",
        dados: error,
      });
    }
  };

  buscarMetaMensalPorSeq = async (req: Request, res: Response) => {
    try {
      const seq = Number(req.params.seq);

      const metas = await this.consultorService.buscarMetaMensalPorSeq(seq);

      res.json({
        status: true,
        mensagem: "Metas do mês atual",
        dados: metas,
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        mensagem: "Erro ao buscar metas",
        dados: error,
      });
    }
  };

  criarMetaDiaria = async (req: Request, res: Response) => {
    try {
      const meta = await this.consultorService.criarConsultorMeta(req.body);

      res.status(201).json({
        status: true,
        mensagem: "Meta diária cadastrada",
        dados: meta,
      });
    } catch (error: any) {
      res.status(500).json({
        status: false,
        mensagem: error.message,
        dados: error,
      });
    }
  };

  atualizarMetaMensal = async (req: Request, res: Response) => {
    try {
      const seq_consultor = Number(req.params.seq);
      const { meta_mensal } = req.body;

      const atualizado = await this.consultorService.atualizarMetaMensal(
        seq_consultor,
        meta_mensal,
      );

      res.json({
        status: true,
        mensagem: "Meta mensal atualizada",
        dados: atualizado,
      });
    } catch (error: any) {
      if (error.message === "CONSULTOR_NAO_ENCONTRADO") {
        return res.status(404).json({
          status: false,
          mensagem: "Consultor não encontrado",
          dados: [],
        });
      }

      res.status(500).json({
        status: false,
        mensagem: error.message,
        dados: error,
      });
    }
  };

  obterHistoricoEmpresa = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const parametroId = req.params.seq_empresa || req.query.seq_empresa;
      const seq_empresa = Number(parametroId);

      if (isNaN(seq_empresa) || seq_empresa <= 0) {
        res.status(400).json({
          status: false,
          mensagem: "Parâmetro seq_empresa inválido ou não fornecido na URL.",
        });
        return;
      }

      const historico =
        await this.consultorService.listarHistoricoEmpresa(seq_empresa);

      res.status(200).json({
        status: true,
        mensagem: "Histórico encontrado com sucesso.",
        dados: historico,
      });
    } catch (error: any) {
      console.error(`[API ERROR] Falha ao buscar histórico:`, error.message);
      res.status(500).json({
        status: false,
        mensagem: "Erro interno ao buscar histórico da empresa.",
        detalhes: error.message,
      });
    }
  };
}

export default ConsultorController;

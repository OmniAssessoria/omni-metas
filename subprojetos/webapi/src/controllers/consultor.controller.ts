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
                dados: consultores
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                mensagem: "Erro ao buscar consultores",
                dados: error
            });
        }
    }

    buscarConsultorPorSeq = async (req: Request, res: Response) => {
        try {

            const seq = Number(req.params.seq);

            const consultor = await this.consultorService.buscarConsultorPorSeq(seq);

            if (!consultor) {
                return res.status(404).json({
                    status: false,
                    mensagem: "Consultor não encontrado",
                    dados: []
                });
            }

            res.json({
                status: true,
                mensagem: "Consultor encontrado",
                dados: consultor
            });

        } catch (error) {

            res.status(500).json({
                status: false,
                mensagem: "Erro ao buscar consultor",
                dados: error
            });

        }
    }

    buscarMetaMensalPorSeq = async (req: Request, res: Response) => {
        try {

            const seq = Number(req.params.seq);

            const metas = await this.consultorService.buscarMetaMensalPorSeq(seq);

            res.json({
                status: true,
                mensagem: "Metas do mês atual",
                dados: metas
            });

        } catch (error) {

            res.status(500).json({
                status: false,
                mensagem: "Erro ao buscar metas",
                dados: error
            });

        }
    }

    criarMetaDiaria = async (req: Request, res: Response) => {
        try {

            const meta = await this.consultorService.criarConsultorMeta(req.body);

            res.status(201).json({
                status: true,
                mensagem: "Meta diária cadastrada",
                dados: meta
            });

        } catch (error: any) {

            res.status(500).json({
                status: false,
                mensagem: error.message,
                dados: error
            });

        }
    }

    atualizarMetaMensal = async (req: Request, res: Response) => {
        try {

            const seq_consultor = Number(req.params.seq);
            const { meta_mensal } = req.body;

            const atualizado = await this.consultorService.atualizarMetaMensal(
                seq_consultor,
                meta_mensal
            );

            res.json({
                status: true,
                mensagem: "Meta mensal atualizada",
                dados: atualizado
            });

        } catch (error: any) {

            if (error.message === "CONSULTOR_NAO_ENCONTRADO") {

                return res.status(404).json({
                    status: false,
                    mensagem: "Consultor não encontrado",
                    dados: []
                });

            }

            res.status(500).json({
                status: false,
                mensagem: error.message,
                dados: error
            });

        }
    }
}

export default ConsultorController;
import axios from "axios";

// Configuração da API do PipeRun
const TOKEN_PIPERUN = "3dfa1682a3832478cb29a7b9a4c86233";
const apiPipeRun = axios.create({
    baseURL: "https://api.pipe.run/v1",
    headers: {
        "accept": "application/json",
        "token": TOKEN_PIPERUN,
    },
});

// Configuração da sua API interna (BackEnd OMNI)
const apiInterna = axios.create({
    baseURL: "http://localhost:3000/api",
    headers: {
        "Content-Type": "application/json",
    },
});

/**
 * Função auxiliar para buscar o valor de um campo customizado do PipeRun
 */
const obterCustomField = (customFields: any[], fieldId: number | string, fieldName: string) => {
    if (!customFields) return null;
    const field = customFields.find(f => f.id === fieldId || f.name === fieldName);
    return field ? field.value : null;
};

/**
 * Função para buscar o CNPJ na rota de Companies caso não venha no Deal
 */
const buscarCnpjPorCompanyId = async (companyId: number): Promise<string | null> => {
    try {
        const response = await apiPipeRun.get(`/companies/${companyId}`);
        if (response.data && response.data.success && response.data.data.cnpj) {
            return response.data.data.cnpj;
        }
        return null;
    } catch (error) {
        console.error(`Erro ao buscar empresa ID ${companyId} no PipeRun:`, error);
        return null;
    }
};

/**
 * Função principal que será chamada pelo Frontend ao escolher a data
 * @param dataEscolhida Formato "YYYY-MM-DD"
 */
export const sincronizarDadosPipeRun = async (dataEscolhida: string) => {
    let paginaAtual = 1;
    let temMaisDados = true;
    const dealsFormatados = [];
    const closedAtStart = `${dataEscolhida} 00:00:00`;
    const closedAtEnd = `${dataEscolhida} 23:59:59`;

    try {
        console.log(`[Sincronização] Iniciando busca para a data: ${dataEscolhida}`);

        while (temMaisDados) {
            console.log(`[Sincronização] Buscando página ${paginaAtual}...`);
            const url = `/deals?status=1,3&closed_at_start=${closedAtStart}&closed_at_end=${closedAtEnd}&with=customFields,company,owner,lostReason&show=200&page=${paginaAtual}`;

            const response = await apiPipeRun.get(url);
            const dadosPagina = response.data.data;

            if (!dadosPagina || dadosPagina.length === 0) {
                console.log(`[Sincronização] Sem mais dados na página ${paginaAtual}. Encerrando busca.`);
                temMaisDados = false;
                break;
            }

            for (const deal of dadosPagina) {
                let cnpj = obterCustomField(deal.customFields, 592065, "CNPJ");
                if (!cnpj && deal.company_id) {
                    cnpj = await buscarCnpjPorCompanyId(deal.company_id);
                }

                if (!cnpj) {
                    console.warn(`[Aviso] Deal ID ${deal.id} ignorado por falta de CNPJ.`);
                    continue;
                }

                const operadoraOriginal = obterCustomField(deal.customFields, 631881, "Operadora do Pedido");

                let tipoServico = "CLARO";

                if (Array.isArray(operadoraOriginal) && operadoraOriginal[0]) {
                    tipoServico = String(operadoraOriginal[0]).toUpperCase();
                } else if (typeof operadoraOriginal === 'string') {
                    tipoServico = operadoraOriginal.toUpperCase();
                }

                const isGanho = deal.status === 1 || deal.lost_reason_id === null;
                const observacao = deal.observation || deal.description || "Sem detalhes";

                const payloadFormatado = {
                    cnpj: cnpj,
                    codigo_crm: deal.owner_id,
                    tipo_servico: tipoServico,
                    data_inicio_atendimento: deal.created_at,
                    data_fim_atendimento: deal.closed_at,
                    seq_motivo_declinio: isGanho ? null : deal.lost_reason_id,
                    observacao_fechamento: observacao,
                    is_ganho: isGanho
                };

                dealsFormatados.push(payloadFormatado);
            }

            paginaAtual++;
        }

        console.log(`[Sincronização] Busca concluída. ${dealsFormatados.length} serviços extraídos. Enviando ao backend...`);
        let sucessoEnvio = 0;
        let falhaEnvio = 0;

        for (const dado of dealsFormatados) {
            try {
                await apiInterna.patch("/servico-claro/piperun/sincronizar", dado);
                sucessoEnvio++;
            } catch (error: any) {
                console.error(`Erro ao sincronizar CNPJ ${dado.cnpj} no backend:`, error.response?.data || error.message);
                falhaEnvio++;
            }
        }

        return {
            sucesso: true,
            mensagem: `Processo finalizado. Sincronizados: ${sucessoEnvio}. Falhas: ${falhaEnvio}.`,
            totalProcessado: dealsFormatados.length
        };

    } catch (error) {
        console.error("[Sincronização] Erro crítico na comunicação com PipeRun:", error);
        throw new Error("Falha ao extrair dados do PipeRun.");
    }
};
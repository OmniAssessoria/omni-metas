import axios from "axios";

// ============================================================================
// CONFIGURAÇÕES E CONSTANTES
// ============================================================================
const TOKEN_PIPERUN = "3dfa1682a3832478cb29a7b9a4c86233";

const HASH_GANHOS = "c1d9312f-db68-4379-8820-a5d3619ec002";
const FUNIS_PERDAS = [
    93990,  // PROSPECÇÃO CARTEIRA
    91356,  // FOLLOW UP
    103176, // FOLLOW UP PONTIN
    91369,  // PROCESSOS BKO
    77127,  // ASSINATURA
    90697,  // PROSPECÇÃO
    102509  // PROSPECÇÃO PORTIN
];

const apiPipeRun = axios.create({
    baseURL: "https://api.pipe.run/v1",
    headers: {
        "accept": "application/json",
        "token": TOKEN_PIPERUN,
    },
});

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
 * Motor de busca paginada genérico para iterar sobre todas as páginas de uma URL base
 */
const buscarTodasAsPaginas = async (urlBase: string) => {
    let paginaAtual = 1;
    let temMaisDados = true;
    const todosOsResultados = [];

    while (temMaisDados) {
        const urlCompleta = `${urlBase}&page=${paginaAtual}`;
        
        try {
            const response = await apiPipeRun.get(urlCompleta);
            const dadosPagina = response.data.data;

            if (!dadosPagina || dadosPagina.length === 0) {
                temMaisDados = false;
                break;
            }

            todosOsResultados.push(...dadosPagina);
            paginaAtual++;
        } catch (error) {
            console.error(`[Erro na Paginação] Falha ao buscar URL: ${urlCompleta}`, error);
            temMaisDados = false;
        }
    }

    return todosOsResultados;
};

// ============================================================================
// FUNÇÃO PRINCIPAL DE SINCRONIZAÇÃO
// ============================================================================

/**
 * Função principal que será chamada pelo Frontend ao escolher a data
 * @param dataEscolhida Formato "YYYY-MM-DD"
 */
export const sincronizarDadosPipeRun = async (dataEscolhida: string) => {
    const closedAtStart = `${dataEscolhida} 00:00:00`;
    const closedAtEnd = `${dataEscolhida} 23:59:59`;
    const paramsComplementares = `&closed_at_start=${closedAtStart}&closed_at_end=${closedAtEnd}&with=customFields,company,owner,lostReason&show=200`;
    const dealsBrutos = [];

    try {
        console.log(`[Sincronização] Iniciando busca para a data: ${dataEscolhida}`);

        // --------------------------------------------------------------------
        // 1. BUSCA DE GANHOS (Apenas através do Hash Específico)
        // --------------------------------------------------------------------
        console.log(`[Sincronização] Extraindo Ganhos do Hash: ${HASH_GANHOS}...`);
        const urlGanhos = `/deals?cursor=""&hash=${HASH_GANHOS}&status=1${paramsComplementares}`;
        const ganhosExtraidos = await buscarTodasAsPaginas(urlGanhos);
        dealsBrutos.push(...ganhosExtraidos);

        console.log(`[Sincronização] Extraindo Perdas dos ${FUNIS_PERDAS.length} funis mapeados...`);
        for (const pipelineId of FUNIS_PERDAS) {
            console.log(`[Sincronização] Consultando perdas no funil ID: ${pipelineId}...`);
            const urlPerdas = `/deals?cursor=""&pipeline_id=${pipelineId}&status=3${paramsComplementares}`;
            const perdasExtraidas = await buscarTodasAsPaginas(urlPerdas);
            dealsBrutos.push(...perdasExtraidas);
        }

        if (dealsBrutos.length === 0) {
            console.log(`[Sincronização] Nenhum deal encontrado para a data informada.`);
            return { sucesso: true, mensagem: "Nenhum dado para processar.", totalProcessado: 0 };
        }

        console.log(`[Sincronização] Extração concluída. Estruturando ${dealsBrutos.length} deals encontrados...`);

        const dealsFormatados = [];

        for (const deal of dealsBrutos) {
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

        // --------------------------------------------------------------------
        // 4. ENVIO PARA API INTERNA (OMNI)
        // --------------------------------------------------------------------
        console.log(`[Sincronização] Iniciando envio ao backend de ${dealsFormatados.length} registros...`);
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
        console.error("[Sincronização] Erro crítico na comunicação global com PipeRun:", error);
        throw new Error("Falha geral ao extrair ou enviar dados.");
    }
};

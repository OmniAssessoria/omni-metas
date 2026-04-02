import { apiPipeRun } from "../configs/piperun.config";

export const obterCustomField = (customFields: any[], fieldId: number | string, fieldName: string) => {
    if (!customFields) return null;
    const field = customFields.find(f => f.id === fieldId || f.name === fieldName);
    return field ? field.value : null;
};

export const buscarCnpjPorCompanyId = async (companyId: number): Promise<string | null> => {
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

export const buscarTodasAsPaginas = async (urlBase: string) => {
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
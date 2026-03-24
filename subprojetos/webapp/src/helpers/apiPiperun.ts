import axios from "axios";
import { IServicoPipeRun } from "@/interfaces/servicoPipeRun.interface";

const TOKEN_PIPERUN = "3dfa1682a3832478cb29a7b9a4c86233";
const URL_INTEGRADOR_PIPERUN = "https://app.pipe.run/webservice/integradorJson";

// Instância Axios para a API REST (Pessoas e Empresas)
const apiPipeRunRest = axios.create({
    baseURL: "https://api.pipe.run/v1",
    headers: {
        "accept": "application/json",
        "token": TOKEN_PIPERUN,
    },
});

export interface IPipeRunIntegrationParams {
    servicos: IServicoPipeRun[];
    hashFunil: string;
}

export interface IPipeRunIntegrationResult {
    sucessos: number;
    falhas: number;
}

// ============================================================================
// 1. FUNÇÕES DE FORMATAÇÃO (PREPARAÇÃO DOS DADOS)
// ============================================================================

const limparPontuacao = (str: string | null | undefined): string => {
    if (!str) return "";
    return str.replace(/\D/g, "");
};

const formatarCPF = (cpf: string): string => {
    const limpo = limparPontuacao(cpf);
    if (limpo.length !== 11) return cpf;
    return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
};

const formatarCNPJ = (cnpj: string): string => {
    const limpo = limparPontuacao(cnpj);
    if (limpo.length !== 14) return cnpj;
    return limpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
};

const formatarDataBR = (dataStr: string | null | undefined): string => {
    if (!dataStr) return "";
    try {
        const date = new Date(dataStr);
        if (isNaN(date.getTime())) return dataStr;
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    } catch {
        return dataStr;
    }
};

const calcularMesesAteFimContrato = (dataFimStr: string | null | undefined): number => {
    if (!dataFimStr) return 0;
    try {
        const fim = new Date(dataFimStr);
        const hoje = new Date();
        if (isNaN(fim.getTime())) return 0;

        let meses = (fim.getFullYear() - hoje.getFullYear()) * 12;
        meses -= hoje.getMonth();
        meses += fim.getMonth();
        return meses > 0 ? meses : 0;
    } catch {
        return 0;
    }
};

const formatarMoeda = (valor: number | string | null | undefined): string => {
    if (!valor) return "R$ 0,00";
    const num = typeof valor === "string" ? parseFloat(valor) : valor;
    if (isNaN(num)) return "R$ 0,00";
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const extrairEFormatarTelefonesEDDD = (principal: string | null, obs: string | null) => {
    const telefonesUnicos = new Set<string>();
    const contagemDDD: Record<string, number> = {};
    let dddMaisFrequente = "00";

    // Regex para pegar sequências numéricas que pareçam telefones com DDD
    const extrair = (texto: string) => {
        const numeros = texto.replace(/[^\d,]/g, "").split(",");
        numeros.forEach(num => {
            const limpo = num.trim();
            if (limpo.length >= 10 && limpo.length <= 11) {
                const ddd = limpo.substring(0, 2);
                const resto = limpo.substring(2);
                
                contagemDDD[ddd] = (contagemDDD[ddd] || 0) + 1;
                
                if (resto.length === 9) {
                    telefonesUnicos.add(`+55 (${ddd}) ${resto.substring(0, 5)}-${resto.substring(5)}`);
                } else {
                    telefonesUnicos.add(`+55 (${ddd}) ${resto.substring(0, 4)}-${resto.substring(4)}`);
                }
            }
        });
    };

    if (principal) extrair(principal);
    if (obs) extrair(obs);

    const arrayTelefones = Array.from(telefonesUnicos);
    let maxCount = 0;
    for (const [ddd, count] of Object.entries(contagemDDD)) {
        if (count > maxCount) {
            maxCount = count;
            dddMaisFrequente = ddd;
        }
    }

    return {
        telefonesFormatados: arrayTelefones,
        dddPrincipal: dddMaisFrequente
    };
};

const extrairEmails = (principal: string | null, obs: string | null): string[] => {
    const emailsUnicos = new Set<string>();
    
    const validarEAdicionar = (str: string) => {
        const pedacos = str.split(/[,;|\s]+/);
        pedacos.forEach(p => {
            const limpo = p.trim().toLowerCase();
            if (limpo && limpo.includes("@")) {
                emailsUnicos.add(limpo);
            }
        });
    };

    if (principal) validarEAdicionar(principal);
    if (obs) validarEAdicionar(obs);

    return Array.from(emailsUnicos);
};

// ============================================================================
// 2. ORQUESTRAÇÃO CRONOLÓGICA DAS APIS
// ============================================================================

export const API_PIPERUN = async ({
    servicos,
    hashFunil,
}: IPipeRunIntegrationParams): Promise<IPipeRunIntegrationResult> => {
    let sucessos = 0;
    let falhas = 0;

    for (const servico of servicos) {
        console.log(`\n================================================================`);
        console.log(`[PipeRun] Iniciando processamento cronológico: ${servico.razao}`);
        
        try {
            // ----------------------------------------------------------------
            // FORMATADORES: Centralizando a limpeza dos dados antes das APIs
            // ----------------------------------------------------------------
            const cpfLimpo = limparPontuacao(servico.decisor_cpf);
            const cpfFormatado = formatarCPF(servico.decisor_cpf || "");
            const cnpjLimpo = limparPontuacao(servico.cnpj);
            const cnpjFormatado = formatarCNPJ(servico.cnpj);
            const decisorNome = (servico.decisor_nome || "Contato Indisponível").trim().toUpperCase();
            const { telefonesFormatados, dddPrincipal } = extrairEFormatarTelefonesEDDD(servico.decisor_numero, servico.decisor_num_obs);
            const emailsFormatados = extrairEmails(servico.decisor_email, servico.decisor_email_observacao);
            const dataFimFormatada = formatarDataBR(servico.dt_fim_contrato);
            const mesesContrato = calcularMesesAteFimContrato(servico.dt_fim_contrato);

            // ----------------------------------------------------------------
            // PASSO 1: PESSOA (DECISOR) - Buscar, Atualizar ou Cadastrar
            // ----------------------------------------------------------------
            let personId = null;
            console.log(`[Passo 1] Validando Pessoa: ${decisorNome} (CPF: ${cpfLimpo})`);

            if (cpfLimpo) {
                let resPerson = await apiPipeRunRest.get("/persons", { params: { cpf: cpfLimpo } });
                
                if (!resPerson.data?.data?.length) {
                    resPerson = await apiPipeRunRest.get("/persons", { params: { cpf: cpfFormatado } });
                }

                if (!resPerson.data?.data?.length) {
                    resPerson = await apiPipeRunRest.get("/persons", { params: { name: decisorNome } });
                }

                if (resPerson.data?.data && resPerson.data.data.length > 0) {
                    personId = resPerson.data.data[0].id;
                    console.log(`[Passo 1] Pessoa existente encontrada. ID: ${personId}`);
                }
            }

            const payloadPerson = {
                name: decisorNome,
                cpf: cpfLimpo, 
                contactPhones: telefonesFormatados,
                contactEmails: emailsFormatados,
                observation: `Telefones extras: ${servico.decisor_num_obs || ""} | Emails extras: ${servico.decisor_email_observacao || ""}`
            };

            if (personId) {
                console.log(`[Passo 1] Disparando PUT para atualizar Pessoa (ID: ${personId})...`);
                await apiPipeRunRest.put(`/persons/${personId}`, payloadPerson);
            } else {
                console.log(`[Passo 1] Disparando POST para cadastrar nova Pessoa...`);
                const createPerson = await apiPipeRunRest.post("/persons", payloadPerson);
                personId = createPerson.data?.data?.id || null;
            }

            // ----------------------------------------------------------------
            // PASSO 2: EMPRESA (COMPANY) - Buscar, Atualizar ou Cadastrar
            // ----------------------------------------------------------------
            let companyId = null;
            console.log(`[Passo 2] Validando Empresa: ${servico.razao} (CNPJ: ${cnpjLimpo})`);

            if (cnpjLimpo) {
                let resCompany = await apiPipeRunRest.get("/companies", { params: { cnpj: cnpjLimpo } });
                
                if (!resCompany.data?.data?.length) {
                    resCompany = await apiPipeRunRest.get("/companies", { params: { cnpj: cnpjFormatado } });
                }

                if (resCompany.data?.data && resCompany.data.data.length > 0) {
                    companyId = resCompany.data.data[0].id;
                    console.log(`[Passo 2] Empresa existente encontrada. ID: ${companyId}`);
                }
            }

            const payloadCompany = {
                name: servico.razao,
                cnpj: cnpjFormatado,
                contactPhones: telefonesFormatados
            };

            if (companyId) {
                console.log(`[Passo 2] Disparando PUT para atualizar Empresa (ID: ${companyId})...`);
                await apiPipeRunRest.put(`/companies/${companyId}`, payloadCompany);
            } else {
                console.log(`[Passo 2] Disparando POST para cadastrar nova Empresa...`);
                const createCompany = await apiPipeRunRest.post("/companies", payloadCompany);
                companyId = createCompany.data?.data?.id || null;
            }

            // ----------------------------------------------------------------
            // PASSO 3: OPORTUNIDADE (DEAL) - Via Integrador JSON
            // ----------------------------------------------------------------
            console.log(`[Passo 3] Gerando payload formatado para a Oportunidade...`);
            
            const titleCard = `(${dddPrincipal}) ${servico.indicacao} >> ${servico.razao}`;

            const payloadIntegrador = {
                leads: [{
                    user: servico.consultor_email,
                    title: titleCard,
                    company: servico.razao,
                    cnpj: cnpjFormatado,
                    custom_fields: {
                        "Tempo de Contrato": mesesContrato.toString(),
                        "Final do Contrato": dataFimFormatada,
                        "DDD": dddPrincipal,
                        "Quantidade de linhas móveis": servico.qtd_servico_claro || 0,
                        "Observacao": servico.observacao || "",
                        "Indicacao": servico.indicacao,
                        "Classificacao do Contrato": servico.classificacao_contrato || "",
                        "Tipo de Servico": "CLARO",
                        "DOC DRIVE": servico.servico_docdrive || "",
                    }
                }]
            };

            console.log(`[Passo 3] Disparando Integrador JSON para criar a Oportunidade...`);
            const responseIntegrador = await axios.post(URL_INTEGRADOR_PIPERUN, payloadIntegrador, {
                params: { hash: hashFunil },
                headers: { "Content-Type": "application/json" }
            });

            // ----------------------------------------------------------------
            // PASSO 4: VINCULAR PESSOA À OPORTUNIDADE
            // ----------------------------------------------------------------
            // O retorno do integrador webService do PipeRun geralmente entrega o ID no corpo.
            // Tratamos isso defensivamente para não quebrar a aplicação caso a API omita o dado.
            let dealIdCriado = null;
            if (responseIntegrador.data && responseIntegrador.data.data && Array.isArray(responseIntegrador.data.data)) {
                dealIdCriado = responseIntegrador.data.data[0]?.id;
            } else if (responseIntegrador.data?.id) {
                dealIdCriado = responseIntegrador.data.id;
            }

            if (dealIdCriado && personId) {
                console.log(`[Passo 4] Vinculando Pessoa (ID: ${personId}) à Oportunidade (ID: ${dealIdCriado})...`);
                await apiPipeRunRest.put(`/deals/${dealIdCriado}/persons/${personId}`);
                console.log(`[Passo 4] Vínculo realizado com sucesso.`);
            } else {
                console.warn(`[Passo 4] Atenção: Não foi possível vincular. dealId: ${dealIdCriado}, personId: ${personId}`);
            }

            console.log(`✅ Fluxo concluído com sucesso para: ${servico.razao}`);
            sucessos++;
            
        } catch (err) {
            falhas++;
            console.error(`\n[!!! ERRO NO FLUXO !!!] Falha ao processar: ${servico.razao}`);
            
            if (axios.isAxiosError(err)) {
                console.error(`Status HTTP: ${err.response?.status} na Rota: ${err.config?.url}`);
                console.error(`Resposta da API:`, JSON.stringify(err.response?.data || err.message));
            } else {
                console.error(`Erro Interno:`, err instanceof Error ? err.message : err);
            }
        }
    }

    console.log(`\n================================================================`);
    console.log(`🏁 [Orquestração Finalizada] Sucessos: ${sucessos} | Falhas: ${falhas}`);
    return { sucessos, falhas };
};
import axios from "axios";
import { IServicoPipeRun } from "@/interfaces/servicoPipeRun.interface";

const TOKEN_PIPERUN = "3dfa1682a3832478cb29a7b9a4c86233";
const URL_INTEGRADOR_PIPERUN = "https://app.pipe.run/webservice/integradorJson";

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
// 1. FUNÇÕES DE FORMATAÇÃO E EXTRAÇÃO (PREPARAÇÃO DOS DADOS)
// ============================================================================

const limparPontuacao = (str: string | null | undefined): string => {
    if (!str) return "";
    return str.replace(/\D/g, "");
};

const formatarCPF = (cpf: string | null | undefined): string => {
    const limpo = limparPontuacao(cpf);
    if (limpo.length !== 11) return limpo;
    return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
};

const formatarCNPJ = (cnpj: string | null | undefined): string => {
    const limpo = limparPontuacao(cnpj);
    if (limpo.length !== 14) return limpo; 
    return limpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
};

const formatarTelefone = (numeroStr: string): string => {
    const limpo = limparPontuacao(numeroStr);
    if (limpo.length < 10 || limpo.length > 11) return limpo; 
    
    const ddd = limpo.substring(0, 2);
    const resto = limpo.substring(2);
    
    if (resto.length === 9) {
        return `+55 (${ddd}) ${resto.substring(0, 5)}-${resto.substring(5)}`;
    } else {
        return `+55 (${ddd}) ${resto.substring(0, 4)}-${resto.substring(4)}`;
    }
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

// ----------------------------------------------------------------------------
// EXTRAÇÃO ESPECÍFICA: TELEFONES DO DECISOR (PESSOA)
// ----------------------------------------------------------------------------
const extrairEFormatarTelefonesDecisor = (principal: string | null, obs: string | null) => {
    const telefonesUnicos = new Set<string>();
    const contagemDDD: Record<string, number> = {};
    let dddMaisFrequente = "00";

    const processarNumeros = (texto: string) => {
        const pedacos = texto.split(",");
        pedacos.forEach(pedaco => {
            const limpo = limparPontuacao(pedaco);
            if (limpo.length >= 10 && limpo.length <= 11) {
                const ddd = limpo.substring(0, 2);
                contagemDDD[ddd] = (contagemDDD[ddd] || 0) + 1;
                telefonesUnicos.add(formatarTelefone(limpo));
            }
        });
    };

    if (principal) processarNumeros(principal);
    if (obs) processarNumeros(obs);

    let maxCount = 0;
    for (const [ddd, count] of Object.entries(contagemDDD)) {
        if (count > maxCount) {
            maxCount = count;
            dddMaisFrequente = ddd;
        }
    }

    return {
        telefonesFormatados: Array.from(telefonesUnicos),
        dddPrincipal: dddMaisFrequente
    };
};

// ----------------------------------------------------------------------------
// EXTRAÇÃO ESPECÍFICA: TELEFONES DA EMPRESA (LINHAS VIA REGEX NA OBSERVAÇÃO)
// ----------------------------------------------------------------------------
const extrairTelefonesEmpresaDaObservacao = (observacao: string | null) => {
    const telefonesUnicos = new Set<string>();
    const contagemDDD: Record<string, number> = {};
    let dddMaisFrequente = "00";

    if (!observacao) {
        return { telefonesFormatados: [], dddPrincipal: dddMaisFrequente };
    }

    const matchAreaLinhas = observacao.match(/Linhas:\s*(.*?)(?:\|\|\|\||$)/);
    
    if (matchAreaLinhas && matchAreaLinhas[1]) {
        const trechoLinhas = matchAreaLinhas[1];
        
        const regexCapturaNumero = /P\[\d+\]\s*-\s*(\d+)/g;
        let match;
        
        while ((match = regexCapturaNumero.exec(trechoLinhas)) !== null) {
            const numeroLimpo = limparPontuacao(match[1]);
            
            if (numeroLimpo.length >= 10 && numeroLimpo.length <= 11) {
                const ddd = numeroLimpo.substring(0, 2);
                contagemDDD[ddd] = (contagemDDD[ddd] || 0) + 1; 
                telefonesUnicos.add(formatarTelefone(numeroLimpo));
            }
        }
    }

    let maxCount = 0;
    for (const [ddd, count] of Object.entries(contagemDDD)) {
        if (count > maxCount) {
            maxCount = count;
            dddMaisFrequente = ddd;
        }
    }

    return {
        telefonesFormatados: Array.from(telefonesUnicos),
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
            // FORMATADORES E DISTRIBUIÇÃO DE DADOS
            // ----------------------------------------------------------------
            const cpfLimpo = limparPontuacao(servico.decisor_cpf);
            const cpfFormatado = formatarCPF(servico.decisor_cpf);
            const cnpjLimpo = limparPontuacao(servico.cnpj);
            const cnpjFormatado = formatarCNPJ(servico.cnpj);
            
            const decisorNomeOriginal = servico.decisor_nome ? servico.decisor_nome.trim() : null;
            const decisorNomeUpper = decisorNomeOriginal ? decisorNomeOriginal.toUpperCase() : null;
            
            const resultDecisor = extrairEFormatarTelefonesDecisor(servico.decisor_numero, servico.decisor_num_obs);
            const telefonesDecisor = resultDecisor.telefonesFormatados;
            const dddDecisor = resultDecisor.dddPrincipal;
            
            const resultEmpresa = extrairTelefonesEmpresaDaObservacao(servico.observacao);
            const telefonesEmpresa = resultEmpresa.telefonesFormatados;
            const dddEmpresa = resultEmpresa.dddPrincipal;
            const dddFinal = dddEmpresa !== "00" ? dddEmpresa : (dddDecisor !== "00" ? dddDecisor : "00");
            
            const emailsFormatados = extrairEmails(servico.decisor_email, servico.decisor_email_observacao);
            const dataFimFormatada = formatarDataBR(servico.dt_fim_contrato);
            const mesesContrato = calcularMesesAteFimContrato(servico.dt_fim_contrato);

            // ----------------------------------------------------------------
            // PASSO 1: PESSOA (DECISOR) - Condicional
            // ----------------------------------------------------------------
            let personId = null;
            
            if (decisorNomeUpper) {
                console.log(`[Passo 1] Validando Pessoa: ${decisorNomeUpper} (CPF: ${cpfLimpo})`);

                if (cpfLimpo) {
                    let resPerson = await apiPipeRunRest.get("/persons", { params: { cpf: cpfLimpo } });
                    
                    if (!resPerson.data?.data?.length) {
                        resPerson = await apiPipeRunRest.get("/persons", { params: { cpf: cpfFormatado } });
                    }

                    if (resPerson.data?.data && resPerson.data.data.length > 0) {
                        personId = resPerson.data.data[0].id;
                        console.log(`[Passo 1] Pessoa existente encontrada via CPF. ID: ${personId}`);
                    }
                }

                if (!personId) {
                     const resPersonName = await apiPipeRunRest.get("/persons", { params: { name: decisorNomeUpper } });
                     if (resPersonName.data?.data && resPersonName.data.data.length > 0) {
                         personId = resPersonName.data.data[0].id;
                         console.log(`[Passo 1] Pessoa existente encontrada via Nome. ID: ${personId}`);
                     }
                }

                const payloadPerson = {
                    name: decisorNomeUpper,
                    cpf: cpfFormatado, 
                    contactPhones: telefonesDecisor, 
                    contactEmails: emailsFormatados,
                    observation: `Emails extras: ${servico.decisor_email_observacao || ""}`
                };

                console.log(`[DEBUG - Passo 1] Payload Pessoa Formatado:\n`, JSON.stringify(payloadPerson, null, 2));

                if (personId) {
                    console.log(`[Passo 1] Disparando PUT para atualizar Pessoa (ID: ${personId})...`);
                    await apiPipeRunRest.put(`/persons/${personId}`, payloadPerson);
                } else {
                    console.log(`[Passo 1] Disparando POST para cadastrar nova Pessoa...`);
                    const createPerson = await apiPipeRunRest.post("/persons", payloadPerson);
                    personId = createPerson.data?.data?.id || null;
                }
            } else {
                console.log(`[Passo 1] IGNORADO: Dados do decisor ausentes ou nulos. Procedendo apenas com a Empresa.`);
            }

            // ----------------------------------------------------------------
            // PASSO 2: EMPRESA (COMPANY)
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
                contactPhones: telefonesEmpresa 
            };

            console.log(`[DEBUG - Passo 2] Payload Empresa Formatado:\n`, JSON.stringify(payloadCompany, null, 2));

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
            const titleCard = `(${dddFinal}) ${servico.indicacao} >> ${servico.razao}`;

            const payloadIntegrador = {
                leads: [{
                    user: servico.consultor_email,
                    title: titleCard,
                    company: servico.razao,
                    cnpj: cnpjFormatado, 
                    custom_fields: {
                        "Tempo de Contrato": mesesContrato.toString(),
                        "Final do Contrato": dataFimFormatada,
                        "DDD": dddFinal,
                        "Quantidade de linhas móveis": servico.qtd_servico_claro || 0,
                        "Observacao": servico.observacao || "",
                        "Indicacao": servico.indicacao,
                        "Classificacao do Contrato": servico.classificacao_contrato || "",
                        "Tipo de Servico": "CLARO",
                        "DOC DRIVE": servico.servico_docdrive || "",
                    }
                }]
            };

            console.log(`[DEBUG - Passo 3] Payload Oportunidade (Integrador):\n`, JSON.stringify(payloadIntegrador, null, 2));

            console.log(`[Passo 3] Disparando Integrador JSON para criar a Oportunidade...`);
            const responseIntegrador = await axios.post(URL_INTEGRADOR_PIPERUN, payloadIntegrador, {
                params: { hash: hashFunil },
                headers: { "Content-Type": "application/json" }
            });

            // ----------------------------------------------------------------
            // PASSO 4: VINCULAR PESSOA À OPORTUNIDADE (Apenas se Pessoa existir)
            // ----------------------------------------------------------------
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
                console.warn(`[Passo 4] Vínculo ignorado ou indisponível. dealId: ${dealIdCriado}, personId: ${personId}`);
            }

            console.log(`✅ Fluxo concluído com sucesso para: ${servico.razao}`);
            sucessos++;
            
        } catch (err) {
            falhas++;
            console.error(`\n[!!! ERRO NO FLUXO !!!] Falha ao processar: ${servico.razao}`);
            
            if (axios.isAxiosError(err)) {
                console.error(`Status HTTP: ${err.response?.status} na Rota: ${err.config?.url}`);
                console.error(`Resposta da API:`, JSON.stringify(err.response?.data || err.message, null, 2));
            } else {
                console.error(`Erro Interno:`, err instanceof Error ? err.message : err);
            }
        }
    }

    console.log(`\n================================================================`);
    console.log(`🏁 [Orquestração Finalizada] Sucessos: ${sucessos} | Falhas: ${falhas}`);
    return { sucessos, falhas };
};

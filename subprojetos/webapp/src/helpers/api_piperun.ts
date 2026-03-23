import axios from "axios";
import { IServicoPipeRun } from "@/pages/pipe/subirPipeGeral"; // Ajuste o caminho se necessário

const TOKEN_PIPERUN = "3dfa1682a3832478cb29a7b9a4c86233";

// Instância Axios para a API REST (Decisores e Empresas)
const apiPipeRunRest = axios.create({
    baseURL: "https://api.pipe.run/v1",
    headers: {
        "accept": "application/json",
        "token": TOKEN_PIPERUN,
    },
});


// curl --request PUT \
//     --url https://api.pipe.run/v1/deals/deal_id/persons/person_id \ -> subir o person para a oportunidade
//     --header 'accept: application/json' \
//     --header 'token: 3dfa1682a3832478cb29a7b9a4c86233'


// Só a oportunidade e o empresa vai subir assim:
// 

// URL direta para o Integrador JSON (Oportunidades)
const URL_INTEGRADOR_PIPERUN = "https://app.pipe.run/webservice/integradorJson";

// ============================================================================
// INTERFACES
// ============================================================================
export interface IPipeRunIntegrationParams {
    servicos: IServicoPipeRun[];
    hashFunil: string;
}

export interface IPipeRunIntegrationResult {
    sucessos: number;
    falhas: number;
}

// ============================================================================
// FUNÇÕES AUXILIARES DE FORMATAÇÃO
// ============================================================================

const formatarData = (dataStr: string | null): string | null => {
    if (!dataStr) return null;
    try {
        const date = new Date(dataStr);
        if (isNaN(date.getTime())) return dataStr;
        return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
    } catch {
        return dataStr;
    }
};

const extrairTelefonesEDDD = (obs: string | null): { telefones: string[], dddPrincipal: string } => {
    if (!obs) return { telefones: [], dddPrincipal: "" };
    const regex = /\b(\d{2})(\d{8,9})\b/g;
    let match;
    const contagemDDD: Record<string, number> = {};
    const telefonesUnicos = new Set<string>();

    while ((match = regex.exec(obs)) !== null) {
        const ddd = match[1];
        const numero = match[2];
        if (numero.length === 9) {
            telefonesUnicos.add(`+55 (${ddd}) ${numero.slice(0, 5)}-${numero.slice(5)}`);
        } else {
            telefonesUnicos.add(`+55 (${ddd}) ${numero.slice(0, 4)}-${numero.slice(4)}`);
        }
        contagemDDD[ddd] = (contagemDDD[ddd] || 0) + 1;
    }

    let dddPrincipal = "";
    let maxCount = 0;
    for (const [ddd, count] of Object.entries(contagemDDD)) {
        if (count > maxCount) {
            maxCount = count;
            dddPrincipal = ddd;
        }
    }

    return {
        telefones: Array.from(telefonesUnicos),
        dddPrincipal
    };
};

// ============================================================================
// FUNÇÃO PRINCIPAL DE INTEGRAÇÃO (ORQUESTRAÇÃO)
// ============================================================================

export const integrarServicosPipeRun = async ({
    servicos,
    hashFunil,
}: IPipeRunIntegrationParams): Promise<IPipeRunIntegrationResult> => {
    let sucessos = 0;
    let falhas = 0;

    console.log(`[PipeRun] Iniciando integração. Total de serviços a processar: ${servicos.length}`);

    for (const servico of servicos) {
        console.log(`\n----------------------------------------------------------------`);
        console.log(`[PipeRun] Processando serviço/empresa: ${servico.razao} (CNPJ: ${servico.cnpj})`);
        
        try {
            const { telefones, dddPrincipal } = extrairTelefonesEDDD(servico.observacao);
            const contactEmails = servico.decisor_email ? [servico.decisor_email] : [];
            const decisorNome = servico.decisor_nome?.trim() ? servico.decisor_nome.trim() : "Umbrella";
            
            // ----------------------------------------------------------------
            // PASSO 1: EMPRESA (COMPANY) - Deve ser criada PRIMEIRO
            // ----------------------------------------------------------------
            console.log(`[PipeRun - Passo 1] Verificando Empresa: ${servico.razao}`);
            let companyId = null;
            
            if (servico.cnpj) {
                console.log(`[PipeRun - Passo 1] Buscando Empresa por CNPJ: ${servico.cnpj}`);
                const resCompany = await apiPipeRunRest.get("/companies", { 
                    params: { cnpj: servico.cnpj } 
                });
                
                if (resCompany.data?.data && resCompany.data.data.length > 0) {
                    companyId = resCompany.data.data[0].id;
                    console.log(`[PipeRun - Passo 1] Empresa encontrada. ID: ${companyId}`);
                }
            }

            const payloadCompany = {
                name: servico.razao,
                cnpj: servico.cnpj
            };

            if (companyId) {
                console.log(`[PipeRun - Passo 1] Atualizando Empresa ID: ${companyId}...`);
                await apiPipeRunRest.put(`/companies/${companyId}`, payloadCompany);
            } else {
                console.log(`[PipeRun - Passo 1] Criando nova Empresa...`);
                const createCompany = await apiPipeRunRest.post("/companies", payloadCompany);
                companyId = createCompany.data?.data?.id || null;
                console.log(`[PipeRun - Passo 1] Nova Empresa criada. ID: ${companyId}`);
            }

            // ----------------------------------------------------------------
            // PASSO 2: DECISOR (PERSON) - Criado com vínculo à Empresa
            // ----------------------------------------------------------------
            let personId = null;
            console.log(`[PipeRun - Passo 2] Verificando Pessoa (Decisor): ${decisorNome}`);
            
            if (servico.decisor_cpf) {
                console.log(`[PipeRun - Passo 2] Buscando Pessoa por CPF: ${servico.decisor_cpf}`);
                const resPerson = await apiPipeRunRest.get("/persons", { 
                    params: { cpf: servico.decisor_cpf } 
                });
                
                if (resPerson.data?.data && resPerson.data.data.length > 0) {
                    personId = resPerson.data.data[0].id;
                    console.log(`[PipeRun - Passo 2] Pessoa encontrada. ID: ${personId}`);
                }
            }

            const payloadPerson = {
                name: decisorNome,
                cpf: servico.decisor_cpf || "",
                company_id: companyId, 
                contactPhones: telefones,
                contactEmails: contactEmails,
                observation: servico.decisor_num_obs || ""
            };

            if (personId) {
                console.log(`[PipeRun - Passo 2] Atualizando Pessoa ID: ${personId}...`);
                await apiPipeRunRest.put(`/persons/${personId}`, payloadPerson);
            } else {
                console.log(`[PipeRun - Passo 2] Criando nova Pessoa...`);
                const createPerson = await apiPipeRunRest.post("/persons", payloadPerson);
                personId = createPerson.data?.data?.id || null;
                console.log(`[PipeRun - Passo 2] Nova Pessoa criada. ID: ${personId}`);
            }


            console.log(`[PipeRun - Passo 3] Montando payload para o Integrador JSON...`);
            
            const dddTitulo = dddPrincipal || "00"; 
            const titleCard = `(${dddTitulo}) ${servico.indicacao} >> ${servico.razao}`;

            const leadPipeRun = {
                user: servico.codigo_crm,
                title: titleCard,
                company: servico.razao,   
                custom_fields: {
                    "Final do Contrato": formatarData(servico.dt_fim_contrato),
                    "Observacao": servico.observacao,
                    "Indicacao": servico.indicacao,
                    "Classificacao": servico.classificacao_contrato || "",
                    "Quantidade de linhas móveis": servico.qtd_servico_claro || 0,
                    "DOC DRIVE": servico.servico_docdrive || "",
                }
            };

            const payloadIntegrador = {
                leads: [leadPipeRun]
            };

            console.log(`[PipeRun - Passo 3] Disparando para URL do Integrador com Hash: ${hashFunil}`);
            console.log(`[PipeRun - Passo 3] Payload completo:`, JSON.stringify(payloadIntegrador, null, 2));

            const responseIntegrador = await axios.post(URL_INTEGRADOR_PIPERUN, payloadIntegrador, {
                params: {
                    hash: hashFunil 
                },
                headers: {
                    "Content-Type": "application/json"
                }
            });

            console.log(`[PipeRun - Sucesso] Integração concluída com sucesso para: ${servico.razao}. Resposta:`, responseIntegrador.status);
            sucessos++;
            
        } catch (err) {
            falhas++;
            console.error(`\n[!!! ERRO CRÍTICO !!!] Falha ao integrar pipeline para a empresa: ${servico.razao}`);
            
            if (axios.isAxiosError(err)) {
                console.error(`[Axios Error Details] Status Code: ${err.response?.status}`);
                console.error(`[Axios Error Details] URL Requisitada: ${err.config?.url}`);
                console.error(`[Axios Error Details] Método: ${err.config?.method?.toUpperCase()}`);
                
                if (err.response?.data) {
                    console.error(`[Axios Error Details] Resposta da API (Body):`, JSON.stringify(err.response.data, null, 2));
                } else {
                    console.error(`[Axios Error Details] Mensagem: ${err.message}`);
                }
                
                if (err.config?.data) {
                    console.error(`[Axios Error Details] Payload Enviado:`, err.config.data);
                }
            } else {
                console.error(`[Standard Error Details] Mensagem:`, err instanceof Error ? err.message : err);
                console.error(`[Standard Error Details] Stacktrace:`, err instanceof Error ? err.stack : "Sem stacktrace disponível");
            }
            console.log(`----------------------------------------------------------------\n`);
        }
    }

    console.log(`\n[PipeRun] Integração Finalizada. Sucessos: ${sucessos} | Falhas: ${falhas}`);
    return { sucessos, falhas };
};


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

    for (const servico of servicos) {
        try {
            const { telefones, dddPrincipal } = extrairTelefonesEDDD(servico.observacao);
            const contactEmails = servico.decisor_email ? [servico.decisor_email] : [];
            const decisorNome = servico.decisor_nome?.trim() ? servico.decisor_nome.trim() : "Umbrella";
            let personId = null;
            
            // Se houver CPF, tenta encontrar no PipeRun
            if (servico.decisor_cpf) {
                const resPerson = await apiPipeRunRest.get("/persons", { 
                    params: { cpf: servico.decisor_cpf } 
                });
                
                if (resPerson.data?.data && resPerson.data.data.length > 0) {
                    personId = resPerson.data.data[0].id;
                }
            }

            const payloadPerson = {
                name: decisorNome,
                cpf: servico.decisor_cpf || "",
                contactPhones: telefones,
                contactEmails: contactEmails || [],
                observation: servico.decisor_num_obs || ""
                // Nota: Removido manager_id intencionalmente, a Pessoa não precisa ser vinculada a um dono na sua regra.
            };

            if (personId) {
                // Atualiza a pessoa existente
                await apiPipeRunRest.put(`/persons/${personId}`, payloadPerson);
            } else {
                // Cria uma nova pessoa
                const createPerson = await apiPipeRunRest.post("/persons", payloadPerson);
                personId = createPerson.data?.data?.id || null;
            }

            // ----------------------------------------------------------------
            // PASSO 2: EMPRESA (COMPANY) - VINCULAR AO DECISOR (PERSON)
            // ----------------------------------------------------------------
            let companyId = null;
            
            // Se houver CNPJ, tenta encontrar a empresa no PipeRun
            if (servico.cnpj) {
                const resCompany = await apiPipeRunRest.get("/companies", { 
                    params: { cnpj: servico.cnpj } 
                });
                
                if (resCompany.data?.data && resCompany.data.data.length > 0) {
                    companyId = resCompany.data.data[0].id;
                }
            }

            const payloadCompany = {
                name: servico.razao,
                cnpj: servico.cnpj,
                manager_id: personId, 
            };

            if (companyId) {
                // Atualiza a empresa existente
                await apiPipeRunRest.put(`/companies/${companyId}`, payloadCompany);
            } else {
                // Cria uma nova empresa
                const createCompany = await apiPipeRunRest.post("/companies", payloadCompany);
                companyId = createCompany.data?.data?.id || null;
            }

            // ----------------------------------------------------------------
            // PASSO 3: OPORTUNIDADE (DEAL) - VINCULAR AO CONSULTOR (OWNER)
            // ----------------------------------------------------------------
            
            // Monta o título idêntico ao Python
            const dddTitulo = dddPrincipal || "00"; 
            const titleCard = `(${dddTitulo}) ${servico.indicacao} >> ${servico.razao}`;
            
            let observacaoCompleta = servico.observacao || "";
            if (servico.consultor_nome && servico.consultor_nome.trim().toLowerCase() !== "none") {
                observacaoCompleta += ` ULTIMO CONSULTOR: ${servico.consultor_nome}`;
            }

            // Montagem estrita do Lead JSON esperado pelo Integrador
            const leadPipeRun = {
                user: servico.codigo_crm, 
                cnpj: servico.cnpj, 
                title: titleCard,
                company: servico.razao,
                custom_fields: {
                    "Final do Contrato": formatarData(servico.dt_fim_contrato),
                    "Observacao": observacaoCompleta,
                    "Indicacao": servico.indicacao,
                    "Classificacao": servico.classificacao_contrato || "",
                    "Quantidade de linhas móveis": servico.qtd_servico_claro || 0,
                    "DOC DRIVE": servico.servico_docdrive || "",
                }
            };

            const payloadIntegrador = {
                leads: [leadPipeRun]
            };

            // Dispara para o Endpoint de Integração (usando axios puro pois a Base URL e headers mudam)
            await axios.post(URL_INTEGRADOR_PIPERUN, payloadIntegrador, {
                params: {
                    hash: hashFunil 
                },
                headers: {
                    "Content-Type": "application/json"
                }
            });

            sucessos++;
            
        } catch (err) {
            console.error(`[PipeRun API Error] Falha ao integrar pipeline completo para a empresa: ${servico.razao}`, err);
            falhas++;
        }
    }

    return { sucessos, falhas };
};
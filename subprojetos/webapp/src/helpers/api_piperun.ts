import API from "@/helpers/api";
import { IServicoPipeRun } from "@/pages/pipe/subirPipeGeral";

// Hash pra testar e015a67d-bab4-403a-a0f6-5b2cfbc35ebe

export interface IPipeRunIntegrationParams {
    servicos: IServicoPipeRun[];
    emailConsultor: string;
    hashFunil: string;
    indicacao: string;
}

export interface IPipeRunIntegrationResult {
    sucessos: number;
    falhas: number;
}

const extrairDDD = (observacao: string | null): string => {
    if (!observacao) return "";
    const matches = observacao.match(/\d+/);
    return matches ? matches[0] : "";
};

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

export const integrarServicosPipeRun = async ({
    servicos,
    emailConsultor,
    hashFunil,
    indicacao
}: IPipeRunIntegrationParams): Promise<IPipeRunIntegrationResult> => {
    let sucessos = 0;
    let falhas = 0;

    for (const servico of servicos) {
        try {
            const ddd = extrairDDD(servico.observacao);
            const telefoneFormatado = servico.decisor_numero ? `+55 (${ddd}) ${servico.decisor_numero}` : "";
            const contactPhones = telefoneFormatado ? [telefoneFormatado] : [];
            const contactEmails = servico.decisor_email ? [servico.decisor_email] : [];
            const managerId = servico.codigo_crm || undefined; // O ID do dono da conta
            const decisorNome = servico.decisor_nome?.trim() ? servico.decisor_nome.trim() : "Umbrella";
            let personId = null;
            if (servico.decisor_cpf) {
                const resPerson = await API.get("/api/piperun/persons", { params: { cpf: servico.decisor_cpf } });
                if (resPerson.data?.data && resPerson.data.data.length > 0) {
                    personId = resPerson.data.data[0].id;
                }
            }

            const payloadPerson = {
                name: decisorNome,
                cpf: servico.decisor_cpf || "",
                manager_id: managerId,
                contactPhones: contactPhones,
                contactEmails: contactEmails,
                observation: servico.decisor_num_obs || ""
            };

            if (personId) {
                await API.put(`/api/piperun/persons/${personId}`, payloadPerson);
            } else {
                const createPerson = await API.post("/api/piperun/persons", payloadPerson);
                personId = createPerson.data?.data?.id || null;
            }

            let companyId = null;
            
            if (servico.cnpj) {
                const resCompany = await API.get("/api/piperun/companies", { params: { cnpj: servico.cnpj } });
                if (resCompany.data?.data && resCompany.data.data.length > 0) {
                    companyId = resCompany.data.data[0].id;
                }
            }

            const payloadCompany = {
                name: servico.razao,
                cnpj: servico.cnpj,
                manager_id: managerId,
                contactPhones: contactPhones,
                contactEmails: contactEmails,
            };

            if (companyId) {

                await API.put(`/api/piperun/companies/${companyId}`, payloadCompany);
            } else {
                const createCompany = await API.post("/api/piperun/companies", payloadCompany);
                companyId = createCompany.data?.data?.id || null;
            }

            const titleCard = `(${ddd}) ${indicacao} >> ${servico.razao}`;
            let observacaoCompleta = servico.observacao || "";
            if (servico.consultor_nome && servico.consultor_nome.trim().toLowerCase() !== "none") {
                observacaoCompleta = `${observacaoCompleta} ULTIMO CONSULTOR: ${servico.consultor_nome}`;
            }

            const leadPipeRun = {
                user: emailConsultor,
                cnpj: servico.cnpj, 
                title: titleCard,
                company: servico.razao,
                custom_fields: {
                    "Final do Contrato": formatarData(servico.dt_fim_contrato),
                    "Observacao": observacaoCompleta,
                    "Indicacao": indicacao,
                    "Classificacao": servico.classificacao_contrato || "",
                    "Quantidade de linhas móveis": servico.qtd_servico_claro || 0,
                    "DOC DRIVE": servico.servico_docdrive || "",
                }
            };

            const payloadIntegrador = {
                leads: [leadPipeRun]
            };

            // Dispara para a criação da Oportunidade
            await API.post("/api/piperun/integrar", {
                hash_etapa: hashFunil,
                payload_piperun: payloadIntegrador
            });

            sucessos++;
        } catch (err) {
            console.error(`Falha ao integrar pipeline completo para: ${servico.razao}`, err);
            falhas++;
        }
    }

    return { sucessos, falhas };
};
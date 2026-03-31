import axios from "axios";
import { calcularMesesAteInicioContrato } from "@/utils/calcular_tempo_contrato_por_meses.util";
import { obterDataInicioContrato } from "@/utils/calcular_dt_inicio_contrato.util";
import { IPipeRunIntegrationParams } from "@/interfaces/pipeRunIntegrationParams.interface";
import { IPipeRunIntegrationResult } from "@/interfaces/pipeRunIntegrationsResult.interface";
import { formatarCNPJ, formatarCPF, formatarDataBR, limparPontuacao } from "@/utils/funtionFormataDados.util";
import { extrairEFormatarTelefonesDecisor } from "@/utils/formatarTelefonesDecisor.util";
import { extrairTelefonesEmpresaDaObservacao } from "@/utils/formatarTelefonesLinhasEmpresa.util";
import { extrairEmailsDecisor } from "@/utils/functionEmailsDecisor.util";

const TOKEN_PIPERUN = "3dfa1682a3832478cb29a7b9a4c86233";
const URL_INTEGRADOR_PIPERUN = "https://app.pipe.run/webservice/integradorJson";

const apiPipeRunRest = axios.create({
    baseURL: "https://api.pipe.run/v1",
    headers: {
        "accept": "application/json",
        "token": TOKEN_PIPERUN,
    },
});

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
            
            const emailsFormatados = extrairEmailsDecisor(servico.decisor_email, servico.decisor_email_observacao);
            
            const dataFimFormatada = formatarDataBR(servico.dt_fim_contrato);
            const dataInicioFormatada = obterDataInicioContrato(servico.dt_fim_contrato);
            const mesesContrato = calcularMesesAteInicioContrato(dataInicioFormatada);

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

            console.log(`[Passo 3] Gerando payload formatado para a Oportunidade...`);
            const titleCard = `(${dddFinal}) ${servico.indicacao} >> ${servico.razao}`;

            const payloadIntegrador = {
                leads: [{
                    user: servico.consultor_email,
                    title: titleCard,
                    company: servico.razao,
                    cnpj: cnpjFormatado, 
                    DDD: dddFinal,
                    custom_fields: {
                        "Inicio do Contrato": dataInicioFormatada,
                        "Final do Contrato": dataFimFormatada,
                        "Tempo de Contrato": mesesContrato,
                        "Quantidade de linhas móveis": servico.qtd_servico_claro || 0,
                        "Obs de fechamento": servico.observacao_fechamento || "",
                        "Observacao": servico.observacao || "",
                        "Carteira": servico.carteira || "",
                        "Indicacao": servico.indicacao,
                        "Classificação": servico.classificacao_contrato || "",
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
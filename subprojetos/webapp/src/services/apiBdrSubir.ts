import axios from "axios";
import { ILeadOmniResponse } from "@/interfaces/leadOmni.interface";
import API from "./api";
import { formatarCNPJ, limparPontuacao } from "@/utils/formataDados.util";
import { extrairEFormatarTelefonesDecisor } from "@/utils/formatarTelefonesDecisor.util";
import { extrairTelefonesEmpresaDaObservacao } from "@/utils/formatarTelefonesLinhasEmpresa.util";

import {
  extrairEAnexarDecisorOmni,
  extrairEAnexarPdfDecisorOmni,
  gerarEAnexarImagemOmni,
} from "./omniGeradorLayoutService";
import { useState } from "react";

const TOKEN_OMNI_CRM = import.meta.env.VITE_TOKEN_API_KEY;
const apiOmniCrm = axios.create({
  baseURL: "https://omniassessoria.online/api/local/v1",
  headers: {
    accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${TOKEN_OMNI_CRM}`,
  },
});

interface DadosServicoOperadora {
  seq_servico_operadora: number;
  seq_empresa: number;
  tipo_servico: "CLARO" | "VIVO";
  dt_fim_compromisso: string;
  numero_linha: number;
  plano: string;
  valor: string;
  bonus: string;
  linha_ativa: boolean;
}

/**
 * Busca e processa as linhas secundárias do banco via API.
 * Aplica os critérios: 1º Maior GB, 2º Maior Valor, 3º Ordem do banco.
 */
const obterLinhasSecundariasRanqueadas = async (
  seq_empresa: number,
  linhaPrincipalExcluida: string | null
): Promise<string | null> => {
  try {
    const response = await API.get(`/servico-operadora/${seq_empresa}`);
    const linhas: DadosServicoOperadora[] = response.data?.dados || [];

    if (linhas.length === 0) return null;

    const linhaPrincipalLimpa = linhaPrincipalExcluida
      ? String(linhaPrincipalExcluida).replace(/\D/g, "")
      : "";

    const linhasElegiveis = linhas.filter((l) => {
      const numLimpo = String(l.numero_linha).replace(/\D/g, "");
      return numLimpo !== linhaPrincipalLimpa;
    });

    if (linhasElegiveis.length === 0) return null;

    const extrairGigabytes = (plano: string): number => {
      if (!plano) return 0;
      const match = plano.match(/(\d+)\s*GB/i);
      return match ? parseInt(match[1], 10) : 0;
    };

    linhasElegiveis.sort((a, b) => {
      const gbA = extrairGigabytes(a.plano);
      const gbB = extrairGigabytes(b.plano);

      if (gbA !== gbB) return gbB - gbA;

      const valorA = parseFloat(a.valor || "0");
      const valorB = parseFloat(b.valor || "0");

      if (valorA !== valorB) return valorB - valorA;

      return 0;
    });

    const topoDuasLinhas = linhasElegiveis.slice(0, 2);
    return topoDuasLinhas.map((l) => l.numero_linha).join(", ");
    
  } catch (error) {
    console.error(`[Omni BDR] Falha silenciosa ao processar linhas secundárias (SeqEmpresa: ${seq_empresa}):`, error);
    return null;
  }
};

const formatarObsNumerosSecundarios = (numeros: any[]): string => {
  if (!numeros || numeros.length === 0) return "";
  return numeros
    .map((item) => {
      const numeroLimpo = String(item.numero_linha || "").replace(/\D/g, "");
      return numeroLimpo ? `55${numeroLimpo}` : "";
    })
    .filter((num) => num !== "")
    .join(", ");
};

// =========================================================================
// FUNÇÃO DE ENVIO AO CRM (BDR)
// =========================================================================
export const enviarLeadOmniCrmBdr = async (
  lead: ILeadOmniResponse,
  tipoOperacao?: string,
) => {
  console.log(
    `\n================================================================`,
  );
  console.log(`[Omni CRM BDR] Iniciando processamento do Lead: ${lead.razao}`);

  try {
    const cnpjLimpo = limparPontuacao(lead.cnpj);
    const cnpjFormatado = formatarCNPJ(lead.cnpj);
    const resultDecisor = extrairEFormatarTelefonesDecisor(
      lead.numero_decisor,
      "",
    );
    const resultEmpresa = extrairTelefonesEmpresaDaObservacao("");
    const dddFinal =
      resultEmpresa.dddPrincipal !== "00"
        ? resultEmpresa.dddPrincipal
        : resultDecisor.dddPrincipal !== "00"
          ? resultDecisor.dddPrincipal
          : "00";

    const emailConsultor = lead.email_consultor
      ? String(lead.email_consultor).trim().toLowerCase()
      : "";

    const decisorNome =
      lead.nome_decisor && lead.nome_decisor.trim() !== ""
        ? lead.nome_decisor.trim().toUpperCase()
        : null;
    const decisorEmail =
      lead.email_decisor && lead.email_decisor.trim() !== ""
        ? lead.email_decisor.trim()
        : null;

    const decisorPhonesArray: any[] = [];
    const numeroDecisorBruto =
      resultDecisor.telefonesFormatados || lead.numero_decisor;

    if (numeroDecisorBruto) {
      const numeroLimpoDecisor = String(numeroDecisorBruto).replace(/\D/g, "");
      if (numeroLimpoDecisor) {
        decisorPhonesArray.push({
          number: numeroLimpoDecisor,
          label: "celular decisor",
          isMain: true,
        });
      }
    }

    const temDecisor = Boolean(
      decisorNome || decisorPhonesArray.length > 0 || decisorEmail,
    );

    let infoDecisorStr = "";

    if (temDecisor) {
      const telefonesFormatadosString =
        decisorPhonesArray.length > 0
          ? decisorPhonesArray.map((p) => p.number).join(", ")
          : "NÃO INFORMADO";

      infoDecisorStr = `NOME: ${decisorNome || "NÃO INFORMADO"} ||||| > TELEFONES: ${telefonesFormatadosString} ||||| EMAILS: ${decisorEmail || "NÃO INFORMADO"}`;
    }

    let telefoneContatoFinal = "";
    let labelContatoFinal = "";
    let nomeContatoFinal = "Contato Principal";
    let isDecisionMakerFlag = false;

    if (decisorPhonesArray.length > 0 && decisorPhonesArray[0].number) {
      telefoneContatoFinal = decisorPhonesArray[0].number;
      labelContatoFinal = "Celular Decisor";
      nomeContatoFinal = decisorNome || "Decisor";
      isDecisionMakerFlag = true;
    } else if (lead.linha_claro) {
      const numClaroLimpo = String(lead.linha_claro).replace(/\D/g, "");
      if (numClaroLimpo) {
        telefoneContatoFinal = numClaroLimpo;
        labelContatoFinal = "Linha Móvel Claro";
        nomeContatoFinal = "Linhas da Empresa";
        isDecisionMakerFlag = false;
      }
    } else if (lead.google_fontes_telefones) {
      const primeiroGoogleTel = String(lead.google_fontes_telefones)
        .split(",")[0]
        .replace(/\D/g, "");
      if (primeiroGoogleTel) {
        telefoneContatoFinal = primeiroGoogleTel;
        labelContatoFinal = "Telefone Google Maps";
        nomeContatoFinal = "Contato Google Maps";
        isDecisionMakerFlag = false;
      }
    }

    const contactsPayload: any[] = [];

    if (telefoneContatoFinal) {
      contactsPayload.push({
        name: nomeContatoFinal,
        roleHint: labelContatoFinal,
        isPrimary: true,
        isDecisionMaker: isDecisionMakerFlag,
        phones: [
          {
            number: telefoneContatoFinal,
            label: labelContatoFinal,
            isMain: true,
          },
        ],
      });
    }

    if (lead.site_empresarial_telefones) {
      const telefonesDoSite = lead.site_empresarial_telefones.split("||");
      const formatadosSitePhones: any[] = [];

      telefonesDoSite.forEach((tel, index) => {
        const numLimpo = String(tel).replace(/\D/g, "");
        
        if (numLimpo) {
          formatadosSitePhones.push({
            number: numLimpo,
            label: "Telefone do Site",
            isMain: index === 0,
          });
        }
      });

      if (formatadosSitePhones.length > 0) {
        contactsPayload.push({
          name: "Site Empresarial",
          roleHint: "Contatos retirados do site oficial da empresa",
          isPrimary: contactsPayload.length === 0,
          isDecisionMaker: false,
          phones: formatadosSitePhones,
        });
      }
    }

    const titleCard = `(${dddFinal}) BDR >> ${lead.razao}`;

    const linhasSecundariasProcessadas = await obterLinhasSecundariasRanqueadas(
      lead.seq_empresa,
      lead.linha_claro
    );

    const rawCustomFieldsObj: Record<string, any> = {
      "Título do Negócio": titleCard ?? "N/A",
      Origem: "Base Setembro BDR",
      Indicacao: "BDR",
      "Informações DECISOR (Possível decisor)": infoDecisorStr ?? "N/A",
      "Nomes Fantasias": lead.google_fontes_nomes_fantasia ?? "N/A",
      "Nome Decisor": lead.nome_decisor ?? "N/A",
      "Telefone Decisor": lead.numero_decisor ?? "N/A",
      "Email Decisor": lead.email_decisor ?? "N/A",
      "Linha Claro (Maior GB)": lead.linha_claro ?? "N/A",
      "Números (Google e outras Fontes)": lead.google_fontes_telefones ?? "N/A",
      "Emails (Google e outras Fontes)": lead.google_fontes_emails ?? "N/A",
      "Sites (Google e outras Fontes)": lead.google_fontes_sites ?? "N/A",
      "Emails (Site da Empresa)": lead.site_empresarial_emails ?? "N/A",
      "Telefones (Site da Empresa)": lead.site_empresarial_telefones ?? "N/A",
    };

    if (linhasSecundariasProcessadas) {
      rawCustomFieldsObj["Linhas Claro (Secundárias)"] = linhasSecundariasProcessadas;
    }

    const pipelineDefinido = "wm2n294u8vgp31duczik6iak";
    const stageDefinido = "n1e91tv7a124cgepguadjn8t";

    console.log(`[Passo Pré-Voo BDR] 🔎 Verificando se o CNPJ ${cnpjLimpo} já existe no CRM...`);
    try {
      const checkResponse = await apiOmniCrm.get("/deals", {
        params: {
          pipelineId: pipelineDefinido,
          status: "all",
          q: cnpjLimpo,
        },
      });

      const dealsEncontrados = checkResponse.data?.data || [];
      
      const leadJaExiste = dealsEncontrados.some((d: any) => {
        const docCrm = String(d.companyCnpj || "").replace(/\D/g, "");
        return docCrm === cnpjLimpo;
      });

      if (leadJaExiste) {
        console.warn(`[Omni BDR] 🛡️ BLOQUEADO: O CNPJ ${cnpjFormatado} já está no pipeline do CRM!`);
        console.log(`[Omni BDR] 🩹 Curando sincronização local para que o DB registre (crm=true).`);
        
        await API.patch(
          `/api/servico-omni/leads/marcar-enviado/${lead.seq_empresa}`,
          {
            dt_crm: new Date().toISOString(),
            codigo_crm: Number(lead.codigo_crm) || lead.seq_consultor,
          },
        );

        return { success: false, duplicado: true };
      }
    } catch (checkError: any) {
      console.error(
        `[Omni BDR] ⚠️ Falha na checagem de duplicidade. Tentando criar mesmo assim...`,
        checkError.message,
      );
    }

    const payloadSingleCreation = {
      companyName: lead.razao,
      companyCnpj: cnpjFormatado,
      value: 0,
      pipelineId: pipelineDefinido,
      stageId: stageDefinido,
      user: emailConsultor !== "" ? emailConsultor : undefined,
      customFields: JSON.stringify(rawCustomFieldsObj), // Envia o objeto manipulado dinamicamente
      contacts: contactsPayload,
    };

    console.log(`[Passo 1] 🚀 Criando Negócio no CRM Omni pelo fluxo BDR...`);

    const responseCreation = await apiOmniCrm.post(
      "/deals",
      payloadSingleCreation,
    );
    const dealIdCriado =
      responseCreation.data?.data?.id || responseCreation.data?.id;

    if (dealIdCriado) {
      console.log(
        `[Passo 2] ✅ Negócio criado (ID: ${dealIdCriado}). Processando Anexos e Atualização DB Local...`,
      );

      await gerarEAnexarImagemOmni(dealIdCriado, lead, cnpjFormatado, "linhas");

      if (lead.docdrive) {
        console.log(
          `[Orquestrador BDR] Processando arquivos locais do Decisor para o Deal ${dealIdCriado}...`,
        );

        await Promise.allSettled([
          extrairEAnexarDecisorOmni(
            dealIdCriado,
            lead.docdrive,
            cnpjLimpo,
            lead.seq_empresa,
          ),
          extrairEAnexarPdfDecisorOmni(dealIdCriado, lead.docdrive, cnpjLimpo),
        ]);
      }

      await API.patch(
        `/api/servico-omni/leads/marcar-enviado/${lead.seq_empresa}`,
        {
          dt_crm: new Date().toISOString(),
          codigo_crm: Number(lead.codigo_crm) || lead.seq_consultor,
        },
      );

      return { success: true, dealId: dealIdCriado };
    } else {
      throw new Error(
        "A API Omni retornou sucesso, mas não devolveu o UUID do Deal.",
      );
    }
  } catch (error: any) {
    console.error(
      `[Omni BDR ERRO] Falha ao processar a empresa: ${lead.razao}`,
    );

    if (error.response) {
      console.error(`Status HTTP: ${error.response.status}`);
      console.error(
        `Mensagem da API:`,
        JSON.stringify(error.response.data, null, 2),
      );
    } else {
      console.error(`Detalhes:`, error.message);
    }

    throw error;
  }
};

// =========================================================================
// HOOK CUSTOMIZADO PARA INTERFACE E INTEGRAÇÃO EM MASSA
// =========================================================================
interface UseIntegracaoProps {
  seqConsultor: number;
  limiteEnvio: number;
  onSuccessCb: (logs?: { sucessos: any[]; falhas: any[] }) => void;
}

export function useIntegracaoPipeBdr() {
  const [isEnviando, setIsEnviando] = useState(false);

  const handleSubirServicos = async ({
    seqConsultor,
    limiteEnvio,
    onSuccessCb,
  }: UseIntegracaoProps) => {
    if (!seqConsultor || !limiteEnvio) {
      alert("Consultor e quantidade são obrigatórios.");
      return;
    }

    try {
      setIsEnviando(true);
      let sucessosLogs: any[] = [];
      let falhasLogs: any[] = [];

      const resEmpresas = await API.get(
        `/api/servico-omni/empresas-envio?seq_consultor=${seqConsultor}&limit=${limiteEnvio}`,
      );
      const listaEmpresas = resEmpresas.data?.dados || [];

      if (listaEmpresas.length === 0) {
        alert(
          "Nenhum lead disponível para este consultor com os filtros atuais.",
        );
        setIsEnviando(false);
        return;
      }

      console.info(
        `🚀 Iniciando processamento de ${listaEmpresas.length} leads.`,
      );
      
      for (const item of listaEmpresas) {
        const seqEmpresa = item.seq_empresa;
        let leadData: ILeadOmniResponse | null = null;

        try {
          const resLead = await API.get(
            `/api/servico-omni/leads/${seqEmpresa}`,
          );
          leadData = resLead.data?.dados[0];

          if (!leadData) {
            falhasLogs.push({
              payload: { cnpj: `SEQ-${seqEmpresa}` },
              erro: "Dados detalhados do lead não encontrados no banco.",
            });
            continue;
          }

          const omniResult = await enviarLeadOmniCrmBdr(leadData);

          if (omniResult && omniResult.duplicado) {
            falhasLogs.push({
              payload: leadData,
              erro: "BLOQUEADO: A empresa já existe no CRM BDR. (O sistema local foi curado e atualizado)."
            });
          } 
    
          else if (omniResult && omniResult.success && omniResult.dealId) {
            sucessosLogs.push({ payload: leadData, dealId: omniResult.dealId });
            console.info(
              `✅ Lead ${seqEmpresa} subido e banco atualizado pelo serviço BDR.`,
            );
          }
          
        } catch (error: any) {
          console.error(
            `🚨 Falha no processamento do lead ${seqEmpresa}:`,
            error,
          );
          falhasLogs.push({
            payload: leadData ? leadData : { cnpj: `SEQ-${seqEmpresa}` },
            erro: error.message || "Erro inesperado durante integração com o CRM Omni.",
          });
        }
      }

      onSuccessCb({ sucessos: sucessosLogs, falhas: falhasLogs });
    } catch (error) {
      console.error(`🚨 Exception sistêmica no Hook:`, error);
      alert("Ocorreu um erro estrutural durante a busca das empresas.");
    } finally {
      setIsEnviando(false);
    }
  };

  return { handleSubirServicos, isEnviando };
}

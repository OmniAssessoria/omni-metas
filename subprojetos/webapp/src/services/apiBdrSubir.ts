import axios from "axios";
import { apiPipeRunRest } from "@/configs/piperunConfigs.config";
import { anexarImagemDecisorPipeRun, extrairImagemDecisorLocal } from "./driveObterDecisor";
import { ILeadOmniResponse } from "@/interfaces/leadOmni.interface";

const limparPontuacao = (str: string) => str.replace(/\D/g, "");
const formatarCNPJ = (cnpj: string) => {
  const c = limparPontuacao(cnpj);
  if (c.length === 14) return c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  return cnpj;
};

export const enviarLeadPipeRun = async (lead: ILeadOmniResponse) => {
  console.log(`\n[PipeRun] Iniciando subida do Lead: ${lead.razao}`);

  try {
    const cnpjLimpo = limparPontuacao(lead.cnpj);
    const cnpjFormatado = formatarCNPJ(lead.cnpj);
    let companyId = null;
    if (cnpjFormatado) {
      const resCompany = await apiPipeRunRest.get("/companies", { params: { cnpj: cnpjFormatado } });
      if (resCompany.data?.data && resCompany.data.data.length > 0) {
        companyId = resCompany.data.data[0].id;
      }
    }

    const payloadEmpresa = {
      name: lead.razao,
      cnpj: cnpjFormatado,
    };

    if (companyId) {
      await apiPipeRunRest.put(`/companies/${companyId}`, payloadEmpresa);
    } else {
      const createCompany = await apiPipeRunRest.post("/companies", payloadEmpresa);
      companyId = createCompany.data?.data?.id || null;
    }

    const HASH_ETAPA = "f7b51f6e-d692-4e2b-a272-630044fef80c"; 
    const payloadWebhook = {
      rules: {
        update: true,
        equal_pipeline: 104307,
        stage_id: 672347,
        status: "open"
      },
      leads: [
        {
          title: `${cnpjFormatado} - ${lead.razao}`,
          company: lead.razao,
          cnpj: cnpjFormatado,
          user: lead.email_consultor ? lead.email_consultor.trim().toLowerCase() : undefined,
          probability: 10,
          custom_fields: {
            "Número Claro": lead.numero_claro || "N/A",
            "DOCDRIVE": lead.docdrive || "N/A",
            "Nome Decisor": lead.nome_decisor || "N/A",
            "Telefone Decisor": lead.numero_decisor || "N/A",
            "Email Decisor": lead.email_decisor || "N/A"
          },
        },
      ],
    };

    const responseWebhook = await axios.post(
      `https://app.pipe.run/webservice/integradorJson`,
      payloadWebhook,
      {
        params: { hash: HASH_ETAPA },
        headers: { "Content-Type": "application/json" },
      }
    );

    let dealIdCriado = null;
    if (responseWebhook.status === 200 || responseWebhook.data?.success) {
      const respData = responseWebhook.data?.data;
      if (Array.isArray(respData) && respData.length > 0) dealIdCriado = respData[0].id;
      else if (respData?.id) dealIdCriado = respData.id;
      else if (responseWebhook.data?.id) dealIdCriado = responseWebhook.data.id;
    }

    if (!dealIdCriado) {
      throw new Error("Oportunidade criada, mas o PipeRun não retornou o ID do Deal.");
    }

    if (lead.docdrive) {
      console.log(`[PipeRun] Buscando imagem do decisor no driveLocal...`);
      const base64Decisor = await extrairImagemDecisorLocal(lead.docdrive, cnpjLimpo);

      if (base64Decisor) {
        await anexarImagemDecisorPipeRun(dealIdCriado, base64Decisor, lead.seq_empresa);
        console.log(`[PipeRun] Imagem do decisor anexada com sucesso.`);
      }
    }

    return { success: true, dealId: dealIdCriado };

  } catch (error: any) {
    console.error(`[PipeRun ERRO] Falha ao processar a empresa: ${lead.razao}`, error.message);
    throw error;
  }
};

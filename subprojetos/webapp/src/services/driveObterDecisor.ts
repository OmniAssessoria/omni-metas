import axios from "axios";
import { URL_API_LOCAL } from "./api"; // Ajuste o caminho conforme seu projeto
import { apiPipeRunRest, TOKEN_PIPERUN } from "@/configs/piperunConfigs.config";

/**
 * 1) FUNÇÃO PARA EXTRAIR A IMAGEM DO ARMAZENAMENTO LOCAL VIA BACKEND
 * Ela pede para a sua API Node.js contatar o servidor Python (10.0.0.106)
 * e devolver a imagem Base64.
 */
export const extrairImagemDecisorLocal = async (
  caminhoBancoUrl: string,
  cnpjLimpo: string,
): Promise<string | null> => {
  try {
    if (!caminhoBancoUrl) return null;

    console.log(
      `[Storage] 🔎 Buscando imagem do Decisor no Servidor Local para CNPJ: ${cnpjLimpo}...`,
    );

    const response = await axios.post(
      `${URL_API_LOCAL}/api/armazenamento-local/buscar-decisor`,
      {
        url_pasta: caminhoBancoUrl,
        cnpj: cnpjLimpo,
      },
    );

    const base64 = response.data?.imagemBase64;

    if (!base64) {
      console.log(
        `[Storage] ⚠️ Nenhuma imagem de decisor encontrada para o CNPJ ${cnpjLimpo}.`,
      );
      return null;
    }

    console.log(
      `[Storage] ✅ Imagem do decisor encontrada e extraída com sucesso do HD Local!`,
    );
    return base64;
  } catch (err: any) {
    console.error(
      `[Storage] ❌ Erro ao buscar imagem do decisor no Servidor Local:`,
      err.message,
    );
    return null;
  }
};

/**
 * 2) FUNÇÃO PARA SUBIR A IMAGEM EXTRAÍDA NO PIPERUN
 * (Mantida intacta, pois a lógica de manipulação de Blob para o PipeRun é impecável)
 */
export const anexarImagemDecisorPipeRun = async (
  dealId: number,
  base64Imagem: string,
  seqEmpresa: string | number,
) => {
  try {
    console.log(
      `[Anexo] 📎 Fazendo upload do Decisor para o Deal ${dealId}...`,
    );

    // Garante que o buffer tem o header mimeType do Base64
    const base64DataStr = base64Imagem.includes("data:image")
      ? base64Imagem
      : `data:image/png;base64,${base64Imagem}`;

    const responseFetch = await fetch(base64DataStr);
    const blobImagem = await responseFetch.blob();

    const formData = new FormData();
    formData.append("files[]", blobImagem, `DECISOR_${seqEmpresa}.png`);
    formData.append("deal_id", String(dealId));

    const uploadResp = await axios.post(
      `${apiPipeRunRest.defaults.baseURL}/files/upload/deal/note/image`,
      formData,
      {
        headers: {
          token: TOKEN_PIPERUN,
          accept: "application/json",
        },
      },
    );

    if (uploadResp.data?.success && uploadResp.data?.data?.length > 0) {
      const urlResource = uploadResp.data.data[0].url_resource;

      const imgHtml = `<img src="${urlResource}" alt="Decisor do Contrato" style="max-width:100%; height:auto;"/>`;

      const notePayload = {
        text: `<strong>👤 Decisor do Contrato ❗️</strong><br><br>${imgHtml}`,
        deal_id: Number(dealId),
      };

      const responseNota = await apiPipeRunRest.post("/notes", notePayload);

      if (responseNota.status === 200 || responseNota.status === 201) {
        console.log(`[Anexo] ✅ Nota do Decisor anexada com sucesso no PipeRun!`);
      } else {
        console.warn(
          `[Anexo] ⚠️ A nota foi enviada, mas o status do PipeRun foi ${responseNota.status}`,
        );
      }
    }
  } catch (err: any) {
    console.error(
      `[Anexo] ❌ Erro ao subir imagem do Decisor no Deal ${dealId}:`,
      err.message,
    );
  }
};

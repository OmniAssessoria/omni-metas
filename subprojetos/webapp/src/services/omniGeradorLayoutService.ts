import axios from "axios";
import { URL_API_LOCAL } from "./api";
import { apiPipeRunRest, TOKEN_PIPERUN } from "@/configs/piperunConfigs.config";


export const gerarEAnexarImagemPipeRun = async (
  dealId: number,
  servico: any,
  cnpjFormatado: string,
  tipoLayout: "linhas" | "proposta",
  tituloNota: string
) => {
  try {
    console.log(`[Anexo] 📸 Solicitando imagem (${tipoLayout}) para ${servico.razao}...`);
    
    const endpoint = tipoLayout === "linhas" 
      ? "/api/servico-claro/layout/imagem-linhas" 
      : "/api/servico-claro/layout/imagem-proposta";

    const responseImagem = await axios.post(`${URL_API_LOCAL}${endpoint}`, {
      seq_empresa: servico.seq_empresa,
      razao: servico.razao,
      cnpj: cnpjFormatado
    });

    const imagemLayoutBase64 = responseImagem.data?.dados?.imagem;
    
    if (!imagemLayoutBase64) {
      console.warn(`[Anexo] ⚠️ Falha ao gerar imagem ${tipoLayout}. Retorno vazio.`);
      return;
    }

    console.log(`[Anexo] 📎 Fazendo upload da imagem (${tipoLayout}) para o Deal ${dealId}...`);
    
    const base64DataStr = imagemLayoutBase64.includes("data:image")
      ? imagemLayoutBase64
      : `data:image/png;base64,${imagemLayoutBase64}`;

    const responseFetch = await fetch(base64DataStr);
    const blobImagem = await responseFetch.blob();

    const formData = new FormData();
    formData.append("files[]", blobImagem, `${tipoLayout}_${servico.seq_empresa}.png`);
    formData.append("deal_id", String(dealId));

    const uploadResp = await axios.post(
      `${apiPipeRunRest.defaults.baseURL}/files/upload/deal/note/image`,
      formData,
      {
        headers: {
          "token": TOKEN_PIPERUN,
          "accept": "application/json"
        }
      }
    );

    if (uploadResp.data?.success && uploadResp.data?.data?.length > 0) {
      const urlResource = uploadResp.data.data[0].url_resource;
      console.log(`[Anexo] ✅ Upload concluído! URL: ${urlResource}`);
      
      const imgHtml = `<img src="${urlResource}" alt="${tipoLayout}" style="max-width:100%; height:auto;"/>`;
      
      const notePayload = {
        text: `<strong>${tituloNota}</strong><br><br>${imgHtml}`,
        deal_id: Number(dealId)
      };

      const responseNota = await apiPipeRunRest.post("/notes", notePayload);

      if (responseNota.status === 200 || responseNota.status === 201) {
        console.log(`[Anexo] ✅ Nota de ${tipoLayout} anexada com sucesso no Deal!`);
      } else {
        console.warn(`[Anexo] ⚠️ A nota foi enviada, mas o status foi ${responseNota.status}`);
      }
    } else {
      console.warn(`[Anexo] ⚠️ Upload OK, mas sem 'success: true' na resposta do PipeRun.`);
    }
  } catch (err: any) {
    console.error(`[Anexo] ❌ Erro ao processar a imagem (${tipoLayout}) no Deal ${dealId}:`, err.message);
    if (err.response?.data) {
      console.error("Detalhes da Recusa PipeRun:", JSON.stringify(err.response.data));
    }
  }
};

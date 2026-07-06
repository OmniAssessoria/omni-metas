import axios from "axios";
import { URL_API_LOCAL } from "./api";

export const URL_OMNI_API = "https://omniassessoria.online/api/local/v1";
export const TOKEN_AXION = process.env.NEXT_PUBLIC_AXION_API_KEY || "SUA_CHAVE_AQUI";

/**
 * Motor genérico de upload para a API Omni Local (Intenção -> Transferência -> Confirmação)
 */
export const uploadFileToOmni = async (
  dealId: string,
  blobArquivo: Blob,
  fileName: string,
  contentType: string = "image/png"
): Promise<boolean> => {
  try {
    const sizeBytes = blobArquivo.size;

    const initResponse = await axios.post(
      `${URL_OMNI_API}/deals/${dealId}/files`,
      { fileName, contentType, sizeBytes },
      {
        headers: {
          Authorization: `Bearer ${TOKEN_AXION}`,
          "Content-Type": "application/json",
        },
      }
    );

    const { data: fileData, upload } = initResponse.data;

    await axios({
      method: upload.method,
      url: upload.url,
      headers: upload.headers, 
      data: blobArquivo, 
    });

    const completeResponse = await axios.post(
      `${URL_OMNI_API}/files/${fileData.id}/complete`,
      {},
      {
        headers: {
          Authorization: `Bearer ${TOKEN_AXION}`,
        },
      }
    );

    return completeResponse.data?.ok === true;
  } catch (error: any) {
    console.error(`❌ [Storage Omni] Falha no ciclo de upload para Deal [${dealId}] - Arquivo: ${fileName}`);
    if (error.response) console.error("Detalhes:", error.response.data);
    return false;
  }
};

/**
 * Função responsável por extrair a imagem do Python Local e enviar para o Omni CRM
 */
export const extrairEAnexarDecisorOmni = async (
  dealId: string,
  caminhoBancoUrl: string,
  cnpjLimpo: string,
  seqEmpresa: string | number
) => {
  try {
    if (!caminhoBancoUrl) return;

    console.log(`[Storage] 🔎 Buscando imagem do Decisor no Servidor Local para CNPJ: ${cnpjLimpo}...`);
    const response = await axios.post(
      `${URL_API_LOCAL}/api/armazenamento-local/buscar-decisor`,
      { url_pasta: caminhoBancoUrl, cnpj: cnpjLimpo }
    );

    const base64 = response.data?.imagemBase64;
    if (!base64) {
      console.log(`[Storage] ⚠️ Nenhuma imagem de decisor encontrada para o CNPJ ${cnpjLimpo}.`);
      return;
    }

    const base64DataStr = base64.includes("data:image") ? base64 : `data:image/png;base64,${base64}`;
    const responseFetch = await fetch(base64DataStr);
    const blobImagem = await responseFetch.blob();

    console.log(`[Anexo] 📎 Fazendo upload do Decisor para o Deal ${dealId} no Omni...`);
    const sucesso = await uploadFileToOmni(
      dealId,
      blobImagem,
      `DECISOR_${seqEmpresa}.png`,
      "image/png"
    );

    if (sucesso) {
      console.log(`[Anexo Omni] ✅ Imagem do Decisor anexada com sucesso!`);
    }
  } catch (err: any) {
    console.error(`[Anexo Omni] ❌ Erro na cadeia do Decisor (Deal ${dealId}):`, err.message);
  }
};

/**
 * 🚀 NOVA FUNÇÃO: Substitui o gerarEAnexarImagemPipeRun
 * Agora ela gera o layout no seu backend e sobe nativamente para a Omni usando o fluxo de 3 etapas.
 */
export const gerarEAnexarImagemOmni = async (
  dealId: string, 
  servico: any,
  cnpjFormatado: string,
  tipoLayout: "linhas" | "proposta"
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

    console.log(`[Anexo] 📎 Fazendo upload da imagem (${tipoLayout}) para o Deal ${dealId} na Omni...`);
    
    const base64DataStr = imagemLayoutBase64.includes("data:image")
      ? imagemLayoutBase64
      : `data:image/png;base64,${imagemLayoutBase64}`;

    const responseFetch = await fetch(base64DataStr);
    const blobImagem = await responseFetch.blob();
    const fileName = `${tipoLayout}_${servico.seq_empresa}.png`;
    const sucesso = await uploadFileToOmni(dealId, blobImagem, fileName, "image/png");

    if (sucesso) {
      console.log(`[Anexo Omni] ✅ Layout de ${tipoLayout} anexado com sucesso no Deal!`);
    } else {
      console.warn(`[Anexo Omni] ⚠️ Falha na confirmação de upload do layout ${tipoLayout}.`);
    }
  } catch (err: any) {
    console.error(`[Anexo Omni] ❌ Erro ao processar a imagem (${tipoLayout}) no Deal ${dealId}:`, err.message);
  }
};

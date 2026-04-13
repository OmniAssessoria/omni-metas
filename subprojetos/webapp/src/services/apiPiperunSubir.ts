import axios from "axios";
// IMPORTANTE: Removemos a importação do pacote "form-data" do Node.js,
// pois o Browser já possui sua própria classe FormData nativa.

import { calcularMesesAteInicioContrato } from "@/utils/calcular_tempo_contrato_por_meses.util";
import { obterDataInicioContrato } from "@/utils/calcular_dt_inicio_contrato.util";
import { IPipeRunIntegrationParams } from "@/interfaces/pipeRunIntegrationParams.interface";
import { IPipeRunIntegrationResult } from "@/interfaces/pipeRunIntegrationsResult.interface";
import {
  formatarCNPJ,
  formatarCPF,
  formatarDataBR,
  limparPontuacao,
} from "@/utils/funtionFormataDados.util";
import { extrairEFormatarTelefonesDecisor } from "@/utils/formatarTelefonesDecisor.util";
import { extrairTelefonesEmpresaDaObservacao } from "@/utils/formatarTelefonesLinhasEmpresa.util";

function formatarObservacaoPlanosLinhas(
  observacaoRaw: string | null | undefined,
): string {
  if (!observacaoRaw) return "";

  if (
    !observacaoRaw.includes("Planos:") ||
    !observacaoRaw.includes("Linhas:")
  ) {
    return observacaoRaw;
  }

  try {
    const sections = observacaoRaw.split(" |||| ");

    const planosSection = sections.find((s) => s.trim().startsWith("Planos:"));
    const linhasSection = sections.find((s) => s.trim().startsWith("Linhas:"));

    if (!planosSection || !linhasSection) return observacaoRaw;

    const planosMap: Record<string, { nome: string; valor: string }> = {};
    const planosStr = planosSection.replace("Planos:", "").trim();
    const planosArray = planosStr.split(" || ");

    for (const planoItem of planosArray) {
      const matchPlano = planoItem.match(
        /\((\d+)\)\s*-\s*(.*?)\s*:\s*(R\$[0-9.,]+)/,
      );
      if (matchPlano) {
        const id = matchPlano[1];
        const nomePlano = matchPlano[2].trim();
        const valorPlano = matchPlano[3].trim();
        planosMap[id] = { nome: nomePlano, valor: valorPlano };
      }
    }

    const linhasStr = linhasSection.replace("Linhas:", "").trim();
    const linhasArray = linhasStr.split(" :: ");

    const resultadoFinal: string[] = [];

    for (const linhaItem of linhasArray) {
      const matchLinha = linhaItem.match(/P\[(\d+)\]\s*-\s*(\d+)/);
      if (matchLinha) {
        const idPlano = matchLinha[1];
        const numeroPuro = matchLinha[2];

        let numeroFormatado = numeroPuro;

        if (numeroPuro.length === 11) {
          numeroFormatado = `+55 (${numeroPuro.slice(0, 2)}) ${numeroPuro.slice(2, 7)}-${numeroPuro.slice(7)}`;
        } else if (numeroPuro.length === 10) {
          numeroFormatado = `+55 (${numeroPuro.slice(0, 2)}) ${numeroPuro.slice(2, 6)}-${numeroPuro.slice(6)}`;
        }

        const dadosPlano = planosMap[idPlano];

        if (dadosPlano) {
          resultadoFinal.push(
            `LINHA:: ${numeroFormatado} <==> PLANO:: ${dadosPlano.nome} <==> VALOR:: ${dadosPlano.valor}`,
          );
        } else {
          resultadoFinal.push(
            `LINHA:: ${numeroFormatado} <==> PLANO:: Não identificado <==> VALOR:: R$ --`,
          );
        }
      }
    }

    if (resultadoFinal.length > 0) {
      return resultadoFinal.join(" |||##||| ");
    }

    return observacaoRaw;
  } catch (error) {
    console.error(
      "[ERRO Formatação Observação]: Falha ao processar Regex de Planos/Linhas",
      error,
    );
    return observacaoRaw;
  }
}

const TOKEN_PIPERUN = "3dfa1682a3832478cb29a7b9a4c86233";

const apiPipeRunRest = axios.create({
  baseURL: "https://api.pipe.run/v1",
  headers: {
    accept: "application/json",
    "content-type": "application/json",
    token: TOKEN_PIPERUN,
  },
});

const URL_API_LOCAL = "http://localhost:3000";

export const API_PIPERUN = async ({
  servicos,
  tipoOperacao,
}: IPipeRunIntegrationParams & {
  tipoOperacao?: string;
}): Promise<IPipeRunIntegrationResult> => {
  let sucessos = 0;
  let falhas = 0;
  let pulados = 0;

  for (const servico of servicos) {
    console.log(
      `\n================================================================`,
    );
    console.log(
      `[PipeRun REST/Webhook] Iniciando processamento cronológico: ${servico.razao}`,
    );

    try {
      const isExclusivo = tipoOperacao === "Exclusivo";

      const cnpjLimpo = limparPontuacao(servico.cnpj);
      const cnpjFormatado = formatarCNPJ(servico.cnpj);
      const resultDecisor = extrairEFormatarTelefonesDecisor(
        servico.decisor_numero,
        servico.decisor_num_obs,
      );
      const dddDecisor = resultDecisor.dddPrincipal;
      const resultEmpresa = extrairTelefonesEmpresaDaObservacao(
        servico.observacao,
      );
      const telefonesEmpresa = resultEmpresa.telefonesFormatados;
      const dddEmpresa = resultEmpresa.dddPrincipal;
      const dddFinal =
        dddEmpresa !== "00"
          ? dddEmpresa
          : dddDecisor !== "00"
            ? dddDecisor
            : "00";

      const dddNumerico = parseInt(dddFinal, 10);
      const indicacaoCrua = servico.indicacao || "";
      const indicacaoNormalizada = indicacaoCrua
        .trim()
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      if (!isExclusivo) {
        if (isNaN(dddNumerico) || dddNumerico < 11 || dddNumerico > 19) {
          console.warn(
            `[PipeRun] 🚧 PULADO (Fora de SP ou Inválido): ${servico.razao} possui DDD ${dddFinal}. Permitido apenas 11 ao 19.`,
          );
          pulados++;
          continue;
        }

        if (indicacaoNormalizada === "RENOVACAO" && dddFinal === "11") {
          console.warn(
            `[PipeRun] 🚧 PULADO: ${servico.razao} possui DDD 11 e é de RENOVACAO.`,
          );
          pulados++;
          continue;
        }
      } else {
        console.log(`[PipeRun] 🎯 Fluxo Exclusivo Ativo: Ignorando validações restritivas de DDD para ${servico.razao}`);
      }

      const dataFimFormatada = formatarDataBR(servico.dt_fim_contrato);
      const dataInicioFormatada = obterDataInicioContrato(
        servico.dt_fim_contrato,
      );
      const mesesContrato = calcularMesesAteInicioContrato(dataInicioFormatada);

      let companyId = null;

      console.log(
        `[Passo 2] 🏢 Validando Empresa: ${servico.razao} (CNPJ: ${cnpjLimpo})`,
      );

      if (cnpjLimpo) {
        let resCompany = await apiPipeRunRest.get("/companies", {
          params: { cnpj: cnpjLimpo },
        });

        if (!resCompany.data?.data?.length) {
          resCompany = await apiPipeRunRest.get("/companies", {
            params: { cnpj: cnpjFormatado },
          });
        }

        if (resCompany.data?.data && resCompany.data.data.length > 0) {
          companyId = resCompany.data.data[0].id;
          console.log(
            `[Passo 2] Empresa existente encontrada. ID: ${companyId}`,
          );
        }
      }

      const payloadCompany = {
        name: servico.razao,
        cnpj: cnpjFormatado,
        contactPhones: telefonesEmpresa,
      };

      if (companyId) {
        console.log(
          `[Passo 2] Disparando PUT para atualizar Empresa (ID: ${companyId})...`,
        );
        const { cnpj, ...payloadPutSemCnpj } = payloadCompany;
        await apiPipeRunRest.put(`/companies/${companyId}`, payloadPutSemCnpj);
      } else {
        console.log(`[Passo 2] Disparando POST para cadastrar nova Empresa...`);
        const createCompany = await apiPipeRunRest.post(
          "/companies",
          payloadCompany,
        );
        companyId = createCompany.data?.data?.id || null;
      }

      console.log(
        `[Passo 3] 🤝 Gerando payload da Oportunidade via Webhook/Hash...`,
      );

      let hashDefinido = "e015a67d-bab4-403a-a0f6-5b2cfbc35ebe";

      const isCarteira =
        servico.carteira && String(servico.carteira).trim() !== "";
      const isPortabilidade =
        tipoOperacao === "Portabilidade" ||
        indicacaoNormalizada === "PORTABILIDADE";
      const emailConsultor = servico.consultor_email
        ? String(servico.consultor_email).trim().toLowerCase()
        : "";
      const isConsultorCarolina =
        Number(servico.seq_consultor) === 8 ||
        emailConsultor === "carolina.souza@rennovatecnologia.com.br";

      if (isConsultorCarolina) {
        hashDefinido = "911c2966-27b7-4fc2-b9b2-21dc3deaa561";
      } else if (isCarteira) {
        hashDefinido = "911c2966-27b7-4fc2-b9b2-21dc3deaa561";
      } else if (isPortabilidade) {
        hashDefinido = "856cb565-72d5-499f-aa40-d2bdb54825ac";
      }

      const processarEFormatarLista = (
        principal: string | null,
        observacao: string | null,
        tipo: "telefone" | "email",
      ): string => {
        const lista: string[] = [];

        if (principal)
          lista.push(
            ...principal
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          );
        if (observacao)
          lista.push(
            ...observacao
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          );

        if (lista.length === 0) return "";

        const listaFormatada = lista.map((item) => {
          if (tipo === "email") {
            return item.toLowerCase();
          } else if (tipo === "telefone") {
            const numLimpo = item.replace(/\D/g, "");
            if (numLimpo.length === 11)
              return `(${numLimpo.slice(0, 2)}) ${numLimpo.slice(2, 7)}-${numLimpo.slice(7)}`;
            if (numLimpo.length === 10)
              return `(${numLimpo.slice(0, 2)}) ${numLimpo.slice(2, 6)}-${numLimpo.slice(6)}`;
            return item;
          }
          return item;
        });

        return listaFormatada.join(" <=> ");
      };

      const decisorNome = servico.decisor_nome ? servico.decisor_nome.trim().toUpperCase() : "";
      const decisorCpf = servico.decisor_cpf ? formatarCPF(servico.decisor_cpf.trim()) : "";
      const telefonesStr = processarEFormatarLista(servico.decisor_numero, servico.decisor_num_obs, "telefone");
      const emailsStr = processarEFormatarLista(servico.decisor_email, servico.decisor_email_observacao, "email");

      let infoDecisorStr = "";
      if (decisorNome || decisorCpf || telefonesStr || emailsStr) {
        infoDecisorStr = `NOME: ${decisorNome || "NÃO INFORMADO"} ||||| > CPF: ${decisorCpf || "NÃO INFORMADO"} < ||||| > TELEFONES: ${telefonesStr || "NÃO INFORMADO"} ||||| EMAILS: ${emailsStr || "NÃO INFORMADO"}`;
      }

      // ===================================================================
      // 3.1) BUSCA A IMAGEM EM BASE64 DA API INTERNA
      // ===================================================================
      let imagemLayoutBase64 = "";
      try {
        console.log(`[Passo 3.1] 📸 Gerando imagem da proposta em Base64 para ${servico.razao}...`);

        // CORREÇÃO: O endpoint correto na sua controller está na raiz da URL base configurada no Vite
        const responseImagem = await axios.post(`${URL_API_LOCAL}/api/servico-claro/layout/imagem-linhas`, {
          seq_empresa: servico.seq_empresa,
          razao: servico.razao,
          cnpj: cnpjFormatado
        });

        if (responseImagem.data?.status && responseImagem.data?.dados?.imagem) {
          imagemLayoutBase64 = responseImagem.data.dados.imagem;
          console.log(`[Passo 3.1] ✅ Imagem obtida com sucesso!`);
        }
      } catch (imgErr: any) {
        console.warn(`[Passo 3.1] ⚠️ Falha ao gerar imagem. Oportunidade subirá sem ela.`);
      }

      // ===================================================================
      // 3.2) MONTA O PAYLOAD DO WEBHOOK
      // ===================================================================
      let payloadWebhook;
      const custom_fields_payload: Record<string, string | null | undefined> = {
        "Inicio do Contrato": dataInicioFormatada,
        "Final do Contrato": dataFimFormatada,
        "Tempo de Contrato": String(mesesContrato),
        "DDD": dddFinal,
        "Quantidade de linhas móveis": String(servico.qtd_servico_claro),
        "DOCDRIVE": servico.servico_docdrive,
        "Observacao": formatarObservacaoPlanosLinhas(servico.observacao),
      };

      if (infoDecisorStr) {
        custom_fields_payload["Informações DECISOR (Possível decisor)"] = infoDecisorStr;
      }

      const titleCard = isExclusivo
        ? `(${dddFinal}) EXCLUSIVO CLARO >> ${servico.razao}`
        : `(${dddFinal}) ${servico.indicacao || "GERAL"} >> ${servico.razao}`;

      custom_fields_payload["Indicacao"] = isExclusivo
        ? `EXCLUSIVO CLARO: ${servico.indicacao || "N/A"}`
        : servico.indicacao;

      payloadWebhook = {
        rules: { update: true, filter_status_update: "open", status: "open" },
        leads: [
          {
            title: titleCard,
            company_id: companyId,
            company: servico.razao,
            cnpj: cnpjFormatado,
            user: emailConsultor || undefined,
            probability: 10,
            custom_fields: custom_fields_payload
          }
        ]
      };

      // ===================================================================
      // 4) DISPARA O WEBHOOK PARA CRIAR O DEAL
      // ===================================================================
      const responseWebhook = await axios.post(
        `https://app.pipe.run/webservice/integradorJson`,
        payloadWebhook,
        {
          params: { hash: hashDefinido },
          headers: { "Content-Type": "application/json" },
        },
      );
      
      // ===================================================================
      // 5) EXTRAI O DEAL ID E ANEXA A IMAGEM VIA NOTA
      // ===================================================================
      let dealIdCriado = null;
      if (responseWebhook.status === 200 || responseWebhook.data?.success) {
        console.log(`✅ Oportunidade Criada com Sucesso via Webhook! Status: ${responseWebhook.status}`);

        const respData = responseWebhook.data?.data;
        if (Array.isArray(respData) && respData.length > 0) {
          dealIdCriado = respData[0].id;
        } else if (respData?.id) {
          dealIdCriado = respData.id;
        } else if (responseWebhook.data?.id) {
          dealIdCriado = responseWebhook.data.id;
        }
      }

      if (dealIdCriado && imagemLayoutBase64) {
        try {
          console.log(`[Passo 5] 📎 Anexando imagem como nota no Deal ID: ${dealIdCriado}...`);

          // Converte Base64 para Blob nativo do navegador
          const base64DataStr = imagemLayoutBase64.includes("data:image")
            ? imagemLayoutBase64
            : `data:image/png;base64,${imagemLayoutBase64}`;

          const responseFetch = await fetch(base64DataStr);
          const blobImagem = await responseFetch.blob();

          // Prepara o formulário de Upload
          const formData = new FormData();
          formData.append("files[]", blobImagem, `proposta_${servico.seq_empresa}.png`);
          formData.append("deal_id", String(dealIdCriado));

          // Faz o upload físico da imagem
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
            console.log(`✅ Upload concluído! URL: ${urlResource}`);

            // CULPADO 1 CORRIGIDO: Formatação idêntica ao Python, usando aspas duplas escapadas (\")
            const imgHtml = `<img src="${urlResource}" alt="image" style="max-width:100%; height:auto;"/>`;

            const notePayload: any = {
              text: `<strong>Resumo de Situação Atual</strong><br><br>${imgHtml}`,
              deal_id: Number(dealIdCriado)
            };

            // CULPADO 2 CORRIGIDO: Omitimos o user_id fixo.
            // Se o PipeRun exigir explicitamente e der erro sem ele, remova as barras da linha abaixo:
            // notePayload.user_id = 73042;

            console.log(`[DEBUG] Criando nota no PipeRun. Payload:`, JSON.stringify(notePayload));

            const responseNota = await apiPipeRunRest.post("/notes", notePayload);

            if (responseNota.status === 200 || responseNota.status === 201) {
              console.log(`✅ Nota com imagem anexada com sucesso no Deal!`);
            } else {
              console.warn(`⚠️ A nota foi enviada, mas o status foi ${responseNota.status}`);
            }

          } else {
            console.warn(`⚠️ O upload retornou status HTTP ok, mas sem 'success: true'.`);
          }
        } catch (uploadErr: any) {
          console.error(`❌ Erro ao anexar a imagem como nota no Deal ${dealIdCriado}:`, uploadErr.message);
          if (uploadErr.response?.data) {
            console.error("Detalhes PipeRun:", JSON.stringify(uploadErr.response.data));
          }
        }
      } else if (!dealIdCriado && imagemLayoutBase64) {
        console.warn(`⚠️ A imagem foi gerada, mas o Webhook não retornou um 'deal_id' legível para anexar a nota.`);
      }

      console.log(`✅ Fluxo concluído com sucesso para: ${servico.razao}`);
      sucessos++;
    } catch (err) {
      falhas++;
      console.error(
        `\n[!!! ERRO NO FLUXO !!!] Falha ao processar a empresa: ${servico.razao}`,
      );

      if (axios.isAxiosError(err)) {
        console.error(
          `Status HTTP: ${err.response?.status} na Rota: ${err.config?.url}`,
        );

        const errorMessage = err.response?.data ? JSON.stringify(err.response.data).substring(0, 500) : "Sem dados";
        console.error(`Detalhes da Recusa da API:`, errorMessage);
      } else {
        console.error(
          `Erro Interno no Node/Browser:`,
          err instanceof Error ? err.message : err,
        );
      }
    }
  }

  console.log(
    `\n================================================================`,
  );
  console.log(
    `🏁 [Orquestração API REST/Webhook Finalizada] ✅ Sucessos: ${sucessos} | ❌ Falhas: ${falhas} | 🚧 Pulados: ${pulados}`,
  );

  return { sucessos, falhas, pulados } as any;
};

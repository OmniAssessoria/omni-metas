import axios from "axios";
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

/**
 * Função responsável por mapear, formatar e reestruturar a observação
 * cruzando as linhas de telefone com seus respectivos planos e valores.
 */
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

      // ===================================================================
      // REGRA: SE NÃO FOR EXCLUSIVO, APLICA TRAVAS DE DDD
      // ===================================================================
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

      console.log(
        `[Passo 1] ⏸️ PULADO TEMPORARIAMENTE: Criação de Pessoa comentada devido a erros de CPF na base.`,
      );

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

      let hashDefinido = "e015a67d-bab4-403a-a0f6-5b2cfbc35ebe"; // Padrão Renovação

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
        console.log(
          `[Regra Especial] Consultora Carolina Souza detectada. Roteando via Hash para CARTEIRA.`,
        );
        hashDefinido = "911c2966-27b7-4fc2-b9b2-21dc3deaa561";
      } else if (isCarteira) {
        console.log(
          `[Regra Especial] Cliente de Carteira detectado. Roteando via Hash para CARTEIRA.`,
        );
        hashDefinido = "911c2966-27b7-4fc2-b9b2-21dc3deaa561";
      } else if (isPortabilidade) {
        console.log(
          `[Regra Especial] Operação de Portabilidade detectada. Roteando via Hash para PORTABILIDADE.`,
        );
        hashDefinido = "856cb565-72d5-499f-aa40-d2bdb54825ac";
      } else {
        console.log(
          `[Regra Especial] Fluxo Padrão. Roteando via Hash para RENOVAÇÃO.`,
        );
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

      const decisorNome = servico.decisor_nome
        ? servico.decisor_nome.trim().toUpperCase()
        : "";
      const decisorCpf = servico.decisor_cpf
        ? formatarCPF(servico.decisor_cpf.trim())
        : "";
      const telefonesStr = processarEFormatarLista(
        servico.decisor_numero,
        servico.decisor_num_obs,
        "telefone",
      );
      const emailsStr = processarEFormatarLista(
        servico.decisor_email,
        servico.decisor_email_observacao,
        "email",
      );

      let infoDecisorStr = "";
      if (decisorNome || decisorCpf || telefonesStr || emailsStr) {
        infoDecisorStr = `NOME: ${decisorNome || "NÃO INFORMADO"} ||||| > CPF: ${decisorCpf || "NÃO INFORMADO"} < ||||| > TELEFONES: ${telefonesStr || "NÃO INFORMADO"} ||||| EMAILS: ${emailsStr || "NÃO INFORMADO"}`;
      }

      let payloadWebhook;

      // ===================================================================
      // BIFURCAÇÃO DO PAYLOAD: EXCLUSIVO x PADRÃO
      // ===================================================================
      if (isExclusivo) {
        
        const titleCard = `(${dddFinal}) EXCLUSIVO CLARO >> ${servico.razao}`;

        const custom_fields_payload: Record<string, string | null | undefined> = {
          "Inicio do Contrato": dataInicioFormatada,
          "Final do Contrato": dataFimFormatada,
          "Tempo de Contrato": String(mesesContrato),
          "DDD": dddFinal,
          "Quantidade de linhas móveis": String(servico.qtd_servico_claro),
          "DOCDRIVE": servico.servico_docdrive,
          "Observacao": formatarObservacaoPlanosLinhas(servico.observacao),
          "Indicacao": `EXCLUSIVO CLARO: ${servico.indicacao || "N/A"}`
        };

        if (infoDecisorStr) {
          custom_fields_payload["Informações DECISOR (Possível decisor)"] = infoDecisorStr;
        }

        payloadWebhook = {
          rules: {
            update: true,
            filter_status_update: "open",
            status: "open"
          },
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

      } else {
        
        const titleCard = `(${dddFinal}) ${servico.indicacao || "GERAL"} >> ${servico.razao}`;

        const custom_fields_payload: Record<string, string | null | undefined> = {
          "Inicio do Contrato": dataInicioFormatada,
          "Final do Contrato": dataFimFormatada,
          "Tempo de Contrato": String(mesesContrato),
          "DDD": dddFinal,
          "Quantidade de linhas móveis": String(servico.qtd_servico_claro),
          "DOCDRIVE": servico.servico_docdrive,
          "Observacao": formatarObservacaoPlanosLinhas(servico.observacao),
          "Indicacao": servico.indicacao,
        };

        if (infoDecisorStr) {
          custom_fields_payload["Informações DECISOR (Possível decisor)"] = infoDecisorStr;
        }

        payloadWebhook = {
          rules: {
            update: true,
            filter_status_update: "open",
            status: "open",
          },
          leads: [
            {
              title: titleCard,
              company_id: companyId,
              company: servico.razao,
              cnpj: cnpjFormatado,
              user: emailConsultor || undefined,
              probability: 10,
              custom_fields: custom_fields_payload,
            },
          ],
        };
      }

      console.log(
        `[DEBUG] Rota /integradorJson | Hash: ${hashDefinido} | Payload sendo enviado:\n`,
        JSON.stringify(payloadWebhook, null, 2),
      );

      const responseWebhook = await axios.post(
        `https://app.pipe.run/webservice/integradorJson`,
        payloadWebhook,
        {
          params: { hash: hashDefinido },
          headers: { "Content-Type": "application/json" },
        },
      );

      if (responseWebhook.status === 200 || responseWebhook.data?.success) {
        console.log(
          `✅ Oportunidade Criada com Sucesso via Webhook! Status: ${responseWebhook.status} - Hash Utilizado: ${hashDefinido}`,
        );
      }

      console.log(
        `[Passo 4] ⏸️ PULADO TEMPORARIAMENTE: Vínculo Pessoa x Oportunidade ignorado (Passo 1 inativo).`,
      );

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
        console.error(
          `Detalhes da Recusa da API:`,
          JSON.stringify(err.response?.data, null, 2),
        );
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

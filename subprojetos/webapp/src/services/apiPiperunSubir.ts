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
} from "@/utils/formataDados.util";
import { extrairEFormatarTelefonesDecisor } from "@/utils/formatarTelefonesDecisor.util";
import { extrairTelefonesEmpresaDaObservacao } from "@/utils/formatarTelefonesLinhasEmpresa.util";
import formatarObservacaoPlanosLinhas from "@/utils/formatarObservacao.util";
import { apiPipeRunRest } from "@/configs/piperunConfigs.config";
import {
  gerarEAnexarImagemPipeRun,
} from "./omniGeradorLayoutService";
import { anexarImagemDecisorPipeRun, extrairImagemDecisorDrive } from "./driveObterDecisor";

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
      const resultEmpresa = extrairTelefonesEmpresaDaObservacao(
        servico.observacao,
      );
      const dddFinal =
        resultEmpresa.dddPrincipal !== "00"
          ? resultEmpresa.dddPrincipal
          : resultDecisor.dddPrincipal !== "00"
            ? resultDecisor.dddPrincipal
            : "00";

      const dddNumerico = parseInt(dddFinal, 10);
      const indicacaoNormalizada = (servico.indicacao || "")
        .trim()
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      if (!isExclusivo) {
        if (isNaN(dddNumerico) || dddNumerico < 11 || dddNumerico > 19) {
          console.warn(
            `[PipeRun] 🚧 PULADO (Fora de SP ou Inválido): ${servico.razao} possui DDD ${dddFinal}.`,
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
        console.log(`[PipeRun] 🎯 Fluxo Exclusivo Ativo para ${servico.razao}`);
      }

      const dataFimFormatada = formatarDataBR(servico.dt_fim_contrato);
      const dataInicioFormatada = obterDataInicioContrato(
        servico.dt_fim_contrato,
      );
      const mesesContrato = calcularMesesAteInicioContrato(dataInicioFormatada);

      let companyId = null;
      console.log(
        `[Passo 1] 🏢 Validando Empresa: ${servico.razao} (CNPJ: ${cnpjLimpo})`,
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
        }
      }

      const payloadCompany = {
        name: servico.razao,
        cnpj: cnpjFormatado,
        contactPhones: resultEmpresa.telefonesFormatados,
      };

      if (companyId) {
        const { cnpj, ...payloadPutSemCnpj } = payloadCompany;
        await apiPipeRunRest.put(`/companies/${companyId}`, payloadPutSemCnpj);
      } else {
        const createCompany = await apiPipeRunRest.post(
          "/companies",
          payloadCompany,
        );
        companyId = createCompany.data?.data?.id || null;
      }

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
      const isConsultorOtavio =
        emailConsultor === "otavio@rennovatecnologia.com.br";

      if (isConsultorCarolina) {
        hashDefinido = "911c2966-27b7-4fc2-b9b2-21dc3deaa561";
      } else if (isConsultorOtavio) {
        hashDefinido = "e015a67d-bab4-403a-a0f6-5b2cfbc35ebe";
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

        return lista
          .map((item) => {
            if (tipo === "email") return item.toLowerCase();
            if (tipo === "telefone") {
              const numLimpo = item.replace(/\D/g, "");
              if (numLimpo.length === 11)
                return `(${numLimpo.slice(0, 2)}) ${numLimpo.slice(2, 7)}-${numLimpo.slice(7)}`;
              if (numLimpo.length === 10)
                return `(${numLimpo.slice(0, 2)}) ${numLimpo.slice(2, 6)}-${numLimpo.slice(6)}`;
            }
            return item;
          })
          .join(" <=> ");
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

      const custom_fields_payload: Record<string, string | null | undefined> = {
        "Inicio do Contrato": dataInicioFormatada,
        "Final do Contrato": dataFimFormatada,
        "Tempo de Contrato": String(mesesContrato),
        DDD: dddFinal,
        "Quantidade de linhas móveis": String(servico.qtd_servico_claro),
        DOCDRIVE: servico.servico_docdrive,
        Observacao: formatarObservacaoPlanosLinhas(servico.observacao),
        Indicacao: isExclusivo
          ? `EXCLUSIVO CLARO: ${servico.indicacao || "N/A"}`
          : servico.indicacao,
        Carteira: servico.carteira,
      };

      if (infoDecisorStr)
        custom_fields_payload["Informações DECISOR (Possível decisor)"] =
          infoDecisorStr;

      const titleCard = isExclusivo
        ? `(${dddFinal}) EXCLUSIVO CLARO >> ${servico.razao}`
        : `(${dddFinal}) ${servico.indicacao} >> ${servico.razao}${isCarteira ? ` >> CARTEIRA` : ""}`;

      const payloadWebhook = {
        rules: { update: true, filter_status_update: "open", status: "open" },
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

      const responseWebhook = await axios.post(
        `https://app.pipe.run/webservice/integradorJson`,
        payloadWebhook,
        {
          params: { hash: hashDefinido },
          headers: { "Content-Type": "application/json" },
        },
      );

      let dealIdCriado = null;
      if (responseWebhook.status === 200 || responseWebhook.data?.success) {
        const respData = responseWebhook.data?.data;
        if (Array.isArray(respData) && respData.length > 0)
          dealIdCriado = respData[0].id;
        else if (respData?.id) dealIdCriado = respData.id;
        else if (responseWebhook.data?.id)
          dealIdCriado = responseWebhook.data.id;
      }

      if (dealIdCriado) {
        await gerarEAnexarImagemPipeRun(
          dealIdCriado,
          servico,
          cnpjFormatado,
          "linhas",
          "📊 Resumo de Situação Atual - Linhas",
        );

        if (indicacaoNormalizada === "RENOVACAO") {
          await gerarEAnexarImagemPipeRun(
            dealIdCriado,
            servico,
            cnpjFormatado,
            "proposta",
            "📱 Proposta Comercial Multiplano",
          );
        }

        if (servico.servico_docdrive) {
          const base64Decisor = await extrairImagemDecisorDrive(
            servico.servico_docdrive,
            cnpjLimpo,
          );

          if (base64Decisor) {
            await anexarImagemDecisorPipeRun(
              dealIdCriado,
              base64Decisor,
              servico.seq_empresa,
            );
          }
        }
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
      } else {
        console.error(
          `Erro Interno:`,
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

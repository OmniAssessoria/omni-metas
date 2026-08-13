import axios from "axios";
import { calcularMesesAteInicioContrato } from "@/utils/calcular_tempo_contrato_por_meses.util";
import { obterDataInicioContrato } from "@/utils/calcular_dt_inicio_contrato.util";
import {
  formatarCNPJ,
  formatarCPF,
  formatarDataBR,
  limparPontuacao,
} from "@/utils/formataDados.util";
import { extrairEFormatarTelefonesDecisor } from "@/utils/formatarTelefonesDecisor.util";
import { extrairTelefonesEmpresaDaObservacao } from "@/utils/formatarTelefonesLinhasEmpresa.util";
import formatarObservacaoPlanosLinhas from "@/utils/formatarObservacao.util";
import {
  extrairEAnexarDecisorOmni,
  extrairEAnexarPdfDecisorOmni,
  gerarEAnexarImagemOmni,
  TOKEN_AXION,
  URL_OMNI_API,
} from "./omniGeradorLayoutService";

export const API_OMNI_SINGLE = async ({
  servicos,
  tipoOperacao,
}: {
  servicos: any[];
  tipoOperacao?: string;
}) => {
  let sucessos = 0;
  let falhas = 0;
  let pulados = 0;
  let duplicados = 0;

  for (const servico of servicos) {
    console.log(
      `\n================================================================`,
    );
    console.log(`[Omni API Single] Iniciando processamento: ${servico.razao}`);

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

      const indicacaoNormalizada = (servico.indicacao || "")
        .trim()
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      if (!isExclusivo) {
        const dddNumerico = parseInt(dddFinal, 10);
        if (isNaN(dddNumerico) || dddNumerico < 11 || dddNumerico > 19) {
          console.warn(
            `[Omni] 🚧 PULADO (Fora de SP ou Inválido): ${servico.razao} possui DDD ${dddFinal}.`,
          );
          pulados++;
          continue;
        }
        if (indicacaoNormalizada === "RENOVACAO" && dddFinal === "11") {
          console.warn(
            `[Omni] 🚧 PULADO: ${servico.razao} possui DDD 11 e é de RENOVACAO.`,
          );
          pulados++;
          continue;
        }
      } else {
        console.log(`[Omni] 🎯 Fluxo Exclusivo Ativo para ${servico.razao}`);
      }

      const dataFimFormatada = formatarDataBR(servico.dt_fim_contrato);
      const dataInicioFormatada = obterDataInicioContrato(
        servico.dt_fim_contrato,
      );
      const mesesContrato = calcularMesesAteInicioContrato(dataInicioFormatada);
      const isCarteira =
        servico.carteira && String(servico.carteira).trim() !== "";
      const emailConsultor = servico.consultor_email
        ? String(servico.consultor_email).trim().toLowerCase()
        : "";

      const decisorNome =
        servico.decisor_nome && servico.decisor_nome.trim() !== ""
          ? servico.decisor_nome.trim().toUpperCase()
          : null;
      const decisorCpf = servico.decisor_cpf
        ? formatarCPF(servico.decisor_cpf.trim())
        : "";
      const decisorEmail =
        servico.decisor_email && servico.decisor_email.trim() !== ""
          ? servico.decisor_email.trim()
          : null;

      const decisorPhonesArray: any[] = [];
      const numeroDecisorBruto =
        resultDecisor.telefonesFormatados || servico.decisor_numero;

      if (numeroDecisorBruto) {
        const numeroLimpoDecisor = String(numeroDecisorBruto).replace(
          /\D/g,
          "",
        );
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
      const linhasPhonesArray: any[] = [];
      const linhasServico = Array.isArray(servico.linhas) ? servico.linhas : [];

      if (linhasServico.length > 0) {
        linhasServico.forEach((linha: any, index: number) => {
          const numeroBrutoLinha = String(
            linha.numero_linha || linha.numero || "",
          );
          const numeroLimpoLinha = numeroBrutoLinha.replace(/\D/g, "");

          if (numeroLimpoLinha) {
            linhasPhonesArray.push({
              number: numeroLimpoLinha,
              label: linha.plano || "Linha Móvel Claro",
              isMain: index === 0,
            });
          }
        });
      }

      if (linhasPhonesArray.length === 0 && servico.observacao) {
        const matchLinhas = servico.observacao.match(
          /Linhas:\s*(.*?)(?:\|\|\|\||$)/i,
        );
        if (matchLinhas && matchLinhas[1]) {
          const pedacos = matchLinhas[1].split("::");
          pedacos.forEach((pedaco: any, idx: any) => {
            const numLimpo = pedaco.replace(/\D/g, "");
            if (numLimpo.length >= 10 && numLimpo.length <= 11) {
              linhasPhonesArray.push({
                number: numLimpo,
                label: "Linha Móvel Claro",
                isMain: idx === 0,
              });
            }
          });
        }
      }

      if (
        linhasPhonesArray.length === 0 &&
        resultEmpresa?.telefonesFormatados
      ) {
        if (Array.isArray(resultEmpresa.telefonesFormatados)) {
          resultEmpresa.telefonesFormatados.forEach(
            (item: any, idx: number) => {
              const num =
                typeof item === "object"
                  ? String(item.number).replace(/\D/g, "")
                  : String(item).replace(/\D/g, "");
              if (num) {
                linhasPhonesArray.push({
                  number: num,
                  label:
                    typeof item === "object" && item.label
                      ? item.label
                      : "Linha Móvel Claro",
                  isMain: idx === 0,
                });
              }
            },
          );
        } else {
          const num = String(resultEmpresa.telefonesFormatados).replace(
            /\D/g,
            "",
          );
          if (num) {
            linhasPhonesArray.push({
              number: num,
              label: "Linha Móvel Claro",
              isMain: true,
            });
          }
        }
      }

      let infoDecisorStr = "";
      if (temDecisor) {
        const telefonesFormatadosString =
          decisorPhonesArray.length > 0
            ? decisorPhonesArray.map((p) => p.number).join(", ")
            : "NÃO INFORMADO";

        infoDecisorStr = `NOME: ${decisorNome || "NÃO INFORMADO"} ||||| > CPF: ${decisorCpf || "NÃO INFORMADO"} < ||||| > TELEFONES: ${telefonesFormatadosString} ||||| EMAILS: ${decisorEmail || "NÃO INFORMADO"} |||| Número Válido Whatsapp: ${servico.decisor_numero_valido_meta || "NÃO INFORMADO"}`;
      }

      const titleCard = isExclusivo
        ? `(${dddFinal}) DDD 11 >> ${servico.razao}`
        : `(${dddFinal}) ${servico.indicacao} >> ${servico.razao}${isCarteira ? ` >> CARTEIRA` : ""}`;

      const rawCustomFieldsObj = {
        "Título do Negócio": titleCard,
        Origem: "Claro Sistemas (CPC + EDOC)",
        "Inicio do Contrato": dataInicioFormatada ?? "N/A",
        "Final do Contrato": dataFimFormatada ?? "N/A",
        "Tempo de Contrato": String(mesesContrato) ?? "N/A",
        DDD: dddFinal ?? "N/A",
        Endereço: String(servico.endereco) ?? "N/A",
        FIXA: String(servico.fixa) ?? "N/A",
        Observacao: formatarObservacaoPlanosLinhas(servico.observacao) ?? "N/A",
        Indicacao: isExclusivo
          ? `DDD 11: ${servico.indicacao}`
          : servico.indicacao,
        Carteira: servico.carteira ?? "N/A",
        "Informações DECISOR (Possível decisor)": infoDecisorStr ?? "N/A",
        "Google Fontes Nome Fantasia":
          servico.decisor_google_fontes_nomes_fantasia ?? "N/A",
        "Google Fontes Telefones":
          servico.decisor_google_fontes_telefones ?? "N/A",
        "Google Fontes Emails": servico.decisor_google_fontes_emails ?? "N/A",
        "Google Fontes Sites da Empresa":
          servico.decisor_google_fontes_emails ?? "N/A",
      };

      const contactsPayload: any[] = [];

      if (linhasPhonesArray.length > 0) {
        contactsPayload.push({
          name: "Linhas da Empresa",
          roleHint: "Linhas móveis Claro",
          isPrimary: true,
          isDecisionMaker: false,
          phones: linhasPhonesArray,
        });
      }

      const pipelineDefinido = "manual_a0c1018c-10e2-4088-b4db-074acbcc1eed";
      const stageDefinido = "manual_12342f70-1730-43eb-8ee8-ea9cf8674637";
      
      console.log(
        `[Passo Pré-Voo] 🔎 Verificando se o CNPJ ${cnpjLimpo} já existe no CRM...`,
      );
      try {
        const checkResponse = await axios.get(`${URL_OMNI_API}/deals`, {
          params: {
            pipelineId: pipelineDefinido,
            status: "all",
            q: cnpjLimpo,
          },
          headers: {
            Authorization: `Bearer ${TOKEN_AXION}`,
            "Content-Type": "application/json",
          },
        });

        const dealsEncontrados = checkResponse.data?.data || [];

        const leadJaExiste = dealsEncontrados.some((d: any) => {
          const docCrm = String(d.companyCnpj || "").replace(/\D/g, "");
          return docCrm === cnpjLimpo;
        });

        if (leadJaExiste) {
          console.warn(
            `[Omni] 🛡️ BLOQUEADO: O CNPJ ${cnpjFormatado} já está no pipeline do CRM!`,
          );
        
          duplicados++;
          continue;
        }
      } catch (checkError: any) {
        console.error(
          `[Omni] ⚠️ Falha na checagem de duplicidade. Tentando criar mesmo assim...`,
          checkError.message,
        );
      }

      const payloadSingleCreation = {
        companyName: servico.razao,
        companyCnpj: cnpjFormatado,
        value: 0,
        pipelineId: pipelineDefinido,
        stageId: stageDefinido,
        user: emailConsultor !== "" ? emailConsultor : undefined,
        customFields: JSON.stringify(rawCustomFieldsObj),
        contacts: contactsPayload,
      };

      console.log(
        `[Passo 1] 🚀 Criando Negócio na API Omni (Pipeline Local, Etapa: Entrada)...`,
      );

      const responseCreation = await axios.post(
        `${URL_OMNI_API}/deals`,
        payloadSingleCreation,
        {
          headers: {
            Authorization: `Bearer ${TOKEN_AXION}`,
            "Content-Type": "application/json",
          },
        },
      );

      const dealIdCriado = responseCreation.data?.data?.id;

      if (dealIdCriado) {
        console.log(
          `[Passo 2] ✅ Negócio criado (ID: ${dealIdCriado}). Iniciando anexos de arquivos Omni...`,
        );

        await gerarEAnexarImagemOmni(
          dealIdCriado,
          servico,
          cnpjFormatado,
          "linhas",
        );

        if (indicacaoNormalizada === "RENOVACAO") {
          await gerarEAnexarImagemOmni(
            dealIdCriado,
            servico,
            cnpjFormatado,
            "proposta",
          );
        }

        const isCenarioPortabilidade =
          indicacaoNormalizada === "PORTABILIDADE" ||
          indicacaoNormalizada === "PRAZO EXCEDIDO" ||
          indicacaoNormalizada === "PRAZO LIMITADO";

        if (isCenarioPortabilidade) {
          await gerarEAnexarImagemOmni(
            dealIdCriado,
            servico,
            cnpjFormatado,
            "portabilidade",
          );
        }

        if (servico.servico_docdrive) {
          console.log(
            `[Orquestrador] Processando arquivos locais do Decisor para o Deal ${dealIdCriado}...`,
          );

          await Promise.allSettled([
            extrairEAnexarDecisorOmni(
              dealIdCriado,
              servico.servico_docdrive,
              cnpjLimpo,
              servico.seq_empresa,
            ),
            extrairEAnexarPdfDecisorOmni(
              dealIdCriado,
              servico.servico_docdrive,
              cnpjLimpo,
            ),
          ]);
        }

        sucessos++;
      } else {
        throw new Error(
          "API Omni retornou sucesso, mas não devolveu o ID estrutural do Deal.",
        );
      }
    } catch (err: any) {
      falhas++;
      console.error(
        `\n[!!! ERRO NO FLUXO !!!] Falha ao processar a empresa: ${servico.razao}`,
      );
      if (axios.isAxiosError(err)) {
        console.error(
          `Status HTTP: ${err.response?.status} | Rota: ${err.config?.url}`,
        );
        console.error(
          `Detalhes da Rejeição:`,
          JSON.stringify(err.response?.data, null, 2),
        );
      } else {
        console.error(`Erro Interno:`, err.message);
      }
    }
  }

  console.log(
    `\n================================================================`,
  );
  console.log(
    `🏁 [Orquestração Single API Finalizada] ✅ Sucessos: ${sucessos} | ❌ Falhas: ${falhas} | 🚧 Pulados: ${pulados} | 🛡️ Duplicados: ${duplicados}`,
  );

  return { sucessos, falhas, pulados, duplicados } as any;
};

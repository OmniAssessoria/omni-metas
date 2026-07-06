import axios from "axios";
import { calcularMesesAteInicioContrato } from "@/utils/calcular_tempo_contrato_por_meses.util";
import { obterDataInicioContrato } from "@/utils/calcular_dt_inicio_contrato.util";
import { formatarCNPJ, formatarCPF, formatarDataBR, limparPontuacao } from "@/utils/formataDados.util";
import { extrairEFormatarTelefonesDecisor } from "@/utils/formatarTelefonesDecisor.util";
import { extrairTelefonesEmpresaDaObservacao } from "@/utils/formatarTelefonesLinhasEmpresa.util";
import formatarObservacaoPlanosLinhas from "@/utils/formatarObservacao.util";
import { extrairEAnexarDecisorOmni, gerarEAnexarImagemOmni, TOKEN_AXION, URL_OMNI_API } from "./apiOmniIntegracao";


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

  for (const servico of servicos) {
    console.log(`\n================================================================`);
    console.log(`[Omni API Single] Iniciando processamento: ${servico.razao}`);

    try {
      const isExclusivo = tipoOperacao === "Exclusivo";
      const cnpjLimpo = limparPontuacao(servico.cnpj);
      const cnpjFormatado = formatarCNPJ(servico.cnpj);

      const resultDecisor = extrairEFormatarTelefonesDecisor(servico.decisor_numero, servico.decisor_num_obs);
      const resultEmpresa = extrairTelefonesEmpresaDaObservacao(servico.observacao);
      
      const dddFinal = resultEmpresa.dddPrincipal !== "00" ? resultEmpresa.dddPrincipal
        : resultDecisor.dddPrincipal !== "00" ? resultDecisor.dddPrincipal : "00";

      const indicacaoNormalizada = (servico.indicacao || "").trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      if (!isExclusivo) {
        const dddNumerico = parseInt(dddFinal, 10);
        if (isNaN(dddNumerico) || dddNumerico < 11 || dddNumerico > 19) {
          console.warn(`[Omni] 🚧 PULADO (Fora de SP ou Inválido): ${servico.razao} possui DDD ${dddFinal}.`);
          pulados++;
          continue;
        }
        if (indicacaoNormalizada === "RENOVACAO" && dddFinal === "11") {
          console.warn(`[Omni] 🚧 PULADO: ${servico.razao} possui DDD 11 e é de RENOVACAO.`);
          pulados++;
          continue;
        }
      } else {
        console.log(`[Omni] 🎯 Fluxo Exclusivo Ativo para ${servico.razao}`);
      }

      const dataFimFormatada = formatarDataBR(servico.dt_fim_contrato);
      const dataInicioFormatada = obterDataInicioContrato(servico.dt_fim_contrato);
      const mesesContrato = calcularMesesAteInicioContrato(dataInicioFormatada);
      const isCarteira = servico.carteira && String(servico.carteira).trim() !== "";
      const emailConsultor = servico.consultor_email ? String(servico.consultor_email).trim().toLowerCase() : "";

      const phonesArray = [];
      if (resultDecisor.telefonesFormatados) {
        phonesArray.push({ number: resultDecisor.telefonesFormatados, label: "celular principal", isMain: true });
      } else if (servico.decisor_numero) {
        phonesArray.push({ number: servico.decisor_numero, label: "celular", isMain: true });
      }

      const decisorNome = servico.decisor_nome ? servico.decisor_nome.trim().toUpperCase() : "";
      const decisorCpf = servico.decisor_cpf ? formatarCPF(servico.decisor_cpf.trim()) : "";
      
      let infoDecisorStr = "";
      if (decisorNome || decisorCpf || phonesArray.length > 0) {
        infoDecisorStr = `NOME: ${decisorNome || "NÃO INFORMADO"} ||||| > CPF: ${decisorCpf || "NÃO INFORMADO"} < ||||| > TELEFONES: ${phonesArray.map(p => p.number).join(', ') || "NÃO INFORMADO"} ||||| EMAILS: ${servico.decisor_email || "NÃO INFORMADO"}`;
      }

      const link_db = servico.servico_docdrive ? "http://10.0.0.106:8090" : "N/A";

      const titleCard = isExclusivo
        ? `(${dddFinal}) DDD 11 >> ${servico.razao}`
        : `(${dddFinal}) ${servico.indicacao} >> ${servico.razao}${isCarteira ? ` >> CARTEIRA` : ""}`;

      const rawCustomFieldsObj = {
        "Título do Negócio": titleCard, 
        "Origem": "ERP Interno",
        "Inicio do Contrato": dataInicioFormatada,
        "Final do Contrato": dataFimFormatada,
        "Tempo de Contrato": String(mesesContrato),
        "DDD": dddFinal,
        "Quantidade de linhas móveis": String(servico.qtd_servico_claro),
        "DOCDRIVE": servico.servico_docdrive || "",
        "link_docdrive": link_db,
        "Observacao": formatarObservacaoPlanosLinhas(servico.observacao),
        "Indicacao": isExclusivo ? `DDD 11: ${servico.indicacao || "N/A"}` : servico.indicacao,
        "Carteira": servico.carteira || "",
        "Informações DECISOR (Possível decisor)": infoDecisorStr
      };

      const payloadSingleCreation = {
        companyName: servico.razao,
        companyCnpj: cnpjFormatado,
        externalKey: `seq_claro_${servico.seq_claro}`,
        value: 0,
        customFields: JSON.stringify(rawCustomFieldsObj),
        contacts: decisorNome || servico.decisor_email ? [
          {
            name: decisorNome || "Contato Não Identificado",
            email: servico.decisor_email || "",
            roleHint: "Decisor",
            isDecisionMaker: true,
            phones: phonesArray
          }
        ] : []
      };

      console.log(`[Passo 1] 🚀 Criando Negócio na API Omni...`);
      const responseCreation = await axios.post(
        `${URL_OMNI_API}/deals`,
        payloadSingleCreation,
        {
          headers: {
            "Authorization": `Bearer ${TOKEN_AXION}`,
            "Content-Type": "application/json"
          }
        }
      );

      const dealIdCriado = responseCreation.data?.data?.id;

      if (dealIdCriado) {
        console.log(`[Passo 2] ✅ Negócio criado (ID: ${dealIdCriado}). Iniciando anexos...`);
        await gerarEAnexarImagemOmni(dealIdCriado, servico, cnpjFormatado, "linhas"); 

        if (indicacaoNormalizada === "RENOVACAO") {
           await gerarEAnexarImagemOmni(dealIdCriado, servico, cnpjFormatado, "proposta");
        }

        if (servico.servico_docdrive) {
          await extrairEAnexarDecisorOmni(dealIdCriado, servico.servico_docdrive, cnpjLimpo, servico.seq_empresa);
        }
        
        sucessos++;
      } else {
        throw new Error("API retornou sucesso mas não devolveu o ID do Deal.");
      }

    } catch (err: any) {
      falhas++;
      console.error(`\n[!!! ERRO NO FLUXO !!!] Falha ao processar a empresa: ${servico.razao}`);
      if (axios.isAxiosError(err)) {
        console.error(`Status HTTP: ${err.response?.status} | Rota: ${err.config?.url}`);
        console.error(`Detalhes da Rejeição:`, JSON.stringify(err.response?.data, null, 2));
      } else {
        console.error(`Erro Interno:`, err.message);
      }
    }
  }

  console.log(`\n================================================================`);
  console.log(`🏁 [Orquestração Single API Finalizada] ✅ Sucessos: ${sucessos} | ❌ Falhas: ${falhas} | 🚧 Pulados: ${pulados}`);

  return { sucessos, falhas, pulados } as any;
};

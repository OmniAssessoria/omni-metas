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
// import { extrairEmailsDecisor } from "@/utils/functionEmailsDecisor.util"; // Comentado pois o Passo 1 está pulado

const TOKEN_PIPERUN = "3dfa1682a3832478cb29a7b9a4c86233";


const apiPipeRunRest = axios.create({
  baseURL: "https://api.pipe.run/v1",
  headers: {
    "accept": "application/json",
    "content-type": "application/json",
    "token": TOKEN_PIPERUN,
  },
});

export const API_PIPERUN = async ({
  servicos,
  tipoOperacao,
}: IPipeRunIntegrationParams & { tipoOperacao?: string }): Promise<IPipeRunIntegrationResult> => {
  let sucessos = 0;
  let falhas = 0;
  let pulados = 0;

  for (const servico of servicos) {
    console.log(`\n================================================================`);
    console.log(`[PipeRun REST] Iniciando processamento cronológico: ${servico.razao}`);

    try {
      // Formatação Base de Dados
      // const cpfLimpo = limparPontuacao(servico.decisor_cpf);
      // const cpfFormatado = formatarCPF(servico.decisor_cpf);
      const cnpjLimpo = limparPontuacao(servico.cnpj);
      const cnpjFormatado = formatarCNPJ(servico.cnpj);

      const resultDecisor = extrairEFormatarTelefonesDecisor(
        servico.decisor_numero,
        servico.decisor_num_obs,
      );
      const dddDecisor = resultDecisor.dddPrincipal;

      const resultEmpresa = extrairTelefonesEmpresaDaObservacao(servico.observacao);
      const telefonesEmpresa = resultEmpresa.telefonesFormatados;
      const dddEmpresa = resultEmpresa.dddPrincipal;
      
      const dddFinal =
        dddEmpresa !== "00"
          ? dddEmpresa
          : dddDecisor !== "00"
            ? dddDecisor
            : "00";

      const dddNumerico = parseInt(dddFinal, 10);
      if (isNaN(dddNumerico) || dddNumerico < 11 || dddNumerico > 19) {
        console.warn(`[PipeRun] 🚧 PULADO (Fora de SP ou Inválido): ${servico.razao} possui DDD ${dddFinal}. Permitido apenas 11 ao 19.`);
        pulados++;
        continue;
      }

      const indicacaoCrua = servico.indicacao || "";
      const indicacaoNormalizada = indicacaoCrua
        .trim()
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      if (indicacaoNormalizada === "RENOVACAO" && dddFinal === "11") {
        console.warn(`[PipeRun] 🚧 PULADO: ${servico.razao} possui DDD 11 e é de RENOVACAO.`);
        pulados++;
        continue;
      }

      const dataFimFormatada = formatarDataBR(servico.dt_fim_contrato);
      const dataInicioFormatada = obterDataInicioContrato(servico.dt_fim_contrato);
      const mesesContrato = calcularMesesAteInicioContrato(dataInicioFormatada);

      console.log(`[Passo 1] ⏸️ PULADO TEMPORARIAMENTE: Criação de Pessoa comentada devido a erros de CPF na base.`);
      // let personId = null; 


      let companyId = null;
      console.log(`[Passo 2] 🏢 Validando Empresa: ${servico.razao} (CNPJ: ${cnpjLimpo})`);

      if (cnpjLimpo) {
        let resCompany = await apiPipeRunRest.get("/companies", { params: { cnpj: cnpjLimpo } });

        if (!resCompany.data?.data?.length) {
          resCompany = await apiPipeRunRest.get("/companies", { params: { cnpj: cnpjFormatado } });
        }

        if (resCompany.data?.data && resCompany.data.data.length > 0) {
          companyId = resCompany.data.data[0].id;
          console.log(`[Passo 2] Empresa existente encontrada. ID: ${companyId}`);
        }
      }

      const payloadCompany = {
        name: servico.razao,
        cnpj: cnpjFormatado, 
        contactPhones: telefonesEmpresa,
      };

      if (companyId) {
        console.log(`[Passo 2] Disparando PUT para atualizar Empresa (ID: ${companyId})...`);
        const { cnpj, ...payloadPutSemCnpj } = payloadCompany; 
        await apiPipeRunRest.put(`/companies/${companyId}`, payloadPutSemCnpj);
      } else {
        console.log(`[Passo 2] Disparando POST para cadastrar nova Empresa...`);
        const createCompany = await apiPipeRunRest.post("/companies", payloadCompany);
        companyId = createCompany.data?.data?.id || null;
      }

      console.log(`[Passo 3] 🤝 Gerando payload da Oportunidade via REST...`);
      const titleCard = `(${dddFinal}) ${servico.indicacao || 'GERAL'} >> ${servico.razao}`;

      let stageIdDefinido = 578431; 
      
      const isCarteira = servico.carteira && String(servico.carteira).trim() !== "";
      const isPortabilidade = tipoOperacao === "Portabilidade" || indicacaoNormalizada === "PORTABILIDADE";
      const emailConsultor = servico.consultor_email ? String(servico.consultor_email).trim().toLowerCase() : "";
      const isConsultorCarolina = Number(servico.seq_consultor) === 8 || emailConsultor === "carolina.souza@rennovatecnologia.com.br";

      if (isConsultorCarolina) {
        console.log(`[Regra Especial] Consultora Carolina Souza detectada. Roteando para etapa CARTEIRA (598026).`);
        stageIdDefinido = 598026;
      } else if (isCarteira) {
        console.log(`[Regra Especial] Cliente de Carteira detectado. Roteando para etapa CARTEIRA (598026).`);
        stageIdDefinido = 598026;
      } else if (isPortabilidade) {
        console.log(`[Regra Especial] Operação de Portabilidade detectada. Roteando para etapa PORTABILIDADE (659600).`);
        stageIdDefinido = 659600; 
      } else {
        console.log(`[Regra Especial] Fluxo Padrão. Roteando para etapa (578431).`);
      }

      const descricaoFormatada = `
**INFORMAÇÕES DO SERVIÇO (Enviado via API):**
- **Início do Contrato:** ${dataInicioFormatada}
- **Final do Contrato:** ${dataFimFormatada}
- **Tempo de Contrato:** ${mesesContrato} meses
- **Quantidade de linhas móveis:** ${servico.qtd_servico_claro || 0}
- **Obs de fechamento:** ${servico.observacao_fechamento || "N/A"}
- **Observação:** ${servico.observacao || "N/A"}
- **Carteira:** ${servico.carteira || "N/A"}
- **Indicação:** ${servico.indicacao || "N/A"}
- **Classificação:** ${servico.classificacao_contrato || "N/A"}
- **Tipo de Servico:** CLARO
- **DOC DRIVE:** ${servico.servico_docdrive || "N/A"}
- **Consultor Origem:** ${servico.consultor_email || "N/A"}
      `.trim();

      const payloadDeal = {
        title: titleCard,
        company_id: companyId,
        stage_id: stageIdDefinido, 
        description: descricaoFormatada,
        probability: 10
      };

      console.log(`[DEBUG] Rota /deals | Payload sendo enviado:\n`, JSON.stringify(payloadDeal, null, 2));

      const responseDeal = await apiPipeRunRest.post('/deals', payloadDeal);
      const dealIdCriado = responseDeal.data?.data?.id || responseDeal.data?.id;

      if (dealIdCriado) {
        console.log(`✅ Oportunidade Criada com Sucesso! Deal ID: ${dealIdCriado} na Etapa ID: ${stageIdDefinido}`);
      }

      console.log(`[Passo 4] ⏸️ PULADO TEMPORARIAMENTE: Vínculo Pessoa x Oportunidade ignorado (Passo 1 inativo).`);

      console.log(`✅ Fluxo concluído com sucesso para: ${servico.razao}`);
      sucessos++;

    } catch (err) {
      falhas++;
      console.error(`\n[!!! ERRO NO FLUXO !!!] Falha ao processar a empresa: ${servico.razao}`);

      if (axios.isAxiosError(err)) {
        console.error(`Status HTTP: ${err.response?.status} na Rota: ${err.config?.url}`);
        console.error(`Detalhes da Recusa da API:`, JSON.stringify(err.response?.data, null, 2));
        
        if (err.response?.status === 403 && err.response?.data?.message?.includes("nesta etapa")) {
          console.error(`\n💡 DICA DE OURO: O ID da etapa [${err.config?.data ? JSON.parse(err.config.data).stage_id : 'desconhecido'}] NÃO é uma etapa de entrada permitida no PipeRun. Verifique se este ID corresponde à PRIMEIRA COLUNA do funil no painel do PipeRun.`);
        }
      } else {
        console.error(`Erro Interno no Node/Browser:`, err instanceof Error ? err.message : err);
      }
    }
  }

  console.log(`\n================================================================`);
  console.log(`🏁 [Orquestração API REST Finalizada] ✅ Sucessos: ${sucessos} | ❌ Falhas: ${falhas} | 🚧 Pulados: ${pulados}`);
  
  return { sucessos, falhas, pulados } as any; 
};

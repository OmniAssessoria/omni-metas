import axios from "axios";
import MotivoDeclinioService from "../services/motivo_declinio.service.js";

/**
 * Função responsável por sincronizar os Motivos de Perda (Lost Reasons)
 * do CRM da Omni com o nosso banco de dados PostgreSQL.
 */
export default async function AtualizarBaseMotivosDecliniomniCrm() {
  const TOKEN_OMNI_CRM = "axn_-jjcxVoIlR7NgWNPsszE_0mc9LIVGTBwxgKTNqL_iSM";
  
  const apiOmniCrm = axios.create({
    baseURL: "https://omniassessoria.online/api/local/v1",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${TOKEN_OMNI_CRM}`,
    },
  });

  const motivoService = new MotivoDeclinioService();

  let sucessos = 0;
  let ignorados = 0;
  let falhas = 0;

  try {
    console.log("\n[SYNC INICIADO] Buscando Motivos de Declínio na API Omni CRM...");
    
    const response = await apiOmniCrm.get("/lost-reasons");

    if (!response.data || !response.data.ok) {
      throw new Error("A API da Omni não retornou um formato 'ok: true' válido.");
    }

    const motivosCrm = response.data.data;
    console.log(`[SYNC INFO] Extraídos ${motivosCrm.length} motivos do CRM. Iniciando processamento...`);

    for (let i = 0; i < motivosCrm.length; i++) {
      const motivo = motivosCrm[i];
      const idApi = motivo.id;
      const nomeApi = motivo.name;

      try {
        const existeNoBanco = await motivoService.buscarMotivoDeclinio(idApi);

        if (existeNoBanco) {
          ignorados++;
        } else {
          console.log(`[SYNC CRIANDO] Cadastrando novo motivo: ${nomeApi}`);
          
          await motivoService.criarMotivoDeclinio({
            motivo_declinio: nomeApi,
            situacao_atendimento: "TEMPORARIO",
            id_motivo_declinio: idApi,
          });
          
          sucessos++;
        }
      } catch (err: any) {
        console.error(`[SYNC ERRO] Falha ao processar o motivo '${nomeApi}':`, err.message);
        falhas++;
      }
    }

    console.log(`\n[SYNC CONCLUÍDO] Resumo da Sincronização de Motivos de Declínio:`);
    console.log(`🟢 Criados: ${sucessos}`);
    console.log(`⚪ Ignorados (Já existiam): ${ignorados}`);
    console.log(`🔴 Falhas: ${falhas}\n`);

    return {
      sucesso: true,
      mensagem: "Sincronização de Motivos de Declínio finalizada.",
      resumo: { criados: sucessos, ignorados: ignorados, falhas: falhas }
    };

  } catch (error: any) {
    console.error("[SYNC ERRO FATAL] O processo foi interrompido:", error.message);
    throw error;
  }
}

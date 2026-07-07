import app from "./app.js";
import "dotenv/config";
import cron from "node-cron";
import os from "os"; 
import FunctionsDatabaseRepository from "./repositories/functions_database.repository.js";
// ATUALIZADO: Importando a nova classe do CRM Omni
import CronOmniCrmSincronizar from "./crons/cron_omni_crm_sincronizar.helper.js";
import Bdr from "./crons/cron_servico_omni_sincronizar.helper.js";

function obterIpLocal() {
  const interfaces = os.networkInterfaces();
  
  for (const nomeInterface in interfaces) {
    const rede = interfaces[nomeInterface];
    if (rede) {
      for (const info of rede) {
        if (info.family === "IPv4" && !info.internal) {
          return info.address; 
        }
      }
    }
  }
  return "localhost";
}

async function Servidor() {
  const server = app.listen(3333, "0.0.0.0", () => {
    const ipRede = obterIpLocal();
    
    console.log(`\n🚀 Servidor inicializado com sucesso!`);
    console.log(`📡 Acesso Local (sua máquina): http://localhost:3333`);
    console.log(`🌐 Acesso na Rede (outras máquinas): http://${ipRede}:3333\n`);

    const omniCrmCron = new CronOmniCrmSincronizar();
    const omniBdr = new Bdr();

    // ====================================================================
    // CRON JOB 1: ROTINA DAS 19:00 - Extrair leads perdidos/ganhos Omni CRM (Serviços Atuais)
    // ====================================================================
    cron.schedule(
      "0 19 * * *",
      async () => {
        try {
          console.log("[SISTEMA] Iniciando trigger do Cron Job das 19h (Novo CRM Omni)...");
          await omniCrmCron.executarRotinaNoturnaOmniCrm();
        } catch (error) {
          console.error(
            "[SISTEMA] Erro fatal não tratado durante a execução do cron das 19h:",
            error,
          );
        }
      },
      { timezone: "America/Sao_Paulo" },
    );

    // ====================================================================
    // CRON JOB 2: ROTINA DAS 00:30 - Limpeza de CPC e Temporários Omni
    // ====================================================================
    cron.schedule(
      "30 0 * * *",
      async () => {
        try {
          console.log(`\n======================================================`);
          console.log("[CRON 00:30] Iniciando trigger do Cron Job da Madrugada...");
          
          const repoDB = new FunctionsDatabaseRepository();
          
          console.log("[CRON 00:30] Executando fn_verificar_aquecendo()...");
          await repoDB.executarValidacaoLeituraCpcForaDoPrazo();
          
          console.log("[CRON 00:30] Executando fn_validar_servico_omni_temporario()...");
          await repoDB.executarValidacaoTemporarioOmni();

          console.log("[CRON 00:30] Processo noturno de recálculo finalizado com sucesso!");
          console.log(`======================================================\n`);
        } catch (error) {
          console.error(
            "[SISTEMA] Erro fatal não tratado durante a execução do cron das 00:30:",
            error,
          );
        }
      },
      { timezone: "America/Sao_Paulo" },
    );

    // ====================================================================
    // CRON JOB 3: ROTINA DAS 2:30 - Sincronização BDR (Nova Tabela Omni)
    // ====================================================================
    cron.schedule(
      "30 02 * * *",
      async () => {
        try {
          console.log("[SISTEMA] Iniciando trigger do Cron Job das 02h30 (Omni BDR)...");
          await omniBdr.executarRotinaNoturnaPipeBdr();
        } catch (error) {
          console.error(
            "[SISTEMA] Erro fatal não tratado durante a execução do cron das 02:30:",
            error,
          );
        }
      },
      { timezone: "America/Sao_Paulo" },
    );

    console.log("✅ Cron Job ativado: Rotina CRM Omni (19:00 SP).");
    console.log("✅ Cron Job ativado: Recálculo Temporário/CPC (00:30 SP).");
    console.log("✅ Cron Job ativado: Sincronização BDR Omni (02:30 SP).");
  });

  server.setTimeout(300000);
}

Servidor();

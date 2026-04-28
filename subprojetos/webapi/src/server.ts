import app from "./app.js";
import "dotenv/config";
import cron from "node-cron";
import os from "os"; 
import FunctionsDatabaseRepository from "./repositories/functions_database.repository.js";
import Piperun from "./crons/cron_piperun_sincronizar.helper.js";

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

    const piperunCron = new Piperun();

    // ====================================================================
    // CRON JOB 1: ROTINA DAS 19:00
    // ====================================================================
    cron.schedule(
      "0 19 * * *",
      async () => {
        try {
          console.log("[SISTEMA] Iniciando trigger do Cron Job das 19h...");
          await piperunCron.executarRotinaNoturnaPipeRun();
        } catch (error) {
          console.error(
            "[SISTEMA] Erro fatal não tratado durante a execução do cron das 19h:",
            error,
          );
        }
      },
      {
        timezone: "America/Sao_Paulo",
      },
    );

    // ====================================================================
    // CRON JOB 2: ROTINA DAS 00:30 - Verificação de Aquecendo/CPC
    // ====================================================================
    cron.schedule(
      "30 0 * * *",
      async () => {
        try {
          console.log(`\n======================================================`);
          console.log("[CRON 00:30] Iniciando trigger do Cron Job da Madrugada...");
          console.log("[CRON 00:30] Disparando function de verificação de aquecimento no PostgreSQL...");

          const repoDB = new FunctionsDatabaseRepository();
          await repoDB.executarValidacaoLeituraCpcForaDoPrazo();

          console.log("[CRON 00:30] Processo noturno de recálculo finalizado com sucesso!");
          console.log(`======================================================\n`);
        } catch (error) {
          console.error(
            "[SISTEMA] Erro fatal não tratado durante a execução do cron das 00:30:",
            error,
          );
        }
      },
      {
        timezone: "America/Sao_Paulo",
      },
    );

    console.log("✅ Cron Job ativado: Rotina do PipeRun agendada para 19:00 (Horário de SP).");
    console.log("✅ Cron Job ativado: Rotina de Validação de Aquecimento agendada para 00:30 (Horário de SP).");
  });

  server.setTimeout(300000);
}

Servidor();

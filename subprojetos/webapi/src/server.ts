import app from "./app.js";
import "dotenv/config";
import cron from "node-cron";
import os from "os";
import FunctionsDatabaseRepository from "./repositories/functions_database.repository.js";
import CronServicoTelecomSincronizar from "./crons/cron_servico_telecom.cron.js";
import CronServicoOmniSincronizar from "./crons/cron_servico_omni_bdr.cron.js";
import LoggerHelper from "./helpers/logger.help.js";
import CronDisparoWhatsappSincronizar from "./crons/cron_disparo_whatsapp_sincronizar.cron.js";

const logger = new LoggerHelper("servidor_log");

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
    
    logger.info(`🚀 Servidor inicializado com sucesso!`);
    logger.info(`📡 Acesso Local (sua máquina): http://localhost:3333`);
    logger.info(`🌐 Acesso na Rede (outras máquinas): http://${ipRede}:3333`);

    const omniCrmCron = new CronServicoTelecomSincronizar();
    const omniBdrCron = new CronServicoOmniSincronizar();
    const cronDisparos = new CronDisparoWhatsappSincronizar();

    // ====================================================================
    // CRON JOB 1: ROTINA DE TESTE (19:30)
    // ====================================================================
    cron.schedule(
      "30 19 * * *",
      async () => {
        try {
          logger.info(
            "[SISTEMA] Iniciando trigger do Cron Job das 19:30 (Teste Novo CRM Omni)...",
          );
          await omniCrmCron.executarRotinaNoturnaOmniCrm();
        } catch (error) {
          logger.error(
            "[SISTEMA] Erro fatal não tratado durante a execução do cron das 19:30:",
            error,
          );
        }
      },
      { timezone: "America/Sao_Paulo" },
    );


    // ====================================================================
    // CRON JOB: ROTINA DE DISPAROS WHATSAPP (Exemplo: 20:00)
    // ====================================================================
    cron.schedule(
      "00 20 * * *",
      async () => {
        try {
          logger.info(
            "[SISTEMA] Iniciando trigger do Cron Job das 20:00 (Sincronizador Disparos WhatsApp)...",
          );
          await cronDisparos.executarRotinaNoturnaDisparos();
        } catch (error) {
          logger.error(
            "[SISTEMA] Erro fatal não tratado no cron das 20:00:",
            error,
          );
        }
      },
      { timezone: "America/Sao_Paulo" },
    );

    // ====================================================================
    // CRON JOB 2: ROTINA DAS 00:30
    // ====================================================================
    cron.schedule(
      "30 0 * * *",
      async () => {
        try {
          logger.info(
            "[CRON 00:30] Iniciando trigger do Cron Job da Madrugada...",
          );
          const repoDB = new FunctionsDatabaseRepository();

          logger.info("[CRON 00:30] Executando fn_verificar_aquecendo()...");
          await repoDB.executarValidacaoLeituraCpcForaDoPrazo();

          logger.info(
            "[CRON 00:30] Executando fn_validar_servico_omni_temporario()...",
          );
          await repoDB.executarValidacaoTemporarioClaro();

          logger.info(
            "[CRON 00:30] Processo noturno de recálculo finalizado com sucesso!",
          );
        } catch (error) {
          logger.error(
            "[SISTEMA] Erro fatal não tratado durante a execução do cron das 00:30:",
            error,
          );
        }
      },
      { timezone: "America/Sao_Paulo" },
    );

    // ====================================================================
    // CRON JOB 3: ROTINA DAS 2:30
    // ====================================================================
    cron.schedule(
      "30 02 * * *",
      async () => {
        try {
          logger.info(
            "[SISTEMA] Iniciando trigger do Cron Job das 02h30 (Omni BDR)...",
          );
          await omniBdrCron.executarRotinaNoturnaPipeBdr();
        } catch (error) {
          logger.error(
            "[SISTEMA] Erro fatal não tratado durante a execução do cron das 02:30:",
            error,
          );
        }
      },
      { timezone: "America/Sao_Paulo" },
    );

    logger.info(
      "✅ Cron Job ativado: Rotina CRM Omni (19:30 SP - MODO TESTE).",
    );
    logger.info("✅ Cron Job ativado: Recálculo Temporário/CPC (00:30 SP).");
    logger.info("✅ Cron Job ativado: Sincronização BDR Omni (02:30 SP).");
    logger.info(
      "✅ Cron Job ativado: Limpeza Temporários Omni BDR (04:30 SP).",
    );
    logger.info(
      "✅ Cron Job ativado: Sincronização Abertos Telecom/BDR (06:00 SP).",
    );
  });

  // ====================================================================
  // CRON JOB 4: ROTINA DAS 04:30
  // ====================================================================
  cron.schedule(
    "30 04 * * *",
    async () => {
      try {
        logger.info(
          "[CRON 04:30] Iniciando trigger do Cron Job da Madrugada...",
        );
        const repoDB = new FunctionsDatabaseRepository();

        logger.info(
          "[CRON 04:30] Executando fn_validar_servico_omni_temporario()...",
        );
        await repoDB.executarValidacaoTemporarioOmni();

        logger.info(
          "[CRON 04:30] Processo noturno de recálculo finalizado com sucesso!",
        );
      } catch (error) {
        logger.error(
          "[SISTEMA] Erro fatal não tratado durante a execução do cron das 04:30:",
          error,
        );
      }
    },
    { timezone: "America/Sao_Paulo" },
  );

  server.setTimeout(300000);
}

Servidor();

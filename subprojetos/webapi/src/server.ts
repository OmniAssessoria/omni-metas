import app from "./app.js";
import "dotenv/config";
import cron from "node-cron";
import Piperun from "./validators/piperun_sincronizar.helper.js";

async function Servidor() {
  app.listen(3000, () => {
    console.log("Server está rodando http://localhost:3000");
    
    const piperunCron = new Piperun();
    
    cron.schedule('0 19 * * *', async () => {
      try {
        console.log("[SISTEMA] Iniciando trigger do Cron Job das 19h...");
        await piperunCron.executarRotinaNoturnaPipeRun();
      } catch (error) {
        console.error("[SISTEMA] Erro fatal não tratado durante a execução do cron das 19h:", error);
      }
    }, {
      timezone: "America/Sao_Paulo" 
    });

    console.log("Cron Job ativado: Rotina do PipeRun agendada para 19:00 (Horário de SP).");
  });
}

Servidor();

import { useState } from "react";
import API from "@/services/api";
import { IServicoPipeRun } from "@/interfaces/servicoPipeRun.interface";
import { API_PIPERUN } from "@/services/apiPiperun";

interface UseIntegracaoProps {
  tipoOperacao: "Renovação" | "Portabilidade";
  dadosGlobais: IServicoPipeRun[];
  consultoresEnvio: number[];
  empresasEnvio?: number[];
  limiteEnvio: number | "";
  onSuccessCb: (logs?: { sucessos: any[]; falhas: any[] }) => void; 
}

export function useIntegracaoPipeRun() {
  const [isEnviando, setIsEnviando] = useState(false);

  const handleSubirServicos = async ({
    tipoOperacao,
    dadosGlobais,
    consultoresEnvio,
    empresasEnvio = [],
    limiteEnvio,
    onSuccessCb,
  }: UseIntegracaoProps) => {
    if (consultoresEnvio.length === 0 && empresasEnvio.length === 0) {
      alert("Selecione pelo menos um consultor na lista ou marque empresas específicas na tabela para envio.");
      return;
    }

    try {
      setIsEnviando(true);

      if (!Array.isArray(dadosGlobais)) {
        throw new Error(`Matriz principal de dados de ${tipoOperacao} está inválida/indisponível.`);
      }

      let servicosParaEnviar = dadosGlobais.filter((item) => {
        try {
          const pertenceAoConsultor = consultoresEnvio.includes(Number(item.seq_consultor));
          const empresaSelecionada = empresasEnvio.includes(Number(item.seq_empresa));
          return pertenceAoConsultor || empresaSelecionada;
        } catch (filterError) {
          console.error(`🚨 [Filtro] Avaliação de serviço falhou:`, item, filterError);
          return false;
        }
      });

      if (servicosParaEnviar.length === 0) {
        alert(`Os filtros aplicados não possuem serviços de ${tipoOperacao} disponíveis.`);
        setIsEnviando(false);
        return;
      }

      if (limiteEnvio && typeof limiteEnvio === "number" && limiteEnvio > 0) {
        servicosParaEnviar = servicosParaEnviar.slice(0, limiteEnvio);
      }

      console.info(`🚀 Iniciando pipeline de ${tipoOperacao} com ${servicosParaEnviar.length} payloads ativos.`);

      let sucessosLogs: any[] = [];
      let falhasLogs: any[] = [];

      for (const servico of servicosParaEnviar) {
        try {
          if (!servico || !servico.seq_claro) {
            falhasLogs.push({ payload: servico, erro: "Serviço inválido ou sem seq_claro" });
            continue;
          }

          console.info(`⏳ Transacionando ${tipoOperacao} - seq_claro: ${servico.seq_claro}`);

          const resultadoPipe = await API_PIPERUN({
            servicos: [servico],
            tipoOperacao: tipoOperacao, 
          } as any);

          if (resultadoPipe && resultadoPipe.sucessos > 0) {
            try {
              const axiosResult = await API.patch(`/api/servico-claro/piperun/${servico.seq_claro}`);
              console.info(`✅ Commit absoluto no DB (Status ${axiosResult.status}). Seq_claro: ${servico.seq_claro}`);
              
              sucessosLogs.push({
                payload: servico,
                respostaApi: `Criado no PipeRun e Atualizado DB Local (Status: ${axiosResult.status})`
              });
            } catch (patchError: any) {
              console.error(`\n🚨 FALHA AO REGISTRAR NO DB LOCAL [Seq: ${servico.seq_claro}]`);
              
              let msgErro = "Erro ao atualizar DB interno após sucesso no PipeRun.";
              if (patchError.response) {
                msgErro = `Rejeição da API Express. Status: ${patchError.response.status}`;
              } else if (patchError.request) {
                msgErro = "Requisição feita, mas sem resposta do servidor local.";
              }
              
              falhasLogs.push({ payload: servico, erro: msgErro });
            }
          } else {
            console.error(`🚨 Recusa pelo PipeRun. Serviço: ${servico.seq_claro}`, resultadoPipe);
            falhasLogs.push({ payload: servico, erro: "Recusado pelas regras do PipeRun (ex: CPF/CNPJ inválido, DDD fora de SP, etc)" });
          }
        } catch (error: any) {
          console.error(`🚨 Crash na thread do seq_claro ${servico?.seq_claro}:`, error);
          falhasLogs.push({ payload: servico, erro: error.message || "Erro estrutural inesperado" });
        }
      }

      onSuccessCb({ sucessos: sucessosLogs, falhas: falhasLogs });

    } catch (error) {
      console.error(`🚨 Exception sistêmica em ${tipoOperacao}:`, error);
      alert("Ocorreu um erro estrutural durante a execução da integração.");
      setIsEnviando(false);
      onSuccessCb();
    } finally {
      setIsEnviando(false);
    }
  };

  return { handleSubirServicos, isEnviando };
}

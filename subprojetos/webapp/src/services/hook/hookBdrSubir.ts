import { useState } from "react";
import API from "@/services/api";
import { ILeadOmniResponse } from "@/interfaces/leadOmni.interface";
import { enviarLeadOmniCrmBdr } from "../apiBdrSubir";

interface UseIntegracaoProps {
  seqConsultor: number;
  limiteEnvio: number;
  onSuccessCb: (logs?: { sucessos: any[]; falhas: any[] }) => void;
}

export function useIntegracaoPipeBdr() {
  const [isEnviando, setIsEnviando] = useState(false);

  const handleSubirServicos = async ({
    seqConsultor,
    limiteEnvio,
    onSuccessCb,
  }: UseIntegracaoProps) => {
    if (!seqConsultor || !limiteEnvio) {
      alert("Consultor e quantidade são obrigatórios.");
      return;
    }

    try {
      setIsEnviando(true);
      let sucessosLogs: any[] = [];
      let falhasLogs: any[] = [];

      const resEmpresas = await API.get(
        `/api/servico-omni/empresas-envio?seq_consultor=${seqConsultor}&limit=${limiteEnvio}`,
      );
      const listaEmpresas = resEmpresas.data?.dados || [];

      if (listaEmpresas.length === 0) {
        alert(
          "Nenhum lead disponível para este consultor com os filtros atuais.",
        );
        setIsEnviando(false);
        return;
      }

      console.info(
        `🚀 Iniciando processamento de ${listaEmpresas.length} leads.`,
      );
      
      for (const item of listaEmpresas) {
        const seqEmpresa = item.seq_empresa;
        let leadData: ILeadOmniResponse | null = null;

        try {
          const resLead = await API.get(
            `/api/servico-omni/leads/${seqEmpresa}`,
          );
          leadData = resLead.data?.dados[0];

          if (!leadData) {
            falhasLogs.push({
              payload: { cnpj: `SEQ-${seqEmpresa}` },
              erro: "Dados detalhados do lead não encontrados no banco.",
            });
            continue;
          }

          // A nova função só retorna objeto com success: true ou quebra no catch
          const omniResult = await enviarLeadOmniCrmBdr(leadData);

          if (omniResult && omniResult.success && omniResult.dealId) {
            sucessosLogs.push({ payload: leadData, dealId: omniResult.dealId });
            console.info(
              `✅ Lead ${seqEmpresa} subido e banco atualizado pelo serviço BDR.`,
            );
          }
          
        } catch (error: any) {
          console.error(
            `🚨 Falha no processamento do lead ${seqEmpresa}:`,
            error,
          );
          falhasLogs.push({
            payload: leadData ? leadData : { cnpj: `SEQ-${seqEmpresa}` },
            erro: error.message || "Erro inesperado durante integração com o CRM Omni.",
          });
        }
      }

      onSuccessCb({ sucessos: sucessosLogs, falhas: falhasLogs });
    } catch (error) {
      console.error(`🚨 Exception sistêmica no Hook:`, error);
      alert("Ocorreu um erro estrutural durante a busca das empresas.");
    } finally {
      setIsEnviando(false);
    }
  };

  return { handleSubirServicos, isEnviando };
}

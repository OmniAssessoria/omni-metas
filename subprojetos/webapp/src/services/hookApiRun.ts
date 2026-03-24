import { useState } from "react";
import API from "@/services/api";
import { IServicoPipeRun } from "@/interfaces/servicoPipeRun.interface";
import { API_PIPERUN } from "@/services/apiPiperun";

interface UseIntegracaoProps {
    tipoOperacao: "Renovação" | "Portabilidade";
    hashFunil: string;
    dadosGlobais: IServicoPipeRun[];
    consultoresEnvio: number[];
    limiteEnvio: number | "";
    onSuccessCb: () => void;
}

export function useIntegracaoPipeRun() {
    const [isEnviando, setIsEnviando] = useState(false);

    const handleSubirServicos = async ({
        tipoOperacao,
        hashFunil,
        dadosGlobais,
        consultoresEnvio,
        limiteEnvio,
        onSuccessCb
    }: UseIntegracaoProps) => {
        if (consultoresEnvio.length === 0) {
            alert("Selecione pelo menos um consultor na lista de envio.");
            return;
        }

        try {
            setIsEnviando(true);

            if (!Array.isArray(dadosGlobais)) {
                throw new Error(`Matriz principal de dados de ${tipoOperacao} está inválida/indisponível.`);
            }

            let servicosParaEnviar = dadosGlobais.filter(item => {
                try {
                    return consultoresEnvio.includes(Number(item.seq_consultor));
                } catch (filterError) {
                    console.error(`🚨 [Filtro] Avaliação de serviço falhou:`, item, filterError);
                    return false;
                }
            });

            if (servicosParaEnviar.length === 0) {
                alert(`Os consultores selecionados não possuem serviços de ${tipoOperacao} disponíveis.`);
                setIsEnviando(false);
                return;
            }

            if (limiteEnvio && typeof limiteEnvio === "number" && limiteEnvio > 0) {
                servicosParaEnviar = servicosParaEnviar.slice(0, limiteEnvio);
            }

            console.info(`🚀 Iniciando pipeline de ${tipoOperacao} com ${servicosParaEnviar.length} payloads ativos.`);

            let sucessosConfirmados = 0;
            let falhasConfirmadas = 0;

            for (const servico of servicosParaEnviar) {
                try {
                    if (!servico || !servico.seq_claro) {
                        falhasConfirmadas++;
                        continue;
                    }

                    console.info(`⏳ Transacionando ${tipoOperacao} - seq_claro: ${servico.seq_claro}`);

                    const resultadoPipe = await API_PIPERUN({
                        servicos: [servico],
                        hashFunil: hashFunil
                    });

                    if (resultadoPipe && resultadoPipe.sucessos > 0) {
                        try {
                            const axiosResult = await API.patch(`/api/servico-claro/piperun/${servico.seq_claro}`);
                            sucessosConfirmados++;
                            console.info(`✅ Commit absoluto no DB (Status ${axiosResult.status}). Seq_claro: ${servico.seq_claro}`);
                        } catch (patchError: any) {
                            falhasConfirmadas++;
                            console.error(`\n🚨 FALHA AO REGISTRAR NO DB LOCAL [Seq: ${servico.seq_claro}]`);
                            
                            if (patchError.response) {
                                console.error(`Rejeição da API Express. Status: ${patchError.response.status}`);
                                console.error(`Corpo da Resposta:`, patchError.response.data);
                            } else if (patchError.request) {
                                console.error(`Requisição feita, mas sem resposta do servidor. Possível bloqueio de CORS ou Servidor Offline.`);
                            } else {
                                console.error(`Erro estrutural no Axios:`, patchError.message);
                            }
                        }
                    } else {
                        console.error(`🚨 Recusa pelo PipeRun. Serviço: ${servico.seq_claro}`, resultadoPipe);
                        falhasConfirmadas++;
                    }
                } catch (error) {
                    console.error(`🚨 Crash na thread do seq_claro ${servico?.seq_claro}:`, error);
                    falhasConfirmadas++;
                }
            }

            alert(`Processo de ${tipoOperacao} Finalizado!\n✅ Sucessos: ${sucessosConfirmados}\n❌ Falhas: ${falhasConfirmadas}`);

        } catch (error) {
            console.error(`🚨 Exception sistêmica em ${tipoOperacao}:`, error);
            alert("Ocorreu um erro estrutural durante a execução da integração.");
        } finally {
            setIsEnviando(false);
            onSuccessCb(); 
        }
    };

    return { handleSubirServicos, isEnviando };
}
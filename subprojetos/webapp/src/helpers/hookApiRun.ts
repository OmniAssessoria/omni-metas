import { useState } from "react";
import API from "@/helpers/api";
import { IServicoPipeRun } from "@/interfaces/servicoPipeRun.interface";
import { API_PIPERUN } from "@/helpers/apiPiperun";

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

            // Chama a nova API_PIPERUN passando o lote de serviços daquele consultor
            // Note que API_PIPERUN já processa o array, então não precisamos do laço "for" aqui no front-end,
            // mas para manter a atualização unitária no DB local (o PATCH), fazemos um a um:
            
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
                            // Atualiza no banco local que o serviço subiu para o CRM
                            await API.patch(`/api/servico-claro/piperun/${servico.seq_claro}`);
                            sucessosConfirmados++;
                            console.info(`✅ Commit absoluto. Seq_claro: ${servico.seq_claro}`);
                        } catch (patchError) {
                            console.error(`🚨 Timeout ao registrar DB local: ${servico.seq_claro}`, patchError);
                            falhasConfirmadas++;
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
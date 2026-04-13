import { formatarTelefone, limparPontuacao } from "./formataDados.util";

export const extrairEFormatarTelefonesDecisor = (principal: string | null, obs: string | null) => {
    const telefonesUnicos = new Set<string>();
    const contagemDDD: Record<string, number> = {};
    let dddMaisFrequente = "00";

    const processarNumeros = (texto: string) => {
        const pedacos = texto.split(",");
        pedacos.forEach(pedaco => {
            const limpo = limparPontuacao(pedaco);
            if (limpo.length >= 10 && limpo.length <= 11) {
                const ddd = limpo.substring(0, 2);
                contagemDDD[ddd] = (contagemDDD[ddd] || 0) + 1;
                telefonesUnicos.add(formatarTelefone(limpo));
            }
        });
    };

    if (principal) processarNumeros(principal);
    if (obs) processarNumeros(obs);

    let maxCount = 0;
    for (const [ddd, count] of Object.entries(contagemDDD)) {
        if (count > maxCount) {
            maxCount = count;
            dddMaisFrequente = ddd;
        }
    }

    return {
        telefonesFormatados: Array.from(telefonesUnicos),
        dddPrincipal: dddMaisFrequente
    };
};

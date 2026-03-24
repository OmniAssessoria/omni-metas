import { formatarTelefone, limparPontuacao } from "./funtionFormataDados.util";

export const extrairTelefonesEmpresaDaObservacao = (observacao: string | null) => {
    const telefonesUnicos = new Set<string>();
    const contagemDDD: Record<string, number> = {};
    let dddMaisFrequente = "00";

    if (!observacao) {
        return { telefonesFormatados: [], dddPrincipal: dddMaisFrequente };
    }

    const matchAreaLinhas = observacao.match(/Linhas:\s*(.*?)(?:\|\|\|\||$)/);
    
    if (matchAreaLinhas && matchAreaLinhas[1]) {
        const trechoLinhas = matchAreaLinhas[1];
        
        const regexCapturaNumero = /P\[\d+\]\s*-\s*(\d+)/g;
        let match;
        
        while ((match = regexCapturaNumero.exec(trechoLinhas)) !== null) {
            const numeroLimpo = limparPontuacao(match[1]);
            
            if (numeroLimpo.length >= 10 && numeroLimpo.length <= 11) {
                const ddd = numeroLimpo.substring(0, 2);
                contagemDDD[ddd] = (contagemDDD[ddd] || 0) + 1; 
                telefonesUnicos.add(formatarTelefone(numeroLimpo));
            }
        }
    }

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

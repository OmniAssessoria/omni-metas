
export const limparPontuacao = (str: string | null | undefined): string => {
    if (!str) return "";
    return str.replace(/\D/g, "");
};

export const formatarCPF = (cpf: string | null | undefined): string => {
    const limpo = limparPontuacao(cpf);
    if (limpo.length !== 11) return limpo;
    return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
};

export const formatarCNPJ = (cnpj: string | null | undefined): string => {
    const limpo = limparPontuacao(cnpj);
    if (limpo.length !== 14) return limpo; 
    return limpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
};

export const formatarTelefone = (numeroStr: string): string => {
    const limpo = limparPontuacao(numeroStr);
    if (limpo.length < 10 || limpo.length > 11) return limpo; 
    
    const ddd = limpo.substring(0, 2);
    const resto = limpo.substring(2);
    
    if (resto.length === 9) {
        return `+55 (${ddd}) ${resto.substring(0, 5)}-${resto.substring(5)}`;
    } else {
        return `+55 (${ddd}) ${resto.substring(0, 4)}-${resto.substring(4)}`;
    }
};

export const formatarDataBR = (dataStr: string | null | undefined): string => {
    if (!dataStr) return "";
    try {
        const date = new Date(dataStr);
        if (isNaN(date.getTime())) return dataStr;
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    } catch {
        return dataStr;
    }
};

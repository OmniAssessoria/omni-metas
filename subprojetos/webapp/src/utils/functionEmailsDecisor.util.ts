export const extrairEmailsDecisor = (principal: string | null, obs: string | null): string[] => {
    const emailsUnicos = new Set<string>();
    const validarEAdicionar = (str: string) => {
        const pedacos = str.split(/[,;|\s]+/);
        pedacos.forEach(p => {
            const limpo = p.trim().toLowerCase();
            if (limpo && limpo.includes("@")) {
                emailsUnicos.add(limpo);
            }
        });
    };
    if (principal) validarEAdicionar(principal);
    if (obs) validarEAdicionar(obs);
    return Array.from(emailsUnicos);
};

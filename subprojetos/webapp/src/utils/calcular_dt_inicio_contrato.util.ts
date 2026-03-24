export const obterDataInicioContrato = (dataFimStr: string | null | undefined): string => {
    if (!dataFimStr) return "";
    try {
        let dataParaCalculo = dataFimStr;
        
        // Ajuste necessário para o JavaScript interpretar DD/MM/YYYY
        if (dataFimStr.includes("/")) {
            const partes = dataFimStr.split("/");
            dataParaCalculo = `${partes[2]}-${partes[1]}-${partes[0]}T12:00:00`;
        } else if (dataFimStr.includes("-") && dataFimStr.length === 10) {
            dataParaCalculo = `${dataFimStr}T12:00:00`;
        }

        const dataFim = new Date(dataParaCalculo);
        if (isNaN(dataFim.getTime())) return "";

        // Regra: Data Fim menos 2 anos
        dataFim.setFullYear(dataFim.getFullYear() - 2);

        const dia = dataFim.getDate().toString().padStart(2, '0');
        const mes = (dataFim.getMonth() + 1).toString().padStart(2, '0');
        const ano = dataFim.getFullYear();
        
        return `${dia}/${mes}/${ano}`;
    } catch {
        return "";
    }
};

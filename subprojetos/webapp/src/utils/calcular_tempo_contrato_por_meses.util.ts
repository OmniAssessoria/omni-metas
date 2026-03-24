export const calcularMesesAteInicioContrato = (dataInicioBR: string): string => {
    if (!dataInicioBR) return "0";
    try {
        // A data entra formatada como DD/MM/YYYY. Preparamos para o JS ler.
        const partes = dataInicioBR.split("/");
        if (partes.length !== 3) return "0";
        
        const dataInicio = new Date(`${partes[2]}-${partes[1]}-${partes[0]}T12:00:00`);
        const hoje = new Date();

        if (isNaN(dataInicio.getTime())) return "0";

        // Regra: Subtrai a data atual da data de início para encontrar os meses
        let meses = (hoje.getFullYear() - dataInicio.getFullYear()) * 12;
        meses -= dataInicio.getMonth();
        meses += hoje.getMonth();

        return meses > 0 ? meses.toString() : "0";
    } catch {
        return "0";
    }
};
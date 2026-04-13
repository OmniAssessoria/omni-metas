export default function formatarObservacaoPlanosLinhas(
  observacaoRaw: string | null | undefined,
): string {
  if (!observacaoRaw) return "";

  if (
    !observacaoRaw.includes("Planos:") ||
    !observacaoRaw.includes("Linhas:")
  ) {
    return observacaoRaw;
  }

  try {
    const sections = observacaoRaw.split(" |||| ");

    const planosSection = sections.find((s) => s.trim().startsWith("Planos:"));
    const linhasSection = sections.find((s) => s.trim().startsWith("Linhas:"));

    if (!planosSection || !linhasSection) return observacaoRaw;

    const planosMap: Record<string, { nome: string; valor: string }> = {};
    const planosStr = planosSection.replace("Planos:", "").trim();
    const planosArray = planosStr.split(" || ");

    for (const planoItem of planosArray) {
      const matchPlano = planoItem.match(
        /\((\d+)\)\s*-\s*(.*?)\s*:\s*(R\$[0-9.,]+)/,
      );
      if (matchPlano) {
        const id = matchPlano[1];
        const nomePlano = matchPlano[2].trim();
        const valorPlano = matchPlano[3].trim();
        planosMap[id] = { nome: nomePlano, valor: valorPlano };
      }
    }

    const linhasStr = linhasSection.replace("Linhas:", "").trim();
    const linhasArray = linhasStr.split(" :: ");

    const resultadoFinal: string[] = [];

    for (const linhaItem of linhasArray) {
      const matchLinha = linhaItem.match(/P\[(\d+)\]\s*-\s*(\d+)/);
      if (matchLinha) {
        const idPlano = matchLinha[1];
        const numeroPuro = matchLinha[2];

        let numeroFormatado = numeroPuro;

        if (numeroPuro.length === 11) {
          numeroFormatado = `+55 (${numeroPuro.slice(0, 2)}) ${numeroPuro.slice(2, 7)}-${numeroPuro.slice(7)}`;
        } else if (numeroPuro.length === 10) {
          numeroFormatado = `+55 (${numeroPuro.slice(0, 2)}) ${numeroPuro.slice(2, 6)}-${numeroPuro.slice(6)}`;
        }

        const dadosPlano = planosMap[idPlano];

        if (dadosPlano) {
          resultadoFinal.push(
            `LINHA:: ${numeroFormatado} <==> PLANO:: ${dadosPlano.nome} <==> VALOR:: ${dadosPlano.valor}`,
          );
        } else {
          resultadoFinal.push(
            `LINHA:: ${numeroFormatado} <==> PLANO:: Não identificado <==> VALOR:: R$ --`,
          );
        }
      }
    }

    if (resultadoFinal.length > 0) {
      return resultadoFinal.join(" |||##||| ");
    }

    return observacaoRaw;
  } catch (error) {
    console.error(
      "[ERRO Formatação Observação]: Falha ao processar Regex de Planos/Linhas",
      error,
    );
    return observacaoRaw;
  }
}

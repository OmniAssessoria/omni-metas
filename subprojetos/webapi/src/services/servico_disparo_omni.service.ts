class ServicoDisparoOmniService {
  constructor() {}
  private padronizarNumeroBrasileiro(numeroOriginal: number | string): string {
    let numStr = numeroOriginal.toString().replace(/\D/g, "");

    if (numStr.length === 10 || numStr.length === 11) {
      return `55${numStr}`;
    }

    if (numStr.length === 14 && numStr.startsWith("555")) {
      return `55${numStr.substring(3)}`;
    }

    if (
      (numStr.length === 12 || numStr.length === 13) &&
      numStr.startsWith("55")
    ) {
      return numStr;
    }

    return numStr;
  }

  async validarNumeroWhatsapp(
    numero_telefone: number,
  ): Promise<{ possui_whatsapp: boolean; numero_formatado: number }> {
    const apiKey = process.env.WAVALIDATOR_API_KEY;

    if (!apiKey) {
      throw new Error(
        "A variável de ambiente WAVALIDATOR_API_KEY não está configurada.",
      );
    }

    const numeroFormatadoStr = this.padronizarNumeroBrasileiro(numero_telefone);
    const numeroFormatadoNum = Number(numeroFormatadoStr);

    const url = "https://wavalidator.com/api/v1/validate/";

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone_number: numeroFormatadoStr }),
      });

      if (response.status === 429) {
        throw new Error(
          "Limite de requisições (Rate Limit) excedido na API WAValidator.",
        );
      }

      if (!response.ok) {
        throw new Error(
          `Erro de comunicação com WAValidator. Status HTTP: ${response.status}`,
        );
      }

      const result = await response.json();

      switch (result.status) {
        case "valid":
          return {
            possui_whatsapp: true,
            numero_formatado: numeroFormatadoNum,
          };
        case "invalid":
          return {
            possui_whatsapp: false,
            numero_formatado: numeroFormatadoNum,
          };
        case "limit":
          throw new Error(
            "Limite de créditos ou requisições excedido no WAValidator.",
          );
        default:
          throw new Error(
            `Status de validação desconhecido retornado pela API: ${result.status}`,
          );
      }
    } catch (error: any) {
      console.error(
        `[ServicoDisparoOmniService] Falha na validação do número original ${numero_telefone} (Formatado: ${numeroFormatadoStr}):`,
        error.message,
      );
      throw error;
    }
  }
}

export default ServicoDisparoOmniService;

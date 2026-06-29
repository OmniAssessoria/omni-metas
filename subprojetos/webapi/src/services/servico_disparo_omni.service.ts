class ServicoDisparoOmniService {
  constructor() {}

  async validarNumeroWhatsapp(numero_telefone: number): Promise<boolean> {
    const apiKey = process.env.WAVALIDATOR_API_KEY;

    if (!apiKey) {
      throw new Error("A variável de ambiente WAVALIDATOR_API_KEY não está configurada.");
    }

    const url = "https://wavalidator.com/api/v1/validate/";

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone_number: numero_telefone.toString() }),
      });

      if (response.status === 429) {
        throw new Error("Limite de requisições (Rate Limit) excedido na API WAValidator.");
      }

      if (!response.ok) {
        throw new Error(`Erro de comunicação com WAValidator. Status HTTP: ${response.status}`);
      }

      const result = await response.json();

      switch (result.status) {
        case "valid":
          return true;
        case "invalid":
          return false;
        case "limit":
          throw new Error("Limite de créditos ou requisições excedido no WAValidator.");
        default:
          throw new Error(`Status de validação desconhecido retornado pela API: ${result.status}`);
      }
    } catch (error: any) {
      console.error(`[ServicoDisparoOmniService] Falha na validação do número ${numero_telefone}:`, error.message);
      throw error;
    }
  }

}

export default ServicoDisparoOmniService;
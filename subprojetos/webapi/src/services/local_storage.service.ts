import axios from "axios";

class LocalStorageService {
  private readonly BASE_API_URL = "http://10.0.0.106:5000/api";

  constructor() {
    console.log("[Storage API] ✅ Serviço de cliente do Armazenamento Local instanciado.");
  }

  /**
   * Extrai e formata a subpasta alvo a partir da string bruta armazenada no banco.
   * Cobre cenários em que o banco tem a URL inteira do PDF ou apenas o diretório raiz.
   */
  private normalizarSubpasta(caminhoBanco: string, cnpjLimpo: string): string {
    if (caminhoBanco.includes("drive.google.com") || caminhoBanco.includes("folders/")) {
      return `Claro/${cnpjLimpo}`;
    }

    if (caminhoBanco.toLowerCase().endsWith(".pdf") || caminhoBanco.includes(".")) {
      const partes = caminhoBanco.split("/");
      partes.pop(); // Remove o arquivo do final
      return partes.join("/");
    }

    return caminhoBanco;
  }

  /**
   * Comunica-se com a API do servidor local, lista a pasta, acha a imagem mais 
   * recente do decisor, faz o download do binário e o converte para Base64.
   */
  async buscarImagemDecisor(caminhoBanco: string, cnpj: string): Promise<string | null> {
    const cnpjLimpo = cnpj.replace(/\D/g, "");
    const subpasta = this.normalizarSubpasta(caminhoBanco, cnpjLimpo);

    try {
      console.log(`[Storage API] 🔎 Listando arquivos na subpasta física: ${subpasta}...`);

      const resLista = await axios.get(`${this.BASE_API_URL}/listar`, {
        params: { subpasta },
        timeout: 10000
      });

      const arquivos = resLista.data.conteudo;
      if (!arquivos || arquivos.length === 0) {
        console.log(`[Storage API] ⚠️ Pasta vazia ou inexistente no servidor.`);
        return null;
      }

      const imagensValidas = arquivos.filter((item: any) => {
        if (item.tipo !== "arquivo") return false;
        
        const nomeUpper = item.nome.toUpperCase();
        return nomeUpper.includes(`DECISOR_${cnpjLimpo}`) && 
               (nomeUpper.endsWith(".PNG") || nomeUpper.endsWith(".JPG") || nomeUpper.endsWith(".JPEG"));
      });

      if (imagensValidas.length === 0) {
        console.log(`[Storage API] ⚠️ Nenhuma imagem de decisor encontrada para o CNPJ ${cnpjLimpo}.`);
        return null;
      }

      imagensValidas.sort((a: any, b: any) => {
        return new Date(b.ultima_modificacao).getTime() - new Date(a.ultima_modificacao).getTime();
      });

      const arquivoAlvo = imagensValidas[0];
      console.log(`[Storage API] 📥 Fazendo download do arquivo mais recente: ${arquivoAlvo.nome}`);

      const caminhoRelativoDownload = `${subpasta}/${arquivoAlvo.nome}`;
      
      const resArquivo = await axios.get(`${this.BASE_API_URL}/download`, {
        params: { arquivo: caminhoRelativoDownload },
        responseType: "arraybuffer", 
        timeout: 20000
      });

      const buffer = Buffer.from(resArquivo.data, "binary");
      const base64 = buffer.toString("base64");
      const ext = arquivoAlvo.nome.split(".").pop()?.toLowerCase();
      const mimeType = ext === "png" ? "image/png" : "image/jpeg";

      console.log(`[Storage API] ✅ Conversão para Base64 concluída com sucesso.`);
      return `data:${mimeType};base64,${base64}`;

    } catch (error: any) {
      if (error.response && error.response.status === 404) {
         console.warn(`[Storage API] ⚠️ A pasta ou o arquivo solicitado não existem fisicamente no servidor local (Erro 404).`);
         return null;
      }
      
      console.error(`[Storage API] ❌ Erro crítico ao consultar ou baixar arquivo do servidor local:`, error.message);
      throw new Error("Falha na comunicação com a API interna do Servidor de Arquivos (10.0.0.106).");
    }
  }
}

export default LocalStorageService;

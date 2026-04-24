import fs from "fs";
import path from "path";
import { google, drive_v3 } from "googleapis";

class GoogleDriveService {
  private driveClient: drive_v3.Drive | null = null;

  constructor() {
    this.inicializarAutenticacao();
  }

  private inicializarAutenticacao() {
    try {
      const credsPatch = path.join(
        __dirname,
        "../configs/clients_secrets.json",
      );
      const tokenPath = path.join(__dirname, "../configs/token.json");

      if (!fs.existsSync(credsPatch) || !fs.existsSync(tokenPath)) {
        console.warn(
          `[Drive API] ⚠️ Arquivos não encontrados!\nProcurando credenciais em: ${credsPatch}\nProcurando token em: ${tokenPath}`,
        );
        return;
      }

      const credenciaisRaw = fs.readFileSync(credsPatch, "utf-8");
      const credenciais = JSON.parse(credenciaisRaw);

      const { client_secret, client_id, redirect_uris } =
        credenciais.installed || credenciais.web;

      const oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0],
      );

      const tokenRaw = fs.readFileSync(tokenPath, "utf-8");
      const token = JSON.parse(tokenRaw);
      oAuth2Client.setCredentials(token);

      this.driveClient = google.drive({ version: "v3", auth: oAuth2Client });
      console.log(
        "[Drive API] ✅ Autenticação instanciada com sucesso no Node.js.",
      );
    } catch (error: any) {
      console.error(
        `[Drive API] ❌ Falha crítica ao inicializar autenticação:`,
        error.message,
      );
    }
  }

  private extrairIdDaUrl(url: string): string | null {
    if (!url || url.trim() === "") return null;
    const match = url.match(/(?:folders\/|d\/)([a-zA-Z0-9_-]+)/);
    if (match) return match[1];

    return url.replace(/\/$/, "").split("/").pop()?.split("?")[0] || null;
  }

  /**
   * Pesquisa na pasta e retorna a imagem mais recente em Base64
   */
  async buscarImagemDecisor(
    urlPasta: string,
    cnpj: string,
  ): Promise<string | null> {
    if (!this.driveClient) {
      throw new Error(
        "Cliente do Google Drive não foi inicializado corretamente.",
      );
    }

    const folderId = this.extrairIdDaUrl(urlPasta);
    if (!folderId) {
      throw new Error("URL do Drive fornecida é inválida.");
    }

    const cnpjLimpo = cnpj.replace(/\D/g, "");

    try {
      console.log(
        `[Drive API] 🔎 Buscando imagem 'DECISOR_${cnpjLimpo}' na pasta ${folderId}...`,
      );

      const resLista = await this.driveClient.files.list({
        q: `'${folderId}' in parents and name contains 'DECISOR_${cnpjLimpo}' and mimeType='image/png' and trashed=false`,
        orderBy: "createdTime desc",
        fields: "files(id, name, createdTime)",
        pageSize: 1, 
      });

      const arquivos = resLista.data.files;
      if (!arquivos || arquivos.length === 0) {
        return null;
      }

      const fileId = arquivos[0].id!;
      const fileName = arquivos[0].name;
      console.log(
        `[Drive API] 📥 Fazendo download do arquivo mais recente: ${fileName}`,
      );

      const resArquivo = await this.driveClient.files.get(
        { fileId: fileId, alt: "media" },
        { responseType: "arraybuffer" },
      );

      const base64 = Buffer.from(resArquivo.data as ArrayBuffer).toString(
        "base64",
      );

      return `data:image/png;base64,${base64}`;
    } catch (error: any) {
      console.error(
        `[Drive API] ❌ Erro ao consultar ou baixar arquivo do Drive:`,
        error.message,
      );
      throw new Error("Falha na comunicação com a API do Google Drive.");
    }
  }
}

export default GoogleDriveService;

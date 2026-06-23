import dayjs from "dayjs";
import ServicoClaroRepository from "../repositories/servico_claro.repository";
import puppeteer, { Browser, Page } from "puppeteer";
import { gerarHtmlLayoutLinhasPLano } from "../helpers/layout_linhas_planos.helper";

class GeradorImagemLinhasService {
  private repository: ServicoClaroRepository;

  constructor() {
    this.repository = new ServicoClaroRepository();
  }

  private formatarTelefone(numeroStr: string): string {
    if (!numeroStr) return "-";
    const apenasNumeros = numeroStr.replace(/\D/g, "");
    if (apenasNumeros.length === 11) {
      return apenasNumeros.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    return numeroStr;
  }

  private validarEConverterPlano10GB(linhas: any[]): any[] {
    return linhas.map((linha) => {
      const planoStr = String(linha.plano || "").toUpperCase();
      const bonusStr = String(linha.bonus || "").toUpperCase();

      const ehPlano10GB =
        planoStr.includes("10GB") || planoStr.includes("10 GB");
      const temBonus4GB =
        bonusStr.includes("4GB") ||
        bonusStr.includes("4 GB") ||
        bonusStr.trim() === "4";

      if (ehPlano10GB && temBonus4GB) {
        return {
          ...linha,
          plano: linha.plano.replace(/10\s*GB/i, "14GB"),
        };
      }

      return linha;
    });
  }

  async gerarLayoutInfoLinhas(
    seq_empresa: number,
    razao: string,
    cnpj: string,
  ) {
    const linhasDbBrutas =
      await this.repository.buscarLinhasPorSeqEmpresa(seq_empresa);

    if (!linhasDbBrutas || linhasDbBrutas.length === 0) {
      throw new Error(
        `Nenhuma linha ativa (tipo CLARO) encontrada para a empresa ${seq_empresa}`,
      );
    }

    const linhasDb = this.validarEConverterPlano10GB(linhasDbBrutas);
    let linhas_tabela = "";

    linhasDb.forEach((linha) => {
      const numeroFormatado = this.formatarTelefone(linha.numero_linha);
      const dataVencimento = linha.dt_fim_compromisso
        ? dayjs(linha.dt_fim_compromisso).format("DD/MM/YYYY")
        : "-";

      linhas_tabela += `
        <tr>
            <td>${numeroFormatado}</td>
            <td class="plan-name">${linha.plano || "-"}</td>
            <td>${dataVencimento}</td>
        </tr>`;
    });

    const data_atual = dayjs().format("DD/MM/YYYY HH:mm");

    const htmlCompleto = gerarHtmlLayoutLinhasPLano({
      razao_social: razao,
      cnpj: cnpj,
      data_atual,
      linhas_tabela,
    });

    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
      console.log(
        `[Puppeteer] Renderizando layout em memória para a empresa: ${razao}`,
      );

      browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
      });

      page = await browser.newPage();

      await page.setViewport({
        width: 1200,
        height: 1000,
        deviceScaleFactor: 2,
      });

      await page.setContent(htmlCompleto, { waitUntil: "networkidle0" });
      await page.evaluateHandle("document.fonts.ready");

      const documentHeight = await page.evaluate(() => {
        return Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight,
          document.body.offsetHeight,
        );
      });

      await page.setViewport({
        width: 1200,
        height: documentHeight + 100,
        deviceScaleFactor: 2,
      });

      const base64Screenshot = await page.screenshot({
        encoding: "base64",
        fullPage: true,
      });

      console.log(
        `[Puppeteer] Base64 gerado com sucesso! Linhas Processadas: ${linhasDb.length}`,
      );

      return {
        imagem_base64: `data:image/png;base64,${base64Screenshot}`,
        analise: {
          linhas_processadas: linhasDb.length,
        },
      };
    } catch (error: any) {
      console.error(`[Puppeteer Erro] Falha ao processar print HTML:`, error);
      throw new Error(
        `Falha no motor de renderização visual em memória: ${error.message}`,
      );
    } finally {
      if (page) {
        await page
          .close()
          .catch((e: any) => console.error("Erro ao fechar page (linhas)", e));
      }
      if (browser) {
        await browser
          .close()
          .catch((e: any) =>
            console.error("Erro ao fechar browser (linhas)", e),
          );
      }
    }
  }
}

export default GeradorImagemLinhasService;

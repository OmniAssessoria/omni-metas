import dayjs from "dayjs";
import ServicoClaroRepository from "../repositories/servico_claro.repository";
import { gerarHtmlGlassmorphism } from "../helpers/layout_imagem_linhas.helper";
import puppeteer, { Browser, Page } from "puppeteer";
import { gerarHtmlPropostaCompleta } from "../helpers/layout_imagem_proposta.helper";
import { AnalisadorPlanosHelper } from "../helpers/algoritmo_analisar_proposta_plano.helper";

class GeradorImagemLayoutService {
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

  /**
   * Função reutilizável para validar e atualizar planos de 10GB com bônus de 4GB.
   * O plano passa a ser lido como 14GB (para cálculos e exibição no nome do plano),
   */
  private validarEConverterPlano10GB(linhas: any[]): any[] {
    return linhas.map((linha) => {
      const planoStr = String(linha.plano || "").toUpperCase();
      const bonusStr = String(linha.bonus || "").toUpperCase();
      
      const ehPlano10GB = planoStr.includes("10GB") || planoStr.includes("10 GB");
      const temBonus4GB = bonusStr.includes("4GB") || bonusStr.includes("4 GB") || bonusStr.trim() === "4";

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

    let total_valor = 0;
    let linhas_tabela = "";

    linhasDb.forEach((linha) => {
      const bonusString = linha.bonus ? String(linha.bonus).trim() : "-";
      const valor = Number(linha.valor) || 0;

      const numeroFormatado = this.formatarTelefone(linha.numero_linha);
      const dataVencimento = linha.dt_fim_compromisso
        ? dayjs(linha.dt_fim_compromisso).format("DD/MM/YYYY")
        : "-";

      total_valor += valor;

      linhas_tabela += `
        <tr>
            <td>${numeroFormatado}</td>
            <td class="plan-name">${linha.plano || "-"}</td>
            <td>${dataVencimento}</td>
            <td>${bonusString}</td>
            <td class="highlight-yellow">R$ ${valor.toFixed(2)}</td>
        </tr>`;
    });

    const data_atual = dayjs().format("DD/MM/YYYY HH:mm");

    const htmlCompleto = gerarHtmlGlassmorphism({
      razao_social: razao,
      cnpj: cnpj,
      data_atual,
      linhas_tabela,
      total_valor,
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
          "--disable-gpu" 
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
          total_valor,
        },
      };
    } catch (error: any) {
      console.error(`[Puppeteer Erro] Falha ao processar print HTML:`, error);
      throw new Error(
        `Falha no motor de renderização visual em memória: ${error.message}`,
      );
    } finally {
      if (page) {
        await page.close().catch((e: any) => console.error("Erro ao fechar page (linhas)", e));
      }
      if (browser) {
        await browser.close().catch((e: any) => console.error("Erro ao fechar browser (linhas)", e));
      }
    }
  }

  async gerarLayoutImagemProposta(
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

    const analisador = new AnalisadorPlanosHelper();
    const analiseAtual = analisador.analisarPlanosCliente(linhasDb);

    const ofertaEconomica = analisador.encontrarMelhorOfertaEconomica(analiseAtual);
    const ofertaMaisGb = analisador.encontrarMelhorOfertaMaisGb(analiseAtual, ofertaEconomica);

    const dataProposta = {
      empresa: { razao_social: razao, cnpj: cnpj },
      situacao_atual: analiseAtual,
      oferta_economica: ofertaEconomica,
      oferta_mais_gb: ofertaMaisGb,
      data_geracao: dayjs().format("DD/MM/YYYY HH:mm"),
    };

    const htmlCompleto = gerarHtmlPropostaCompleta(dataProposta);

    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
      console.log(`[Puppeteer] Renderizando PROPOSTA para a empresa: ${razao}`);

      browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu" 
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

      console.log(`[Puppeteer] Base64 da Proposta gerado com sucesso!`);

      return {
        imagem_base64: `data:image/png;base64,${base64Screenshot}`,
        analise: {
          linhas_processadas: analiseAtual.total_linhas,
          valor_atual: analiseAtual.total_valor,
          valor_oferta_economica: ofertaEconomica
            ? ofertaEconomica.total_valor
            : null,
          economia_projetada_24m: ofertaEconomica
            ? (analiseAtual.total_valor - ofertaEconomica.total_valor) * 24
            : 0,
          ganho_gb_turbo: ofertaMaisGb
            ? ofertaMaisGb.total_gb_com_bonus - analiseAtual.total_gb
            : 0,
        },
      };
    } catch (error: any) {
      console.error(`[Puppeteer Erro] Falha ao renderizar proposta:`, error);
      throw new Error(
        `Falha no motor de renderização visual da proposta: ${error.message}`,
      );
    } finally {
      if (page) {
        await page.close().catch((e: any) => console.error("Erro ao fechar page (proposta)", e));
      }
      if (browser) {
        await browser.close().catch((e: any) => console.error("Erro ao fechar browser (proposta)", e));
      }
    }
  }
}

export default GeradorImagemLayoutService;

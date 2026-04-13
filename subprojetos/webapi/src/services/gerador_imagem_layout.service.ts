import ServicoClaroRepository from "../repositories/servico_claro.repository";
import { gerarHtmlGlassmorphism } from "../helpers/layout_imagem_linhas.helper";
import puppeteer from "puppeteer";
import dayjs from "dayjs"; 

class GeradorImagemLayoutService {
  private repository: ServicoClaroRepository;

  constructor() {
    this.repository = new ServicoClaroRepository();
  }

  private formatarTelefone(numeroStr: string): string {
    if (!numeroStr) return "-";
    const apenasNumeros = numeroStr.replace(/\D/g, '');
    if (apenasNumeros.length === 11) {
      return apenasNumeros.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return numeroStr; 
  }

  async gerarLayoutInfoLinhas(seq_empresa: number, razao: string, cnpj: string) {
    const linhasDb = await this.repository.buscarLinhasPorSeqEmpresa(seq_empresa);

    if (!linhasDb || linhasDb.length === 0) {
      throw new Error(`Nenhuma linha ativa (tipo CLARO) encontrada para a empresa ${seq_empresa}`);
    }

    let total_valor = 0;
    let linhas_tabela = "";

    linhasDb.forEach((linha) => {
      const bonusString = linha.bonus ? String(linha.bonus).trim() : "-";
      const valor = Number(linha.valor) || 0;
      
      const numeroFormatado = this.formatarTelefone(linha.numero_linha);
      const dataVencimento = linha.dt_fim_compromisso 
        ? dayjs(linha.dt_fim_compromisso).format('DD/MM/YYYY') 
        : '-';

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

    const data_atual = dayjs().format('DD/MM/YYYY HH:mm');

    const htmlCompleto = gerarHtmlGlassmorphism({
      razao_social: razao,
      cnpj: cnpj,
      data_atual,
      linhas_tabela,
      total_valor
    });

    try {
      console.log(`[Puppeteer] Renderizando layout em memória para a empresa: ${razao}`);
      
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox', 
          '--disable-dev-shm-usage'
        ]
      });
      
      const page = await browser.newPage();
      
      await page.setViewport({ width: 1200, height: 1000, deviceScaleFactor: 2 });
      await page.setContent(htmlCompleto, { waitUntil: 'networkidle0' });

      const bodyHandle = await page.$('body');
      const boundingBox = await bodyHandle?.boundingBox();
      const documentHeight = boundingBox ? Math.ceil(boundingBox.height) + 100 : 2000;

      await page.setViewport({ width: 1200, height: documentHeight, deviceScaleFactor: 2 });

      const base64Screenshot = await page.screenshot({ 
        encoding: 'base64', 
        fullPage: true 
      });

      await browser.close();
      console.log(`[Puppeteer] Base64 gerado com sucesso! Linhas Processadas: ${linhasDb.length}`);

      return {
        imagem_base64: `data:image/png;base64,${base64Screenshot}`,
        analise: {
            linhas_processadas: linhasDb.length,
            total_valor,
        }
      };

    } catch (error: any) {
      console.error(`[Puppeteer Erro] Falha ao processar print HTML:`, error);
      throw new Error(`Falha no motor de renderização visual em memória: ${error.message}`);
    }
  }
}

export default GeradorImagemLayoutService;

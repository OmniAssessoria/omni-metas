import * as xlsx from "xlsx";
import ImportacaoBasesRepository from "../repositories/empresa_importacao.repository";

class EmpresaImportacaoService {
  private repo: ImportacaoBasesRepository;

  constructor() {
    this.repo = new ImportacaoBasesRepository();
  }

  private formatarCNPJ(cnpj: string | number): string {
    const apenasNumeros = String(cnpj).replace(/\D/g, '').padStart(14, '0');
    return apenasNumeros.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  }

  async importarBases(bufferPlanilha: Buffer, origem: string) {
    const workbook = xlsx.read(bufferPlanilha, { type: 'buffer' });
    const nomePrimeiraAba = workbook.SheetNames[0];
    const aba = workbook.Sheets[nomePrimeiraAba];
    const linhas: any[] = xlsx.utils.sheet_to_json(aba);
    const linhasValidas = linhas.filter(linha => linha["CNPJ"] || linha["cnpj"]);
    
    if (linhasValidas.length === 0) {
        throw new Error("Nenhum CNPJ encontrado na planilha.");
    }

    const TAMANHO_LOTE = 100;

    for (let i = 0; i < linhasValidas.length; i += TAMANHO_LOTE) {
      const lote = linhasValidas.slice(i, i + TAMANHO_LOTE);
      const promessasLote = lote.map(async (linha) => {
        const cnpjCru = linha["CNPJ"] || linha["cnpj"];
        const razaoSocial = 
            linha["Razao Social"] || linha["Razão Social"] || 
            linha["razao social"] || linha["razao"] || 
            linha["razão"] || linha["Razao"];

        const cnpjFormatado = this.formatarCNPJ(cnpjCru);
        const razaoMaiuscula = String(razaoSocial || "EMPRESA SEM NOME").toUpperCase();

        try {
          const empresa = await this.repo.buscarEmpresaPorCnpj(cnpjFormatado);

          if (empresa) {
            const resetarCpc = Number(empresa.qtd_servico_claro) === 0;
            const resetarEdoc = empresa.docdrive === null || empresa.docdrive === undefined;

            await this.repo.atualizarEmpresa(
              empresa.seq_empresa, 
              origem, 
              resetarCpc, 
              resetarEdoc
            );
          } else {
            await this.repo.inserirEmpresa(cnpjFormatado, razaoMaiuscula, origem); 
          }
        } catch (error) {
          console.error(`Falha ao processar CNPJ: ${cnpjFormatado} - Erro:`, error);
        }
      });
      await Promise.all(promessasLote);
    }
  }
}

export default EmpresaImportacaoService;

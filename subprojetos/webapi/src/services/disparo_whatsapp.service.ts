import DisparoWhatsappRepository from "../repositories/disparo_whatsapp.repository.js";
import ServicoClaroRepository from "../repositories/servico_claro.repository.js";
import ConsultorRepository from "../repositories/consultor.repository.js";
import LoggerHelper from "../helpers/logger.help.js";
import AtualizarBaseMotivosDecliniomniCrm from "../helpers/atualizar_base_motivos_declinio.helper.js";
import * as xlsx from "xlsx";
import path from "path";
import fs from "fs";

export default class DisparoWhatsappService {
  private repoDisparo: DisparoWhatsappRepository;
  private repoClaro: ServicoClaroRepository;
  private repoConsultor: ConsultorRepository;
  private logger: LoggerHelper;

  constructor() {
    this.repoDisparo = new DisparoWhatsappRepository();
    this.repoClaro = new ServicoClaroRepository();
    this.repoConsultor = new ConsultorRepository();
    this.logger = new LoggerHelper("service_disparo_whatsapp");
  }

  async sincronizarDeclinioGanhoDisparo(dados: any) {
    await AtualizarBaseMotivosDecliniomniCrm();
    const seqEmpresaQuery = await this.repoClaro.buscarSeqEmpresaPorCnpj(
      dados.cnpj,
    );
    if (!seqEmpresaQuery || seqEmpresaQuery.length === 0) {
      return {
        ignorado: true,
        motivo: `Empresa com CNPJ ${dados.cnpj} não existe no banco.`,
      };
    }
    const seq_empresa = seqEmpresaQuery[0].seq_empresa;

    const consultor = await this.repoConsultor.buscarSeqConsultorPorEmail(
      dados.email_consultor,
    );
    if (!consultor || !consultor.seq_consultor) {
      return {
        ignorado: true,
        motivo: `Consultor com e-mail ${dados.email_consultor} não encontrado.`,
      };
    }
    const seq_consultor = consultor.seq_consultor;

    const isGanho = dados.is_ganho === true;
    const situacao_crm = isGanho ? "GANHO" : "PERDIDO";
    let situacaoAtendimento = isGanho ? "GANHO" : "TEMPORARIO";
    let seqMotivoDeclinioNumerico = isGanho ? 1 : 2;

    if (
      !isGanho &&
      dados.id_motivo_declinio &&
      String(dados.id_motivo_declinio) !== "1"
    ) {
      const motivoMapeado = await this.repoClaro.buscarMotivoDeclinioPorIdCrm(
        dados.id_motivo_declinio,
      );
      if (motivoMapeado && motivoMapeado.length > 0) {
        seqMotivoDeclinioNumerico = motivoMapeado[0].seq_motivo_declinio;
        situacaoAtendimento = motivoMapeado[0].situacao_atendimento;
      } else {
        this.logger.warn(
          `ID de declínio "${dados.id_motivo_declinio}" não mapeado, caindo para TEMPORARIO.`,
        );
        situacaoAtendimento = "TEMPORARIO";
      }
    }

    const disparoAtualizado =
      await this.repoDisparo.atualizarSituacaoCrmDisparo(
        seq_empresa,
        dados.id_lead,
        situacao_crm,
      );

    if (!disparoAtualizado) {
      return {
        ignorado: true,
        motivo: `O lead ID ${dados.id_lead} não corresponde a nenhum disparo prévio para a empresa ${seq_empresa}.`,
      };
    }

    await this.repoDisparo.atualizarServicoClaroPosDisparo(
      seq_empresa,
      dados.observacao_fechamento,
      dados.data_fim_atendimento,
      situacaoAtendimento,
      consultor.nome,
      isGanho,
    );

    await this.repoDisparo.criarHistoricoDisparo({
      seq_empresa: seq_empresa,
      seq_consultor: seq_consultor,
      tipo_servico: dados.tipo_servico,
      data_inicio_atendimento: dados.data_inicio_atendimento,
      data_fim_atendimento: dados.data_fim_atendimento,
      seq_motivo_declinio: seqMotivoDeclinioNumerico,
    });

    return { sucesso: true, situacao: situacao_crm };
  }

  async dashboardTotais() {
    const dadosBanco = await this.repoDisparo.obterTotaisDisponiveis();
    const consultores = await this.repoConsultor.buscarConsultores();

    const por_indicacao: any = {
      "FORA DO PRAZO": 0,
      RENOVACAO: 0,
      PORTABILIDADE: 0,
      "PRAZO LIMITADO": 0,
      "PRAZO EXCEDIDO": 0,
    };

    const analise_funil: any = {
      GERAL: {
        total: 0,
        sem_resposta: 0,
        falhas: 0,
        sucessos: 0,
        crm_ganho: 0,
        crm_perdido: 0,
        crm_aberto: 0,
      },
      RENOVACAO: {
        total: 0,
        sem_resposta: 0,
        falhas: 0,
        sucessos: 0,
        crm_ganho: 0,
        crm_perdido: 0,
        crm_aberto: 0,
      },
      PORTABILIDADE: {
        total: 0,
        sem_resposta: 0,
        falhas: 0,
        sucessos: 0,
        crm_ganho: 0,
        crm_perdido: 0,
        crm_aberto: 0,
      },
      "FORA DO PRAZO": {
        total: 0,
        sem_resposta: 0,
        falhas: 0,
        sucessos: 0,
        crm_ganho: 0,
        crm_perdido: 0,
        crm_aberto: 0,
      },
      "PRAZO LIMITADO": {
        total: 0,
        sem_resposta: 0,
        falhas: 0,
        sucessos: 0,
        crm_ganho: 0,
        crm_perdido: 0,
        crm_aberto: 0,
      },
      "PRAZO EXCEDIDO": {
        total: 0,
        sem_resposta: 0,
        falhas: 0,
        sucessos: 0,
        crm_ganho: 0,
        crm_perdido: 0,
        crm_aberto: 0,
      },
    };

    let total_disponiveis = 0;

    dadosBanco.disponiveis.forEach((linha: any) => {
      const ind = linha.indicacao;
      const qtd = parseInt(linha.qtd, 10);
      if (por_indicacao[ind] !== undefined) {
        por_indicacao[ind] = qtd;
      }
      total_disponiveis += qtd;
    });

    dadosBanco.funil_disparos.forEach((linha: any) => {
      const ind = linha.indicacao;
      if (analise_funil[ind]) {
        analise_funil[ind].total = parseInt(linha.total_enviado || 0);
        analise_funil[ind].sem_resposta = parseInt(linha.sem_resposta || 0);
        analise_funil[ind].falhas = parseInt(linha.falhas || 0);
        analise_funil[ind].sucessos = parseInt(linha.sucessos || 0);
        analise_funil[ind].crm_ganho = parseInt(linha.crm_ganho || 0);
        analise_funil[ind].crm_perdido = parseInt(linha.crm_perdido || 0);
        analise_funil[ind].crm_aberto = parseInt(linha.crm_aberto || 0);
        analise_funil["GERAL"].total += analise_funil[ind].total;
        analise_funil["GERAL"].sem_resposta += analise_funil[ind].sem_resposta;
        analise_funil["GERAL"].falhas += analise_funil[ind].falhas;
        analise_funil["GERAL"].sucessos += analise_funil[ind].sucessos;
        analise_funil["GERAL"].crm_ganho += analise_funil[ind].crm_ganho;
        analise_funil["GERAL"].crm_perdido += analise_funil[ind].crm_perdido;
        analise_funil["GERAL"].crm_aberto += analise_funil[ind].crm_aberto;
      }
    });

    return {
      consultores: consultores,
      totais: {
        disponiveis: total_disponiveis,
        disparados_total: analise_funil["GERAL"].total,
        por_indicacao,
        analise_funil,
      },
    };
  }

  private normalizarChaveColuna(chave: string): string {
    return chave
      .replace(/^\uFEFF/, "") // remove BOM UTF-8
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove acentos
      .trim()
      .toLowerCase();
  }

  private extrairCnpjDoNome(nome: string): string | null {
    if (!nome) return null;

    // Prioriza o conteúdo após "||", mas também aceita CNPJ em qualquer ponto da string
    const parteCnpj = nome.includes("||") ? nome.split("||").pop() || "" : nome;
    const matchFormatado = parteCnpj.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/);

    if (matchFormatado) {
      const digitos = matchFormatado[0].replace(/\D/g, "");
      return digitos.length === 14 ? digitos : null;
    }

    const somenteDigitos = parteCnpj.replace(/\D/g, "");
    if (somenteDigitos.length === 14) return somenteDigitos;

    return null;
  }

  private normalizarTelefone(telefone: string): string | null {
    if (!telefone) return null;
    let digitos = String(telefone).replace(/\D/g, "");
    if (!digitos) return null;

    if (digitos.startsWith("550")) {
      digitos = "55" + digitos.substring(3);
    } else if (digitos.startsWith("0")) {
      digitos = "55" + digitos.substring(1);
    } else if (!digitos.startsWith("55")) {
      digitos = "55" + digitos;
    }

    return digitos.length >= 12 ? digitos : null;
  }

  private parseDataTake(valor: any): Date | null {
    if (valor === null || valor === undefined) return null;
    const texto = String(valor).trim();
    if (!texto || texto === "-") return null;

    // Formato Take: "01/10/2026, 06:11:34" ou "01/10/2026 06:11:34"
    const match = texto.match(
      /^(\d{2})\/(\d{2})\/(\d{4})[,\s]+(\d{2}):(\d{2})(?::(\d{2}))?$/,
    );

    if (match) {
      const [, dia, mes, ano, hora, min, seg = "00"] = match;
      return new Date(
        Number(ano),
        Number(mes) - 1,
        Number(dia),
        Number(hora),
        Number(min),
        Number(seg),
      );
    }

    // Fallback para formato ISO caso o Excel tenha convertido
    const dataFallback = new Date(texto);
    return isNaN(dataFallback.getTime()) ? null : dataFallback;
  }

  private limparTextoTake(valor: any): string | null {
    if (valor === null || valor === undefined) return null;
    const texto = String(valor).trim();
    if (!texto || texto === "-") return null;
    return texto;
  }

  async importarRelatorioTake(buffer: Buffer, nomeArquivo: string) {
    // codepage 65001 garante leitura correta de UTF-8 (acentos em CSV)
    const workbook = xlsx.read(buffer, {
      type: "buffer",
      raw: false,
      codepage: 65001,
    });

    const primeiraAba = workbook.SheetNames[0];
    if (!primeiraAba) {
      throw new Error("O arquivo enviado não possui abas válidas.");
    }

    const linhasBrutas: Record<string, any>[] = xlsx.utils.sheet_to_json(
      workbook.Sheets[primeiraAba],
      { defval: "", raw: false },
    );

    if (linhasBrutas.length === 0) {
      throw new Error("A planilha da Take está vazia.");
    }

    const registrosTratados: any[] = [];
    const errosParsing: Array<{ linha: number; motivo: string }> = [];

    linhasBrutas.forEach((linhaObj, idx) => {
      const normalizado: Record<string, any> = {};
      for (const [k, v] of Object.entries(linhaObj)) {
        normalizado[this.normalizarChaveColuna(k)] = v;
      }

      const idTake = this.limparTextoTake(normalizado["id"]);
      const nome = String(normalizado["nome"] || "");
      const telefoneRaw = String(normalizado["telefone"] || "");
      const statusRaw = this.limparTextoTake(normalizado["status"]);

      const cnpj = this.extrairCnpjDoNome(nome);
      const numero = this.normalizarTelefone(telefoneRaw);

      if (!cnpj || !numero) {
        errosParsing.push({
          linha: idx + 2,
          motivo: !cnpj
            ? `CNPJ não identificado na coluna Nome ("${nome}")`
            : `Telefone inválido ("${telefoneRaw}")`,
        });
        return;
      }

      const dtRespondido = this.parseDataTake(normalizado["respondido em"]);
      let statusTake = (statusRaw || "DESCONHECIDO").toUpperCase();

      // Se houve data de resposta, garante status RESPONDIDO mesmo que a coluna Status diga Entregue/Lido
      if (dtRespondido && statusTake !== "RESPONDIDO") {
        statusTake = "RESPONDIDO";
      }

      registrosTratados.push({
        linha: idx + 2,
        id_disparo_take: idTake,
        cnpj,
        numero,
        status_take: statusTake,
        motivo_falha_take: this.limparTextoTake(normalizado["motivo falha"]),
        dt_criado_take: this.parseDataTake(normalizado["criado em"]),
        dt_concluido_take: this.parseDataTake(normalizado["concluido em"]),
        dt_entregue_take: this.parseDataTake(normalizado["entregue em"]),
        dt_lido_take: this.parseDataTake(normalizado["lido em"]),
        dt_respondido_take: dtRespondido,
      });
    });

    const resultadoDb =
      await this.repoDisparo.atualizarEmLotePorRelatorioTake(registrosTratados);

    this.logger.info(
      `Importação Take (${nomeArquivo}) finalizada: ${resultadoDb.atualizados} atualizados, ${resultadoDb.nao_encontrados.length} não encontrados.`,
    );

    return {
      arquivo: nomeArquivo,
      total_linhas_planilha: linhasBrutas.length,
      linhas_validas: registrosTratados.length,
      erros_parsing: errosParsing.length,
      ...resultadoDb,
      detalhes_erros_parsing: errosParsing.slice(0, 50),
    };
  }

  async separarEGerarPlanilha(
    limit: number,
    indicacao: string,
    seq_consultor: number,
  ) {
    const leadsTratados = await this.repoDisparo.gerarLeadsDisparo(
      limit,
      indicacao,
      seq_consultor,
    );

    if (!leadsTratados || leadsTratados.length === 0) {
      return null;
    }

    const meses = [
      "JANEIRO",
      "FEVEREIRO",
      "MARCO",
      "ABRIL",
      "MAIO",
      "JUNHO",
      "JULHO",
      "AGOSTO",
      "SETEMBRO",
      "OUTUBRO",
      "NOVEMBRO",
      "DEZEMBRO",
    ];

    const dataAtual = new Date();
    const nomeArquivo = `${indicacao}_${dataAtual.getDate()}_${meses[dataAtual.getMonth()]}_${dataAtual.getFullYear()}.xlsx`;
    const folderPath = path.join(process.cwd(), "public", "downloads");
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    const caminhoCompleto = path.join(folderPath, nomeArquivo);

    const dadosFormatados = leadsTratados.map((lead) => ({
      nome: String(lead.nome),
      numero: String(lead.numero),
      razao_social: String(lead.razao_social),
      cnpj: String(lead.cnpj),
    }));

    const worksheet = xlsx.utils.json_to_sheet(dadosFormatados);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Disparos");

    xlsx.writeFile(workbook, caminhoCompleto);

    return {
      arquivo: nomeArquivo,
      qtd_gerada: leadsTratados.length,
    };
  }
}

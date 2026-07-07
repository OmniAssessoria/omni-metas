import { INovoHistoricoEmpresaConsultor } from "../interfaces/novo_historico_empresa_consultor.interface.js";
import pool from "../module/postgresdb/conexao.js";

export default class ServicoClaroRepository {
  async buscarDashboardEmpresasInfo() {
    const query = `SELECT * FROM omni.vw_dash_funil_cpc;`;
    try {
      const result = await pool.query(query);
      return result.rows[0];
    } catch (error) {
      console.error(
        "[ServicoClaroRepository] Erro ao buscar Dashboard Funil CPC (vw_dash_funil_cpc):",
        error,
      );
      throw error;
    }
  }

  async buscarDashboardEmpresasCarteira() {
    const query = `SELECT * FROM omni.vw_empresas_carteira;`;
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error(
        "[ServicoClaroRepository] Erro ao buscar dados da view (vw_empresas_carteira):",
        error,
      );
      throw error;
    }
  }

  async buscarMotivoDeclinioPorNome(motivo_str: string) {
    const query = `
      SELECT seq_motivo_declinio, situacao_atendimento 
      FROM omni.motivo_declinio 
      WHERE motivo_declinio ILIKE $1;
    `;
    try {
      const result = await pool.query(query, [motivo_str]);
      return result.rows;
    } catch (error) {
      console.error(
        "[ServicoClaroRepository] Erro ao buscar motivo de declinio por nome:",
        error,
      );
      throw error;
    }
  }

  async buscarMotivoDeclinioPorIdCrm(id_motivo_str: string) {
    const query = `
        SELECT seq_motivo_declinio, situacao_atendimento 
        FROM omni.motivo_declinio 
        WHERE id_motivo_declinio = $1;
      `;
    try {
      const result = await pool.query(query, [id_motivo_str]);
      return result.rows;
    } catch (error) {
      console.error(
        "[ServicoClaroRepository] Erro ao buscar motivo de declinio por id_motivo_declinio:",
        error,
      );
      throw error;
    }
  }

  async buscarSeqEmpresaPorCnpj(cnpj: string) {
    const query = `SELECT seq_empresa FROM omni.empresa WHERE cnpj = $1;`;
    try {
      const result = await pool.query(query, [cnpj]);
      return result.rows;
    } catch (error) {
      console.error(
        "[ServicoClaroRepository] Erro ao buscar seq_empresa por CNPJ:",
        error,
      );
      throw error;
    }
  }

  async buscarSeqServicoPorSeqEmpresa(seq_empresa: number) {
    const query = `SELECT seq_claro FROM omni.servico_claro WHERE seq_empresa = $1;`;
    try {
      const result = await pool.query(query, [seq_empresa]);
      return result.rows;
    } catch (error) {
      console.error(
        "[ServicoClaroRepository] Erro ao buscar seq_servico por seq_empresa:",
        error,
      );
      throw error;
    }
  }

  async buscarTodosMotivosDeclinio() {
    const query = `
      SELECT seq_motivo_declinio, motivo_declinio, situacao_atendimento 
        FROM omni.motivo_declinio 
        WHERE situacao_atendimento != 'INATIVO';
    `;
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error(
        "[ServicoClaroRepository] Erro ao buscar motivos de declínio:",
        error,
      );
      throw error;
    }
  }

  async verificarHistoricoEmpresaConsultorExiste(
    seq_empresa: number,
    seq_consultor: number,
  ) {
    const query = `
            SELECT COUNT(*) AS total 
            FROM omni.historico_empresa_consultor 
            WHERE seq_empresa = $1 AND seq_consultor = $2;
        `;
    try {
      const result = await pool.query(query, [seq_empresa, seq_consultor]);
      return result.rows;
    } catch (error) {
      console.error(
        "[ServicoClaroRepository] Erro ao buscar historico_empresa_consultor:",
        error,
      );
      throw error;
    }
  }

  async criarHistoricoEmpresaConsultor(dados: INovoHistoricoEmpresaConsultor) {
    const query = `
            INSERT INTO omni.historico_empresa_consultor 
            (seq_empresa, seq_consultor, tipo_servico, data_inicio_atendimento, data_fim_atendimento, seq_motivo_declinio) 
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;
    const values = [
      dados.seq_empresa,
      dados.seq_consultor,
      dados.tipo_servico,
      dados.data_inicio_atendimento,
      dados.data_fim_atendimento,
      dados.seq_motivo_declinio,
    ];

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error("[ServicoClaroRepository] Erro ao criar histórico:", error);
      throw error;
    }
  }

  async obterSituacaoPorSeqMotivoDeclinio(seq_motivo_declinio: number) {
    const query = `SELECT situacao_atendimento FROM omni.motivo_declinio WHERE seq_motivo_declinio = $1;`;
    try {
      const result = await pool.query(query, [seq_motivo_declinio]);
      return result.rows;
    } catch (error) {
      console.error(
        "[ServicoClaroRepository] Erro ao buscar situacao por seq_motivo_declinio:",
        error,
      );
      throw error;
    }
  }

  async atualizarServicoPiperunVolta(
    seq_empresa: number,
    observacao: string,
    dt_fechamento: Date,
    situacao: string,
    nome_consultor: string,
    is_ganho: boolean,
  ) {
    let query = `
        UPDATE omni.servico_claro 
        SET situacao = $1, crm = false, observacao_fechamento = $2, dt_fechamento = $3
    `;

    const params: any[] = [situacao, observacao, dt_fechamento];

    if (is_ganho && nome_consultor) {
      query += `, carteira = $4 WHERE seq_empresa = $5 RETURNING *;`;
      params.push(nome_consultor, seq_empresa);
    } else {
      query += ` WHERE seq_empresa = $4 RETURNING *;`;
      params.push(seq_empresa);
    }

    try {
      const result = await pool.query(query, params);
      return result.rows[0];
    } catch (error) {
      console.error(
        "[ServicoClaroRepository] Erro ao atualizar serviço volta:",
        error,
      );
      throw error;
    }
  }

  async buscarServicosClaroPipeExclusivo() {
    const query = `SELECT * FROM omni.api_subir_exclusivo;`;
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error(
        "[ServicoClaroRepository] Erro ao buscar RENOVAÇÕES:",
        error,
      );
      throw error;
    }
  }

  async buscarServicosClaroPipeRenovacao() {
    const query = `SELECT * FROM omni.api_subir_renovacao;`;
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error(
        "[ServicoClaroRepository] Erro ao buscar RENOVAÇÕES:",
        error,
      );
      throw error;
    }
  }

  async buscarServicosClaroPipePortabilidade() {
    const query = `SELECT * FROM omni.api_subir_portabilidade;`;
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error(
        "[ServicoClaroRepository] Erro ao buscar PORTABILIDADES:",
        error,
      );
      throw error;
    }
  }

  async atualizarSituacaoServicoPipe(seq_claro: number) {
    const query = `
            UPDATE omni.servico_claro
            SET crm = TRUE, dt_fechamento = NULL
            WHERE seq_claro = $1
            RETURNING *;
        `;
    try {
      console.log(
        `[DB] Executando UPDATE no PostgreSQL para seq_claro: ${seq_claro}`,
      );
      const result = await pool.query(query, [seq_claro]);

      if (result.rowCount === 0) {
        console.warn(
          `[DB] UPDATE executado, mas nenhuma linha afetada. O seq_claro ${seq_claro} existe?`,
        );
        return null;
      }
      return result.rows[0];
    } catch (error: any) {
      console.error(
        `[DB - ERROR] Erro crítico no PostgreSQL ao atualizar seq_claro ${seq_claro}:`,
        error.message,
      );
      throw error;
    }
  }

  async buscarDashboardHistorico() {
    const query = `SELECT * FROM omni.vw_historico_atendimento_declinio;`;
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error(
        "[ServicoClaroRepository] Erro ao buscar Dashboard de Histórico:",
        error,
      );
      throw error;
    }
  }

  async buscarDashboardServicoBase() {
    const query = `SELECT * FROM omni.vw_servico_claro_base;`;
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error(
        "[ServicoClaroRepository] Erro ao buscar Dashboard Base de Serviços:",
        error,
      );
      throw error;
    }
  }

  async buscarDashboardPorIndicacao(tipoIndicacao: string) {
    const mapaViews: { [key: string]: string } = {
      renovacao: "vw_servico_claro_renovacao",
      "fora-do-prazo": "vw_servico_claro_fora_prazo",
      portabilidade: "vw_servico_claro_portabilidade",
      "prazo-limitado": "vw_servico_claro_prazo_limitado",
      "prazo-excedido": "vw_servico_claro_prazo_excedido",
    };

    const nomeView = mapaViews[tipoIndicacao.toLowerCase()];

    if (!nomeView) {
      throw new Error(
        `A indicação informada (${tipoIndicacao}) não possui uma View mapeada no sistema.`,
      );
    }

    const query = `SELECT * FROM omni.${nomeView};`;
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error(
        `[ServicoClaroRepository] Erro ao buscar dados da view ${nomeView}:`,
        error,
      );
      throw error;
    }
  }

  async buscarLinhasPorSeqEmpresa(seq_empresa: number) {
    const query = `
      SELECT 
        seq_servico_operadora, 
        seq_empresa, 
        tipo_servico, 
        dt_fim_compromisso, 
        numero_linha, 
        plano, 
        valor, 
        bonus, 
        linha_ativa 
      FROM omni.servico_operadora 
      WHERE seq_empresa = $1 
        AND linha_ativa = true 
        AND tipo_servico = 'CLARO';
    `;
    try {
      const result = await pool.query(query, [seq_empresa]);
      return result.rows;
    } catch (error) {
      console.error(
        "[ServicoClaroRepository] Erro ao buscar linhas (servico_operadora):",
        error,
      );
      throw error;
    }
  }
}

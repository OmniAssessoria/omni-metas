import { INovoHistoricoEmpresaConsultor } from "../interfaces/novo_historico_empresa_consultor.interface.js";
import pool from "../module/postgresdb/conexao.js";

export default class ServicoClaroRepository {
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
    const query = `SELECT * FROM omni.motivo_declinio;`;
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
            SET crm = TRUE
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
}

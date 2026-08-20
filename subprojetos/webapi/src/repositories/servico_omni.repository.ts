import pool from "../module/postgresdb/conexao.js";

export default class ServicoOmniRepository {
  async buscarMotivoDeclinioPorIdString(id_motivo_declinio: string) {
    const query = `
      SELECT seq_motivo_declinio, situacao_atendimento 
      FROM omni.motivo_declinio 
      WHERE id_motivo_declinio = $1;
    `;
    try {
      const result = await pool.query(query, [id_motivo_declinio]);
      return result.rows;
    } catch (error) {
      console.error(
        "[ServicoOmniRepository] Erro ao buscar motivo por id_motivo_declinio string:",
        error,
      );
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
        "[ServicoOmniRepository] Erro ao buscar situacao por seq_motivo_declinio:",
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
        "[ServicoOmniRepository] Erro ao buscar seq_empresa por CNPJ:",
        error,
      );
      throw error;
    }
  }

  async buscarEmpresasEnvio(seq_consultor: number, limit_busca: number) {
    const query = `
      SELECT seq_empresa 
      FROM omni.servico_omni so 
      WHERE so.crm = FALSE 
        AND so.situacao = 'ABERTO' 
        AND so.seq_consultor = $1 
      LIMIT $2;
    `;
    try {
      const result = await pool.query(query, [seq_consultor, limit_busca]);
      return result.rows;
    } catch (error) {
      console.error(
        "[ServicoOmniRepository] Erro ao buscar empresas para envio:",
        error,
      );
      throw error;
    }
  }

  async buscarSeqServicoOmniPorSeqEmpresa(seq_empresa: number) {
    const query = `SELECT seq_servico_omni FROM omni.servico_omni WHERE seq_empresa = $1;`;
    try {
      const result = await pool.query(query, [seq_empresa]);
      return result.rows;
    } catch (error) {
      console.error(
        "[ServicoOmniRepository] Erro ao buscar seq_servico por seq_empresa:",
        error,
      );
      throw error;
    }
  }

  async buscarEmpresaInforPorSeq(seq_empresa: number) {
    const query = `SELECT * FROM omni.fn_servico_omni_por_empresa($1);`;
    try {
      const result = await pool.query(query, [seq_empresa]);
      return result.rows;
    } catch (error) {
      console.error("[ServicoOmniRepository] Erro ao buscar LEADS BDR:", error);
      throw error;
    }
  }

  async buscarServicosOmniDisponivel() {
    const query = `SELECT * FROM omni.vw_servico_omni_disponivel;`;
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error("[ServicoOmniRepository] Erro ao buscar LEADS BDR:", error);
      throw error;
    }
  }

  async buscarContagemServicosOmniDisponivel() {
    const query = `SELECT * FROM omni.vw_contagem_servico_omni_disponivel;`;
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error(
        "[ServicoOmniRepository] Erro ao buscar LEADS BDR Total disponivel:",
        error,
      );
      throw error;
    }
  }

  async buscarPainelIndicadoresConsultor() {
    const query = `SELECT * FROM omni.vw_painel_indicadores_consultor;`;
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error(
        "[ServicoOmniRepository] Erro ao buscar Painel de Indicadores:",
        error,
      );
      throw error;
    }
  }

  async verificarHistoricoServicoOmniExiste(
    seq_empresa: number,
    seq_consultor: number,
  ) {
    const query = `
            SELECT COUNT(*) AS total 
            FROM omni.historico_servico_omni 
            WHERE seq_empresa = $1 AND seq_consultor = $2;
        `;
    try {
      const result = await pool.query(query, [seq_empresa, seq_consultor]);
      return result.rows;
    } catch (error) {
      console.error(
        "[ServicoOmniRepository] Erro ao buscar historico_servico_omni:",
        error,
      );
      throw error;
    }
  }

  async criarHistoricoServicoOmni(dados: any) {
    const query = `
            INSERT INTO omni.historico_servico_omni 
            (seq_empresa, seq_consultor, dt_inicio_atendimento, dt_fim_atendimento, seq_motivo_declinio) 
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
    const values = [
      dados.seq_empresa,
      dados.seq_consultor,
      dados.dt_inicio_atendimento,
      dados.dt_fim_atendimento,
      dados.seq_motivo_declinio,
    ];

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error(
        "[ServicoOmniRepository] Erro ao criar histórico na historico_servico_omni:",
        error,
      );
      throw error;
    }
  }

  async atualizarEnvioCrmServicoOmni(
    seq_empresa: number,
    dt_crm: Date,
    codigo_crm: number,
  ) {
    const query = `
            UPDATE omni.servico_omni
            SET crm = TRUE, dt_crm = $2, codigo_crm = $3
            WHERE seq_empresa = $1
            RETURNING *;
        `;
    try {
      console.log(
        `[DB] Executando UPDATE no PostgreSQL para seq_empresa: ${seq_empresa}`,
      );
      const result = await pool.query(query, [seq_empresa, dt_crm, codigo_crm]);

      if (result.rowCount === 0) {
        console.warn(
          `[DB] UPDATE executado, mas nenhuma linha afetada. O seq_empresa ${seq_empresa} existe na servico_omni?`,
        );
        return null;
      }
      return result.rows[0];
    } catch (error: any) {
      console.error(
        `[DB - ERROR] Erro crítico no PostgreSQL ao atualizar seq_empresa ${seq_empresa}:`,
        error.message,
      );
      throw error;
    }
  }

  async atualizarServicoOmniVolta(
    seq_empresa: number,
    situacao: string,
    nome_consultor: string,
    is_ganho: boolean,
  ) {
    const query = `
        UPDATE omni.servico_omni
        SET situacao = $1, crm = false, codigo_crm = null, dt_crm = null, seq_consultor = null
        WHERE seq_empresa = $2 RETURNING *
    `;
    const params: any[] = [situacao, seq_empresa];

    try {
      if (is_ganho && nome_consultor) {
        const query_carteira = `UPDATE omni.empresa SET carteira = $1 where seq_empresa = $2;`;
        await pool.query(query_carteira, [nome_consultor, seq_empresa]);
      }

      const result = await pool.query(query, params);
      return result.rows[0];
    } catch (error) {
      console.error(
        "[ServicoOmniRepository] Erro ao atualizar serviço de volta (Aberto/Perdido/Ganho):",
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
        "[ServicoOmniRepository] Erro ao buscar motivos de declínio:",
        error,
      );
      throw error;
    }
  }

  async obterNumerosContatosSecundarioClientes(seq_empresa: number) {
    const query = `SELECT numero_linha FROM omni.servico_operadora where seq_empresa = $1;`;
    try {
      const result = await pool.query(query, [seq_empresa]);
      return result.rows;
    } catch (error) {
      console.error(
        "[ServicoOmniRepository] Erro ao buscar numeros de contato secundario por seq_empresa:",
        error,
      );
      throw error;
    }
  }

  async atribuirEmpresasParaConsultor(seq_consultor: number, limit: number) {
    const query = `SELECT * FROM omni.fn_atribuir_empresa_consultor($1, $2);`;
    try {
      const result = await pool.query(query, [seq_consultor, limit]);
      return result.rows;
    } catch (error) {
      console.error(
        "[ServicoOmniRepository] Erro ao atribuir LEADS BDR para o consultor:",
        error,
      );
      throw error;
    }
  }

  async buscarAbertosParaSincronizacao() {
    const query = `
      SELECT so.seq_servico_omni, e.cnpj 
      FROM omni.servico_omni so
      INNER JOIN omni.empresa e ON so.seq_empresa = e.seq_empresa
      WHERE so.crm = TRUE 
        AND so.seq_consultor IS NOT NULL 
        AND so.situacao = 'ABERTO';
    `;
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error(
        "[ServicoOmniRepository] Erro ao buscar abertos BDR sync:",
        error,
      );
      throw error;
    }
  }

  async reverterServicoAbertoNaoEncontradoCrm(seq_servico_omni: number) {
    const query = `
      UPDATE omni.servico_omni 
      SET crm = false, dt_crm = null, codigo_crm = null, seq_consultor = null, situacao = 'ABERTO'
      WHERE seq_servico_omni = $1;
    `;
    try {
      await pool.query(query, [seq_servico_omni]);
    } catch (error) {
      console.error(
        "[ServicoOmniRepository] Erro ao reverter serviço BDR:",
        error,
      );
      throw error;
    }
  }

  async atribuirLeadsConsultor(
    seq_consultor: number,
    quantidade: number,
    com_edoc_cpc: boolean,
  ): Promise<number> {
    const query = `SELECT omni.atribuir_leads_consultor($1, $2, $3) AS total_atribuido;`;

    try {
      const result = await pool.query(query, [
        seq_consultor,
        quantidade,
        com_edoc_cpc,
      ]);

      return result.rows[0]?.total_atribuido || 0;
    } catch (error) {
      console.error(
        "[ServicoOmniRepository] Erro crítico ao executar function de atribuição de leads:",
        error,
      );
      throw error;
    }
  }
}

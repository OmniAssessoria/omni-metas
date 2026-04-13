import { MetasConsultor } from "../interfaces/consultor_metas.interface.js";
import pool from "../module/postgresdb/conexao.js";

export default class ConsultorRepository {
  async buscarConsultores() {
    const query = `
            SELECT 
                seq_consultor,
                nome,
                meta_mensal,
                codigo_crm,
                perfil_indicacao,
                perfil_qtd_linhas_min,
                perfil_qtd_linhas_max
            FROM omni.consultor 
            WHERE perfil_indicacao IS NOT NULL
            ORDER BY nome
        `;

    const result = await pool.query(query);
    return result.rows;
  }

  async buscarSeqConsultorPorCodigoCrm(codigo_crm: string) {
    const query = `SELECT seq_consultor, codigo_crm, nome, email, perfil_indicacao, perfil_qtd_linhas_min, perfil_qtd_linhas_max, meta_mensal FROM omni.consultor WHERE codigo_crm = $1;`;
    try {
      const result = await pool.query(query, [codigo_crm]);
      return result.rows[0];
    } catch (error) {
      console.error(
        "[ServicoClaroRepository] Erro ao buscar seq_consultor por codigo_crm:",
        error,
      );
      throw error;
    }
  }

  async buscarHistoricoPorSeqEmpresa(seq_empresa: number) {
    const query = `
            SELECT 
                h.seq_historico_consultor_empresa,
                h.tipo_servico,
                h.data_inicio_atendimento,
                h.data_fim_atendimento,
                c.nome AS consultor_nome,
                c.perfil_indicacao,
                c.perfil_qtd_linhas_min,
                c.perfil_qtd_linhas_max,
                m.motivo_declinio,
                m.situacao_atendimento
            FROM omni.historico_empresa_consultor h
            INNER JOIN omni.consultor c ON h.seq_consultor = c.seq_consultor
            LEFT JOIN omni.motivo_declinio m ON h.seq_motivo_declinio = m.seq_motivo_declinio
            WHERE h.seq_empresa = $1
            ORDER BY h.data_inicio_atendimento DESC;
        `;
    try {
      const result = await pool.query(query, [seq_empresa]);
      return result.rows;
    } catch (error) {
      console.error(
        "[ServicoClaroRepository] Erro ao buscar histórico da empresa:",
        error,
      );
      throw error;
    }
  }

  async buscarConsultorPorSeq(seq: number) {
    const query = `
            SELECT
                seq_consultor,
                nome,
                email,
                meta_mensal
            FROM omni.consultor
            WHERE seq_consultor = $1 AND perfil_indicacao IS NOT NULL
        `;

    const result = await pool.query(query, [seq]);
    return result.rows[0];
  }

  async buscarMetaMensalPorSeq(seq: number) {
    const query = `
            SELECT
                seq_consultor_meta,
                seq_consultor,
                data_referencia,
                valor_dia
            FROM omni.consultor_metas
            WHERE seq_consultor = $1
            AND date_trunc('month', data_referencia) = date_trunc('month', CURRENT_DATE)
            ORDER BY data_referencia
        `;

    const result = await pool.query(query, [seq]);
    return result.rows;
  }

  async criarConsultorMeta(dados: MetasConsultor) {
    const query = `
            INSERT INTO omni.consultor_metas
            (
                seq_consultor,
                data_referencia,
                valor_dia
            )
            VALUES ($1,$2,$3)
            RETURNING *
        `;

    const values = [
      dados.seq_consultor,
      dados.data_referencia,
      dados.valor_dia,
    ];

    const result = await pool.query(query, values);

    return result.rows[0];
  }

  async buscarConsultoresDisponiveis(
    seq_empresa: number,
    indicacao: string,
    carteira?: string,
  ) {
    const query = `
      WITH dados_empresa AS (
          SELECT 
              COALESCE((SELECT qtd_servico_claro FROM omni.empresa WHERE seq_empresa = $1 AND cliente_ativo = TRUE), 0) as qtd_linhas,
              (SELECT EXISTS (SELECT 1 FROM omni.historico_empresa_consultor WHERE seq_empresa = $1 AND tipo_servico = 'CLARO')) as tem_historico,
              ($3::varchar <> '') as tem_carteira
      )
      SELECT 
          c.seq_consultor,
          c.nome,
          c.perfil_indicacao,
          c.perfil_qtd_linhas_min,
          c.perfil_qtd_linhas_max,
          (
              SELECT COUNT(*) 
              FROM omni.historico_empresa_consultor h_carga
              JOIN omni.empresa e_carga ON e_carga.seq_empresa = h_carga.seq_empresa
              WHERE h_carga.seq_consultor = c.seq_consultor
                AND e_carga.cliente_ativo = TRUE
          ) as carga_atual
      FROM omni.consultor c
      CROSS JOIN dados_empresa de
      WHERE c.perfil_indicacao IS NOT NULL
        AND (
            (de.tem_carteira AND c.perfil_indicacao = 'CARTEIRA' AND de.qtd_linhas BETWEEN c.perfil_qtd_linhas_min AND c.perfil_qtd_linhas_max)
            OR 
            (NOT de.tem_carteira AND (
                (c.perfil_indicacao <> 'CARTEIRA' AND (
                    ($2 = 'RENOVACAO' AND c.perfil_indicacao IN ('RENOVACAO', 'AMBOS'))
                    OR 
                    ($2 = 'PORTABILIDADE' AND c.perfil_indicacao IN ('PORTABILIDADE', 'AMBOS'))
                ) AND de.qtd_linhas BETWEEN c.perfil_qtd_linhas_min AND c.perfil_qtd_linhas_max)
                OR 
                (c.perfil_indicacao = 'CARTEIRA' AND $2 = 'RENOVACAO' AND de.qtd_linhas >= 2 AND de.qtd_linhas <= 9)
            ))
        )
        AND (
            NOT de.tem_historico 
            OR NOT EXISTS (
                SELECT 1 
                FROM omni.historico_empresa_consultor h_check 
                WHERE h_check.seq_empresa = $1 
                  AND h_check.seq_consultor = c.seq_consultor 
                  AND h_check.tipo_servico = 'CLARO'
            )
        )
      ORDER BY carga_atual ASC, c.nome ASC;
    `;

    const values = [seq_empresa, indicacao, carteira || ""];

    try {
      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      console.error(
        "[ConsultorRepository] Erro SQL crítico ao buscar consultores disponíveis:",
        error,
      );
      throw error;
    }
  }

  async buscarConsultoresDisponiveisExclusivos(seq_empresa: number) {
    const query = `
      WITH dados_empresa AS (
          SELECT 
              COALESCE((SELECT qtd_servico_claro FROM omni.empresa WHERE seq_empresa = $1 AND cliente_ativo = TRUE), 0) as qtd_linhas,
              (SELECT EXISTS (SELECT 1 FROM omni.historico_empresa_consultor WHERE seq_empresa = $1 AND tipo_servico = 'CLARO')) as tem_historico
      )
      SELECT 
          c.seq_consultor,
          c.nome,
          c.perfil_indicacao,
          c.perfil_qtd_linhas_min,
          c.perfil_qtd_linhas_max,
          (
              SELECT COUNT(*) 
              FROM omni.historico_empresa_consultor h_carga
              JOIN omni.empresa e_carga ON e_carga.seq_empresa = h_carga.seq_empresa
              WHERE h_carga.seq_consultor = c.seq_consultor
                AND e_carga.cliente_ativo = TRUE
          ) as carga_atual
      FROM omni.consultor c
      CROSS JOIN dados_empresa de
      WHERE 
        -- Garante que o consultor tenha um perfil válido configurado (ignora os zerados/sem perfil)
        c.perfil_indicacao IS NOT NULL 
        AND c.perfil_indicacao <> '' 
        
        -- AQUI ENTRA A ÚNICA REGRA DE MATCH: QUANTIDADE DE LINHAS
        -- Ignoramos completamente qual é a string gravada em c.perfil_indicacao
        AND de.qtd_linhas BETWEEN c.perfil_qtd_linhas_min AND c.perfil_qtd_linhas_max
        
        -- A REGRA DE HISTÓRICO PERMANECE PARA EVITAR REPETIÇÃO
        AND (
            NOT de.tem_historico 
            OR NOT EXISTS (
                SELECT 1 
                FROM omni.historico_empresa_consultor h_check 
                WHERE h_check.seq_empresa = $1 
                  AND h_check.seq_consultor = c.seq_consultor 
                  AND h_check.tipo_servico = 'CLARO'
            )
        )
      ORDER BY carga_atual ASC, c.nome ASC;
    `;

    try {
      const result = await pool.query(query, [seq_empresa]);
      return result.rows;
    } catch (error) {
      console.error(
        "[ConsultorRepository] Erro SQL crítico ao buscar consultores exclusivos disponíveis:",
        error,
      );
      throw error;
    }
  }

  async atualizarConsultorEmpresa(
    seq_consultor_novo: number,
    seq_empresa: number,
  ) {
    const query = `
        UPDATE omni.servico_claro
        SET seq_consultor = $1
        WHERE seq_empresa = $2
        RETURNING *;
    `;

    const values = [seq_consultor_novo, seq_empresa];

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error(
        `[ConsultorRepository] Falha ao sobreescrever o seq_consultor (${seq_consultor_novo}) para a empresa (${seq_empresa}) no serviço CLARO:`,
        error,
      );
      throw error;
    }
  }

  async atualizarMetaMensal(seq_consultor: number, meta: number) {
    const query = `
            UPDATE omni.consultor
            SET meta_mensal = $1
            WHERE seq_consultor = $2
            RETURNING *
        `;
    const result = await pool.query(query, [meta, seq_consultor]);
    return result.rows[0];
  }
}

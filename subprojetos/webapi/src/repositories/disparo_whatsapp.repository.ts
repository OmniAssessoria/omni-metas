import pool from "../module/postgresdb/conexao.js";
import { INovoHistoricoEmpresaConsultor } from "../interfaces/novo_historico_empresa_consultor.interface.js";

export default class DisparoWhatsappRepository {
  async atualizarSituacaoCrmDisparo(
    seq_empresa: number,
    id_lead: string,
    situacao_crm: string,
  ) {
    const query = `
      UPDATE omni.disparo_whatsapp
      SET situacao_crm = $1
      WHERE seq_empresa = $2 AND id_lead = $3
      RETURNING *;
    `;
    try {
      const result = await pool.query(query, [
        situacao_crm,
        seq_empresa,
        id_lead,
      ]);
      return result.rows[0];
    } catch (error: any) {
      console.error(
        `[DisparoWhatsappRepository] Erro ao atualizar disparo (Lead ${id_lead}):`,
        error.message,
      );
      throw error;
    }
  }

  async atualizarEmLotePorRelatorioTake(registros: Array<{
    linha: number;
    id_disparo_take: string | null;
    cnpj: string;
    numero: string;
    status_take: string;
    motivo_falha_take: string | null;
    dt_criado_take: Date | null;
    dt_concluido_take: Date | null;
    dt_entregue_take: Date | null;
    dt_lido_take: Date | null;
    dt_respondido_take: Date | null;
  }>) {
    const client = await pool.connect();

    const resumo = {
      atualizados: 0,
      marcados_como_falha: 0,
      corrigidos_de_falha_para_entregue: 0,
      ja_possuiam_crm_enriquecidos: 0,
      respondidos_sem_crm: [] as Array<{
        seq_disparo: number;
        seq_empresa: number;
        cnpj: string;
        numero: string;
        dt_respondido_take: Date | null;
      }>,
      nao_encontrados: [] as Array<{
        linha: number;
        cnpj: string;
        numero: string;
        id_disparo_take: string | null;
      }>,
    };

    const queryBusca = `
      SELECT 
        dw.seq_disparo,
        dw.seq_empresa,
        dw.numero,
        dw.situacao,
        dw.id_lead,
        dw.situacao_crm
      FROM omni.disparo_whatsapp dw
      INNER JOIN omni.empresa e ON e.seq_empresa = dw.seq_empresa
      WHERE LPAD(REGEXP_REPLACE(e.cnpj, '\\D', '', 'g'), 14, '0') = $1
        AND (
          dw.numero = $2
          OR (
            LEFT(dw.numero, 4) = LEFT($2, 4)
            AND RIGHT(dw.numero, 8) = RIGHT($2, 8)
          )
        )
      ORDER BY
        CASE WHEN dw.numero = $2 THEN 0 ELSE 1 END,
        dw.dt_disparo DESC
      LIMIT 1;
    `;

    const queryUpdate = `
      UPDATE omni.disparo_whatsapp
      SET
        id_disparo_take    = COALESCE($2, id_disparo_take),
        status_take        = $3,
        motivo_falha_take  = $4,
        dt_criado_take     = COALESCE($5, dt_criado_take),
        dt_concluido_take  = COALESCE($6, dt_concluido_take),
        dt_entregue_take   = COALESCE($7, dt_entregue_take),
        dt_lido_take       = COALESCE($8, dt_lido_take),
        dt_respondido_take = COALESCE($9, dt_respondido_take),
        situacao           = $10,
        dt_importacao_take = CURRENT_TIMESTAMP
      WHERE seq_disparo = $1;
    `;

    try {
      await client.query("BEGIN");

      for (const reg of registros) {
        const busca = await client.query(queryBusca, [reg.cnpj, reg.numero]);

        if (busca.rows.length === 0) {
          resumo.nao_encontrados.push({
            linha: reg.linha,
            cnpj: reg.cnpj,
            numero: reg.numero,
            id_disparo_take: reg.id_disparo_take,
          });
          continue;
        }

        const atual = busca.rows[0];
        const possuiCrm =
          Boolean(atual.id_lead) ||
          ["ABERTO", "GANHO", "PERDIDO"].includes(atual.situacao_crm);

        let novaSituacao: string | null = atual.situacao;

        if (possuiCrm) {
          // Proteção: já tem registro no CRM, mantém SUCESSO e apenas enriquece colunas Take
          novaSituacao = atual.situacao || "SUCESSO";
          resumo.ja_possuiam_crm_enriquecidos++;
        } else if (reg.status_take === "FALHOU") {
          novaSituacao = "FALHA";
          resumo.marcados_como_falha++;
        } else if (
          reg.status_take === "RESPONDIDO" ||
          reg.dt_respondido_take !== null
        ) {
          // Respondeu na Take mas não criou lead no CRM: limpa falha anterior se existir e sinaliza divergência
          if (atual.situacao === "FALHA") {
            novaSituacao = null;
          }
          resumo.respondidos_sem_crm.push({
            seq_disparo: atual.seq_disparo,
            seq_empresa: atual.seq_empresa,
            cnpj: reg.cnpj,
            numero: atual.numero,
            dt_respondido_take: reg.dt_respondido_take,
          });
        } else if (
          ["ENTREGUE", "LIDO", "ENVIADO"].includes(reg.status_take)
        ) {
          // Sucesso na entrega da Take sem resposta ainda: se estava marcado como FALHA por engano, corrige para NULL
          if (atual.situacao === "FALHA") {
            novaSituacao = null;
            resumo.corrigidos_de_falha_para_entregue++;
          }
        }

        await client.query(queryUpdate, [
          atual.seq_disparo,
          reg.id_disparo_take,
          reg.status_take,
          reg.status_take === "FALHOU" ? reg.motivo_falha_take : null,
          reg.dt_criado_take,
          reg.dt_concluido_take,
          reg.dt_entregue_take,
          reg.dt_lido_take,
          reg.dt_respondido_take,
          novaSituacao,
        ]);

        resumo.atualizados++;
      }

      await client.query("COMMIT");
      return resumo;
    } catch (error: any) {
      await client.query("ROLLBACK");
      console.error(
        "[DisparoWhatsappRepository] Erro na importação Take (ROLLBACK):",
        error.message,
      );
      throw error;
    } finally {
      client.release();
    }
  }

  async atualizarServicoClaroPosDisparo(
    seq_empresa: number,
    observacao: string,
    dt_fechamento: Date,
    situacao: string,
    nome_consultor: string,
    is_ganho: boolean,
  ) {
    const cpcStatus = is_ganho ? false : true;

    let query = `
        UPDATE omni.servico_claro 
        SET situacao = $1, crm = false, cpc = $2, observacao_fechamento = $3, dt_fechamento = $4
    `;

    const params: any[] = [situacao, cpcStatus, observacao, dt_fechamento];

    if (is_ganho && nome_consultor) {
      query += `, carteira = $5 WHERE seq_empresa = $6 RETURNING *;`;
      params.push(nome_consultor, seq_empresa);
    } else {
      query += ` WHERE seq_empresa = $5 RETURNING *;`;
      params.push(seq_empresa);
    }

    try {
      const result = await pool.query(query, params);
      return result.rows[0];
    } catch (error: any) {
      console.error(
        "[DisparoWhatsappRepository] Erro ao atualizar serviço claro pós-disparo:",
        error.message,
      );
      throw error;
    }
  }

  async criarHistoricoDisparo(dados: INovoHistoricoEmpresaConsultor) {
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
    } catch (error: any) {
      console.error(
        "[DisparoWhatsappRepository] Erro ao criar histórico do disparo:",
        error.message,
      );
      throw error;
    }
  }

  async obterTotaisDisponiveis() {
    const queryDisponiveis = `
      WITH candidatos_telefones AS (
        SELECT e.seq_empresa, s.indicacao, d.numero AS raw_numero
        FROM omni.empresa e
        INNER JOIN omni.servico_claro s ON e.seq_empresa = s.seq_empresa
        INNER JOIN omni.decisor d ON d.seq_empresa = e.seq_empresa
        WHERE e.qtd_servico_claro >= 2 AND e.qtd_servico_claro <= 12
          AND s.situacao = 'ABERTO'
          AND s.crm = false AND s.cpc = false
          AND s.indicacao IN ('FORA DO PRAZO', 'RENOVACAO', 'PORTABILIDADE', 'PRAZO LIMITADO', 'PRAZO EXCEDIDO')
          AND NULLIF(TRIM(d.numero), '') IS NOT NULL

        UNION ALL

        SELECT e.seq_empresa, s.indicacao, op.numero_linha AS raw_numero
        FROM omni.empresa e
        INNER JOIN omni.servico_claro s ON e.seq_empresa = s.seq_empresa
        INNER JOIN omni.servico_operadora op ON op.seq_empresa = e.seq_empresa
        WHERE e.qtd_servico_claro >= 2 AND e.qtd_servico_claro <= 12
          AND s.situacao = 'ABERTO'
          AND s.crm = false AND s.cpc = false
          AND s.indicacao IN ('FORA DO PRAZO', 'RENOVACAO', 'PORTABILIDADE', 'PRAZO LIMITADO', 'PRAZO EXCEDIDO')
          AND NULLIF(TRIM(op.numero_linha), '') IS NOT NULL

        UNION ALL

        SELECT e.seq_empresa, s.indicacao, unnest(regexp_split_to_array(d.google_fontes_telefones, '[,;/|]+')) AS raw_numero
        FROM omni.empresa e
        INNER JOIN omni.servico_claro s ON e.seq_empresa = s.seq_empresa
        INNER JOIN omni.decisor d ON d.seq_empresa = e.seq_empresa
        WHERE e.qtd_servico_claro >= 2 AND e.qtd_servico_claro <= 12
          AND s.situacao = 'ABERTO'
          AND s.crm = false AND s.cpc = false
          AND s.indicacao IN ('FORA DO PRAZO', 'RENOVACAO', 'PORTABILIDADE', 'PRAZO LIMITADO', 'PRAZO EXCEDIDO')
          AND NULLIF(TRIM(d.google_fontes_telefones), '') IS NOT NULL
      ),
      telefones_validos AS (
        SELECT
          seq_empresa,
          indicacao,
          CASE
            WHEN digitos LIKE '550%' THEN '55' || SUBSTRING(digitos, 4)
            WHEN digitos LIKE '55%'  THEN digitos
            WHEN digitos LIKE '0%'   THEN '55' || SUBSTRING(digitos, 2)
            ELSE '55' || digitos
          END AS numero_final
        FROM (
          SELECT seq_empresa, indicacao, REGEXP_REPLACE(raw_numero, '\\D', '', 'g') AS digitos
          FROM candidatos_telefones
        ) t
        WHERE digitos <> ''
      )
      SELECT tv.indicacao, COUNT(DISTINCT tv.seq_empresa) AS qtd
      FROM telefones_validos tv
      WHERE LENGTH(tv.numero_final) = 13
        AND SUBSTRING(tv.numero_final, 5, 1) = '9'
        -- Bloqueia empresa se tiver CRM ABERTO, GANHO ou disparo sem resposta há menos de 15 dias
        AND NOT EXISTS (
          SELECT 1
          FROM omni.disparo_whatsapp dw_bloq
          WHERE dw_bloq.seq_empresa = tv.seq_empresa
            AND (
              dw_bloq.situacao_crm IN ('ABERTO', 'GANHO')
              OR (
                dw_bloq.situacao IS NULL
                AND COALESCE(dw_bloq.status_take, '') <> 'FALHOU'
                AND dw_bloq.dt_disparo > CURRENT_TIMESTAMP - INTERVAL '15 days'
              )
            )
        )
        -- Garante que esse número específico ainda não foi disparado para essa empresa
        AND NOT EXISTS (
          SELECT 1
          FROM omni.disparo_whatsapp dw_num
          WHERE dw_num.seq_empresa = tv.seq_empresa
            AND dw_num.numero = tv.numero_final
        )
      GROUP BY tv.indicacao;
    `;

    const queryFunilDisparos = `
      SELECT 
        indicacao,
        COUNT(seq_disparo) AS total_enviado,
        COUNT(seq_disparo) FILTER (WHERE situacao IS NULL) AS sem_resposta,
        COUNT(seq_disparo) FILTER (WHERE situacao = 'FALHA') AS falhas,
        COUNT(seq_disparo) FILTER (WHERE situacao = 'SUCESSO' AND id_lead IS NOT NULL) AS sucessos,
        COUNT(DISTINCT seq_empresa) FILTER (WHERE situacao_crm = 'GANHO' AND id_lead IS NOT NULL) AS crm_ganho,
        COUNT(DISTINCT seq_empresa) FILTER (WHERE situacao_crm = 'PERDIDO' AND id_lead IS NOT NULL) AS crm_perdido,
        COUNT(DISTINCT seq_empresa) FILTER (WHERE situacao_crm = 'ABERTO' AND id_lead IS NOT NULL) AS crm_aberto
      FROM omni.disparo_whatsapp
      WHERE indicacao IN ('FORA DO PRAZO', 'RENOVACAO', 'PORTABILIDADE', 'PRAZO LIMITADO', 'PRAZO EXCEDIDO')
      GROUP BY indicacao;
    `;

    try {
      const dispResult = await pool.query(queryDisponiveis);
      const funilResult = await pool.query(queryFunilDisparos);

      return {
        disponiveis: dispResult.rows,
        funil_disparos: funilResult.rows,
      };
    } catch (error: any) {
      console.error(
        "[DisparoWhatsappRepository] Erro ao buscar totais e funil:",
        error.message,
      );
      throw error;
    }
  }

  async gerarLeadsDisparo(
    limit: number,
    indicacao: string,
    seq_consultor: number,
  ) {
    const query = `
      WITH empresas_elegiveis AS (
        SELECT
          e.seq_empresa,
          REGEXP_REPLACE(e.cnpj, '\\D', '', 'g') AS cnpj_numeros,
          UPPER(e.razao) AS razao_social,
          $1::text AS indicacao
        FROM omni.empresa e
        INNER JOIN omni.servico_claro s ON e.seq_empresa = s.seq_empresa
        WHERE e.qtd_servico_claro >= 2 AND e.qtd_servico_claro <= 12
          AND s.indicacao = $1
          AND s.situacao = 'ABERTO'
          AND s.crm = false
          AND s.cpc = false
          -- Não dispara para empresa com CRM ABERTO, GANHO ou aguardando resposta dentro de 15 dias
          AND NOT EXISTS (
            SELECT 1
            FROM omni.disparo_whatsapp dw_bloq
            WHERE dw_bloq.seq_empresa = e.seq_empresa
              AND (
                dw_bloq.situacao_crm IN ('ABERTO', 'GANHO')
                OR (
                  dw_bloq.situacao IS NULL
                  AND COALESCE(dw_bloq.status_take, '') <> 'FALHOU'
                  AND dw_bloq.dt_disparo > CURRENT_TIMESTAMP - INTERVAL '15 days'
                )
              )
          )
      ),
      telefones_candidatos AS (
        -- Prioridade 1: Telefone do decisor
        SELECT
          ee.seq_empresa,
          ee.cnpj_numeros,
          ee.razao_social,
          ee.indicacao,
          d.numero AS raw_numero,
          1 AS prioridade_fonte,
          0::numeric AS ordem_bonus,
          0::numeric AS ordem_valor
        FROM empresas_elegiveis ee
        INNER JOIN omni.decisor d ON d.seq_empresa = ee.seq_empresa
        WHERE NULLIF(TRIM(d.numero), '') IS NOT NULL

        UNION ALL

        -- Prioridade 2: Todas as linhas da operadora (ordenadas por bônus e valor)
        SELECT
          ee.seq_empresa,
          ee.cnpj_numeros,
          ee.razao_social,
          ee.indicacao,
          op.numero_linha AS raw_numero,
          2 AS prioridade_fonte,
          COALESCE(CAST(SUBSTRING(op.bonus FROM '[0-9]+') AS NUMERIC), 0) AS ordem_bonus,
          COALESCE(op.valor, 0) AS ordem_valor
        FROM empresas_elegiveis ee
        INNER JOIN omni.servico_operadora op ON op.seq_empresa = ee.seq_empresa
        WHERE NULLIF(TRIM(op.numero_linha), '') IS NOT NULL

        UNION ALL

        -- Prioridade 3: Telefones do Google (suporta múltiplos separados por , ; / |)
        SELECT
          ee.seq_empresa,
          ee.cnpj_numeros,
          ee.razao_social,
          ee.indicacao,
          unnest(regexp_split_to_array(d.google_fontes_telefones, '[,;/|]+')) AS raw_numero,
          3 AS prioridade_fonte,
          0::numeric AS ordem_bonus,
          0::numeric AS ordem_valor
        FROM empresas_elegiveis ee
        INNER JOIN omni.decisor d ON d.seq_empresa = ee.seq_empresa
        WHERE NULLIF(TRIM(d.google_fontes_telefones), '') IS NOT NULL
      ),
      telefones_formatados AS (
        SELECT
          seq_empresa,
          cnpj_numeros,
          razao_social,
          indicacao,
          prioridade_fonte,
          ordem_bonus,
          ordem_valor,
          razao_social || ' || ' ||
          SUBSTRING(LPAD(cnpj_numeros, 14, '0'), 1, 2) || '.' ||
          SUBSTRING(LPAD(cnpj_numeros, 14, '0'), 3, 3) || '.' ||
          SUBSTRING(LPAD(cnpj_numeros, 14, '0'), 6, 3) || '/' ||
          SUBSTRING(LPAD(cnpj_numeros, 14, '0'), 9, 4) || '-' ||
          SUBSTRING(LPAD(cnpj_numeros, 14, '0'), 13, 2) AS nome_contato,
          CASE
            WHEN num_digitos LIKE '550%' THEN '55' || SUBSTRING(num_digitos, 4)
            WHEN num_digitos LIKE '55%'  THEN num_digitos
            WHEN num_digitos LIKE '0%'   THEN '55' || SUBSTRING(num_digitos, 2)
            ELSE '55' || num_digitos
          END AS numero_final
        FROM (
          SELECT *, REGEXP_REPLACE(raw_numero, '\\D', '', 'g') AS num_digitos
          FROM telefones_candidatos
        ) limpo
        WHERE num_digitos <> ''
      ),
      proximo_numero_por_empresa AS (
        SELECT DISTINCT ON (tf.seq_empresa)
          tf.seq_empresa,
          tf.cnpj_numeros,
          tf.razao_social,
          tf.indicacao,
          tf.nome_contato,
          tf.numero_final
        FROM telefones_formatados tf
        WHERE LENGTH(tf.numero_final) = 13
          AND SUBSTRING(tf.numero_final, 5, 1) = '9'
          -- Garante que este número NUNCA foi disparado antes para esta empresa
          AND NOT EXISTS (
            SELECT 1
            FROM omni.disparo_whatsapp dw_usado
            WHERE dw_usado.seq_empresa = tf.seq_empresa
              AND dw_usado.numero = tf.numero_final
          )
        ORDER BY
          tf.seq_empresa,
          tf.prioridade_fonte ASC,
          tf.ordem_bonus DESC,
          tf.ordem_valor DESC
      ),
      leads_selecionados AS (
        SELECT *
        FROM proximo_numero_por_empresa
        LIMIT $2::integer
      ),
      inserted_disparos AS (
        INSERT INTO omni.disparo_whatsapp (seq_empresa, seq_consultor, numero, indicacao, dt_disparo)
        SELECT seq_empresa, $3::integer, numero_final, indicacao, CURRENT_TIMESTAMP
        FROM leads_selecionados
        RETURNING seq_empresa, numero
      )
      SELECT
        l.nome_contato AS nome,
        i.numero,
        l.razao_social,
        l.cnpj_numeros AS cnpj
      FROM leads_selecionados l
      INNER JOIN inserted_disparos i
        ON l.seq_empresa = i.seq_empresa
       AND l.numero_final = i.numero;
    `;

    try {
      const result = await pool.query(query, [indicacao, limit, seq_consultor]);
      return result.rows;
    } catch (error: any) {
      console.error(
        "[DisparoWhatsappRepository] Erro ao gerar e inserir leads disparo:",
        error.message,
      );
      throw error;
    }
  }

}

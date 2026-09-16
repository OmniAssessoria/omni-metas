import pool from "../module/postgresdb/conexao.js";
import { INovoHistoricoEmpresaConsultor } from "../interfaces/novo_historico_empresa_consultor.interface.js";

export default class DisparoWhatsappRepository {
    async atualizarSituacaoCrmDisparo(seq_empresa: number, id_lead: string, situacao_crm: string) {
        const query = `
      UPDATE omni.disparo_whatsapp
      SET situacao_crm = $1
      WHERE seq_empresa = $2 AND id_crm = $3
      RETURNING *;
    `;
        try {
            const result = await pool.query(query, [situacao_crm, seq_empresa, id_lead]);
            return result.rows[0];
        } catch (error: any) {
            console.error(`[DisparoWhatsappRepository] Erro ao atualizar disparo (Lead ${id_lead}):`, error.message);
            throw error;
        }
    }

    async atualizarServicoClaroPosDisparo(
        seq_empresa: number,
        observacao: string,
        dt_fechamento: Date,
        situacao: string,
        nome_consultor: string,
        is_ganho: boolean
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
            console.error("[DisparoWhatsappRepository] Erro ao atualizar serviço claro pós-disparo:", error.message);
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
            console.error("[DisparoWhatsappRepository] Erro ao criar histórico do disparo:", error.message);
            throw error;
        }
    }

    async obterTotaisDisponiveis() {
        const queryDisponiveis = `
            SELECT s.indicacao, COUNT(DISTINCT e.seq_empresa) AS qtd
            FROM omni.empresa e
            INNER JOIN omni.servico_claro s ON e.seq_empresa = s.seq_empresa
            WHERE e.qtd_servico_claro >= 2 AND e.qtd_servico_claro <= 10 
              AND s.situacao = 'ABERTO'
              AND s.crm = false AND s.cpc = false
              AND s.indicacao IN ('FORA DO PRAZO', 'RENOVACAO', 'PORTABILIDADE', 'PRAZO LIMITADO', 'PRAZO EXCEDIDO')
              AND NOT EXISTS (
                  SELECT 1 FROM omni.disparo_whatsapp dw WHERE dw.seq_empresa = e.seq_empresa
              )
            GROUP BY s.indicacao;
        `;
        const queryDisparadosHoje = `
            SELECT COUNT(seq_disparo) AS disparados_hoje 
            FROM omni.disparo_whatsapp
            WHERE DATE(dt_disparo) = CURRENT_DATE;
        `;

        try {
            const dispResult = await pool.query(queryDisponiveis);
            const hojeResult = await pool.query(queryDisparadosHoje);

            return {
                por_indicacao: dispResult.rows,
                disparados_hoje: parseInt(hojeResult.rows[0].disparados_hoje || '0', 10)
            };
        } catch (error: any) {
            console.error("[DisparoWhatsappRepository] Erro ao buscar totais:", error.message);
            throw error;
        }
    }

    async gerarLeadsDisparo(limit: number, indicacao: string, seq_consultor: number) {
        const query = `
        WITH leads_brutos AS (
            SELECT 
                e.seq_empresa, 
                REGEXP_REPLACE(e.cnpj, '\\D', '', 'g') AS cnpj_numeros, 
                UPPER(e.razao) AS razao_social, 
                $1::text AS indicacao,
                
                COALESCE(
                    NULLIF(TRIM(d.numero), ''),
                    (
                        SELECT op.numero_linha 
                        FROM omni.servico_operadora op 
                        WHERE op.seq_empresa = e.seq_empresa 
                          AND NULLIF(TRIM(op.numero_linha), '') IS NOT NULL
                        ORDER BY 
                            CAST(SUBSTRING(op.bonus FROM '[0-9]+') AS NUMERIC) DESC NULLS LAST,
                            op.valor DESC NULLS LAST 
                        LIMIT 1
                    ),
                    NULLIF(TRIM(d.google_fontes_telefones), '')
                ) AS raw_numero
            FROM omni.empresa e
            INNER JOIN omni.servico_claro s ON e.seq_empresa = s.seq_empresa
            LEFT JOIN omni.decisor d ON d.seq_empresa = e.seq_empresa
            WHERE e.qtd_servico_claro >= 2 AND e.qtd_servico_claro <= 10 
              AND s.indicacao = $1
              AND s.crm = false AND s.situacao = 'ABERTO'
              AND NOT EXISTS (
                  SELECT 1 FROM omni.disparo_whatsapp dw 
                  WHERE dw.seq_empresa = e.seq_empresa AND dw.indicacao = $1
              )
            LIMIT $2
        ),
        leads_limpos AS (
            SELECT 
                *,
                REGEXP_REPLACE(raw_numero, '\\D', '', 'g') AS num_digitos
            FROM leads_brutos
            WHERE raw_numero IS NOT NULL
        ),
        leads_formatados AS (
            SELECT 
                seq_empresa,
                cnpj_numeros,
                razao_social,
                indicacao,
                
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
            FROM leads_limpos
        ),
        leads_filtrados AS (
            SELECT *
            FROM leads_formatados
            WHERE LENGTH(numero_final) = 13 
              AND SUBSTRING(numero_final, 5, 1) = '9'
        ),
        inserted_disparos AS (
            INSERT INTO omni.disparo_whatsapp (seq_empresa, seq_consultor, numero, indicacao, dt_disparo)
            SELECT seq_empresa, $3, numero_final, indicacao, CURRENT_TIMESTAMP
            FROM leads_filtrados
            RETURNING seq_empresa, numero
        )
        SELECT 
            l.nome_contato AS nome,
            i.numero,
            l.razao_social,
            l.cnpj_numeros AS cnpj
        FROM leads_filtrados l
        INNER JOIN inserted_disparos i ON l.seq_empresa = i.seq_empresa;
        `;

        try {
            const result = await pool.query(query, [indicacao, limit, seq_consultor]);
            return result.rows;
        } catch (error: any) {
            console.error("[DisparoWhatsappRepository] Erro ao gerar e inserir leads disparo:", error.message);
            throw error;
        }
    }
}

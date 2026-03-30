
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
            console.error("[ServicoClaroRepository] Erro ao buscar seq_consultor por codigo_crm:", error);
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
            console.error("[ServicoClaroRepository] Erro ao buscar histórico da empresa:", error);
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
            dados.valor_dia
        ];

        const result = await pool.query(query, values);

        return result.rows[0];
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
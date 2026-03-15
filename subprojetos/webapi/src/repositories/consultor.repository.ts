
import { MetasConsultor } from "../interfaces/consultor_metas.interface.js";
import pool from "../module/postgresdb/conexao.js";

export default class ConsultorRepository {
    async buscarConsultores() {
        const query = `
            SELECT 
                seq_consultor,
                nome,
                meta_mensal
            FROM omni.consultor
            ORDER BY nome
        `;

        const result = await pool.query(query);
        return result.rows;
    }

    async buscarConsultorPorSeq(seq: number) {

        const query = `
        SELECT
            seq_consultor,
            nome,
            email,
            meta_mensal
        FROM omni.consultor
        WHERE seq_consultor = $1
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
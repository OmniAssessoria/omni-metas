import pool from "../module/postgresdb/conexao.js";

export default class ServicoClaroRepository {

    /**
     * Busca os serviços de RENOVAÇÃO qualificados para integração com o CRM.
     */
    async buscarServicosClaroPipeRenovacao() {
        const query = `
            SELECT *
            FROM omni.api_subir_renovacao;
        `;

        try {
            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            console.error("[ServicoClaroRepository] Erro ao buscar RENOVAÇÕES para o PipeRun:", error);
            throw error;
        }
    }

    /**
     * Busca os serviços de PORTABILIDADE qualificados para integração com o CRM.
     */
    async buscarServicosClaroPipePortabilidade() {
        const query = `
            SELECT *
            FROM omni.api_subir_portabilidade;
        `;

        try {
            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            console.error("[ServicoClaroRepository] Erro ao buscar PORTABILIDADES para o PipeRun:", error);
            throw error;
        }
    }

    /**
     * Atualiza a flag de controle de envio ao CRM para evitar duplicidade de integração.
     * @param seq_claro Identificador único do serviço Claro.
     */
    async atualizarSituacaoServicoPipe(seq_claro: number) {
        const query = `
            UPDATE omni.servico_claro
            SET crm = TRUE
            WHERE seq_claro = $1
            RETURNING *;
        `;

        try {
            const result = await pool.query(query, [seq_claro]);
            return result.rows[0] || null;
        } catch (error) {
            console.error(`[ServicoClaroRepository] Erro ao atualizar flag CRM para o serviço ${seq_claro}:`, error);
            throw error;
        }
    }
}
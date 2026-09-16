import pool from "../module/postgresdb/conexao.js";
import { INovoHistoricoEmpresaConsultor } from "../interfaces/novo_historico_empresa_consultor.interface.js";

export default class DisparoWhatsappRepository {
    async atualizarSituacaoCrmDisparo(seq_empresa: number, id_lead: number, situacao_crm: string) {
        const query = `
      UPDATE omni.disparo_whatsapp
      SET situacao_crm = $1
      WHERE seq_empresa = $2 AND id_lead = $3
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
}

import pool from "../module/postgresdb/conexao.js";

export default class MotivoDeclinioRepository {

  async buscarMotivosDeclinio() {
    const query = `
      SELECT 
          seq_motivo_declinio,
          motivo_declinio,
          situacao_atendimento,
          id_motivo_declinio
      FROM omni.motivo_declinio;
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  async buscarMotivoDeclinioPorIdCrm(id_motivo_declinio: string) {
    const query = `
      SELECT 
          seq_motivo_declinio,
          motivo_declinio,
          situacao_atendimento,
          id_motivo_declinio
      FROM omni.motivo_declinio 
      WHERE id_motivo_declinio = $1;
    `;
    try {
      const result = await pool.query(query, [id_motivo_declinio]);
      return result.rows[0]; 
    } catch (error) {
      console.error(
        "[MotivoDeclinioRepository] Erro ao buscar motivo_declinio por id_motivo_declinio:",
        error,
      );
      throw error;
    }
  }

  async criarMotivoDeclinio(
    seq_motivo_declinio: number, 
    motivo_declinio: string, 
    situacao_atendimento: string, 
    id_motivo_declinio: string
  ) {
    const query = `
      INSERT INTO omni.motivo_declinio (
        seq_motivo_declinio,
        motivo_declinio,
        situacao_atendimento,
        id_motivo_declinio
      ) VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const params = [seq_motivo_declinio, motivo_declinio, situacao_atendimento, id_motivo_declinio];
    
    try {
      const result = await pool.query(query, params);
      return result.rows[0];
    } catch (error) {
      console.error("[MotivoDeclinioRepository] Erro ao criar novo motivo de declínio:", error);
      throw error;
    }
  }
}

import pool from "../module/postgresdb/conexao.js";

export default class ServicoOperadoraRepository {
  async buscarServicoOperadoraPorSeqEmpresa(seq_empresa: number) {
    const query = `SELECT * FROM omni.servico_operadora WHERE seq_empresa = $1;`;
    try {
      const result = await pool.query(query, [seq_empresa]);
      return result.rows;
    } catch (error) {
      console.error(
        "[ServicoClaroRepository] Erro ao buscar linahs telefonicas por seq_empresa:",
        error,
      );
      throw error;
    }
  }
}

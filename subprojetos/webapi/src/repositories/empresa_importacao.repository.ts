import pool from "../module/postgresdb/conexao.js";

export default class ImportacaoBasesRepository {
  
  async buscarEmpresaPorCnpj(cnpj: string) {
    const query = `
      SELECT 
        seq_empresa, 
        qtd_servico_claro, 
        docdrive, 
        dt_leitura_edoc, 
        dt_leitura_cpc, 
        dt_leitura_google_fontes 
      FROM omni.empresa 
      WHERE cnpj = $1
    `;
    const result = await pool.query(query, [cnpj]);
    return result.rows[0]; 
  }

  async atualizarEmpresa(seq_empresa: number, origem: string, resetarCpc: boolean, resetarEdoc: boolean) {
    const setClauses = [
      `prioridade = $2`,
      `dt_leitura_google_fontes = null`
    ];

    if (resetarCpc) {
      setClauses.push(`dt_leitura_cpc = null`);
    }
    
    if (resetarEdoc) {
      setClauses.push(`dt_leitura_edoc = null`);
    }

    const query = `
      UPDATE omni.empresa 
      SET ${setClauses.join(", ")} 
      WHERE seq_empresa = $1
    `;
    
    await pool.query(query, [seq_empresa, origem]);
  }

  async inserirEmpresa(cnpj: string, razao: string, origem: string) {
    const query = `
      INSERT INTO omni.empresa (
        cnpj, 
        razao, 
        dt_leitura_cpc, 
        dt_leitura_edoc, 
        dt_leitura_google_fontes, 
        prioridade
      ) 
      VALUES ($1, $2, null, null, null, $3)
    `;
    
    await pool.query(query, [cnpj, razao, origem]);
  }
}

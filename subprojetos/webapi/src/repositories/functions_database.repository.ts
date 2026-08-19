import LoggerHelper from "../helpers/logger.help.js";
import pool from "../module/postgresdb/conexao.js";

export default class FunctionsDatabaseRepository {
  private logger: LoggerHelper;

  constructor() {
    this.logger = new LoggerHelper("db_rotinas_log");
  }

  async executarValidacaoTemporarioClaro() {
    const query = `SELECT omni.fn_validar_temporario_claro();`;
    try {
      this.logger.info(
        `[DB] Executando rotina noturna: omni.fn_validar_temporario_claro()...`,
      );
      const result = await pool.query(query);
      this.logger.info(
        `[DB] Rotina fn_validar_temporario_claro executada com sucesso.`,
      );
      return result.rows;
    } catch (error) {
      this.logger.error(
        "[FunctionsDatabaseRepository] Erro Crítico ao executar fn_validar_temporario_claro",
        error,
      );
      throw error;
    }
  }

  async executarValidacaoTemporarioOmni() {
    const query = `SELECT omni.fn_validar_servico_omni_temporario();`;
    try {
      this.logger.info(
        `[DB] Executando rotina noturna: omni.fn_validar_servico_omni_temporario()...`,
      );
      const result = await pool.query(query);
      this.logger.info(
        `[DB] Rotina fn_validar_servico_omni_temporario executada com sucesso.`,
      );
      return result.rows;
    } catch (error) {
      this.logger.error(
        "[FunctionsDatabaseRepository] Erro Crítico ao executar fn_validar_servico_omni_temporario",
        error,
      );
      throw error;
    }
  }

  async executarValidacaoLeituraCpcForaDoPrazo() {
    const query = `SELECT omni.fn_verificar_aquecendo();`;
    try {
      this.logger.info(
        `[DB] Executando rotina da madrugada: omni.fn_verificar_aquecendo()...`,
      );
      const result = await pool.query(query);
      this.logger.info(
        `[DB] Rotina fn_verificar_aquecendo executada com sucesso. Base recalibrada.`,
      );
      return result.rows;
    } catch (error) {
      this.logger.error(
        "[FunctionsDatabaseRepository] Erro Crítico ao executar fn_verificar_aquecendo",
        error,
      );
      throw error;
    }
  }
}

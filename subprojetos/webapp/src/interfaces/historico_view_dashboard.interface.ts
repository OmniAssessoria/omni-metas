export interface IHistoricoViewAPI {
  seq_historico_consultor_empresa: number;
  historico_tipo_servico: string;
  data_inicio_atendimento: string;
  data_fim_atendimento: string | null;
  seq_empresa: number;
  empresa_cnpj: string;
  empresa_razao: string;
  seq_consultor: number | null;
  consultor_nome: string | null;
  codigo_crm: string | null;
  seq_motivo_declinio: number | null;
  motivo_declinio: string | null;
  situacao_atendimento: string | null;
  total_historico_consultor: number;
  total_historico_empresa: number;
  total_por_motivo_declinio: number;
}

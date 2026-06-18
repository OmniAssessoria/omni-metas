export interface INovoHistoricoEmpresaConsultor {
  seq_empresa: number;
  seq_consultor: number;
  tipo_servico: "CLARO" | "VIVO";
  data_inicio_atendimento: Date;
  data_fim_atendimento: Date;
  seq_motivo_declinio: number;
}

export interface INovoHistoricoEmpresaConsultorServicoOmni {
  seq_empresa: number;
  seq_consultor: number;
  data_inicio_atendimento: Date;
  data_fim_atendimento: Date;
  seq_motivo_declinio: number;
}

export interface DadosServicoOperadora {
  seq_servico_operadora: number;
  seq_empresa: number;
  tipo_servico: "CLARO" | "VIVO";
  dt_fim_compromisso: string;
  numero_linha: number;
  plano: string;
  valor: string;
  bonus: string;
  linha_ativa: boolean;
}
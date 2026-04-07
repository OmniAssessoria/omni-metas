export interface IServicoViewAPI {
  seq_claro: number;
  seq_empresa: number;
  seq_consultor: number | null;
  empresa_razao: string;
  empresa_cnpj: string;
  ddd_predominante: string;
  indicacao: string;
  situacao: string;
  classificacao_contrato:
    | string
    | "CA"
    | "CC"
    | "CE"
    | "CG"
    | "CB"
    | "CD"
    | "CF";
  carteira: string | null;
  observacao: string | null;
  qtd_linhas_total: number;
  qtd_linhas_ativas: number;
  qtd_linhas_claro_operadora: number;
  dt_fim_contrato: string | null;
  dt_fechamento: string | null;
  dt_ultima_leitura_servico: string | null;
  dt_leitura_cpc_empresa: string | null;
  flag_crm_servico: boolean;
  flag_cpc_servico: boolean;
  flag_edoc_servico: boolean;
  servico_claro_ativo: boolean;
  consultor_nome: string | null;
}

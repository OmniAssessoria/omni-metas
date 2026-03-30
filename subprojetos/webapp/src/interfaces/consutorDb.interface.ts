export default interface ConsultorBD {
  seq_consultor: number;
  nome: string;
  meta_mensal: number | null;
  codigo_crm: number;
  perfil_indicacao: string;
  perfil_qtd_linhas_min: number;
  perfil_qtd_linhas_max: number;
}

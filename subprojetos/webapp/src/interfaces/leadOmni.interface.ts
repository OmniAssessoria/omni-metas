export interface ILeadOmniResponse {
  seq_servico_omni: number;
  situacao: string;
  crm: boolean;
  dt_crm: string | null;
  codigo_crm: string | null;
  seq_empresa: number;
  cnpj: string;
  razao: string;
  docdrive: string | null;
  nome_decisor: string | null;
  numero_decisor: string | null;
  email_decisor: string | null;
  linha_claro: string | null;           
  seq_consultor: number;
  nome_consultor: string | null;
  email_consultor: string | null;
  google_fontes_telefones: string | null;
  google_fontes_emails: string | null;    
  google_fontes_sites: string | null;     
  google_fontes_nomes_fantasia: string | null;
  site_empresarial_telefones: string | null;
  site_empresarial_emails: string | null;
}

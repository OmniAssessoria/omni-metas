
export type TipoPerfil = "RENOVACAO" | "PORTABILIDADE" | "CARTEIRA" | "AMBOS";

export interface IConsultor {
  seq: number;
  owner_id: number;
  nome: string;
  email: string;
  perfil: TipoPerfil;
}

export interface IPipeRunDeal {
  id: number;
  pipeline_id: number;
  owner_id: number;
  status: number;
}

export interface IResultadoConsultor {
  seq: number;
  owner_id: number;
  nome: string;
  perfil: string;
  total_oportunidades: number;
}

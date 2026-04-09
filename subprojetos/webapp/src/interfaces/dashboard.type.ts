export type ViewState = "geral" | "renovacao" | "portabilidade";
export type TipoCarteiraFilter = "AMBOS" | "COM_CARTEIRA" | "SEM_CARTEIRA";
export type TipoSituacaoFilter =
  | "TODOS"
  | "ABERTO"
  | "INVIAVEL"
  | "TEMPORARIO"
  | "PAUSADO"
  | "GANHO"
  | "BLACKLIST";
export type TipoPiperunFilter = "AMBOS" | "SIM" | "NAO";
export type TipoAtivoFilter = "TODOS" | "SIM" | "NAO";
export type TipoClassificacaoFilter =
  | "TODOS"
  | "CA"
  | "CB"
  | "CC"
  | "CD"
  | "CE"
  | "CF"
  | "CG"
  | "SEM_CLASSIFICACAO";
export type TipoFiltroLinha = "NONE" | "RANGE" | "EXACT";

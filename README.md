PostgreSQL
│
│
├── tabelas
│ consultor
│ consultor_metas
│
├── VIEW com cálculos
│
└── BI (Metabase / PowerBI)
│
└── dashboards

Aplicação Admin (Node + React)
│
│ insere / atualiza dados
▼
Banco ── :contentReference[oaicite:0]{index=0}
│
│ VIEW com cálculos
▼
Ferramenta BI (consulta direto)
│
▼
Dashboard / gráficos

meta acumulada
│
│ ─────── meta esperada
│ /
│ /
│ /
│ /
│ / ● vendas reais
└────────────────────────────
1 2 3 4 5 6 7 8 9
dias



# lista de funis e hash piperun

```
Funis Pipe:

PROSPECÇÃO | funil: 90697 | Pega todas as etapas
PROSPECÇÃO PORTIN | funil: 102509 | Pega todas as etapas
PROSPECÇÃO VIVO | funil: 94063 | Pega todas as etapas
PROSPECÇÃO CARTEIRA | funil: 93990 | Pega todas as etapas
FOLLOW UP | funil: 91356 | Pega todas as etapas
FOLLOW UP PONTIN | funil: 103176 | Pega todas as etapas
PROCESSOS BKO | funil: 91369 | Pega todas as etapas
ASSINATURA | funil: 77127 | Pega todas as etapas
APOIO 1 | funil: 95219 | Pegar todas etapas
APOIO | funil: 95265 | Pegar todas etapas
APOIO 1 | GANHO | hash: c1d9312f-db68-4379-8820-a5d3619ec002 | Apenas uma etapa de ganhos
APOIO | GANHO | hash:  6b9a2da5-c640-48c3-8cf5-adb63a726a27 | Apenas uma etapas de ganhos
```





# Validar no backend
- Olhar a data de de criados e fechados dos ganhos dentro do periodos

- Se esta puxando os delcinio dessas etapas:
    - PROSPECÇÃO
    - PROSPECÇÃO CARTEIRA
    - PROSPECÇÃO PORTIN
    - FOLLOW UP 
    - FOLLOW UP PORTIN
    - PROCESSOS BKO
    - ASSINATURA
    - APOIO CLARO (VERMELHO)
    - APOIO VIVO (ROXO)

- Se os clientes ganhos estão inserindo o cosultor ganho como carteira.

# Validar filtros da dashboards (Banco de dados)

- DashBoard Servicos
    - Validar importação e prints
    - Validar filtros de colunas

- Dashboard Carteira
    - Validar importação e prints
    - Validar filtros de colunas

- DashBoard Crm
    - Validar importação e prints OK
    - Validar filtros de colunas OK

- Dashboard historico
    - Validar importação e prints
    - Validar filtros de colunas


# Validação dos filtros da Dashoard Analise geral de Bases (Serviços Claro)

## Descrição de cara um dos parametros e qual sua responsabilidade no banco.

interface que vem do banco é essa:

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
  exclusivo: boolean;
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

export interface IApiResponseView {
  status: boolean;
  mensagem: string;
  dados: any[];
}


# Filtros e qual paremtro responsavel.

- Limpar Filtros: Limpar todos os filtros e trazer os dados cru.
- Aplicar na Base atual: Aplicar filtros adicionados
- Serviço ativo
    - Todos (Ativos e Inativos): servico_claro_ativo = true e false
    - Sim (Apenas Ativos): servico_claro_ativo = true
    - Não (Apenas Inativos): servico_claro_ativo = false 
- Serviço Exclusivo:
    - Ambos (Sim e Não): exclusivo = true e false
    - Sim (Apenas exclusivos): exclusivo = true
    - Não (Apenas Normais): exclusivo = false
- Região (DDD Maioral):
    - Todos os DDDs: Exibe todos independente do DDD
    - Todos (Sem 11 p/ Renovação e Fora do Estado): ddd_predominante todos os DDD menos os fora de estado, para os registros que são renovação não se inclui aqueles de DDD 11.
    - Todos (Exclusivos 11 Renovação): ddd_predominante somente que são 11
    - DDDs fora de São Paulo: ddd_predominante deve ser somente aqueles fora de são paulo oou seja que esteja fora de 11 a 19.
    - retantes dos filtros....
- Consultor Atribuido
    - Todos os Consultores: Mostra todos os registros com consultor ou sem
    - Não atribuidos: Aqueles servicos que não tem consultor :seq_consultor
    - Consultores Disponiveis: Exibe serviços que estao com aquele consultor :seq_consultor
        - Lista dos consultores.... :seq_consultor
- Situação do Atendimento
    - Todas as Situações: Não filtra por situação,tras todas :situacao
    - Aberto, Temporário.... E os retantes das situação ai filtra pela situação que esta correspondente.
- Atrib. de Carteira 
    - Ambos (Com e Sem): Servicos que tem a :carteira = null ou carteira is not null
    - Com Carteira : Servicos que tem carteira is not null
    - Sem Carteira : servicos que tem carteira null
- Abertos no Piperun (CRM)
    - Ambos (Dentro e Fora): Todos que tem variavel flag_crm_servico = true ou false
    - Sim (No CRM): flag_crm_servico = true
    - Não (Fora do CRM): flag_crm_servico = false
- Vencimento Contr.
    - dd/mm/aaaa : Só filtra a data do contrato mesmo.
- Classificação
    - Todas as Classificações: Todas as Classificação independente de qual seja classificacao_contrato 
    - as classificação dos contratos....
    - Sem Classificação: todos que tem classificacao_contrato = null
- Dias da Leitura CPC
    - é um seletor que conta em dias exemplo
    - 1d, 30d... Esse filtro vai pegar a dt da ultima leitura e conta os dias a partir de hoje.
- Controle de volume de linha
    - Vai olhar a variavel de qtd de linhas e no filtro vai pegar os registros que for setado naquele periodo exemplo
    serviços com 1 a 3 linhas, de 2 a 10... e afim.

# Pontos a ajustar

- Sincronização de declinio API PORTABILIDADE / API RENOVAÇÂO (ALTERAÇÂO servico_claro e disparo_watsapp)
- Adicionar Carolina na tela portin para subir leads
- Ajustar propostas ✅
- Adicioonar tela de acompanhamento de leads Dashboard (função de atribuir leads, (mesmo que do python dash controle painel))


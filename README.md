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
APOIO 1 | hash: c1d9312f-db68-4379-8820-a5d3619ec002 | Apenas uma etapa de ganhos
APOIO | hash:  6b9a2da5-c640-48c3-8cf5-adb63a726a27 | Apenas uma etapas de ganhos
```






# Pontos para valdiar na DashBoard

- Validar calculo dos leads (ganhos, perdidos e abertos)
    - Valide pelo geral, seguindo a data de criação e data de declinio (Perdidos e Ganhos) dentre o periodo definido.
    - Para os abertos, segue a lógica de mostrar todos os abertos para aquele consultor.
    - Para puxar os perdidos e abertos tem de ser esses funis:
        - PROSPECÇÃO
        - PROSPECÇÃO CARTEIRA
        - PROSPECÇÃO PORTIN
        - FOLLOW UP 
        - FOLLOW UP PORTIN
        - PROCESSOS BKO
        - ASSINATURA
        - APOIO CLARO (VERMELHO)
        - APOIO VIVO (ROXO)

        - Possibilidade de filtrar os perdidos a partir da data do filtro.
    - Para puxar os ganhos somente em apoio no hash de ganhos.
        - possibilidade de filtrar os ganhos a partir da data do filtro.
    - Puxar abertos
        - Possibilidade de filtrar os abertos a partir da data do filtro.
    
    - Cores: Aberto amarelo, Perdidos Vermelho e Ganhos Verde.
    - Totalizador de cada um abaixo.
        - Ganhos: 
        - Perdidos:
        - Abertos: 
    
    - Remover a porcentagem e o valor.

# Validar no backend

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


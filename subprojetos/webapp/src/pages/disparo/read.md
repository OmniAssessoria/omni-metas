# FLUXO DE PROCESSAMENTO E PRODUÇÂO

### Subir Base
A gestão de base vai ser tres processo
- Subir o grupo de contatos
- Subir o lead no piperun
- Subir ao banco

1. Subir o grupo de contatos (separação de base)
Deve-se distribuir igualmente há cada consultor um grupo de contatos com 200 para 5 dias (40 cada dia) da semana. Os disparo começa todas as segundas feira, uma campanha para cada consultor e uma conexao flex para cada.

2. Subir o lead no piperun
Assim que atribuido um cliente a um consultor deve-se adicionar ao banco de dados o seq_consultor, setar true na variavel de indicação de disparo e informar a data do disparo. Na Aplicação vai haver um botão de disparo, no qual ele vai pegar todos que estão com (disparo true, data_disparo true, seq_consultor informado, dt_crm null, crm = false e codigo_crm false) vai criar os leads para cada um no pipeline do consultor especifico, com as informações de cada empresa especifica, o processo usual e ao final atualizar o banco com as informações de cada um dos leads (dt_crm, codigo_crm, crm = true)

3. Atualizar banco para cada uma das alterações.


### Voltar Base ou Redisparo
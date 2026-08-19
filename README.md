# Service Flow Pro

Crie uma aplicação web estilo para ser instalado no celular com o PWA para gestão de ordens de serviços de conforme a descrição abaixo.

1. Gestão Central SaaS (Super Admin - Você)

Ativação e Controle de Empresas: Cadastra as empresas de manutenção de chopeiras e refrigeração.

Gestão de Acesso: Bloqueia ou libera o acesso das Empresas com base no pagamento das mensalidades.

Informativo Financeiro: Informativo de Cliente que não pagou, assim posso decidir se faço o bloqueio. Após o pagamento, a tela altera o status retirando a notificação de cliente devedor. Assim devo cadastrar meu pix que é 02520340312 ou outro em um campo específico para facilitar o pagamento dos clientes via PIX.

2. Passo a Passo do Fluxo Operacional (Gestor & Técnico)

Passo 1: Preparação de Base (Tela do Gestor)

Cadastra a equipe de técnicos e o login e senha de acesso ao sistema.

Catálogo inicial de serviços (sanitização, carga de gás, troca de peças)

Cadastro de Clientes (bares, restaurantes, distribuidores e eventos) com nome, endereço completo e nome do responsável no local.




Passo 2: Planejamento e Cadastro de Rotas (Tela do Gestor)

O gestor cria a Rota de Atendimento de hoje, amanhã ou da semana para cada técnico, informando a ordem de cada atendimento e agrupando as ordens de serviço (emergenciais, preventivas ou sanitização periódicas) para otimizar o deslocamento.

Para cada rota criada uma breve descrição do que se deve fazer no local.




Passo 3: Consulta do Cliente e Destino no Celular (Tela do Técnico)

Ao abrir o aplicativo, o técnico visualiza sua Rota de hoje, amanhã ou da semana.

O técnico consulta os detalhes do cliente onde fará o atendimento:

Nome do estabelecimento e responsável no local.

Endereço completo com acionamento de rota no Waze / Google Maps.

Descrição do problema ou tipo de serviço solicitado (ex: Freezer parou de gelar, Sanitização de chopeira, Instalação de equipamento).




Passo 4: Chegada ao Local e Check-in (Tela do Técnico)

O técnico confirma o recebimento da demanda e aciona o Início de Deslocamento

Check-in ao chegar no estabelecimento do cliente. 

Observação: Sempre que o técnico mudar o status o gestor é informado através do sistema.




Passo 5: Identificação ou Cadastro do Equipamento no Local (Tela do Técnico)

Se o equipamento já existe no sistema:

O técnico seleciona a chopeira, freezer ou visacooler na lista do cliente.

O app exibe a Ficha de Vida Útil do Equipamento: histórico de manutenções passadas, datas de sanitização e peças que já foram trocadas anteriormente.

Se o equipamento for NOVO (Primeiro Atendimento):

O próprio técnico realiza o registro do equipamento direto pelo aplicativo:

Tipo de equipamento (Chopeira a gelo/elétrica/naja, Freezer horizontal/vertical, Visacooler, Balcão refrigerado, etc.).

Marca, modelo e número de série.

Especificações técnicas: voltagem (110V/220V/Trifásico), tipo de gás refrigerante (ex: R134a, R290, R404a), nº de torneiras/vias e tipo de extratora.




Passo 6: Execução, Apontamento de Observações e Peças (Técnico)

No aplicativo, registra:

Observações técnicas sobre o diagnóstico e a solução.

Peças e insumos consumidos na atividade (ex: vedações/O-rings, mangueira atóxica, abraçadeiras, torneira, manômetro, carga de gás).

Cadastro dinâmico de peças: Se a peça utilizada não constar na lista padrão, o técnico cadastra o nome na hora, e o sistema salva a peça no banco de dados para ficar disponível em atividades futuras.




🆕 Passo 7: Conclusão do Serviço e Registro de Tempo (Técnico & Gestor)

Aviso de Conclusão (Check-out): O técnico aciona a opção de finalizar o serviço assim que concluir o trabalho no cliente. Ele não pode desfazer esse status.

Cálculo de Tempo: O sistema calcula automaticamente o tempo total decorrido do atendimento (diferença entre o Check-in e a Conclusão).

Histórico de Produtividade: O tempo de execução é registrado no histórico individual do técnico e na ficha da Ordem de Serviço, permitindo que o gestor saiba exatamente quanto tempo cada técnico levou para concluir cada atendimento.




🆕 Passo 8: Relatórios e Gráficos de Desempenho (Visão do Gestor)

Painel de Relatórios: Disponível no painel do gestor com filtros flexíveis para consultar atendimentos da semana atual, do mês atual e de meses passados.

Gráficos Interativos:

Volume total de atendimentos (Concluídos vs. Pendentes) no período selecionado.

Tempo médio de atendimento por técnico e por tipo de serviço (Corretiva, Sanitização, Preventiva).

Comparativo de produtividade entre técnicos.

Ranking de peças e insumos mais utilizados no mês/semana.

Histórico de Atendimento por Cliente ou técnico

.

Observação: Na tela de gestão do cliente o mesmo deve receber um aviso de que o pagamento está próximo ou vencido com a opção de pagamento via QRCODE por pix.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://cool-repair-manager.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/beeaaaae-a1f2-46cd-8453-c5c8eacb20ab).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

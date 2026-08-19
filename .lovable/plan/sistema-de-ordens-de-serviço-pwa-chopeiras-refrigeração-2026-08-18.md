# Sistema de Ordens de Serviço (PWA) — Chopeiras & Refrigeração

App instalável no celular, com três perfis: Super Admin (SaaS), Gestor da empresa e Técnico.
Backend com Lovable Cloud (banco, login, storage) e regras de acesso por empresa.

## Perfis e telas

**Super Admin**
- Cadastro/ativação de empresas de manutenção.
- Bloqueio e liberação de acesso conforme pagamento da mensalidade.
- Painel financeiro: lista de empresas em dia / próximas do vencimento / vencidas, com destaque de devedores. Ao registrar pagamento, o alerta some.
- Campo de chave PIX (pré-preenchida com 02520340312, editável) usada para gerar o QR Code de cobrança.

**Gestor**
- Aviso no topo quando a mensalidade está próxima do vencimento ou vencida, com QR Code PIX + copia-e-cola.
- Cadastro de técnicos (login e senha de acesso).
- Catálogo de serviços (sanitização, carga de gás, troca de peças...).
- Cadastro de clientes: nome, endereço completo, responsável no local, telefone.
- Rotas: cria rota por técnico e data (hoje/amanhã/semana), define ordem de atendimento e agrupa as OS (emergencial, preventiva, sanitização) com descrição do que fazer no local.
- Notificações em tempo real a cada mudança de status do técnico.
- Painel de relatórios (abaixo).

**Técnico (celular)**
- Minha rota: hoje / amanhã / semana, em ordem de atendimento.
- Detalhe do atendimento: estabelecimento, responsável, endereço com botões Waze e Google Maps, descrição do problema/serviço.
- Fluxo de status irreversível: Recebido → Em deslocamento → Check-in → Concluído (check-out não pode ser desfeito).
- Equipamentos do cliente: seleciona um existente e vê a Ficha de Vida Útil (histórico de manutenções, sanitizações, peças trocadas) ou cadastra novo equipamento: tipo, marca, modelo, nº de série, voltagem, gás refrigerante, nº de torneiras/vias, tipo de extratora.
- Execução: observações técnicas e peças/insumos consumidos, com cadastro dinâmico de peça nova que fica salva para o futuro.
- Ao concluir, o sistema calcula o tempo total (check-in → conclusão).

## Relatórios (Gestor)
Filtros por semana atual, mês atual e meses anteriores:
- Atendimentos concluídos vs. pendentes.
- Tempo médio por técnico e por tipo de serviço.
- Comparativo de produtividade entre técnicos.
- Ranking de peças e insumos mais usados.
- Histórico por cliente e por técnico.

## Dados (Lovable Cloud)
`companies` (status, vencimento, chave PIX), `profiles`, `user_roles` (super_admin, gestor, tecnico), `payments`, `customers`, `equipments`, `services`, `parts`, `work_orders` (status, timestamps, tempo total), `work_order_parts`, `routes`, `route_stops`, `status_events`.
Isolamento por empresa via RLS; papéis em tabela separada; realtime para avisar o gestor.

## PWA
Manifest, ícones, service worker com cache do app shell e prompt de instalação no celular.

## Visual
Tema escuro industrial com âmbar de destaque (chopp), tipografia condensada, cards grandes e botões de ação com alvo amplo para uso em campo.

## Entrega em etapas
1. Cloud + banco + login + papéis + PWA base e design system.
2. Gestor: técnicos, serviços, clientes, equipamentos.
3. Rotas e OS + app do técnico (status, equipamentos, peças, tempo).
4. Relatórios e gráficos.
5. Super Admin + financeiro/PIX e avisos de cobrança.

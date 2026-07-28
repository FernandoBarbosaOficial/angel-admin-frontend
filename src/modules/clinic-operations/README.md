# Operação clínica em tempo real

Módulo Polibon-only para acompanhamento dos agendamentos confirmados pelo Angel na Feegow.

## Contrato consumido

- `GET /api/admin/operacao/tempo-real`
- autenticação administrativa já existente;
- escopo fixo da Polibon;
- identificação do paciente protegida;
- nenhuma exibição de telefone, nascimento, carteirinha ou identificador bruto de sessão.

## Comportamento

- atualização automática a cada 15 segundos;
- retenção da última leitura válida em falhas transitórias;
- modo TV com fullscreen e alto contraste;
- acesso separado aos indicadores do dia;
- tela independente da fila de confirmações.

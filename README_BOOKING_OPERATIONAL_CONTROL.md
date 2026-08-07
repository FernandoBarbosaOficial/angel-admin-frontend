# Controle de agendamento

Módulo operacional para pausa e limite diário do booking automático pelo WhatsApp.

- Inserido em OPERAÇÃO CLÍNICA sem alterar `OperationRealtimePanel` nem `DailyOperationsDashboard`.
- Exibe conexão WhatsApp como status somente leitura.
- Exibe confirmados hoje, limite, capacidade em confirmação e disponibilidade restante.
- Permite ATIVO/PAUSADO e limite inteiro/SEM LIMITE.
- Usa `expectedVersion` para evitar sobrescrita silenciosa entre operadores.
- Atualiza indicadores a cada 15 segundos enquanto aberto.
- A autorização real permanece no backend (`operations.read` / `operations.manage`).

Antes do merge: executar `npm run build`, `npm run smoke:operation-realtime` e `node scripts/booking-operational-control-static-smoke.mjs`.

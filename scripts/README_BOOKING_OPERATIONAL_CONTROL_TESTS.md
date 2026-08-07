# Validações antes do merge

```bash
npm ci
npm run build
node scripts/booking-operational-control-static-smoke.mjs
npm run smoke:operation-realtime
```

Validar também manualmente: ATIVO, PAUSADO, SEM LIMITE, limite finito, status amarelo próximo do limite, vermelho no limite/pausa, atualização concorrente por `expectedVersion` e ausência de regressão em Operação em tempo real / Visão do dia.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const panel = readFileSync(new URL("../src/modules/clinic-operations/OperationRealtimePanel.tsx", import.meta.url), "utf8");
const legacy = readFileSync(new URL("../src/legacy/LegacyAdminPanel.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

assert.match(panel, /\/api\/admin\/operacao\/tempo-real/);
assert.match(panel, /AUTO_REFRESH_SECONDS = 15/);
assert.match(panel, /protectPatientName/);
assert.match(panel, /Modo TV/);
assert.match(panel, /Indicadores do dia/);
assert.doesNotMatch(panel, /pré-agendamento|pre-agendamento|preagendamento/i);
assert.doesNotMatch(panel, /session_id|data_nascimento|carteirinha|from_phone|telefone/i);
assert.match(legacy, /operacao_tempo_real/);
assert.match(legacy, /Operação em tempo real/);
assert.match(styles, /operation-tv-mode/);

console.log("admin-operation-realtime-frontend-smoke: ok");

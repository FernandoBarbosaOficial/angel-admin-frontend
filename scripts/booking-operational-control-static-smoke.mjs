import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const shell = read('src/app/AppShell.tsx');
const launcher = read('src/modules/clinic-operations/BookingOperationalControlLauncher.tsx');
const realtime = read('src/modules/clinic-operations/OperationRealtimePanel.tsx');
const daily = read('src/modules/daily-operations/DailyOperationsDashboard.tsx');

assert(shell.includes('BookingOperationalControlLauncher'), 'AppShell não monta o controle operacional');
assert(launcher.includes('Controle de agendamento'), 'launcher sem rótulo esperado');
assert(launcher.includes('/whatsapp/booking-control'), 'launcher sem endpoint de controle');
assert(launcher.includes('expectedVersion'), 'launcher sem proteção de versão');
assert(launcher.includes('America/Sao_Paulo'), 'launcher sem timezone São Paulo');
assert(launcher.includes('confirmedToday'), 'launcher sem indicador de bookings confirmados');
assert(launcher.includes('remaining'), 'launcher sem capacidade restante');
assert(launcher.includes('WhatsApp conectado'), 'launcher sem status do canal');
assert(!realtime.includes('BookingOperationalControlLauncher'), 'Tempo Real não deve ser alterado pelo novo controle');
assert(!daily.includes('BookingOperationalControlLauncher'), 'Visão do Dia não deve ser alterada pelo novo controle');

console.log('booking-operational-control-static-smoke: OK');

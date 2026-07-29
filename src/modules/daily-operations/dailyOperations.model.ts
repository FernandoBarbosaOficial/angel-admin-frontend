export type DailyOperationsPeriodDays = 1 | 7 | 30;

export type DailyOperationsFunnelKey =
  | "iniciaram_agendamento"
  | "paciente_identificado"
  | "cobertura_informada"
  | "especialidade_informada"
  | "horarios_exibidos"
  | "horario_escolhido"
  | "agendado_feegow";

export type DailyOperationsOutcomeKey =
  | "agendado"
  | "orientado_recepcao"
  | "saida_paciente"
  | "timeout"
  | "regra_assistencial"
  | "cobertura_nao_validada"
  | "sem_horarios"
  | "falha_tecnica"
  | "sem_desfecho_registrado";

export type DailyOperationsTopItem = {
  label: string;
  total: number;
};

export type DailyOperationsDayItem = {
  date: string;
  label: string;
  iniciados: number;
  agendados: number;
  encerradosSemAgendamento: number;
};

export type DailyOperationsFunnelItem = {
  key: DailyOperationsFunnelKey;
  label: string;
  total: number;
  previousTotal: number | null;
  lossFromPrevious: number | null;
  conversionFromPrevious: number | null;
  evidenceDefinition: string;
};

export type DailyOperationsOutcomeItem = {
  key: DailyOperationsOutcomeKey;
  label: string;
  total: number;
  terminal: boolean;
};

export type DailyOperationsSnapshot = {
  generatedAt: string;
  contractVersion: "2.0";
  scope: {
    clienteId: 1;
    clienteNome: string;
    businessTimeZone: "America/Sao_Paulo";
    resolution: string;
  };
  period: {
    days: DailyOperationsPeriodDays;
    startAt: string;
    endAt: string;
    label: string;
  };
  summary: {
    sessoesNoEscopo: number;
    iniciaramAgendamento: number;
    agendadosFeegow: number;
    taxaConclusao: number;
    encerradosSemAgendamento: number;
    orientadosRecepcao: number;
    falhasTecnicas: number;
    semDesfechoRegistrado: number;
  };
  funnel: DailyOperationsFunnelItem[];
  outcomes: DailyOperationsOutcomeItem[];
  breakdowns: {
    agendadosPorEspecialidade: DailyOperationsTopItem[];
    agendadosPorMedico: DailyOperationsTopItem[];
    agendadosPorConvenio: DailyOperationsTopItem[];
    evolucao: DailyOperationsDayItem[];
  };
  dataQuality: {
    measurementMode: string;
    sourceTable: string;
    rowsRead: number;
    sessionsRead: number;
    sessionsWithBookingEvidence: number;
    sessionsWithFinalBookingPayload: number;
    bookingDeduplication: string;
    limitations: string[];
  };
};

type UnknownRecord = Record<string, unknown>;

const FUNNEL_ORDER: DailyOperationsFunnelKey[] = [
  "iniciaram_agendamento",
  "paciente_identificado",
  "cobertura_informada",
  "especialidade_informada",
  "horarios_exibidos",
  "horario_escolhido",
  "agendado_feegow",
];

const FUNNEL_LABELS: Record<DailyOperationsFunnelKey, string> = {
  iniciaram_agendamento: "Iniciaram agendamento",
  paciente_identificado: "Paciente identificado",
  cobertura_informada: "Cobertura informada",
  especialidade_informada: "Especialidade informada",
  horarios_exibidos: "Horários exibidos",
  horario_escolhido: "Horário escolhido",
  agendado_feegow: "Agendado na Feegow",
};

const OUTCOME_LABELS: Record<DailyOperationsOutcomeKey, string> = {
  agendado: "Agendado na Feegow",
  orientado_recepcao: "Orientado a procurar a recepção",
  saida_paciente: "Paciente encerrou o atendimento",
  timeout: "Sessão expirada por inatividade",
  regra_assistencial: "Regra assistencial",
  cobertura_nao_validada: "Cobertura não validada",
  sem_horarios: "Sem horários disponíveis",
  falha_tecnica: "Falha técnica",
  sem_desfecho_registrado: "Sem desfecho registrado",
};

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function finiteNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nonNegativeInteger(value: unknown): number {
  return Math.max(0, Math.round(finiteNumber(value)));
}

function text(value: unknown, fallback = ""): string {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function normalizeDays(value: unknown): DailyOperationsPeriodDays {
  const parsed = Number(value);
  if (parsed === 7 || parsed === 30) return parsed;
  return 1;
}

function normalizeTopItems(value: unknown): DailyOperationsTopItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const record = asRecord(item);
      return {
        label: text(record.label, "Não identificado"),
        total: nonNegativeInteger(record.total),
      };
    })
    .filter((item) => item.total > 0)
    .sort(
      (left, right) =>
        right.total - left.total ||
        left.label.localeCompare(right.label, "pt-BR"),
    );
}

function normalizeEvolution(value: unknown): DailyOperationsDayItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const record = asRecord(item);
      return {
        date: text(record.date),
        label: text(record.label, text(record.date, "Sem data")),
        iniciados: nonNegativeInteger(record.iniciados),
        agendados: nonNegativeInteger(record.agendados),
        encerradosSemAgendamento: nonNegativeInteger(
          record.encerradosSemAgendamento,
        ),
      };
    })
    .filter((item) => item.date || item.label)
    .sort((left, right) => left.date.localeCompare(right.date));
}

function normalizeFunnel(value: unknown): DailyOperationsFunnelItem[] {
  const source = Array.isArray(value) ? value : [];
  const byKey = new Map<DailyOperationsFunnelKey, UnknownRecord>();

  for (const item of source) {
    const record = asRecord(item);
    const key = text(record.key) as DailyOperationsFunnelKey;
    if (FUNNEL_ORDER.includes(key)) {
      byKey.set(key, record);
    }
  }

  let previousTotal: number | null = null;

  return FUNNEL_ORDER.map((key) => {
    const record = byKey.get(key) || {};
    const total = nonNegativeInteger(record.total);
    const normalizedPrevious =
      record.previousTotal === null || record.previousTotal === undefined
        ? previousTotal
        : nonNegativeInteger(record.previousTotal);
    const loss =
      normalizedPrevious === null
        ? null
        : Math.max(
            0,
            record.lossFromPrevious === null ||
              record.lossFromPrevious === undefined
              ? normalizedPrevious - total
              : nonNegativeInteger(record.lossFromPrevious),
          );
    const conversion =
      normalizedPrevious === null
        ? null
        : Math.max(
            0,
            Math.min(
              100,
              finiteNumber(
                record.conversionFromPrevious,
                normalizedPrevious > 0
                  ? (total / normalizedPrevious) * 100
                  : 0,
              ),
            ),
          );

    const normalized: DailyOperationsFunnelItem = {
      key,
      label: text(record.label, FUNNEL_LABELS[key]),
      total,
      previousTotal: normalizedPrevious,
      lossFromPrevious: loss,
      conversionFromPrevious:
        conversion === null ? null : Math.round(conversion * 10) / 10,
      evidenceDefinition: text(record.evidenceDefinition),
    };

    previousTotal = total;
    return normalized;
  });
}

function normalizeOutcomes(value: unknown): DailyOperationsOutcomeItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const record = asRecord(item);
      const key = text(record.key) as DailyOperationsOutcomeKey;
      if (!(key in OUTCOME_LABELS)) return null;

      return {
        key,
        label: text(record.label, OUTCOME_LABELS[key]),
        total: nonNegativeInteger(record.total),
        terminal: Boolean(record.terminal),
      };
    })
    .filter(
      (item): item is DailyOperationsOutcomeItem =>
        Boolean(item && item.total > 0),
    )
    .sort((left, right) => right.total - left.total);
}

export function normalizeDailyOperationsPayload(
  payload: unknown,
): DailyOperationsSnapshot {
  const envelope = asRecord(payload);
  const candidate =
    envelope.ok === true && envelope.data
      ? asRecord(envelope.data)
      : envelope;
  const scope = asRecord(candidate.scope);
  const period = asRecord(candidate.period);
  const summary = asRecord(candidate.summary);
  const breakdowns = asRecord(candidate.breakdowns);
  const dataQuality = asRecord(candidate.dataQuality);
  const limitations = Array.isArray(dataQuality.limitations)
    ? dataQuality.limitations.map((item) => text(item)).filter(Boolean)
    : [];

  const started = nonNegativeInteger(summary.iniciaramAgendamento);
  const booked = nonNegativeInteger(summary.agendadosFeegow);
  const calculatedRate = started > 0 ? (booked / started) * 100 : 0;

  return {
    generatedAt: text(candidate.generatedAt, new Date(0).toISOString()),
    contractVersion: "2.0",
    scope: {
      clienteId: 1,
      clienteNome: text(scope.clienteNome, "Polibon"),
      businessTimeZone: "America/Sao_Paulo",
      resolution: text(
        scope.resolution,
        "cliente_id_or_official_phone_number_id",
      ),
    },
    period: {
      days: normalizeDays(period.days),
      startAt: text(period.startAt, new Date(0).toISOString()),
      endAt: text(period.endAt, new Date(0).toISOString()),
      label: text(
        period.label,
        normalizeDays(period.days) === 1
          ? "Hoje"
          : `Últimos ${normalizeDays(period.days)} dias`,
      ),
    },
    summary: {
      sessoesNoEscopo: nonNegativeInteger(summary.sessoesNoEscopo),
      iniciaramAgendamento: started,
      agendadosFeegow: booked,
      taxaConclusao:
        Math.round(
          Math.max(
            0,
            Math.min(
              100,
              finiteNumber(summary.taxaConclusao, calculatedRate),
            ),
          ) * 10,
        ) / 10,
      encerradosSemAgendamento: nonNegativeInteger(
        summary.encerradosSemAgendamento,
      ),
      orientadosRecepcao: nonNegativeInteger(summary.orientadosRecepcao),
      falhasTecnicas: nonNegativeInteger(summary.falhasTecnicas),
      semDesfechoRegistrado: nonNegativeInteger(
        summary.semDesfechoRegistrado,
      ),
    },
    funnel: normalizeFunnel(candidate.funnel),
    outcomes: normalizeOutcomes(candidate.outcomes),
    breakdowns: {
      agendadosPorEspecialidade: normalizeTopItems(
        breakdowns.agendadosPorEspecialidade,
      ),
      agendadosPorMedico: normalizeTopItems(
        breakdowns.agendadosPorMedico,
      ),
      agendadosPorConvenio: normalizeTopItems(
        breakdowns.agendadosPorConvenio,
      ),
      evolucao: normalizeEvolution(breakdowns.evolucao),
    },
    dataQuality: {
      measurementMode: text(
        dataQuality.measurementMode,
        "observed_session_evidence",
      ),
      sourceTable: text(dataQuality.sourceTable, "whatsapp_message_logs"),
      rowsRead: nonNegativeInteger(dataQuality.rowsRead),
      sessionsRead: nonNegativeInteger(dataQuality.sessionsRead),
      sessionsWithBookingEvidence: nonNegativeInteger(
        dataQuality.sessionsWithBookingEvidence,
      ),
      sessionsWithFinalBookingPayload: nonNegativeInteger(
        dataQuality.sessionsWithFinalBookingPayload,
      ),
      bookingDeduplication: text(
        dataQuality.bookingDeduplication,
        "session_id",
      ),
      limitations,
    },
  };
}

export const DAILY_OPERATIONS_PERIOD_OPTIONS: Array<{
  value: DailyOperationsPeriodDays;
  label: string;
}> = [
  { value: 1, label: "Hoje" },
  { value: 7, label: "Últimos 7 dias" },
  { value: 30, label: "Últimos 30 dias" },
];

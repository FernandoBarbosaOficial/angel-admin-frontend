import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const POLIBON_TIME_ZONE = "America/Sao_Paulo";
const AUTO_REFRESH_SECONDS = 15;

type AdminApiRequest = <T>(path: string, options?: RequestInit) => Promise<T>;

type OperationRealtimePanelProps = {
  apiRequest: AdminApiRequest;
  onOpenIndicators: () => void;
};

type UnknownRecord = Record<string, unknown>;

type NormalizedAppointment = {
  id: string;
  scheduledAt: string | null;
  bookedAt: string | null;
  patientName: string;
  professionalName: string;
  specialty: string;
  insurance: string;
  plan: string;
  unit: string;
  status: string;
  source: string;
  feegowReference: string;
};

type NormalizedOperationSnapshot = {
  generatedAt: string | null;
  clinicName: string;
  timezone: string;
  appointments: NormalizedAppointment[];
};

type AppointmentMoment = "past" | "now" | "upcoming" | "undated";

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getPath(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!isRecord(current)) return undefined;
    return current[segment];
  }, source);
}

function firstValue(source: unknown, paths: string[]): unknown {
  for (const path of paths) {
    const value = getPath(source, path);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function asString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function firstString(source: unknown, paths: string[], fallback = ""): string {
  return asString(firstValue(source, paths)) || fallback;
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;

  const brazilian = value.match(
    /^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (brazilian) {
    const [, day, month, year, hour = "00", minute = "00", second = "00"] = brazilian;
    const parsed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    );
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function dateKeyInTimezone(date: Date, timezone = POLIBON_TIME_ZONE): string {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: POLIBON_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }
  const parts = formatter.formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatClock(value: Date): string {
  return value.toLocaleTimeString("pt-BR", {
    timeZone: POLIBON_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatTime(value: string | null): string {
  const date = parseDate(value);
  if (!date) return "Horário não informado";
  return date.toLocaleTimeString("pt-BR", {
    timeZone: POLIBON_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(value: string | null): string {
  const date = parseDate(value);
  if (!date) return "Não informado";
  return date.toLocaleString("pt-BR", {
    timeZone: POLIBON_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatUpdateAge(value: Date | null, now: Date): string {
  if (!value) return "Aguardando primeira atualização";
  const seconds = Math.max(0, Math.floor((now.getTime() - value.getTime()) / 1000));
  if (seconds < 5) return "Atualizado agora";
  if (seconds < 60) return `Atualizado há ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `Atualizado há ${minutes} min`;
}

function protectPatientName(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return "Paciente identificado";
  if (/[•*]/.test(normalized)) return normalized;
  if (/^[\p{L}À-ÿ]+\s+[\p{L}À-ÿ]\.?$/u.test(normalized)) return normalized;

  const words = normalized.split(" ").filter(Boolean);
  if (words.length === 1) {
    return `${words[0].slice(0, 1).toLocaleUpperCase("pt-BR")}***`;
  }

  const particles = new Set(["da", "de", "do", "das", "dos", "e"]);
  const initials = words
    .slice(1)
    .filter((word) => !particles.has(word.toLocaleLowerCase("pt-BR")))
    .map((word) => `${word.slice(0, 1).toLocaleUpperCase("pt-BR")}.`)
    .slice(0, 2)
    .join(" ");

  return `${words[0]}${initials ? ` ${initials}` : ""}`;
}

function normalizeStatus(value: string): string {
  const key = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

  const labels: Record<string, string> = {
    confirmed: "Confirmado na Feegow",
    confirmado: "Confirmado na Feegow",
    confirmado_feegow: "Confirmado na Feegow",
    booked: "Confirmado na Feegow",
    agendado: "Confirmado na Feegow",
    completed: "Atendimento realizado",
    concluido: "Atendimento realizado",
    atendido: "Atendimento realizado",
    cancelled: "Cancelado",
    cancelado: "Cancelado",
  };

  return labels[key] || value || "Confirmado na Feegow";
}

function findAppointmentArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;

  const preferredPaths = [
    "data.lanes.booked",
    "lanes.booked",
    "items",
    "appointments",
    "appointmentsToday",
    "appointments_today",
    "agendamentos",
    "agendamentosHoje",
    "agendamentos_hoje",
    "consultas",
    "records",
    "rows",
    "snapshot.items",
    "snapshot.appointments",
    "snapshot.agendamentos",
    "operation.items",
    "operacao.items",
    "today.items",
    "hoje.items",
  ];

  for (const path of preferredPaths) {
    const candidate = getPath(payload, path);
    if (Array.isArray(candidate)) return candidate;
  }

  const queue: Array<{ value: unknown; depth: number }> = [{ value: payload, depth: 0 }];
  while (queue.length) {
    const current = queue.shift();
    if (!current || current.depth > 3 || !isRecord(current.value)) continue;

    for (const value of Object.values(current.value)) {
      if (Array.isArray(value) && value.some(isRecord)) {
        const sample = value.find(isRecord);
        if (
          sample &&
          firstValue(sample, [
            "scheduledAt",
            "scheduled_at",
            "appointmentAt",
            "appointment_at",
            "appointmentDateTime",
            "appointment_datetime",
            "appointmentStartAt",
            "appointmentDate",
            "appointment_date",
            "dataHora",
            "data_hora",
            "dataConsulta",
            "data_consulta",
            "horario",
            "paciente",
            "pacienteNome",
            "paciente_nome",
            "patientName",
            "patient_name",
            "patientDisplayName",
            "patientLabel",
            "patient_display_name",
          ]) !== undefined
        ) {
          return value;
        }
      }
      if (isRecord(value)) queue.push({ value, depth: current.depth + 1 });
    }
  }

  return [];
}

function normalizeAppointment(raw: unknown, index: number): NormalizedAppointment {
  let scheduledAt = firstString(raw, [
    "scheduledAt",
    "scheduled_at",
    "appointmentAt",
    "appointment_at",
    "appointmentDateTime",
    "appointment_datetime",
    "appointmentStartAt",
    "startsAt",
    "starts_at",
    "startAt",
    "start_at",
    "dataHora",
    "data_hora",
    "dataConsultaHora",
    "data_consulta_hora",
    "consultaEm",
    "consulta_em",
    "horarioIso",
    "horario_iso",
    "slotStart",
    "slot_start",
  ]);

  if (!scheduledAt) {
    const appointmentDate = firstString(raw, [
      "appointmentDate",
      "appointment_date",
      "scheduledDate",
      "scheduled_date",
      "dataConsulta",
      "data_consulta",
      "data",
    ]);
    const appointmentTime = firstString(raw, [
      "appointmentTime",
      "appointment_time",
      "scheduledTime",
      "scheduled_time",
      "horaConsulta",
      "hora_consulta",
      "horario",
      "hora",
    ]);
    if (appointmentDate) scheduledAt = `${appointmentDate}${appointmentTime ? ` ${appointmentTime}` : ""}`;
  }

  const bookedAt = firstString(raw, [
    "bookedAt",
    "booked_at",
    "bookingCreatedAt",
    "booking_created_at",
    "createdAt",
    "created_at",
    "agendadoEm",
    "agendado_em",
    "confirmedAt",
    "confirmed_at",
    "updatedAt",
  ]);

  const rawPatientName = firstString(raw, [
    "patientDisplayName",
    "patient_display_name",
    "patientName",
    "patient_name",
    "patientLabel",
    "patient_label",
    "pacienteNome",
    "paciente_nome",
    "displayName",
    "display_name",
    "patientMaskedName",
    "patient_masked_name",
    "pacienteNomeExibicao",
    "paciente_nome_exibicao",
    "pacienteNomeProtegido",
    "paciente_nome_protegido",
    "patient.displayName",
    "patient.maskedName",
    "paciente.nomeExibicao",
    "paciente.nomeProtegido",
    "paciente",
  ]);

  const rawStatus = firstString(raw, [
    "statusLabel",
    "status_label",
    "status",
    "bookingStatus",
    "booking_status",
    "situacao",
  ]);

  const id = firstString(
    raw,
    [
      "id",
      "appointmentId",
      "appointment_id",
      "bookingId",
      "booking_id",
      "feegowAppointmentId",
      "feegow_appointment_id",
      "feegowAgendamentoId",
      "feegow_agendamento_id",
    ],
    `appointment-${index + 1}`,
  );

  return {
    id,
    scheduledAt: scheduledAt || null,
    bookedAt: bookedAt || null,
    patientName: protectPatientName(rawPatientName),
    professionalName: firstString(
      raw,
      [
        "professionalName",
        "professional_name",
        "professional",
        "doctorName",
        "doctor_name",
        "doctor",
        "medicoNome",
        "medico_nome",
        "professional.name",
        "doctor.name",
        "medico.nome",
        "medico",
      ],
      "Profissional não informado",
    ),
    specialty: firstString(
      raw,
      [
        "specialtyName",
        "specialty_name",
        "specialty",
        "especialidadeNome",
        "especialidade_nome",
        "specialty.name",
        "especialidade.nome",
        "especialidade",
      ],
      "Especialidade não informada",
    ),
    insurance: firstString(
      raw,
      [
        "insuranceName",
        "insurance_name",
        "insurance",
        "coverage",
        "convenioNome",
        "convenio_nome",
        "insurance.name",
        "convenio.nome",
        "convenio",
      ],
      "Convênio não informado",
    ),
    plan: firstString(raw, [
      "planName",
      "plan_name",
      "plan",
      "planoNome",
      "plano_nome",
      "productName",
      "product_name",
      "produtoNome",
      "produto_nome",
      "plan.name",
      "plano.nome",
      "produto.nome",
      "plano",
    ]),
    unit: firstString(raw, [
      "unitName",
      "unit_name",
      "unit",
      "clienteNome",
      "cliente_nome",
      "clinicName",
      "clinic_name",
      "unidadeNome",
      "unidade_nome",
      "unit.name",
      "clinic.name",
    ]),
    status: normalizeStatus(rawStatus),
    source: firstString(raw, ["sourceLabel", "source_label", "source", "origem"], "WhatsApp Angel"),
    feegowReference: firstString(raw, [
      "feegowReference",
      "feegow_reference",
      "feegowId",
      "feegow_id",
      "feegowAppointmentId",
      "feegow_appointment_id",
      "feegowAgendamentoId",
      "feegow_agendamento_id",
      "bookingReference",
      "booking_reference",
    ]),
  };
}

export function normalizeOperationRealtimePayload(payload: unknown): NormalizedOperationSnapshot {
  const rawItems = findAppointmentArray(payload);
  return {
    generatedAt:
      firstString(payload, [
        "generatedAt",
        "generated_at",
        "asOf",
        "as_of",
        "updatedAt",
        "updated_at",
        "snapshot.generatedAt",
        "snapshot.generated_at",
      ]) || null,
    clinicName: firstString(
      payload,
      [
        "clinicName",
        "clinic_name",
        "clienteNome",
        "cliente_nome",
        "clinic.name",
        "cliente.nome",
        "cliente.nomeFantasia",
        "cliente.nome_fantasia",
        "scope.name",
      ],
      "Policlínica Bonfiglioli",
    ),
    timezone: firstString(payload, ["timezone", "time_zone", "filters.timezone"], POLIBON_TIME_ZONE),
    appointments: rawItems.filter(isRecord).map(normalizeAppointment),
  };
}

function appointmentMoment(appointment: NormalizedAppointment, now: Date): AppointmentMoment {
  const date = parseDate(appointment.scheduledAt);
  if (!date) return "undated";
  const diff = date.getTime() - now.getTime();
  if (Math.abs(diff) <= 15 * 60 * 1000) return "now";
  return diff < 0 ? "past" : "upcoming";
}

function momentLabel(moment: AppointmentMoment): string {
  const labels: Record<AppointmentMoment, string> = {
    past: "Horário já iniciado",
    now: "Atendimento próximo",
    upcoming: "Próximo atendimento",
    undated: "Horário pendente de exibição",
  };
  return labels[moment];
}

function statusClass(status: string): string {
  const normalized = status.toLocaleLowerCase("pt-BR");
  if (normalized.includes("cancel")) return "cancelled";
  if (normalized.includes("realizado") || normalized.includes("atendido")) return "completed";
  return "confirmed";
}

export default function OperationRealtimePanel({
  apiRequest,
  onOpenIndicators,
}: OperationRealtimePanelProps) {
  const [snapshot, setSnapshot] = useState<NormalizedOperationSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastSuccessAt, setLastSuccessAt] = useState<Date | null>(null);
  const [nextRefreshAt, setNextRefreshAt] = useState(Date.now() + AUTO_REFRESH_SECONDS * 1000);
  const [clock, setClock] = useState(() => new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [tvMode, setTvMode] = useState(false);
  const requestSequence = useRef(0);

  const loadSnapshot = useCallback(
    async (manual = false) => {
      const sequence = ++requestSequence.current;
      if (manual) setRefreshing(true);
      try {
        const payload = await apiRequest<unknown>("/api/admin/operacao/tempo-real");
        if (sequence !== requestSequence.current) return;
        setSnapshot(normalizeOperationRealtimePayload(payload));
        setLastSuccessAt(new Date());
        setError("");
      } catch (requestError) {
        if (sequence !== requestSequence.current) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Não foi possível atualizar a operação em tempo real.",
        );
      } finally {
        if (sequence === requestSequence.current) {
          setLoading(false);
          setRefreshing(false);
          setNextRefreshAt(Date.now() + AUTO_REFRESH_SECONDS * 1000);
        }
      }
    },
    [apiRequest],
  );

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadSnapshot();
    }, AUTO_REFRESH_SECONDS * 1000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, loadSnapshot]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && autoRefresh) void loadSnapshot();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [autoRefresh, loadSnapshot]);

  useEffect(() => {
    document.documentElement.classList.toggle("operation-tv-mode", tvMode);
    return () => document.documentElement.classList.remove("operation-tv-mode");
  }, [tvMode]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) setTvMode(false);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const appointments = useMemo(() => {
    const source = snapshot?.appointments || [];
    const nowMs = clock.getTime();
    return [...source].sort((a, b) => {
      const aDate = parseDate(a.scheduledAt)?.getTime();
      const bDate = parseDate(b.scheduledAt)?.getTime();
      const aUpcoming = typeof aDate === "number" && aDate >= nowMs;
      const bUpcoming = typeof bDate === "number" && bDate >= nowMs;
      if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
      if (aDate === undefined || aDate === null) return 1;
      if (bDate === undefined || bDate === null) return -1;
      return aUpcoming ? aDate - bDate : bDate - aDate;
    });
  }, [snapshot, clock]);

  const todayKey = dateKeyInTimezone(clock, snapshot?.timezone || POLIBON_TIME_ZONE);
  const todayAppointments = useMemo(
    () =>
      appointments.filter((appointment) => {
        const bookedDate = parseDate(appointment.bookedAt);
        return (
          !bookedDate ||
          dateKeyInTimezone(bookedDate, snapshot?.timezone || POLIBON_TIME_ZONE) === todayKey
        );
      }),
    [appointments, snapshot?.timezone, todayKey],
  );

  const operationalSummary = useMemo(() => {
    const nowMs = clock.getTime();
    const oneHour = nowMs + 60 * 60 * 1000;
    let upcoming = 0;
    let nextHour = 0;
    let elapsed = 0;

    for (const appointment of todayAppointments) {
      const scheduled = parseDate(appointment.scheduledAt)?.getTime();
      if (typeof scheduled !== "number") continue;
      if (scheduled >= nowMs) {
        upcoming += 1;
        if (scheduled <= oneHour) nextHour += 1;
      } else {
        elapsed += 1;
      }
    }

    return {
      total: todayAppointments.length,
      upcoming,
      nextHour,
      elapsed,
    };
  }, [clock, todayAppointments]);

  const nextAppointment = useMemo(
    () =>
      todayAppointments.find((appointment) => {
        const scheduled = parseDate(appointment.scheduledAt)?.getTime();
        return typeof scheduled === "number" && scheduled >= clock.getTime() - 15 * 60 * 1000;
      }) || null,
    [clock, todayAppointments],
  );

  const secondsToRefresh = autoRefresh
    ? Math.max(0, Math.ceil((nextRefreshAt - clock.getTime()) / 1000))
    : null;
  const isStale = Boolean(lastSuccessAt && clock.getTime() - lastSuccessAt.getTime() > 90 * 1000);

  async function enterTvMode() {
    setTvMode(true);
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // O modo TV visual continua ativo mesmo quando o navegador bloqueia fullscreen.
    }
  }

  async function exitTvMode() {
    setTvMode(false);
    try {
      if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen();
    } catch {
      // O estado visual já foi restaurado.
    }
  }

  async function openIndicators() {
    await exitTvMode();
    onOpenIndicators();
  }

  return (
    <section className={`operationRealtimePanel${tvMode ? " tvMode" : ""}`} aria-live="polite">
      <header className="operationRealtimeHeader">
        <div className="operationRealtimeTitleBlock">
          <div className="operationRealtimeEyebrow">
            <span className={`operationRealtimeLiveDot${error || isStale ? " warning" : ""}`} />
            OPERAÇÃO POLIBON
          </div>
          <h3>Agendamentos em tempo real</h3>
          <p>
            Consultas confirmadas pelo Angel na Feegow, com atualização automática e identificação protegida do paciente.
          </p>
        </div>

        <div className="operationRealtimeClock" aria-label={`Horário atual ${formatClock(clock)}`}>
          <strong>{formatClock(clock)}</strong>
          <span>{clock.toLocaleDateString("pt-BR", { timeZone: POLIBON_TIME_ZONE, weekday: "long", day: "2-digit", month: "long" })}</span>
        </div>

        <div className="operationRealtimeActions">
          {!tvMode && (
            <button type="button" className="secondaryButton" onClick={() => void openIndicators()}>
              Indicadores do dia
            </button>
          )}
          <button
            type="button"
            className="secondaryButton"
            onClick={() => setAutoRefresh((current) => !current)}
            title={autoRefresh ? "Pausar atualização automática" : "Retomar atualização automática"}
          >
            {autoRefresh ? `Automático · ${secondsToRefresh}s` : "Atualização pausada"}
          </button>
          <button type="button" onClick={() => void loadSnapshot(true)} disabled={refreshing}>
            {refreshing ? "Atualizando..." : "Atualizar agora"}
          </button>
          <button type="button" className={tvMode ? "operationTvExitButton" : "operationTvButton"} onClick={() => void (tvMode ? exitTvMode() : enterTvMode())}>
            {tvMode ? "Sair do modo TV" : "Modo TV"}
          </button>
        </div>
      </header>

      {(error || isStale) && (
        <div className="operationRealtimeAlert" role="alert">
          <strong>{error ? "Falha na atualização" : "Atualização atrasada"}</strong>
          <span>
            {error || "O painel manteve a última leitura válida. Verifique a conexão se a atualização não normalizar."}
          </span>
        </div>
      )}

      <div className="operationRealtimeSummaryGrid">
        <article>
          <span>Agendamentos hoje</span>
          <strong>{operationalSummary.total}</strong>
          <small>Confirmados na Feegow</small>
        </article>
        <article>
          <span>Próximos</span>
          <strong>{operationalSummary.upcoming}</strong>
          <small>A partir do horário atual</small>
        </article>
        <article className="highlight">
          <span>Próxima hora</span>
          <strong>{operationalSummary.nextHour}</strong>
          <small>Demandam atenção imediata</small>
        </article>
        <article>
          <span>Horários iniciados</span>
          <strong>{operationalSummary.elapsed}</strong>
          <small>Até o momento</small>
        </article>
        <article className={isStale || error ? "warning" : "healthy"}>
          <span>Sincronização</span>
          <strong>{error || isStale ? "Atenção" : "Ativa"}</strong>
          <small>{formatUpdateAge(lastSuccessAt, clock)}</small>
        </article>
      </div>

      {nextAppointment && (
        <article className="operationNextAppointment">
          <div className="operationNextTime">
            <span>Próximo horário</span>
            <strong>{formatTime(nextAppointment.scheduledAt)}</strong>
          </div>
          <div className="operationNextPatient">
            <span>{protectPatientName(nextAppointment.patientName)}</span>
            <strong>{nextAppointment.specialty}</strong>
          </div>
          <div className="operationNextProfessional">
            <span>{nextAppointment.professionalName}</span>
            <small>{[nextAppointment.insurance, nextAppointment.plan].filter(Boolean).join(" · ")}</small>
          </div>
          <span className="operationRealtimeStatus confirmed">Confirmado na Feegow</span>
        </article>
      )}

      <div className="operationRealtimeListHeader">
        <div>
          <h4>Agenda operacional de hoje</h4>
          <p>{snapshot?.clinicName || "Policlínica Bonfiglioli"}</p>
        </div>
        <span>{todayAppointments.length} consulta(s) exibida(s)</span>
      </div>

      {loading && !snapshot ? (
        <div className="operationRealtimeEmpty loading">
          <strong>Carregando agendamentos confirmados...</strong>
          <span>Consultando a operação da Polibon.</span>
        </div>
      ) : todayAppointments.length === 0 ? (
        <div className="operationRealtimeEmpty">
          <strong>Nenhum agendamento confirmado para hoje.</strong>
          <span>O painel será atualizado automaticamente quando uma nova consulta for confirmada.</span>
        </div>
      ) : (
        <div className="operationRealtimeList">
          {todayAppointments.map((appointment) => {
            const moment = appointmentMoment(appointment, clock);
            return (
              <article
                key={appointment.id}
                className={`operationRealtimeRow ${moment}${nextAppointment?.id === appointment.id ? " next" : ""}`}
              >
                <div className="operationRealtimeRowTime">
                  <strong>{formatTime(appointment.scheduledAt)}</strong>
                  <span>{momentLabel(moment)}</span>
                </div>

                <div className="operationRealtimeRowPatient">
                  <strong>{protectPatientName(appointment.patientName)}</strong>
                  <span>Identificação protegida</span>
                </div>

                <div className="operationRealtimeRowClinical">
                  <strong>{appointment.specialty}</strong>
                  <span>{appointment.professionalName}</span>
                </div>

                <div className="operationRealtimeRowCoverage">
                  <strong>{appointment.insurance}</strong>
                  <span>{appointment.plan || "Plano não informado"}</span>
                </div>

                <div className="operationRealtimeRowMeta">
                  <span className={`operationRealtimeStatus ${statusClass(appointment.status)}`}>
                    {appointment.status}
                  </span>
                  <small>
                    {appointment.feegowReference ? `Feegow #${appointment.feegowReference}` : appointment.source}
                  </small>
                  {!tvMode && appointment.bookedAt && <small>Agendado em {formatDateTime(appointment.bookedAt)}</small>}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <footer className="operationRealtimeFooter">
        <span>Atualização automática a cada {AUTO_REFRESH_SECONDS} segundos.</span>
        <span>Dados pessoais restritos ao mínimo necessário para acompanhamento operacional.</span>
      </footer>
    </section>
  );
}

export type RealtimeOperationStatus =
  | "em_atendimento"
  | "aguardando_paciente"
  | "gravando_feegow"
  | "agendado"
  | "atencao"
  | "encaminhado"
  | "expirado";

export type OperationLaneName =
  | "active"
  | "booked"
  | "attention"
  | "handoffs"
  | "expired";

export type OperationItem = {
  id: string;
  status: RealtimeOperationStatus;
  statusLabel: string;
  patientLabel: string;
  clienteNome: string;
  specialty: string | null;
  coverage: string | null;
  doctor: string | null;
  appointmentStartAt: string | null;
  nextAction: string;
  updatedAt: string;
  elapsedSeconds: number;
};

export type OperationSummary = {
  emAtendimento: number;
  aguardandoPaciente: number;
  processando: number;
  agendadosHoje: number;
  atencoes: number;
  encaminhadosHoje: number;
  expiradosHoje: number;
};

export type OperationSnapshot = {
  generatedAt: string | null;
  businessDate: string | null;
  refreshAfterSeconds: number;
  summary: OperationSummary;
  lanes: Record<OperationLaneName, OperationItem[]>;
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim()
    : typeof value === "number" && Number.isFinite(value)
      ? String(value)
      : "";
}

function numberValue(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function firstText(source: UnknownRecord, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = text(source[key]);
    if (value) return value;
  }
  return fallback;
}

function unwrapPayload(payload: unknown): UnknownRecord {
  if (!isRecord(payload)) return {};
  if (isRecord(payload.data)) return payload.data;
  return payload;
}

function protectPatientLabel(value: unknown): string {
  const normalized = text(value);
  if (!normalized) return "Paciente em atendimento";
  if (/[•*]/.test(normalized)) return normalized;
  if (/^[\p{L}À-ÿ]+\s+[\p{L}À-ÿ]\.?$/u.test(normalized)) return normalized;

  const words = normalized.split(" ").filter(Boolean);
  if (words.length === 1) return words[0];
  return `${words[0]} ${words[words.length - 1].slice(0, 1).toLocaleUpperCase("pt-BR")}.`;
}

function normalizeStatus(
  raw: UnknownRecord,
  lane: OperationLaneName,
): RealtimeOperationStatus {
  if (lane === "booked") return "agendado";
  if (lane === "attention") return "atencao";
  if (lane === "handoffs") return "encaminhado";
  if (lane === "expired") return "expirado";

  const status = firstText(raw, ["status"]) as RealtimeOperationStatus;
  return [
    "em_atendimento",
    "aguardando_paciente",
    "gravando_feegow",
    "agendado",
    "atencao",
    "encaminhado",
    "expirado",
  ].includes(status)
    ? status
    : "em_atendimento";
}

function normalizeStatusLabel(
  raw: UnknownRecord,
  lane: OperationLaneName,
  status: RealtimeOperationStatus,
): string {
  if (lane === "booked" || status === "agendado") return "Agendado na Feegow";
  if (lane === "handoffs" || status === "encaminhado") {
    return "Orientado a procurar a recepção";
  }

  return firstText(raw, ["statusLabel", "status_label"], {
    aguardando_paciente: "Aguardando paciente",
    gravando_feegow: "Gravando na Feegow",
    em_atendimento: "Em processamento",
    atencao: "Atenção necessária",
    expirado: "Expirado",
    agendado: "Agendado na Feegow",
    encaminhado: "Orientado a procurar a recepção",
  }[status]);
}

function normalizeItem(
  value: unknown,
  lane: OperationLaneName,
  index: number,
): OperationItem {
  const raw = isRecord(value) ? value : {};
  const status = normalizeStatus(raw, lane);

  return {
    id: firstText(raw, ["id"], `${lane}-${index + 1}`),
    status,
    statusLabel: normalizeStatusLabel(raw, lane, status),
    patientLabel: protectPatientLabel(
      raw.patientLabel ?? raw.patient_label ?? raw.patientName ?? raw.pacienteNome,
    ),
    clienteNome: firstText(raw, ["clienteNome", "cliente_nome"], "Polibon"),
    specialty:
      firstText(raw, ["specialty", "especialidade", "specialtyName"]) || null,
    coverage:
      firstText(raw, ["coverage", "convenio", "insurance", "insuranceName"]) || null,
    doctor: firstText(raw, ["doctor", "medico", "professionalName"]) || null,
    appointmentStartAt:
      firstText(raw, [
        "appointmentStartAt",
        "appointment_start_at",
        "startDateTime",
        "scheduledAt",
      ]) || null,
    nextAction: firstText(
      raw,
      ["nextAction", "next_action"],
      status === "agendado"
        ? "Consulta gravada com sucesso"
        : "Acompanhar evolução do atendimento",
    ),
    updatedAt: firstText(
      raw,
      ["updatedAt", "updated_at", "createdAt", "created_at"],
      new Date(0).toISOString(),
    ),
    elapsedSeconds: numberValue(raw.elapsedSeconds ?? raw.elapsed_seconds) ?? 0,
  };
}

function normalizeLane(
  source: UnknownRecord,
  name: OperationLaneName,
): OperationItem[] {
  const lanes = isRecord(source.lanes) ? source.lanes : {};
  const values = Array.isArray(lanes[name]) ? lanes[name] : [];
  return values.map((item, index) => normalizeItem(item, name, index));
}

function summaryNumber(
  raw: UnknownRecord,
  keys: string[],
  fallback: number,
): number {
  for (const key of keys) {
    const value = numberValue(raw[key]);
    if (value !== null) return value;
  }
  return fallback;
}

export function normalizeOperationRealtimePayload(payload: unknown): OperationSnapshot {
  const source = unwrapPayload(payload);
  const active = normalizeLane(source, "active");
  const booked = normalizeLane(source, "booked");
  const attention = normalizeLane(source, "attention");
  const handoffs = normalizeLane(source, "handoffs");
  const expired = normalizeLane(source, "expired");
  const summaryRaw = isRecord(source.summary) ? source.summary : {};

  const summary: OperationSummary = {
    emAtendimento: summaryNumber(
      summaryRaw,
      ["emAtendimento", "em_atendimento"],
      active.length,
    ),
    aguardandoPaciente: summaryNumber(
      summaryRaw,
      ["aguardandoPaciente", "aguardando_paciente"],
      active.filter((item) => item.status === "aguardando_paciente").length,
    ),
    processando: summaryNumber(
      summaryRaw,
      ["processando"],
      active.filter((item) =>
        ["em_atendimento", "gravando_feegow"].includes(item.status),
      ).length,
    ),
    agendadosHoje: summaryNumber(
      summaryRaw,
      ["agendadosHoje", "agendados_hoje"],
      booked.length,
    ),
    atencoes: summaryNumber(
      summaryRaw,
      ["atencoes"],
      attention.length,
    ),
    encaminhadosHoje: summaryNumber(
      summaryRaw,
      ["encaminhadosHoje", "encaminhados_hoje"],
      handoffs.length,
    ),
    expiradosHoje: summaryNumber(
      summaryRaw,
      ["expiradosHoje", "expirados_hoje"],
      expired.length,
    ),
  };

  const refreshAfterSeconds = Math.min(
    60,
    Math.max(
      5,
      numberValue(source.refreshAfterSeconds ?? source.refresh_after_seconds) ?? 5,
    ),
  );

  return {
    generatedAt:
      firstText(source, ["generatedAt", "generated_at", "updatedAt"]) || null,
    businessDate:
      firstText(source, ["businessDate", "business_date"]) || null,
    refreshAfterSeconds,
    summary,
    lanes: {
      active,
      booked,
      attention,
      handoffs,
      expired,
    },
  };
}

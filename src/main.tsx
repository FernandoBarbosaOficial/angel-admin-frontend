import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const ADMIN_TOKEN_STORAGE_KEY = "agendai_admin_token";
const ADMIN_USER_STORAGE_KEY = "agendai_admin_user";
const ADMIN_THEME_STORAGE_KEY = "agendai_admin_theme";
const CLIENTES_PAGE_SIZE = 20;
const FORMAS_PAGE_SIZE = 15;
const MEDICOS_PAGE_SIZE = 15;
const PRODUTOS_PAGE_SIZE = 25;
const ACEITES_PAGE_SIZE = 25;
const WHATSAPP_LOGS_PAGE_SIZE = 50;
const WHATSAPP_LOG_GROUPS_PAGE_SIZE = 12;
const ADMIN_AUDIT_PAGE_SIZE = 80;
const FOLLOWUPS_PAGE_SIZE = 25;
const DIAS_SEMANA = [
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
  { value: 7, label: "Domingo" },
];
const PERIODOS_DISPONIBILIDADE: Array<{ value: PeriodoDisponibilidade; label: string; inicio: string; fim: string }> = [
  { value: "manha", label: "Manhã", inicio: "08:00", fim: "12:00" },
  { value: "tarde", label: "Tarde", inicio: "13:00", fim: "18:00" },
  { value: "noite", label: "Noite", inicio: "18:00", fim: "21:00" },
];

type ThemeMode = "light" | "dark";

type Cliente = {
  id: number;
  nome_fantasia: string;
  status: string;
  ativo?: boolean;
  usa_convenio: boolean;
  usa_particular: boolean;
  usa_cartao: boolean;
  exige_plano: boolean;
  provedor_agenda: string | null;
  telefone_contato?: string | null;
  whatsapp_contato?: string | null;
  email_contato?: string | null;
  site?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
};

type ClienteConfiguracao = {
  cliente_id: number;
  usa_convenio: boolean;
  usa_particular: boolean;
  usa_cartao: boolean;
  usa_assinatura?: boolean;
  usa_parceria?: boolean;
  exige_plano: boolean;
  exige_produto_rede?: boolean;
  exige_medico?: boolean;
  exige_especialidade: boolean;
  exige_data_nascimento: boolean;
  permitir_validacao_manual?: boolean;
  permitir_agendamento_sem_cobertura_confirmada?: boolean;
  encaminhar_humano_quando_nao_encontrar?: boolean;
  usa_agenda_externa?: boolean;
  provedor_agenda?: string | null;
  agenda_config?: Record<string, unknown> | null;
  ativo?: boolean;
};

type ClienteCadastroDraft = {
  nome_fantasia: string;
  telefone_contato: string;
  whatsapp_contato: string;
  email_contato: string;
  site: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
};

type NovoClienteDraft = {
  cnpj: string;
  nome_fantasia: string;
  razao_social: string;
  telefone_contato: string;
  whatsapp_contato: string;
  email_contato: string;
  site: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  usa_convenio: boolean;
  usa_particular: boolean;
  usa_cartao: boolean;
  exige_plano: boolean;
};

type BrasilApiCnpjResponse = {
  cnpj?: string;
  razao_social?: string | null;
  nome_fantasia?: string | null;
  ddd_telefone_1?: string | null;
  ddd_telefone_2?: string | null;
  email?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  municipio?: string | null;
  uf?: string | null;
};

type FormaAtendimento = {
  id: number;
  cliente_id: number;
  tipo: string;
  nome: string;
  exige_plano: boolean;
  permite_agendamento_online: boolean;
  ativo: boolean;
  convenio_global?: string | null;
};

type Produto = {
  id: number;
  convenio_id: number;
  convenio: string;
  nome: string;
  tipo: string;
  codigo_operadora?: string | null;
  acomodacao_ou_uf?: string | null;
  observacao?: string | null;
  ativo: boolean;
};

type ProdutosResponse = {
  forma: FormaAtendimento;
  produtos: Produto[];
};

type MedicoRegraIdade = {
  especialidade?: string | null;
  idade_minima?: number | null;
  idade_maxima?: number | null;
  regra_idade_texto?: string | null;
  ativo?: boolean;
};

type Medico = {
  id: number;
  cliente_id: number;
  nome: string;
  registro_profissional?: string | null;
  dias?: string | null;
  andar?: string | null;
  ativo: boolean;
  especialidades: string;
  regras_idade?: MedicoRegraIdade[];
};

type ImportacaoMedicosResultado = {
  total: number;
  criados: number;
  atualizados: number;
  erros: number;
  ignorados: number;
  results: Array<Record<string, unknown>>;
};


type MedicoEspecialidadeRegraForm = {
  nome: string;
  idade_minima: string;
  idade_maxima: string;
  regra_idade_texto: string;
};


type EspecialidadeCatalogo = {
  id: number;
  nome: string;
  nome_normalizado: string;
  aliases: string[];
  ativo: boolean;
};

type PeriodoDisponibilidade = "manha" | "tarde" | "noite";

type MedicoDisponibilidade = {
  id?: number;
  cliente_id?: number;
  medico_id?: number;
  dia_semana: number;
  periodo: PeriodoDisponibilidade;
  hora_inicio: string;
  hora_fim: string;
  intervalo_minutos: number;
  ativo: boolean;
};

type AceiteMedico = {
  id: number;
  cliente_id: number;
  medico_id: number;
  medico: string;
  especialidade_id: number | null;
  especialidade: string | null;
  convenio_id: number;
  convenio: string;
  convenio_produto_id: number | null;
  produto: string | null;
  produto_tipo: string | null;
  codigo_operadora?: string | null;
  acomodacao_ou_uf?: string | null;
  ativo: boolean;
  fonte_tipo?: string | null;
  origem_regra?: string | null;
  observacao_regra?: string | null;
  created_at?: string;
  updated_at?: string;
};

type WhatsappMessageLog = {
  id: number;
  created_at: string;
  cliente_id?: number | null;
  cliente_nome?: string | null;
  session_id?: string | null;
  message_id?: string | null;
  phone_number_id?: string | null;
  from_phone?: string | null;
  from_number?: string | null;
  to_phone?: string | null;
  direction: string;
  status: string;
  stage?: string | null;
  intent?: string | null;
  inbound_text?: string | null;
  outbound_text?: string | null;
  error_message?: string | null;
  processing_seconds?: number | null;
};


type WhatsappCanalModo = "cliente_direto" | "grupo_unidades" | "unidade_direta";

type ClienteCanalWhatsapp = {
  id: number;
  cliente_id: number;
  cliente_nome?: string | null;
  tipo: string;
  nome: string;
  identificador: string;
  provider: string;
  token_ref?: string | null;
  modo_atendimento: WhatsappCanalModo;
  cliente_ids: number[];
  unidade_id?: number | null;
  whatsapp_numero?: string | null;
  nome_exibicao?: string | null;
  ativo: boolean;
  principal: boolean;
  created_at?: string;
  updated_at?: string;
};

type WhatsappCanalForm = {
  cliente_id: string;
  nome: string;
  identificador: string;
  provider: string;
  token_ref: string;
  modo_atendimento: WhatsappCanalModo;
  cliente_ids: number[];
  whatsapp_numero: string;
  nome_exibicao: string;
  ativo: boolean;
  principal: boolean;
};

type WhatsappDiagnosticEnvVar = {
  name: string;
  present: boolean;
  configured: boolean;
  literalFalse?: boolean;
  valuePreview?: string;
};

type WhatsappDiagnosticCheck = {
  key: string;
  ok: boolean;
  label: string;
  details?: unknown;
};

type WhatsappDiagnosticCanal = {
  id: number;
  nome: string;
  cliente_id?: number | null;
  cliente_nome?: string | null;
  identificador: string;
  ativo: boolean;
  principal: boolean;
  modo_atendimento: WhatsappCanalModo;
  token_ref?: string | null;
  required?: boolean;
  present?: boolean;
  configured?: boolean;
  literalFalse?: boolean;
  status?: string;
};

type WhatsappDiagnostics = {
  generatedAt: string;
  summary: {
    ok: boolean;
    totalChecks: number;
    failedChecks: number;
    canaisTotal: number;
    canaisAtivos: number;
    canaisTokenComProblema: number;
    antiAbuseEnabled?: boolean;
  };
  checks: WhatsappDiagnosticCheck[];
  env: WhatsappDiagnosticEnvVar[];
  canais: WhatsappDiagnosticCanal[];
  antiAbuse?: {
    config?: {
      enabled: boolean;
      windowSeconds: number;
      maxMessages: number;
      maxBookingAttemptsPerDay: number;
      tempBlockSeconds: number;
      riskScoreBlockThreshold: number;
    };
    redisConfigured?: boolean;
    enabledAndOperational?: boolean;
  };
};




type WhatsappGrupoUnidadeItem = {
  grupoId: number;
  canalId: number;
  nomeGrupo: string;
  canalNome: string;
  clienteBaseId?: number | null;
  clienteBaseNome?: string | null;
  phoneNumberId?: string | null;
  whatsappNumero?: string | null;
  tokenRef?: string | null;
  ativo: boolean;
  principal: boolean;
  totalUnidades: number;
  unidadesOperacionais: number;
  criticalCount: number;
  warningCount: number;
  status: "pronto" | "atencao" | "critico";
  unidades: Array<{
    id: number;
    nomeFantasia: string;
    ativo: boolean;
    status?: string | null;
    operacional: boolean;
    tipoCliente?: string | null;
    papel?: string;
    duplicadoEmOutrosGrupos?: boolean;
  }>;
  alerts: Array<{ severity: "critical" | "warning"; message: string }>;
};

type WhatsappGruposUnidadesOverview = {
  generatedAt: string;
  summary: {
    totalGrupos: number;
    gruposProntos: number;
    gruposAtencao: number;
    gruposCriticos: number;
    totalUnidades: number;
    unidadesOperacionais: number;
  };
  items: WhatsappGrupoUnidadeItem[];
};

type DashboardTopItem = { label: string; total: number };
type DashboardDayItem = {
  date: string;
  label: string;
  mensagens: number;
  pacientes: number;
  agendamentosIniciados: number;
  agendamentosConcluidos: number;
};
type DashboardGerencial = {
  generatedAt: string;
  filters: { days: number; clienteId?: number | null; canalId?: number | null; groupId?: number | null };
  summary: {
    totalMensagens: number;
    pacientesUnicos: number;
    conversas: number;
    agendamentosIniciados: number;
    agendamentosConcluidos: number;
    conversasAbandonadas: number;
    bloqueiosAntiAbuso: number;
    erros: number;
    taxaConversao: number;
  };
  groups: Array<{ id: number; nome: string; canalNome?: string; phoneNumberId?: string; totalUnidades: number; unidadesOperacionais: number; status: string }>;
  breakdowns: {
    byCliente: DashboardTopItem[];
    byCanal: DashboardTopItem[];
    byIntent: DashboardTopItem[];
    byStage: DashboardTopItem[];
    byEspecialidade: DashboardTopItem[];
    byConvenioPlano: DashboardTopItem[];
    byDay: DashboardDayItem[];
  };
  reportRows: Array<Record<string, string>>;
};

type DashboardSectionKey = "resumo" | "evolucao" | "unidades" | "especialidades" | "convenios" | "etapas" | "logs";

type FollowupJobStatus =
  | "pending"
  | "processing"
  | "sent"
  | "confirmed"
  | "reschedule_requested"
  | "cancel_requested"
  | "failed"
  | "cancelled"
  | "expired";

type FollowupJobPanelItem = {
  id: number;
  clienteId?: number | null;
  clienteNome?: string | null;
  sessionId?: string | null;
  telefone: string;
  pacienteNome?: string | null;
  tipo: string;
  status: FollowupJobStatus | string;
  scheduledAt?: string | null;
  sentAt?: string | null;
  respondedAt?: string | null;
  attempts: number;
  maxAttempts: number;
  lastError?: string | null;
  payload?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type FollowupOperationalPanel = {
  generatedAt: string;
  filters: {
    days: number;
    status: string;
    clienteId?: number | null;
    q?: string;
    page: number;
    pageSize: number;
  };
  summary: {
    total: number;
    pending: number;
    processing: number;
    sent: number;
    semResposta: number;
    confirmed: number;
    rescheduleRequested: number;
    cancelRequested: number;
    failed: number;
    cancelled: number;
    expired: number;
  };
  byStatus: Array<{ status: string; label: string; total: number }>;
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  items: FollowupJobPanelItem[];
};


type WhatsappGoLiveCheck = {
  key: string;
  ok: boolean;
  severity: "critical" | "warning" | "success";
  label: string;
  details?: string;
};

type WhatsappGoLiveItem = {
  canalId: number;
  canalNome: string;
  clienteId: number;
  clienteNome: string;
  tipoCliente?: string | null;
  phoneNumberId: string;
  modoAtendimento: WhatsappCanalModo;
  ativo: boolean;
  principal: boolean;
  tokenRef?: string | null;
  status: "pronto" | "atencao" | "critico";
  okCount: number;
  totalChecks: number;
  criticalCount: number;
  warningCount: number;
  recommendation: string;
  checks: WhatsappGoLiveCheck[];
};

type WhatsappGoLiveChecklist = {
  generatedAt: string;
  summary: {
    total: number;
    pronto: number;
    atencao: number;
    critico: number;
  };
  items: WhatsappGoLiveItem[];
};

type WhatsappAntiAbuseEvent = {
  id?: string;
  type?: string;
  severity?: string;
  createdAt?: string;
  phoneNumberId: string;
  from: string;
  source?: string;
  reason: string;
  retryAfterSeconds?: number;
  blockedUntil?: string | null;
  messageCount?: number | null;
  bookingAttemptsToday?: number | null;
  riskScore?: number | null;
  messagePreview?: string;
  note?: string;
  manual?: boolean;
};

type WhatsappAntiAbuseStatus = {
  generatedAt?: string;
  redisConfigured: boolean;
  blockedNow: number;
  activeBlocks?: Array<{
    phoneNumberId: string;
    from: string;
    ttlSeconds?: number | null;
    blockedUntil?: string | null;
    kind?: string;
    reason?: string;
    note?: string;
    manual?: boolean;
  }>;
  recentBlocks: WhatsappAntiAbuseEvent[];
  lastEvent?: WhatsappAntiAbuseEvent | null;
  config: {
    enabled: boolean;
    windowSeconds: number;
    maxMessages: number;
    maxBookingAttemptsPerDay: number;
    tempBlockSeconds: number;
    riskScoreBlockThreshold: number;
  };
};

type WhatsappChannelTestResult = {
  ok: boolean;
  request: {
    canalId?: number | null;
    phoneNumberId: string;
    from: string;
    text: string;
  };
  resolved: {
    sessionId?: string | null;
    canalContext?: unknown;
    token?: {
      token_ref?: string | null;
      configured?: boolean;
      status?: string;
      present?: boolean;
      literalFalse?: boolean;
    };
    assistantText?: string | null;
  };
  raw?: unknown;
};

type AdminAuditLog = {
  id: number;
  usuario_id?: number | null;
  usuario_email?: string | null;
  usuario_perfil?: string | null;
  acao: string;
  entidade: string;
  entidade_id?: number | null;
  cliente_id?: number | null;
  resumo?: string | null;
  antes_json?: unknown;
  depois_json?: unknown;
  ip?: string | null;
  user_agent?: string | null;
  created_at: string;
};

type AdminUser = {
  id: number;
  nome: string;
  email: string;
  perfil: "global" | "clinica";
  ativo: boolean;
  mfa_enabled: boolean;
  primeiro_acesso: boolean;
  clienteIds: number[];
};

type AccessScopeCliente = {
  id: number;
  nome_fantasia: string;
  status?: string | null;
  ativo?: boolean | null;
};

type AdminAccessScope = {
  perfil: "global" | "clinica";
  isGlobalAdmin: boolean;
  clienteIds: number[];
  clientes?: AccessScopeCliente[];
  linkedClientes?: AccessScopeCliente[];
  operationalClientes?: AccessScopeCliente[];
  linkedCount?: number;
  operationalCount?: number;
};

type AdminUsuario = {
  id: number;
  nome: string;
  email: string;
  perfil: "global" | "clinica";
  ativo: boolean;
  mfa_enabled: boolean;
  primeiro_acesso: boolean;
  ultimo_acesso_at?: string | null;
  clientes?: Array<{ id: number; nome_fantasia: string }>;
};

type AdminLoginResponse = {
  token: string | null;
  user: AdminUser;
  mfaRequired: boolean;
  mfaSetupRequired: boolean;
  setupToken?: string | null;
  challengeToken?: string | null;
};

type AdminMfaSetupResponse = {
  qrCodeDataUrl: string;
  manualSecret: string;
  issuer: string;
  accountName: string;
};


function getStoredAdminToken() {
  return window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
}

function setStoredAuth(token: string, user: AdminUser) {
  window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
  window.localStorage.setItem(ADMIN_USER_STORAGE_KEY, JSON.stringify(user));
  window.sessionStorage.removeItem("agendai_session_expired_reload");
}

function clearStoredAuth() {
  window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(ADMIN_USER_STORAGE_KEY);
}

function scheduleSessionExpiredReload(message = "Sessão expirada. Faça login novamente.") {
  clearStoredAuth();
  if (typeof window === "undefined") return;

  const flag = "agendai_session_expired_reload";
  if (window.sessionStorage.getItem(flag) === "1") return;
  window.sessionStorage.setItem(flag, "1");
  window.sessionStorage.setItem("agendai_session_expired_message", message);

  window.setTimeout(() => {
    window.location.reload();
  }, 50);
}

function getTokenExpirationMs(token: string | null): number | null {
  if (!token || token.split(".").length < 2) return null;

  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = JSON.parse(window.atob(padded));
    const exp = Number(decoded?.exp);
    return Number.isFinite(exp) && exp > 0 ? exp * 1000 : null;
  } catch {
    return null;
  }
}


function getStoredTheme(): ThemeMode {
  const stored = window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY);
  return stored === "dark" ? "dark" : "light";
}

function setStoredTheme(theme: ThemeMode) {
  window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, theme);
}

function applyDocumentTheme(theme: ThemeMode) {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;
}


function createEmptyWhatsappCanalForm(): WhatsappCanalForm {
  return {
    cliente_id: "",
    nome: "",
    identificador: "",
    provider: "meta",
    token_ref: "",
    modo_atendimento: "cliente_direto",
    cliente_ids: [],
    whatsapp_numero: "",
    nome_exibicao: "",
    ativo: true,
    principal: false,
  };
}

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getStoredAdminToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const json = await response.json().catch(() => ({}));

  if (response.status === 401) {
    const hasToken = Boolean(token);
    const message = json.details || json.error || (hasToken ? "Sessão expirada. Faça login novamente." : "Não foi possível autenticar.");
    if (hasToken) scheduleSessionExpiredReload(message);
    throw new Error(message);
  }

  if (!response.ok || json.ok === false) {
    throw new Error(json.details || json.error || "Erro na requisição");
  }

  return json.data;
}

function normalizeSearch(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}


function parseOptionalAge(value: string): number | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 130) {
    throw new Error("Idade deve ser um número inteiro entre 0 e 130");
  }
  return parsed;
}

function normalizeRuleKey(value: unknown): string {
  return normalizeSearch(value).replace(/[^a-z0-9]/g, "");
}

function createEmptyEspecialidadeRegra(): MedicoEspecialidadeRegraForm {
  return {
    nome: "",
    idade_minima: "",
    idade_maxima: "",
    regra_idade_texto: "",
  };
}

function splitEspecialidadesFromMedico(value: string | null | undefined): string[] {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}


function splitEspecialidadesInput(value: string): string[] {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeEmail(value: string): string {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  const email = normalizeEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function formatCnpj(value: string): string {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatCep(value: string): string {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, "$1-$2");
}

function formatPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function getApiText(value?: string | null): string {
  return String(value || "").trim();
}

function followupStatusLabel(status?: string | null): string {
  const map: Record<string, string> = {
    pending: "Pendente",
    processing: "Processando",
    sent: "Enviado sem resposta",
    confirmed: "Confirmado",
    reschedule_requested: "Remarcação solicitada",
    cancel_requested: "Cancelamento solicitado",
    failed: "Falha",
    cancelled: "Cancelado",
    expired: "Expirado",
  };
  return map[String(status || "")] || String(status || "-");
}

function followupStatusClass(status?: string | null): string {
  const map: Record<string, string> = {
    pending: "warning",
    processing: "info",
    sent: "info",
    confirmed: "success",
    reschedule_requested: "warning",
    cancel_requested: "critical",
    failed: "critical",
    cancelled: "muted",
    expired: "muted",
  };
  return map[String(status || "")] || "muted";
}

function asPayloadText(payload: Record<string, unknown> | null | undefined, keys: string[]): string {
  if (!payload) return "-";
  for (const key of keys) {
    const value = payload[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value);
  }
  return "-";
}



type ChangePasswordScreenProps = {
  user: AdminUser;
  required?: boolean;
  onChanged: (user: AdminUser) => void;
  onCancel?: () => void;
  onLogout: () => void;
};

function ChangePasswordScreen({ user, required = false, onChanged, onCancel, onLogout }: ChangePasswordScreenProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submitPasswordChange(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (newPassword.length < 8) throw new Error("A nova senha precisa ter pelo menos 8 caracteres.");
      if (newPassword !== confirmPassword) throw new Error("A confirmação da senha não confere.");
      if (newPassword === currentPassword) throw new Error("A nova senha deve ser diferente da senha atual.");

      const updatedUser = await api<AdminUser>("/api/admin/auth/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const token = getStoredAdminToken();
      if (token) setStoredAuth(token, updatedUser);
      onChanged(updatedUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao alterar senha");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app loginApp">
      <main className="loginBox passwordChangeBox">
        <h1>Trocar senha</h1>
        <p>
          {required
            ? <>Antes de acessar o painel, altere a senha provisória do usuário <strong>{user.email}</strong>.</>
            : <>Altere a senha do usuário <strong>{user.email}</strong>.</>}
        </p>

        <form onSubmit={submitPasswordChange} className="formCard">
          <label>
            Senha atual
            <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required />
          </label>
          <label>
            Nova senha
            <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={8} required />
          </label>
          <label>
            Confirmar nova senha
            <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={8} required />
          </label>

          {error && <div className="alertError">{error}</div>}

          <button type="submit" disabled={loading}>{loading ? "Alterando senha..." : "Alterar senha"}</button>
          {!required && onCancel && (
            <button className="secondaryButton" type="button" onClick={onCancel} disabled={loading}>Cancelar</button>
          )}
          {required && (
            <button className="secondaryButton" type="button" onClick={onLogout} disabled={loading}>Sair</button>
          )}
        </form>
      </main>
    </div>
  );
}


type EmailTokenPasswordScreenProps = {
  kind: "activation" | "password_reset";
};

function EmailTokenPasswordScreen({ kind }: EmailTokenPasswordScreenProps) {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tokenInfo, setTokenInfo] = useState<{ email: string; nome: string } | null>(null);

  const isActivation = kind === "activation";

  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setError("Link inválido ou ausente.");
        setValidating(false);
        return;
      }

      try {
        const data = await api<{ email: string; nome: string }>(`/api/admin/auth/token/validate?tipo=${isActivation ? "activation" : "password_reset"}&token=${encodeURIComponent(token)}`);
        setTokenInfo(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Link inválido ou expirado.");
      } finally {
        setValidating(false);
      }
    }

    validateToken();
  }, [token, isActivation]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (newPassword.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
      if (newPassword !== confirmPassword) throw new Error("A confirmação da senha não confere.");

      await api<AdminUser>(isActivation ? "/api/admin/auth/activate" : "/api/admin/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword }),
      });

      setSuccess(isActivation
        ? "Conta ativada. Agora faça login com sua senha e configure o MFA."
        : "Senha redefinida. Agora faça login com sua nova senha.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir a operação.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app loginApp">
      <main className="loginBox passwordChangeBox publicTokenBox">
        <h1>{isActivation ? "Ativar conta" : "Redefinir senha"}</h1>
        <p>
          {validating
            ? "Validando link seguro..."
            : tokenInfo
              ? <>Link válido para <strong>{tokenInfo.email}</strong>.</>
              : "Não foi possível validar este link."}
        </p>

        {error && <div className="alertError">{error}</div>}
        {success && <div className="alertSuccess">{success}</div>}

        {!success && tokenInfo && (
          <form onSubmit={submit} className="formCard">
            <label>
              Nova senha
              <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={8} required />
            </label>
            <label>
              Confirmar nova senha
              <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={8} required />
            </label>
            <button type="submit" disabled={loading || validating}>{loading ? "Salvando..." : isActivation ? "Ativar conta" : "Redefinir senha"}</button>
          </form>
        )}

        <button className="secondaryButton" type="button" onClick={() => { window.location.href = "/"; }}>
          Ir para login
        </button>
      </main>
    </div>
  );
}

function TopListPanel({ title, rows }: { title: string; rows: DashboardTopItem[] }) {
  const max = Math.max(...rows.map((row) => row.total), 1);
  return (
    <div className="dashboardPanel topListPanel">
      <h4>{title}</h4>
      {rows.length === 0 ? (
        <p className="mutedText">Sem dados no período.</p>
      ) : (
        <div className="topListRows">
          {rows.map((row) => (
            <div className="topListRow" key={row.label}>
              <div>
                <strong>{row.label}</strong>
                <span>{row.total}</span>
              </div>
              <i style={{ width: `${Math.max(6, (row.total / max) * 100)}%` }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


function PaginationBar({
  page,
  pageCount,
  total,
  label,
  onPrev,
  onNext,
}: {
  page: number;
  pageCount: number;
  total: number;
  label: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="paginationBar">
      <span>{label}: página {page} de {pageCount} · {total} registro(s)</span>
      <div className="paginationButtons">
        <button type="button" className="secondary small" disabled={page <= 1} onClick={onPrev}>Anterior</button>
        <button type="button" className="secondary small" disabled={page >= pageCount} onClick={onNext}>Próxima</button>
      </div>
    </div>
  );
}

function Badge({ children, active = true }: { children: React.ReactNode; active?: boolean }) {
  return <span className={active ? "badge badgeOn" : "badge"}>{children}</span>;
}

function formatAdminDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR");
}

function prettyAuditLabel(value?: string | null) {
  return String(value || "-")
    .replace(/_/g, " ")
    .replace(/\./g, " · ");
}

function compactJson(value: unknown) {
  if (!value) return "-";
  try {
    const text = JSON.stringify(value);
    return text.length > 220 ? `${text.slice(0, 220)}...` : text;
  } catch {
    return String(value);
  }
}

function formatJsonPretty(value: unknown) {
  if (!value) return "-";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}

function auditFieldLabel(field: string) {
  const labels: Record<string, string> = {
    nome: "Nome",
    nome_fantasia: "Nome fantasia",
    registro_profissional: "CRM / registro",
    especialidades: "Especialidade",
    especialidade: "Especialidade",
    dias: "Dias/observações",
    andar: "Andar/sala",
    ativo: "Status",
    tipo: "Tipo",
    convenio: "Convênio",
    plano: "Plano",
    produto: "Produto",
    rede: "Rede",
    hora_inicio: "Início",
    hora_fim: "Fim",
    intervalo_minutos: "Intervalo",
    periodo: "Período",
    dia_semana: "Dia",
    telefone_contato: "Telefone",
    whatsapp_contato: "WhatsApp",
    email_contato: "E-mail",
    site: "Site",
    cep: "CEP",
    logradouro: "Logradouro",
    numero: "Número",
    complemento: "Complemento",
    bairro: "Bairro",
    cidade: "Cidade",
    estado: "Estado",
    perfil: "Perfil",
    mfa_enabled: "MFA",
    primeiro_acesso: "Primeiro acesso",
  };

  return labels[field] || field.replace(/_/g, " ");
}

function auditValueToText(field: string, value: unknown) {
  if (value === null || value === undefined || value === "") return "Não informado";

  if (field === "ativo") return value ? "Ativo" : "Inativo";
  if (field === "mfa_enabled") return value ? "Ativado" : "Pendente";
  if (field === "primeiro_acesso") return value ? "Sim" : "Não";
  if (field === "dia_semana") {
    const dia = DIAS_SEMANA.find((item) => item.value === Number(value));
    return dia?.label || String(value);
  }
  if (field === "periodo") {
    const periodo = PERIODOS_DISPONIBILIDADE.find((item) => item.value === String(value));
    return periodo?.label || String(value);
  }
  if (field === "intervalo_minutos") return `${value} min`;

  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "object") {
    try {
      const text = JSON.stringify(value);
      return text === "{}" ? "Não informado" : text;
    } catch {
      return String(value);
    }
  }

  return String(value);
}

function isAvailabilityPayload(value: unknown) {
  return toArray(value).some(
    (item) =>
      isPlainObject(item) &&
      ("dia_semana" in item || "periodo" in item || "hora_inicio" in item || "hora_fim" in item),
  );
}

function getAvailabilityRows(value: unknown) {
  return toArray(value)
    .filter(isPlainObject)
    .filter((item) => item.ativo !== false)
    .map((item) => {
      const dia = DIAS_SEMANA.find((diaItem) => diaItem.value === Number(item.dia_semana));
      const periodo = PERIODOS_DISPONIBILIDADE.find((periodoItem) => periodoItem.value === String(item.periodo));

      return {
        key: [
          item.id,
          item.dia_semana,
          item.periodo,
          item.hora_inicio,
          item.hora_fim,
          item.intervalo_minutos,
        ].join("-"),
        dia: dia?.label || auditValueToText("dia_semana", item.dia_semana),
        periodo: periodo?.label || auditValueToText("periodo", item.periodo),
        inicio: auditValueToText("hora_inicio", item.hora_inicio),
        fim: auditValueToText("hora_fim", item.hora_fim),
        intervalo: auditValueToText("intervalo_minutos", item.intervalo_minutos),
        ativo: item.ativo !== false,
      };
    })
    .sort((a, b) => {
      const diaA = DIAS_SEMANA.findIndex((dia) => dia.label === a.dia);
      const diaB = DIAS_SEMANA.findIndex((dia) => dia.label === b.dia);
      const periodoA = PERIODOS_DISPONIBILIDADE.findIndex((periodo) => periodo.label === a.periodo);
      const periodoB = PERIODOS_DISPONIBILIDADE.findIndex((periodo) => periodo.label === b.periodo);

      return diaA - diaB || periodoA - periodoB || a.inicio.localeCompare(b.inicio);
    });
}

function getObjectDiffRows(before: unknown, after: unknown) {
  if (!isPlainObject(before) && !isPlainObject(after)) return [];

  const ignored = new Set(["id", "cliente_id", "medico_id", "created_at", "updated_at"]);
  const beforeObj = isPlainObject(before) ? before : {};
  const afterObj = isPlainObject(after) ? after : {};
  const keys = Array.from(new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]))
    .filter((key) => !ignored.has(key))
    .sort();

  return keys
    .map((key) => {
      const beforeValue = beforeObj[key];
      const afterValue = afterObj[key];
      const beforeText = auditValueToText(key, beforeValue);
      const afterText = auditValueToText(key, afterValue);
      return {
        key,
        label: auditFieldLabel(key),
        beforeText,
        afterText,
        changed: beforeText !== afterText,
      };
    })
    .filter((row) => row.changed);
}

function AvailabilityHumanList({ title, value }: { title: string; value: unknown }) {
  const rows = getAvailabilityRows(value);

  return (
    <div className="auditHumanPanel">
      <h4>{title}</h4>
      {rows.length ? (
        <div className="auditHumanList">
          {rows.map((row) => (
            <div className="auditHumanItem" key={row.key}>
              <strong>
                {row.dia} · {row.periodo}
              </strong>
              <span>
                {row.inicio} às {row.fim} · intervalo de {row.intervalo}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="auditHumanEmpty">Nenhuma disponibilidade ativa registrada.</p>
      )}
    </div>
  );
}

function GenericHumanDiff({ before, after }: { before: unknown; after: unknown }) {
  const rows = getObjectDiffRows(before, after);

  if (!rows.length) {
    return (
      <div className="auditHumanEmptyBox">
        Não encontrei diferenças simples para traduzir. Use os dados técnicos abaixo para conferência.
      </div>
    );
  }

  return (
    <div className="auditDiffTableWrap">
      <table className="auditDiffTable">
        <thead>
          <tr>
            <th>Campo</th>
            <th>Antes</th>
            <th>Depois</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td>
                <strong>{row.label}</strong>
              </td>
              <td>{row.beforeText}</td>
              <td>{row.afterText}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditHumanSummary({ log }: { log: AdminAuditLog }) {
  const isAvailability = log.entidade.includes("disponibilidade") || isAvailabilityPayload(log.antes_json) || isAvailabilityPayload(log.depois_json);

  return (
    <div className="auditHumanSummaryBlock">
      <div className="auditHumanIntro">
        <strong>Resumo da alteração</strong>
        <span>{log.resumo || prettyAuditLabel(log.acao)}</span>
      </div>

      {isAvailability ? (
        <div className="auditHumanGrid">
          <AvailabilityHumanList title="Antes" value={log.antes_json} />
          <AvailabilityHumanList title="Depois" value={log.depois_json} />
        </div>
      ) : (
        <GenericHumanDiff before={log.antes_json} after={log.depois_json} />
      )}
    </div>
  );
}

function buildDefaultDisponibilidades(): MedicoDisponibilidade[] {
  return DIAS_SEMANA.flatMap((dia) =>
    PERIODOS_DISPONIBILIDADE.map((periodo) => ({
      dia_semana: dia.value,
      periodo: periodo.value,
      hora_inicio: periodo.inicio,
      hora_fim: periodo.fim,
      intervalo_minutos: 30,
      ativo: false,
    })),
  );
}

function mergeDisponibilidadesFromApi(items: MedicoDisponibilidade[]): MedicoDisponibilidade[] {
  const defaults = buildDefaultDisponibilidades();

  return defaults.map((item) => {
    const found = items.find(
      (existing) =>
        Number(existing.dia_semana) === item.dia_semana &&
        existing.periodo === item.periodo,
    );

    if (!found) return item;

    return {
      ...item,
      ...found,
      hora_inicio: String(found.hora_inicio || item.hora_inicio).slice(0, 5),
      hora_fim: String(found.hora_fim || item.hora_fim).slice(0, 5),
      intervalo_minutos: Number(found.intervalo_minutos || 30),
      ativo: Boolean(found.ativo),
    };
  });
}

function getConfigNumber(config: ClienteConfiguracao | null, keys: string[], fallback: number) {
  const agendaConfig = (config?.agenda_config || {}) as Record<string, unknown>;

  for (const key of keys) {
    const raw = agendaConfig[key];
    const value = typeof raw === "string" ? Number(raw) : Number(raw ?? NaN);
    if (Number.isFinite(value) && value > 0) return Math.round(value);
  }

  return fallback;
}

function updateAgendaConfigNumber(
  config: ClienteConfiguracao,
  keys: string[],
  value: number,
): ClienteConfiguracao {
  const safeValue = Number.isFinite(value) && value > 0 ? Math.round(value) : 10;
  const agendaConfig = { ...((config.agenda_config || {}) as Record<string, unknown>) };

  for (const key of keys) {
    agendaConfig[key] = safeValue;
  }

  return {
    ...config,
    agenda_config: agendaConfig,
  };
}

const SESSION_TIMEOUT_KEYS = ["sessionTimeoutMinutes", "timeoutAtendimentoMinutos"];

function LoginScreen({ onLogin }: { onLogin: (result: AdminLoginResponse) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [setupToken, setSetupToken] = useState<string | null>(null);
  const [mfaSetup, setMfaSetup] = useState<AdminMfaSetupResponse | null>(null);
  const [mfaChallengeActive, setMfaChallengeActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryMessage, setRecoveryMessage] = useState("");

  const loginStepLabel = mfaSetup
    ? "Configurar segundo fator"
    : mfaChallengeActive
      ? "Confirmar segundo fator"
      : "Entrar";

  function resetMfaState() {
    setMfaCode("");
    setSetupToken(null);
    setMfaSetup(null);
    setMfaChallengeActive(false);
  }

  async function submitRecoveryReset(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setRecoveryMessage("");

    try {
      const normalizedRecoveryEmail = normalizeEmail(recoveryEmail);
      if (!isValidEmail(normalizedRecoveryEmail)) throw new Error("Informe um e-mail válido.");

      const result = await api<{ message: string }>("/api/admin/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: normalizedRecoveryEmail }),
      });

      setRecoveryEmail(normalizedRecoveryEmail);
      setRecoveryMessage(result.message || "Se o e-mail estiver cadastrado, enviaremos um link de recuperação.");
      setEmail(normalizedRecoveryEmail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao solicitar recuperação de senha");
    } finally {
      setLoading(false);
    }
  }

  function finishLogin(result: AdminLoginResponse) {
    if (!result.token) {
      throw new Error("Login incompleto. O backend não retornou token final.");
    }

    setStoredAuth(result.token, result.user);
    onLogin(result);
  }

  async function startMfaSetup(token: string) {
    const setup = await api<AdminMfaSetupResponse>("/api/admin/auth/mfa/setup", {
      method: "POST",
      body: JSON.stringify({ setupToken: token }),
    });

    setSetupToken(token);
    setMfaSetup(setup);
    setMfaChallengeActive(false);
    setMfaCode("");
  }

  async function submitCredentials(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await api<AdminLoginResponse>("/api/admin/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: normalizeEmail(email), password }),
      });

      if (result.token) {
        finishLogin(result);
        return;
      }

      if (result.mfaSetupRequired && result.setupToken) {
        await startMfaSetup(result.setupToken);
        return;
      }

      if (result.mfaRequired) {
        setMfaChallengeActive(true);
        setMfaSetup(null);
        setSetupToken(null);
        setMfaCode("");
        return;
      }

      throw new Error("Resposta de autenticação inesperada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  }

  async function submitMfaCode(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const code = mfaCode.trim();
      if (!/^\d{6}$/.test(code)) {
        throw new Error("Informe o código de 6 dígitos do Authenticator.");
      }

      if (mfaSetup && setupToken) {
        const result = await api<AdminLoginResponse>("/api/admin/auth/mfa/verify-setup", {
          method: "POST",
          body: JSON.stringify({ setupToken, code }),
        });
        finishLogin(result);
        return;
      }

      const result = await api<AdminLoginResponse>("/api/admin/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: normalizeEmail(email), password, mfaCode: code }),
      });
      finishLogin(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao validar MFA");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app loginApp">
      <main className="loginBox">
        <h1>AgendAI</h1>
        <p>Painel administrativo seguro</p>

        {showRecovery && !mfaSetup && !mfaChallengeActive && (
          <form onSubmit={submitRecoveryReset} className="formCard recoveryCard">
            <div className="mfaIntro">
              <strong>Recuperar senha</strong>
              <span>Informe o e-mail cadastrado. Se ele existir, enviaremos um link seguro para redefinir a senha.</span>
            </div>
            <label>
              E-mail cadastrado
              <input value={recoveryEmail} onChange={(event) => setRecoveryEmail(event.target.value)} autoComplete="username" />
            </label>
            <div className="infoBox">
              O link é enviado somente para o e-mail cadastrado, expira em poucos minutos e só pode ser usado uma vez.
            </div>
            {error && <div className="alertError">{error}</div>}
            {recoveryMessage && <div className="alertSuccess">{recoveryMessage}</div>}
            <button type="submit" disabled={loading}>{loading ? "Enviando..." : "Enviar link de recuperação"}</button>
            <button className="secondaryButton" type="button" onClick={() => { setShowRecovery(false); setError(""); }} disabled={loading}>
              Voltar ao login
            </button>
          </form>
        )}

        {!showRecovery && !mfaSetup && !mfaChallengeActive && (
          <form onSubmit={submitCredentials} className="formCard">
            <label>
              Email
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" />
            </label>
            <label>
              Senha
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </label>
            {error && <div className="alertError">{error}</div>}
            <button type="submit" disabled={loading}>{loading ? "Entrando..." : loginStepLabel}</button>
            <button
              className="linkButton forgotPasswordButton"
              type="button"
              onClick={() => { setShowRecovery(true); setRecoveryEmail(email); setError(""); }}
              disabled={loading}
            >
              Esqueci minha senha
            </button>
          </form>
        )}

        {mfaSetup && (
          <form onSubmit={submitMfaCode} className="formCard mfaCard">
            <div className="mfaIntro">
              <strong>Ative o segundo fator</strong>
              <span>Escaneie o QR Code no Google Authenticator ou Microsoft Authenticator.</span>
            </div>
            <div className="mfaQrBox">
              <img src={mfaSetup.qrCodeDataUrl} alt="QR Code MFA" />
            </div>
            <details className="mfaManualSecret">
              <summary>Configurar manualmente</summary>
              <span>Conta: {mfaSetup.accountName}</span>
              <code>{mfaSetup.manualSecret}</code>
            </details>
            <label>
              Código do Authenticator
              <input
                value={mfaCode}
                onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
              />
            </label>
            {error && <div className="alertError">{error}</div>}
            <button type="submit" disabled={loading}>{loading ? "Validando..." : "Validar e entrar"}</button>
            <button className="secondaryButton" type="button" onClick={resetMfaState} disabled={loading}>
              Voltar ao login
            </button>
          </form>
        )}

        {mfaChallengeActive && (
          <form onSubmit={submitMfaCode} className="formCard mfaCard">
            <div className="mfaIntro">
              <strong>Confirme o segundo fator</strong>
              <span>Digite o código de 6 dígitos do seu Authenticator.</span>
            </div>
            <label>
              Código do Authenticator
              <input
                value={mfaCode}
                onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                autoFocus
              />
            </label>
            {error && <div className="alertError">{error}</div>}
            <button type="submit" disabled={loading}>{loading ? "Validando..." : "Entrar com MFA"}</button>
            <button className="secondaryButton" type="button" onClick={resetMfaState} disabled={loading}>
              Trocar usuário ou senha
            </button>
          </form>
        )}
      </main>
    </div>
  );
}

function App() {
  const currentPath = window.location.pathname;

  if (currentPath === "/ativar-conta") {
    return <EmailTokenPasswordScreen kind="activation" />;
  }

  if (currentPath === "/reset-password") {
    return <EmailTokenPasswordScreen kind="password_reset" />;
  }

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteFiltro, setClienteFiltro] = useState<"todos" | "ativos" | "inativos">("todos");
  const [clientesPage, setClientesPage] = useState(1);
  const [selectedClienteId, setSelectedClienteId] = useState<number | null>(null);
  const [formas, setFormas] = useState<FormaAtendimento[]>([]);
  const [formasSearch, setFormasSearch] = useState("");
  const [formasPage, setFormasPage] = useState(1);
  const [selectedForma, setSelectedForma] = useState<FormaAtendimento | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtoSearch, setProdutoSearch] = useState("");
  const [produtoPage, setProdutoPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [importacaoMedicosStatus, setImportacaoMedicosStatus] = useState("");
  const [toast, setToast] = useState("");
  const [activeTab, setActiveTab] = useState<"clientes" | "medicos" | "whatsapp" | "whatsapp_operacao" | "dashboard_gerencial" | "followups" | "usuarios" | "auditoria">("clientes");
  const [authUser, setAuthUser] = useState<AdminUser | null>(null);
  const [accessScope, setAccessScope] = useState<AdminAccessScope | null>(null);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getStoredTheme());
  const [authLoading, setAuthLoading] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [usuarios, setUsuarios] = useState<AdminUsuario[]>([]);
  const [usuarioStatusFiltro, setUsuarioStatusFiltro] = useState<"ativos" | "inativos" | "todos">("ativos");
  const [editingUsuarioId, setEditingUsuarioId] = useState<number | null>(null);
  const [usuarioForm, setUsuarioForm] = useState({
    nome: "",
    email: "",
    perfil: "clinica" as "global" | "clinica",
    senha_provisoria: "",
    ativo: true,
    cliente_ids: [] as number[],
  });
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [especialidadesCatalogo, setEspecialidadesCatalogo] = useState<EspecialidadeCatalogo[]>([]);
  const [medicoSearch, setMedicoSearch] = useState("");
  const [medicoStatusFiltro, setMedicoStatusFiltro] = useState<"ativos" | "inativos" | "todos">("ativos");
  const [medicosPage, setMedicosPage] = useState(1);
  const [selectedMedicoId, setSelectedMedicoId] = useState<number | null>(null);
  const [aceites, setAceites] = useState<AceiteMedico[]>([]);
  const [aceiteSearch, setAceiteSearch] = useState("");
  const [aceiteFiltro, setAceiteFiltro] = useState<"ativos" | "inativos" | "todos">("ativos");
  const [aceitePage, setAceitePage] = useState(1);
  const [clienteConfig, setClienteConfig] = useState<ClienteConfiguracao | null>(null);
  const [clienteCadastro, setClienteCadastro] = useState<ClienteCadastroDraft | null>(null);
  const [whatsappLogs, setWhatsappLogs] = useState<WhatsappMessageLog[]>([]);
  const [expandedWhatsappLogGroups, setExpandedWhatsappLogGroups] = useState<Record<string, boolean>>({});
  const [whatsappLogFilters, setWhatsappLogFilters] = useState({
    phone: "",
    status: "todos",
    startDate: "",
    endDate: "",
    onlyErrors: false,
  });
  const [whatsappLogsLoading, setWhatsappLogsLoading] = useState(false);
  const [whatsappLogGroupsPage, setWhatsappLogGroupsPage] = useState(1);
  const [whatsappCanais, setWhatsappCanais] = useState<ClienteCanalWhatsapp[]>([]);
  const [whatsappCanaisLoading, setWhatsappCanaisLoading] = useState(false);
  const [editingWhatsappCanalId, setEditingWhatsappCanalId] = useState<number | null>(null);
  const [whatsappCanalForm, setWhatsappCanalForm] = useState<WhatsappCanalForm>(() => createEmptyWhatsappCanalForm());
  const [whatsappDiagnostics, setWhatsappDiagnostics] = useState<WhatsappDiagnostics | null>(null);
  const [whatsappDiagnosticsLoading, setWhatsappDiagnosticsLoading] = useState(false);
  const [whatsappGoLiveChecklist, setWhatsappGoLiveChecklist] = useState<WhatsappGoLiveChecklist | null>(null);
  const [whatsappGoLiveLoading, setWhatsappGoLiveLoading] = useState(false);
  const [whatsappGruposUnidades, setWhatsappGruposUnidades] = useState<WhatsappGruposUnidadesOverview | null>(null);
  const [whatsappGruposLoading, setWhatsappGruposLoading] = useState(false);
  const [whatsappGrupoExpanded, setWhatsappGrupoExpanded] = useState<Record<number, boolean>>({});
  const [dashboardGerencial, setDashboardGerencial] = useState<DashboardGerencial | null>(null);
  const [dashboardGerencialLoading, setDashboardGerencialLoading] = useState(false);
  const [dashboardGerencialFilters, setDashboardGerencialFilters] = useState({
    days: "7",
    clienteId: "todos",
    canalId: "todos",
    groupId: "todos",
  });
  const [dashboardReportSections, setDashboardReportSections] = useState<Record<DashboardSectionKey, boolean>>({
    resumo: true,
    evolucao: true,
    unidades: true,
    especialidades: true,
    convenios: true,
    etapas: true,
    logs: false,
  });

  const [followupsPanel, setFollowupsPanel] = useState<FollowupOperationalPanel | null>(null);
  const [followupsLoading, setFollowupsLoading] = useState(false);
  const [followupsFilters, setFollowupsFilters] = useState({
    days: "30",
    status: "todos",
    clienteId: "todos",
    q: "",
    page: 1,
    pageSize: FOLLOWUPS_PAGE_SIZE,
  });

  const [goLiveFilters, setGoLiveFilters] = useState({
    search: "",
    status: "todos",
    modo: "todos",
    canalStatus: "todos",
    token: "todos",
  });
  const [goLiveExpanded, setGoLiveExpanded] = useState<Record<number, boolean>>({});
  const [goLivePage, setGoLivePage] = useState(1);
  const [goLivePageSize, setGoLivePageSize] = useState(10);
  const [whatsappAntiAbuseStatus, setWhatsappAntiAbuseStatus] = useState<WhatsappAntiAbuseStatus | null>(null);
  const [whatsappAntiAbuseLoading, setWhatsappAntiAbuseLoading] = useState(false);
  const [whatsappDashboardLastUpdatedAt, setWhatsappDashboardLastUpdatedAt] = useState<string | null>(null);
  const [whatsappAlertsLastUpdatedAt, setWhatsappAlertsLastUpdatedAt] = useState<string | null>(null);
  const [whatsappCountdownTick, setWhatsappCountdownTick] = useState(() => Date.now());
  const [whatsappAutoRefreshError, setWhatsappAutoRefreshError] = useState<string | null>(null);
  const [whatsappManualBlockLoading, setWhatsappManualBlockLoading] = useState(false);
  const [whatsappManualBlockForm, setWhatsappManualBlockForm] = useState({
    phoneNumberId: "",
    from: "",
    durationSeconds: "86400",
    reason: "manual_block",
    note: "",
  });
  const [whatsappTestForm, setWhatsappTestForm] = useState({ canalId: "", from: "5511888877777", text: "oi" });
  const [whatsappTestResult, setWhatsappTestResult] = useState<WhatsappChannelTestResult | null>(null);
  const [whatsappTestLoading, setWhatsappTestLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [auditFilters, setAuditFilters] = useState({
    usuarioEmail: "",
    clienteId: "todos",
    acao: "",
    entidade: "",
    startDate: "",
    endDate: "",
  });
  const [selectedAuditLog, setSelectedAuditLog] = useState<AdminAuditLog | null>(null);

  const [novoAceite, setNovoAceite] = useState({
    convenio: "",
    plano: "",
  });

  const emptyMedicoForm = {
    nome: "",
    registro_profissional: "",
    especialidade: "",
    especialidades_regras: [createEmptyEspecialidadeRegra()] as MedicoEspecialidadeRegraForm[],
    dias: "",
    andar: "",
    idade_minima: "",
    idade_maxima: "",
    regra_idade_texto: "",
  };

  const [medicoForm, setMedicoForm] = useState(emptyMedicoForm);
  const [editingMedicoId, setEditingMedicoId] = useState<number | null>(null);
  const [disponibilidades, setDisponibilidades] = useState<MedicoDisponibilidade[]>(buildDefaultDisponibilidades());

  const emptyNovoCliente: NovoClienteDraft = {
    cnpj: "",
    nome_fantasia: "",
    razao_social: "",
    telefone_contato: "",
    whatsapp_contato: "",
    email_contato: "",
    site: "",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    usa_convenio: false,
    usa_particular: true,
    usa_cartao: true,
    exige_plano: false,
  };

  const [novoCliente, setNovoCliente] = useState<NovoClienteDraft>(emptyNovoCliente);
  const [loadingCnpj, setLoadingCnpj] = useState(false);

  const emptyFormaForm = {
    tipo: "particular",
    nome: "",
    exige_plano: false,
    permite_agendamento_online: true,
  };

  const [novaForma, setNovaForma] = useState(emptyFormaForm);
  const [editingFormaId, setEditingFormaId] = useState<number | null>(null);

  const [novoProduto, setNovoProduto] = useState({
    nome: "",
    tipo: "plano",
    codigo_operadora: "",
    acomodacao_ou_uf: "",
    observacao: "",
  });

  const selectedCliente = useMemo(
    () => clientes.find((cliente) => cliente.id === selectedClienteId) || null,
    [clientes, selectedClienteId],
  );

  const selectedMedico = useMemo(
    () => medicos.find((medico) => medico.id === selectedMedicoId) || null,
    [medicos, selectedMedicoId],
  );

  const isGlobalAdmin = authUser?.perfil === "global";
  const scopedClientes = useMemo(() => {
    if (isGlobalAdmin) return clientes;
    const allowedIds = authUser?.clienteIds || [];

    // Em perfis de clínica, a API já retorna apenas os clientes vinculados.
    // Se o token antigo/localStorage ainda não trouxer clienteIds, usamos a lista carregada como fonte visual.
    if (allowedIds.length === 0) return clientes;

    const allowed = new Set(allowedIds);
    return clientes.filter((cliente) => allowed.has(cliente.id));
  }, [authUser?.clienteIds, clientes, isGlobalAdmin]);

  const scopedOperationalClientes = useMemo(
    () => scopedClientes.filter((cliente) => cliente.ativo !== false && String(cliente.status || "ativo").toLowerCase() === "ativo"),
    [scopedClientes],
  );

  const medicosClienteSelecionado = useMemo(() => {
    if (selectedCliente) return selectedCliente;
    if (!selectedClienteId) return null;
    return (
      scopedClientes.find((cliente) => Number(cliente.id) === Number(selectedClienteId)) ||
      clientes.find((cliente) => Number(cliente.id) === Number(selectedClienteId)) ||
      null
    );
  }, [clientes, scopedClientes, selectedCliente, selectedClienteId]);

  const accessLinkedClientes = !isGlobalAdmin && accessScope?.linkedClientes?.length
    ? accessScope.linkedClientes
    : scopedClientes;
  const accessOperationalClientes = !isGlobalAdmin && accessScope?.operationalClientes
    ? accessScope.operationalClientes
    : scopedOperationalClientes;

  const operationalFilterClientes = useMemo(() => {
    const source = isGlobalAdmin
      ? scopedOperationalClientes
      : (accessOperationalClientes.length > 0 ? accessOperationalClientes : accessLinkedClientes);

    const seen = new Set<number>();
    return source
      .map((cliente) => ({
        id: Number(cliente.id),
        nome_fantasia: cliente.nome_fantasia || `Cliente #${cliente.id}`,
        status: cliente.status || "ativo",
        ativo: cliente.ativo,
      }))
      .filter((cliente) => {
        if (!Number.isFinite(cliente.id) || cliente.id <= 0 || seen.has(cliente.id)) return false;
        seen.add(cliente.id);
        const statusAtivo = String(cliente.status || "ativo").toLowerCase() === "ativo";
        return cliente.ativo !== false && statusAtivo;
      })
      .sort((a, b) => a.nome_fantasia.localeCompare(b.nome_fantasia));
  }, [accessLinkedClientes, accessOperationalClientes, isGlobalAdmin, scopedOperationalClientes]);



  const dashboardSelectedClienteId = useMemo(() => {
    const parsed = Number(dashboardGerencialFilters.clienteId);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [dashboardGerencialFilters.clienteId]);

  const getDashboardCanalClienteIds = (canal: ClienteCanalWhatsapp): number[] => {
    if (canal.modo_atendimento === "grupo_unidades" && canal.cliente_ids?.length) {
      return canal.cliente_ids.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0);
    }
    const clienteId = Number(canal.cliente_id);
    return Number.isFinite(clienteId) && clienteId > 0 ? [clienteId] : [];
  };

  const dashboardCanalOptions = useMemo(() => {
    if (!isGlobalAdmin) return [];
    if (!dashboardSelectedClienteId) return whatsappCanais;
    return whatsappCanais.filter((canal) => getDashboardCanalClienteIds(canal).includes(dashboardSelectedClienteId));
  }, [dashboardSelectedClienteId, isGlobalAdmin, whatsappCanais]);

  const dashboardGroupOptions = useMemo(() => {
    const source = whatsappGruposUnidades?.items || [];
    const mapped = source.map((grupo) => ({
      id: Number(grupo.canalId || grupo.grupoId),
      nome: grupo.nomeGrupo || grupo.canalNome || `Grupo #${grupo.canalId || grupo.grupoId}`,
      clienteIds: (grupo.unidades || [])
        .map((unidade) => Number(unidade.id))
        .filter((id) => Number.isFinite(id) && id > 0),
    }));

    const filtered = dashboardSelectedClienteId
      ? mapped.filter((grupo) => grupo.clienteIds.includes(dashboardSelectedClienteId))
      : mapped;

    return filtered.filter((grupo, index, arr) => arr.findIndex((item) => item.id === grupo.id) === index);
  }, [dashboardSelectedClienteId, whatsappGruposUnidades]);

  const dashboardSelectedCanal = useMemo(() => {
    if (dashboardGerencialFilters.canalId === "todos") return null;
    return dashboardCanalOptions.find((canal) => String(canal.id) === dashboardGerencialFilters.canalId) || null;
  }, [dashboardCanalOptions, dashboardGerencialFilters.canalId]);

  const dashboardSelectedGroup = useMemo(() => {
    if (dashboardGerencialFilters.groupId === "todos") return null;
    return dashboardGroupOptions.find((grupo) => String(grupo.id) === dashboardGerencialFilters.groupId) || null;
  }, [dashboardGerencialFilters.groupId, dashboardGroupOptions]);

  function clearDashboardResultOnFilterChange() {
    setDashboardGerencial(null);
  }

  function handleDashboardDaysChange(value: string) {
    clearDashboardResultOnFilterChange();
    setDashboardGerencialFilters((current) => ({ ...current, days: value }));
  }

  function handleDashboardClienteChange(value: string) {
    clearDashboardResultOnFilterChange();
    setDashboardGerencialFilters((current) => ({
      ...current,
      clienteId: value,
      canalId: "todos",
      groupId: "todos",
    }));
  }

  function handleDashboardGroupChange(value: string) {
    clearDashboardResultOnFilterChange();
    setDashboardGerencialFilters((current) => ({
      ...current,
      groupId: value,
      canalId: "todos",
    }));
  }

  function handleDashboardCanalChange(value: string) {
    clearDashboardResultOnFilterChange();
    setDashboardGerencialFilters((current) => ({
      ...current,
      canalId: value,
      groupId: "todos",
    }));
  }

  const linkedClientesCount = isGlobalAdmin
    ? clientes.length
    : accessScope?.linkedCount ?? accessLinkedClientes.length;
  const operationalClientesCount = isGlobalAdmin
    ? clientes.filter((cliente) => cliente.ativo !== false && String(cliente.status || "ativo").toLowerCase() === "ativo").length
    : accessScope?.operationalCount ?? accessOperationalClientes.length;
  const inactiveLinkedClientes = !isGlobalAdmin
    ? accessLinkedClientes.filter((cliente) => cliente.ativo === false || String(cliente.status || "ativo").toLowerCase() !== "ativo")
    : [];

  const accessScopeLabel = isGlobalAdmin
    ? "Acesso global a todos os clientes"
    : `${linkedClientesCount} cliente(s) vinculado(s)`;

  const accessScopeDetail = isGlobalAdmin
    ? "Pode cadastrar clientes, canais WhatsApp, usuários e operar o dashboard global."
    : linkedClientesCount === 0
      ? "Nenhuma clínica vinculada ao seu usuário."
      : operationalClientesCount === 0
        ? `${linkedClientesCount} clínica(s) vinculada(s), mas nenhuma operacional. ${inactiveLinkedClientes[0]?.nome_fantasia || "Clínica"} está inativa.`
        : `${linkedClientesCount} clínica(s) vinculada(s), ${operationalClientesCount} operacional(is).`;


  useEffect(() => {
    applyDocumentTheme(themeMode);
    setStoredTheme(themeMode);
  }, [themeMode]);

  function toggleThemeMode() {
    setThemeMode((current) => (current === "dark" ? "light" : "dark"));
  }

  const getClienteNomeById = (clienteId?: number | null) => {
    if (!clienteId) return "-";
    const cliente = clientes.find((item) => item.id === clienteId);
    return cliente ? cliente.nome_fantasia : `Clínica #${clienteId}`;
  };

  const clienteUsaConvenio = useMemo(() => {
    return Boolean(clienteConfig?.usa_convenio);
  }, [clienteConfig]);

  const clienteTemFormaConvenio = useMemo(() => {
    return formas.some((forma) => forma.ativo && forma.tipo === "convenio");
  }, [formas]);

  const especialidadeOptions = useMemo(() => {
    const items = new Set<string>();

    for (const especialidade of especialidadesCatalogo) {
      items.add(especialidade.nome);
      for (const alias of especialidade.aliases || []) {
        items.add(alias);
      }
    }

    return Array.from(items).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [especialidadesCatalogo]);

  function resolveEspecialidadeDigitada(rawValue: string) {
    const q = normalizeSearch(rawValue);
    if (!q) return null;

    return (
      especialidadesCatalogo.find((especialidade) =>
        [especialidade.nome, especialidade.nome_normalizado, ...(especialidade.aliases || [])]
          .filter(Boolean)
          .some((value) => normalizeSearch(value) === q),
      ) || null
    );
  }

  function resolveEspecialidadesParaSalvar(rawValue: string): string {
    const especialidades = splitEspecialidadesInput(rawValue);
    if (especialidades.length === 0) {
      throw new Error("Informe ao menos uma especialidade");
    }

    return especialidades
      .map((item) => {
        const existente = resolveEspecialidadeDigitada(item);
        if (existente) return existente.nome;

        if (!isGlobalAdmin) {
          throw new Error(`Especialidade não cadastrada: ${item}. Peça ao Admin Global para cadastrar.`);
        }

        return item;
      })
      .join(", ");
  }

  const clientesFiltrados = useMemo(() => {
    return clientes.filter((cliente) => {
      const clienteAtivo = cliente.status === "ativo" && cliente.ativo !== false;
      if (clienteFiltro === "ativos") return clienteAtivo;
      if (clienteFiltro === "inativos") return !clienteAtivo;
      return true;
    });
  }, [clientes, clienteFiltro]);

  const totalClientePages = Math.max(1, Math.ceil(clientesFiltrados.length / CLIENTES_PAGE_SIZE));
  const clientesPageSafe = Math.min(clientesPage, totalClientePages);
  const clientesPaginados = useMemo(() => {
    const start = (clientesPageSafe - 1) * CLIENTES_PAGE_SIZE;
    return clientesFiltrados.slice(start, start + CLIENTES_PAGE_SIZE);
  }, [clientesFiltrados, clientesPageSafe]);


  const formasFiltradas = useMemo(() => {
    const q = normalizeSearch(formasSearch);

    return formas
      .filter((forma) => {
        if (!q) return true;

        return [
          forma.tipo,
          forma.nome,
          forma.convenio_global,
          forma.exige_plano ? "exige plano" : "nao exige plano",
        ]
          .filter(Boolean)
          .some((value) => normalizeSearch(value).includes(q));
      });
  }, [formas, formasSearch]);

  const totalFormasPages = Math.max(1, Math.ceil(formasFiltradas.length / FORMAS_PAGE_SIZE));
  const formasPageSafe = Math.min(formasPage, totalFormasPages);
  const formasPaginadas = useMemo(() => {
    const start = (formasPageSafe - 1) * FORMAS_PAGE_SIZE;
    return formasFiltradas.slice(start, start + FORMAS_PAGE_SIZE);
  }, [formasFiltradas, formasPageSafe]);


  const medicosFiltrados = useMemo(() => {
    const q = normalizeSearch(medicoSearch);

    return medicos.filter((medico) => {
      if (medicoStatusFiltro === "ativos" && !medico.ativo) return false;
      if (medicoStatusFiltro === "inativos" && medico.ativo) return false;

      if (!q) return true;

      return [
        medico.nome,
        medico.registro_profissional,
        medico.especialidades,
        medico.dias,
        medico.andar,
        medico.ativo ? "ativo" : "inativo",
      ]
        .filter(Boolean)
        .some((value) => normalizeSearch(value).includes(q));
    });
  }, [medicos, medicoSearch, medicoStatusFiltro]);

  const totalMedicosPages = Math.max(1, Math.ceil(medicosFiltrados.length / MEDICOS_PAGE_SIZE));
  const medicosPageSafe = Math.min(medicosPage, totalMedicosPages);
  const medicosPaginados = useMemo(() => {
    const start = (medicosPageSafe - 1) * MEDICOS_PAGE_SIZE;
    return medicosFiltrados.slice(start, start + MEDICOS_PAGE_SIZE);
  }, [medicosFiltrados, medicosPageSafe]);


  const aceitesFiltrados = useMemo(() => {
    const q = normalizeSearch(aceiteSearch);

    return aceites.filter((aceite) => {
      if (!q) return true;

      return [
        aceite.convenio,
        aceite.produto,
        aceite.produto_tipo,
        aceite.especialidade,
        aceite.codigo_operadora,
        aceite.acomodacao_ou_uf,
        aceite.origem_regra,
      ]
        .filter(Boolean)
        .some((value) => normalizeSearch(value).includes(q));
    });
  }, [aceites, aceiteSearch]);

  const produtosFiltrados = useMemo(() => {
    const q = normalizeSearch(produtoSearch);
    if (!q) return produtos;
    return produtos.filter((produto) =>
      [produto.nome, produto.tipo, produto.codigo_operadora, produto.acomodacao_ou_uf]
        .filter(Boolean)
        .some((value) => normalizeSearch(value).includes(q)),
    );
  }, [produtos, produtoSearch]);

  const totalProdutoPages = Math.max(
    1,
    Math.ceil(produtosFiltrados.length / PRODUTOS_PAGE_SIZE),
  );

  const produtoPageSafe = Math.min(produtoPage, totalProdutoPages);

  const produtosPaginados = useMemo(() => {
    const start = (produtoPageSafe - 1) * PRODUTOS_PAGE_SIZE;
    const end = start + PRODUTOS_PAGE_SIZE;
    return produtosFiltrados.slice(start, end);
  }, [produtoPageSafe, produtosFiltrados]);

  const produtosPageStart =
    produtosFiltrados.length === 0
      ? 0
      : (produtoPageSafe - 1) * PRODUTOS_PAGE_SIZE + 1;

  const produtosPageEnd = Math.min(
    produtoPageSafe * PRODUTOS_PAGE_SIZE,
    produtosFiltrados.length,
  );


  const totalAceitePages = Math.max(
    1,
    Math.ceil(aceitesFiltrados.length / ACEITES_PAGE_SIZE),
  );

  const aceitePageSafe = Math.min(aceitePage, totalAceitePages);

  const aceitesPaginados = useMemo(() => {
    const start = (aceitePageSafe - 1) * ACEITES_PAGE_SIZE;
    const end = start + ACEITES_PAGE_SIZE;
    return aceitesFiltrados.slice(start, end);
  }, [aceitePageSafe, aceitesFiltrados]);

  const aceitesPageStart =
    aceitesFiltrados.length === 0
      ? 0
      : (aceitePageSafe - 1) * ACEITES_PAGE_SIZE + 1;

  const aceitesPageEnd = Math.min(
    aceitePageSafe * ACEITES_PAGE_SIZE,
    aceitesFiltrados.length,
  );


  const whatsappLogsResumo = useMemo(() => {
    const total = whatsappLogs.length;
    const failed = whatsappLogs.filter((log) => log.status === "failed" || log.error_message).length;
    const sent = whatsappLogs.filter((log) => log.status === "sent").length;
    return { total, failed, sent };
  }, [whatsappLogs]);

  const whatsappLogGroups = useMemo(() => {
    const groups = new Map<string, {
      key: string;
      phone: string;
      cliente: string;
      canal: string;
      latest: WhatsappMessageLog;
      logs: WhatsappMessageLog[];
      count: number;
      errorCount: number;
      statuses: string[];
      intents: string[];
    }>();

    for (const log of whatsappLogs) {
      const phone = log.from_number || log.from_phone || log.to_phone || "sem-telefone";
      const canal = log.phone_number_id || "sem-canal";
      const cliente = String(log.cliente_nome || log.cliente_id || "sem-cliente");
      const key = `${canal}:${phone}:${cliente}`;
      const current = groups.get(key);

      if (!current) {
        groups.set(key, {
          key,
          phone,
          cliente,
          canal,
          latest: log,
          logs: [log],
          count: 1,
          errorCount: log.error_message || log.status === "failed" ? 1 : 0,
          statuses: log.status ? [log.status] : [],
          intents: log.intent ? [log.intent] : [],
        });
        continue;
      }

      current.logs.push(log);
      current.count += 1;
      if (log.error_message || log.status === "failed") current.errorCount += 1;
      if (log.status && !current.statuses.includes(log.status)) current.statuses.push(log.status);
      if (log.intent && !current.intents.includes(log.intent)) current.intents.push(log.intent);

      const latestTime = new Date(current.latest.created_at).getTime();
      const logTime = new Date(log.created_at).getTime();
      if (!Number.isNaN(logTime) && (Number.isNaN(latestTime) || logTime > latestTime)) {
        current.latest = log;
      }
    }

    return Array.from(groups.values()).sort((a, b) => {
      const aTime = new Date(a.latest.created_at).getTime();
      const bTime = new Date(b.latest.created_at).getTime();
      return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
    });
  }, [whatsappLogs]);

  const totalWhatsappLogGroupPages = Math.max(1, Math.ceil(whatsappLogGroups.length / WHATSAPP_LOG_GROUPS_PAGE_SIZE));
  const whatsappLogGroupsPageSafe = Math.min(whatsappLogGroupsPage, totalWhatsappLogGroupPages);
  const whatsappLogGroupsPaginados = useMemo(() => {
    const start = (whatsappLogGroupsPageSafe - 1) * WHATSAPP_LOG_GROUPS_PAGE_SIZE;
    return whatsappLogGroups.slice(start, start + WHATSAPP_LOG_GROUPS_PAGE_SIZE);
  }, [whatsappLogGroups, whatsappLogGroupsPageSafe]);


  const whatsappCanaisResumo = useMemo(() => {
    const ativos = whatsappCanais.filter((canal) => canal.ativo).length;
    const grupos = whatsappCanais.filter((canal) => canal.modo_atendimento === "grupo_unidades").length;
    return { total: whatsappCanais.length, ativos, grupos };
  }, [whatsappCanais]);

  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((usuario) => {
      if (usuarioStatusFiltro === "ativos") return usuario.ativo;
      if (usuarioStatusFiltro === "inativos") return !usuario.ativo;
      return true;
    });
  }, [usuarios, usuarioStatusFiltro]);

  const auditLogsResumo = useMemo(() => {
    const total = auditLogs.length;
    const usuarios = new Set(auditLogs.map((log) => log.usuario_email).filter(Boolean)).size;
    const clinicas = new Set(auditLogs.map((log) => log.cliente_id).filter(Boolean)).size;
    return { total, usuarios, clinicas };
  }, [auditLogs]);

  const auditActionOptions = useMemo(() => {
    return Array.from(new Set(auditLogs.map((log) => log.acao).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [auditLogs]);

  const auditEntityOptions = useMemo(() => {
    return Array.from(new Set(auditLogs.map((log) => log.entidade).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [auditLogs]);

  function showToast(text: string, keepVisible = false) {
    setToast(text);

    if (!keepVisible) {
      window.setTimeout(() => {
        setToast("");
      }, 2200);
    }
  }

  function toCadastroDraft(cliente: Cliente): ClienteCadastroDraft {
    return {
      nome_fantasia: cliente.nome_fantasia || "",
      telefone_contato: cliente.telefone_contato || "",
      whatsapp_contato: cliente.whatsapp_contato || "",
      email_contato: cliente.email_contato || "",
      site: cliente.site || "",
      cep: cliente.cep || "",
      logradouro: cliente.logradouro || "",
      numero: cliente.numero || "",
      complemento: cliente.complemento || "",
      bairro: cliente.bairro || "",
      cidade: cliente.cidade || "",
      estado: cliente.estado || "",
    };
  }

  function selecionarCliente(clienteId: number) {
    if (clienteId === selectedClienteId) return;

    setSelectedClienteId(clienteId);
    setMedicos([]);
    setSelectedMedicoId(null);
    setEditingMedicoId(null);
    setMedicoForm(emptyMedicoForm);
    setAceites([]);
    setAceitePage(1);
    setDisponibilidades(buildDefaultDisponibilidades());
    setSelectedForma(null);
    setProdutos([]);
    setEditingFormaId(null);
    setNovaForma(emptyFormaForm);
    setWhatsappLogs([]);
  }

  async function loadEspecialidadesCatalogo() {
    const data = await api<EspecialidadeCatalogo[]>("/api/admin/especialidades");
    setEspecialidadesCatalogo(data);
  }

  async function loadClientes() {
    setLoading(true);
    try {
      const data = await api<Cliente[]>("/api/admin/clientes");
      setClientes(data);
      if (!selectedClienteId && data.length > 0) {
        setSelectedClienteId(data[0].id);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadClienteOperacional(clienteId: number) {
    const [cliente, config] = await Promise.all([
      api<Cliente>(`/api/admin/clientes/${clienteId}`),
      api<ClienteConfiguracao | null>(`/api/admin/clientes/${clienteId}/configuracao`),
    ]);

    setClienteCadastro(toCadastroDraft(cliente));
    setClienteConfig(
      config || {
        cliente_id: Number(clienteId),
        usa_convenio: Boolean(cliente.usa_convenio),
        usa_particular: Boolean(cliente.usa_particular),
        usa_cartao: Boolean(cliente.usa_cartao),
        exige_plano: Boolean(cliente.exige_plano),
        exige_especialidade: true,
        exige_data_nascimento: true,
        encaminhar_humano_quando_nao_encontrar: true,
        provedor_agenda: cliente.provedor_agenda || "mock",
        agenda_config: {
          sessionTimeoutMinutes: 10,
          timeoutAtendimentoMinutos: 10,
        },
        ativo: true,
      },
    );
  }

  async function loadFormas(clienteId: number) {
    setFormasSearch("");
    setProdutoSearch("");
    setProdutoPage(1);
    const data = await api<FormaAtendimento[]>(`/api/admin/clientes/${clienteId}/formas-atendimento`);
    setFormas(data);
    setSelectedForma(null);
    setProdutos([]);
    setEditingFormaId(null);
    setNovaForma(emptyFormaForm);
  }

  async function selecionarClienteParaMedicos(rawClienteId: number) {
    const clienteId = Number(rawClienteId);
    if (!Number.isFinite(clienteId) || clienteId <= 0) return;

    setToast("");
    setSelectedClienteId(clienteId);
    setSelectedMedicoId(null);
    setEditingMedicoId(null);
    setMedicoForm(emptyMedicoForm);
    setMedicos([]);
    setAceites([]);
    setDisponibilidades(buildDefaultDisponibilidades());
    setLoadingAction("medicos.cliente.select");

    try {
      await Promise.all([
        loadClienteOperacional(clienteId),
        loadFormas(clienteId),
        loadMedicos(clienteId),
      ]);
    } catch (error) {
      showToast(error instanceof Error ? `Erro: ${error.message}` : "Erro ao carregar médicos da clínica", true);
    } finally {
      setLoadingAction((current) => current === "medicos.cliente.select" ? null : current);
    }
  }

  async function loadMedicos(clienteId: number) {
    setMedicoSearch("");
    setMedicoStatusFiltro("ativos");
    setAceiteSearch("");
    setMedicos([]);
    setSelectedMedicoId(null);
    setEditingMedicoId(null);
    setMedicoForm(emptyMedicoForm);
    setAceites([]);
    setAceitePage(1);
    setDisponibilidades(buildDefaultDisponibilidades());

    const data = await api<Medico[]>(`/api/admin/clientes/${clienteId}/medicos`);
    setMedicos(data);

    if (data.length > 0) {
      setSelectedMedicoId(data[0].id);
    }
  }

  async function loadAceites(medicoId: number) {
    if (!selectedClienteId) return;
    const medicoAtual = medicos.find((medico) => medico.id === medicoId && medico.cliente_id === selectedClienteId);
    if (!medicoAtual) {
      setAceites([]);
      return;
    }

    const data = await api<AceiteMedico[]>(
      `/api/admin/clientes/${selectedClienteId}/medicos/${medicoId}/aceites?status=${aceiteFiltro}`,
    );
    setAceites(data);
  }

  async function loadDisponibilidades(medicoId: number) {
    if (!selectedClienteId) return;
    const medicoAtual = medicos.find((medico) => medico.id === medicoId && medico.cliente_id === selectedClienteId);
    if (!medicoAtual) {
      setDisponibilidades(buildDefaultDisponibilidades());
      return;
    }

    const data = await api<MedicoDisponibilidade[]>(
      `/api/admin/clientes/${selectedClienteId}/medicos/${medicoId}/disponibilidades`,
    );
    setDisponibilidades(mergeDisponibilidadesFromApi(data));
  }

  async function loadProdutos(forma: FormaAtendimento) {
    setSelectedForma(forma);
    setProdutoSearch("");
    setProdutoPage(1);
    const data = await api<ProdutosResponse>(`/api/admin/formas-atendimento/${forma.id}/produtos`);
    setProdutos(data.produtos);
  }


  async function loadUsuarios() {
    if (!isGlobalAdmin) return;
    setLoadingAction("usuarios.refresh");
    try {
      const data = await api<AdminUsuario[]>("/api/admin/usuarios");
      setUsuarios(data);
    } finally {
      setLoadingAction((current) => (current === "usuarios.refresh" ? null : current));
    }
  }

  function resetUsuarioForm() {
    setEditingUsuarioId(null);
    setUsuarioForm({
      nome: "",
      email: "",
      perfil: "clinica",
      senha_provisoria: "",
      ativo: true,
      cliente_ids: [],
    });
  }

  function handleEditUsuario(usuario: AdminUsuario) {
    setEditingUsuarioId(usuario.id);
    setUsuarioForm({
      nome: usuario.nome || "",
      email: usuario.email || "",
      perfil: usuario.perfil,
      senha_provisoria: "",
      ativo: usuario.ativo,
      cliente_ids: usuario.perfil === "clinica" ? (usuario.clientes || []).map((cliente) => cliente.id) : [],
    });
  }

  async function handleCreateUsuario(event: React.FormEvent) {
    event.preventDefault();

    const isEditing = Boolean(editingUsuarioId);
    const normalizedEmail = normalizeEmail(usuarioForm.email);
    const normalizedNome = usuarioForm.nome.trim();

    if (!normalizedNome) {
      showToast("❌ Informe o nome do usuário", true);
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      showToast("❌ Informe um e-mail válido", true);
      return;
    }

    if (usuarioForm.perfil === "clinica" && usuarioForm.cliente_ids.length === 0) {
      showToast("❌ Selecione pelo menos uma clínica para o Admin Clínica", true);
      return;
    }

    const payload: Record<string, unknown> = {
      nome: normalizedNome,
      email: normalizedEmail,
      perfil: usuarioForm.perfil,
      ativo: usuarioForm.ativo,
      cliente_ids: usuarioForm.perfil === "clinica" ? usuarioForm.cliente_ids : [],
    };

    setLoadingAction(isEditing ? "usuarios.save" : "usuarios.create");
    try {
      if (isEditing && editingUsuarioId) {
        await api<AdminUsuario>(`/api/admin/usuarios/${editingUsuarioId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        showToast("✅ Usuário atualizado");
      } else {
        await api<AdminUsuario>("/api/admin/usuarios", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        showToast("✅ Usuário criado e convite enviado por e-mail");
      }

      resetUsuarioForm();
      await loadUsuarios();
    } catch (error) {
      showToast(error instanceof Error ? `❌ ${error.message}` : "❌ Erro ao salvar usuário", true);
    } finally {
      setLoadingAction((current) => (current === "usuarios.save" || current === "usuarios.create" ? null : current));
    }
  }

  async function handleToggleUsuarioAtivo(usuario: AdminUsuario) {
    const nextAtivo = !usuario.ativo;
    const acao = nextAtivo ? "ativar" : "inativar";
    const confirmed = window.confirm(`${acao.charAt(0).toUpperCase() + acao.slice(1)} usuário ${usuario.nome}?`);
    if (!confirmed) return;

    setLoadingAction(`usuarios.toggle.${usuario.id}`);
    try {
      await api<AdminUsuario>(`/api/admin/usuarios/${usuario.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ativo: nextAtivo }),
      });
      showToast(nextAtivo ? "✅ Usuário ativado" : "✅ Usuário inativado");
      await loadUsuarios();
      if (editingUsuarioId === usuario.id) {
        setUsuarioForm((current) => ({ ...current, ativo: nextAtivo }));
      }
    } catch (error) {
      showToast(error instanceof Error ? `❌ ${error.message}` : "❌ Erro ao alterar status do usuário", true);
    } finally {
      setLoadingAction((current) => (current === `usuarios.toggle.${usuario.id}` ? null : current));
    }
  }

  async function handleResetUsuarioMfa(usuario: AdminUsuario) {
    const confirmed = window.confirm(
      `Resetar MFA de ${usuario.nome}? No próximo login, esse usuário precisará cadastrar novo QR Code.`,
    );

    if (!confirmed) return;

    setLoadingAction(`usuarios.mfa.${usuario.id}`);
    try {
      await api<AdminUsuario>(`/api/admin/usuarios/${usuario.id}/reset-mfa`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      showToast("✅ MFA resetado. O usuário deverá configurar o Authenticator no próximo login.");
      await loadUsuarios();
    } catch (error) {
      showToast(error instanceof Error ? `❌ ${error.message}` : "❌ Erro ao resetar MFA", true);
    } finally {
      setLoadingAction((current) => (current === `usuarios.mfa.${usuario.id}` ? null : current));
    }
  }

  async function handleSendUsuarioInvite(usuario: AdminUsuario) {
    const confirmed = window.confirm(`Enviar convite de ativação para ${usuario.email}?`);
    if (!confirmed) return;

    setLoadingAction(`usuarios.invite.${usuario.id}`);
    try {
      await api<AdminUsuario>(`/api/admin/usuarios/${usuario.id}/send-invite`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      showToast("✅ Convite enviado por e-mail");
    } catch (error) {
      showToast(error instanceof Error ? `❌ ${error.message}` : "❌ Erro ao enviar convite", true);
    } finally {
      setLoadingAction((current) => (current === `usuarios.invite.${usuario.id}` ? null : current));
    }
  }

  async function handleSendUsuarioPasswordReset(usuario: AdminUsuario) {
    const confirmed = window.confirm(`Enviar link de redefinição de senha para ${usuario.email}?`);
    if (!confirmed) return;

    setLoadingAction(`usuarios.resetmail.${usuario.id}`);
    try {
      await api<AdminUsuario>(`/api/admin/usuarios/${usuario.id}/send-password-reset`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      showToast("✅ Link de redefinição enviado por e-mail");
    } catch (error) {
      showToast(error instanceof Error ? `❌ ${error.message}` : "❌ Erro ao enviar reset de senha", true);
    } finally {
      setLoadingAction((current) => (current === `usuarios.resetmail.${usuario.id}` ? null : current));
    }
  }

  function toggleUsuarioCliente(clienteId: number) {
    setUsuarioForm((current) => {
      const exists = current.cliente_ids.includes(clienteId);
      return {
        ...current,
        cliente_ids: exists
          ? current.cliente_ids.filter((id) => id !== clienteId)
          : [...current.cliente_ids, clienteId],
      };
    });
  }

  async function loadWhatsappLogs() {
    setWhatsappLogsLoading(true);
    try {
      const params = new URLSearchParams();
      // Não filtrar automaticamente por cliente aqui.
      // Os logs antigos podem estar com cliente_id nulo, e o filtro por cliente
      // esconde a auditoria inteira ao trocar de clínica no painel.
      if (whatsappLogFilters.phone.trim()) params.set("phone", whatsappLogFilters.phone.trim());
      if (whatsappLogFilters.status !== "todos") params.set("status", whatsappLogFilters.status);
      if (whatsappLogFilters.startDate) params.set("startDate", whatsappLogFilters.startDate);
      if (whatsappLogFilters.endDate) params.set("endDate", whatsappLogFilters.endDate);
      if (whatsappLogFilters.onlyErrors) params.set("onlyErrors", "true");
      params.set("limit", String(WHATSAPP_LOGS_PAGE_SIZE));

      const data = await api<WhatsappMessageLog[]>(`/api/admin/whatsapp/logs?${params.toString()}`);
      setWhatsappLogs(data);
    } finally {
      setWhatsappLogsLoading(false);
    }
  }

  async function loadWhatsappCanais() {
    if (!isGlobalAdmin) return;
    setWhatsappCanaisLoading(true);
    try {
      const data = await api<ClienteCanalWhatsapp[]>("/api/admin/whatsapp/canais");
      setWhatsappCanais(data);
    } finally {
      setWhatsappCanaisLoading(false);
    }
  }

  async function loadWhatsappAntiAbuseStatus() {
    if (!isGlobalAdmin) return;
    setWhatsappAntiAbuseLoading(true);
    try {
      const data = await api<WhatsappAntiAbuseStatus>("/api/admin/whatsapp/anti-abuse/status");
      setWhatsappAntiAbuseStatus(data);
      setWhatsappAlertsLastUpdatedAt(new Date().toISOString());
      setWhatsappAutoRefreshError(null);
    } finally {
      setWhatsappAntiAbuseLoading(false);
    }
  }

  async function handleCreateWhatsappManualBlock(event?: React.FormEvent) {
    event?.preventDefault();
    if (!whatsappManualBlockForm.phoneNumberId.trim() || !whatsappManualBlockForm.from.trim()) {
      showToast("❌ Informe canal e telefone para bloquear", true);
      return;
    }
    setWhatsappManualBlockLoading(true);
    try {
      const durationValue = whatsappManualBlockForm.durationSeconds === "permanent" ? null : Number(whatsappManualBlockForm.durationSeconds || 0);
      await api("/api/admin/whatsapp/anti-abuse/block", {
        method: "POST",
        body: JSON.stringify({
          phoneNumberId: whatsappManualBlockForm.phoneNumberId.trim(),
          from: whatsappManualBlockForm.from.trim(),
          durationSeconds: durationValue,
          reason: whatsappManualBlockForm.reason || "manual_block",
          note: whatsappManualBlockForm.note.trim(),
        }),
      });
      showToast("✅ Número bloqueado no Angel");
      setWhatsappManualBlockForm((current) => ({ ...current, from: "", note: "" }));
      await loadWhatsappAntiAbuseStatus();
      await loadWhatsappLogs();
    } catch (error) {
      showToast(error instanceof Error ? `❌ ${error.message}` : "❌ Erro ao bloquear número", true);
    } finally {
      setWhatsappManualBlockLoading(false);
    }
  }

  async function handleReleaseWhatsappManualBlock(phoneNumberId: string, from: string) {
    const confirmed = window.confirm(`Liberar bloqueio manual/interno do número ${from} no canal ${phoneNumberId}?`);
    if (!confirmed) return;
    setWhatsappManualBlockLoading(true);
    try {
      await api("/api/admin/whatsapp/anti-abuse/block", {
        method: "DELETE",
        body: JSON.stringify({ phoneNumberId, from }),
      });
      showToast("✅ Bloqueio liberado no Angel");
      await loadWhatsappAntiAbuseStatus();
      await loadWhatsappLogs();
    } catch (error) {
      showToast(error instanceof Error ? `❌ ${error.message}` : "❌ Erro ao liberar bloqueio", true);
    } finally {
      setWhatsappManualBlockLoading(false);
    }
  }

  function fillManualBlockFromEvent(phoneNumberId: string, from: string) {
    setWhatsappManualBlockForm((current) => ({ ...current, phoneNumberId, from }));
    showToast("📌 Dados copiados para bloqueio manual");
  }

  async function loadWhatsappGoLiveChecklist() {
    if (!isGlobalAdmin) return;
    setWhatsappGoLiveLoading(true);
    try {
      const data = await api<WhatsappGoLiveChecklist>("/api/admin/whatsapp/golive-checklist");
      setWhatsappGoLiveChecklist(data);
    } finally {
      setWhatsappGoLiveLoading(false);
    }
  }


  async function loadWhatsappGruposUnidades() {
    if (!isGlobalAdmin) return;
    setWhatsappGruposLoading(true);
    try {
      const data = await api<WhatsappGruposUnidadesOverview>("/api/admin/whatsapp/grupos-unidades");
      setWhatsappGruposUnidades(data);
    } finally {
      setWhatsappGruposLoading(false);
    }
  }

  async function refreshWhatsappCanaisArea() {
    if (!isGlobalAdmin) return;
    await Promise.all([
      loadWhatsappCanais(),
      loadWhatsappGruposUnidades(),
      loadWhatsappGoLiveChecklist(),
    ]);
  }


  async function loadDashboardGerencial() {
    setDashboardGerencialLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("days", dashboardGerencialFilters.days);
      if (dashboardGerencialFilters.clienteId !== "todos") {
        params.set("clienteId", dashboardGerencialFilters.clienteId);
      }
      const data = await api<DashboardGerencial>(`/api/admin/dashboard/gerencial?${params.toString()}`);
      setDashboardGerencial(data);
    } catch (error) {
      setDashboardGerencial(null);
      showToast(error instanceof Error ? `❌ ${error.message}` : "❌ Erro ao carregar dashboard gerencial", true);
    } finally {
      setDashboardGerencialLoading(false);
    }
  }

  async function loadFollowupsPanel() {
    setFollowupsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("days", followupsFilters.days);
      params.set("status", followupsFilters.status);
      params.set("page", String(followupsFilters.page));
      params.set("pageSize", String(followupsFilters.pageSize));
      if (followupsFilters.clienteId !== "todos") params.set("clienteId", followupsFilters.clienteId);
      if (followupsFilters.q.trim()) params.set("q", followupsFilters.q.trim());
      const data = await api<FollowupOperationalPanel>(`/api/admin/followups?${params.toString()}`);
      setFollowupsPanel(data);
    } finally {
      setFollowupsLoading(false);
    }
  }

  function toggleDashboardReportSection(section: DashboardSectionKey) {
    setDashboardReportSections((current) => ({ ...current, [section]: !current[section] }));
  }

  function dashboardFilterLabel() {
    const days = dashboardGerencial?.filters.days || Number(dashboardGerencialFilters.days || 7);
    const cliente = dashboardGerencialFilters.clienteId === "todos"
      ? "Todos os clientes"
      : clientes.find((item) => String(item.id) === dashboardGerencialFilters.clienteId)?.nome_fantasia || `Cliente #${dashboardGerencialFilters.clienteId}`;
    return `${days} dia(s) · ${cliente}`;
  }

  function makeDashboardWorkbook() {
    if (!dashboardGerencial) throw new Error("Carregue o dashboard antes de exportar.");
    const wb = XLSX.utils.book_new();
    if (dashboardReportSections.resumo) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
        { Indicador: "Mensagens", Valor: dashboardGerencial.summary.totalMensagens },
        { Indicador: "Pacientes únicos", Valor: dashboardGerencial.summary.pacientesUnicos },
        { Indicador: "Conversas", Valor: dashboardGerencial.summary.conversas },
        { Indicador: "Agendamentos iniciados", Valor: dashboardGerencial.summary.agendamentosIniciados },
        { Indicador: "Agendamentos concluídos", Valor: dashboardGerencial.summary.agendamentosConcluidos },
        { Indicador: "Abandonadas", Valor: dashboardGerencial.summary.conversasAbandonadas },
        { Indicador: "Taxa de conversão", Valor: `${dashboardGerencial.summary.taxaConversao}%` },
        { Indicador: "Bloqueios anti-abuso", Valor: dashboardGerencial.summary.bloqueiosAntiAbuso },
      ]), "Resumo");
    }
    if (dashboardReportSections.evolucao) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dashboardGerencial.breakdowns.byDay), "Evolucao");
    if (dashboardReportSections.unidades) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dashboardGerencial.breakdowns.byCliente), "Unidades");
    if (dashboardReportSections.especialidades) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dashboardGerencial.breakdowns.byEspecialidade), "Especialidades");
    if (dashboardReportSections.convenios) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dashboardGerencial.breakdowns.byConvenioPlano), "Convenios");
    if (dashboardReportSections.etapas) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dashboardGerencial.breakdowns.byStage), "Etapas");
    if (dashboardReportSections.logs) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dashboardGerencial.reportRows), "Logs");
    return wb;
  }

  function exportDashboardExcel() {
    try {
      const wb = makeDashboardWorkbook();
      XLSX.writeFile(wb, `angel-dashboard-gerencial-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (error) {
      showToast(error instanceof Error ? `❌ ${error.message}` : "❌ Erro ao gerar Excel", true);
    }
  }

  function topListHtml(title: string, rows: DashboardTopItem[]) {
    if (!rows.length) return `<h3>${title}</h3><p>Sem dados no período.</p>`;
    return `<h3>${title}</h3><table><thead><tr><th>Item</th><th>Total</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${row.label}</td><td>${row.total}</td></tr>`).join("")}</tbody></table>`;
  }

  function printDashboardPdf() {
    if (!dashboardGerencial) {
      showToast("❌ Carregue o dashboard antes de gerar PDF", true);
      return;
    }
    const sections: string[] = [];
    if (dashboardReportSections.resumo) sections.push(`
      <h2>Resumo executivo</h2>
      <div class="kpis">
        <div><strong>${dashboardGerencial.summary.totalMensagens}</strong><span>Mensagens</span></div>
        <div><strong>${dashboardGerencial.summary.pacientesUnicos}</strong><span>Pacientes únicos</span></div>
        <div><strong>${dashboardGerencial.summary.agendamentosIniciados}</strong><span>Agendamentos iniciados</span></div>
        <div><strong>${dashboardGerencial.summary.agendamentosConcluidos}</strong><span>Agendamentos concluídos</span></div>
        <div><strong>${dashboardGerencial.summary.taxaConversao}%</strong><span>Conversão</span></div>
      </div>`);
    if (dashboardReportSections.evolucao) sections.push(topListHtml("Evolução por dia", dashboardGerencial.breakdowns.byDay.map((row) => ({ label: row.label, total: row.mensagens }))));
    if (dashboardReportSections.unidades) sections.push(topListHtml("Unidades / clientes", dashboardGerencial.breakdowns.byCliente));
    if (dashboardReportSections.especialidades) sections.push(topListHtml("Atendimentos por especialidade", dashboardGerencial.breakdowns.byEspecialidade));
    if (dashboardReportSections.convenios) sections.push(topListHtml("Atendimentos por convênio/plano", dashboardGerencial.breakdowns.byConvenioPlano));
    if (dashboardReportSections.etapas) sections.push(topListHtml("Atendimentos por etapa final", dashboardGerencial.breakdowns.byStage));
    if (dashboardReportSections.logs) sections.push(`<h3>Logs recentes</h3><table><thead><tr><th>Data</th><th>Cliente</th><th>Telefone</th><th>Status</th><th>Etapa</th><th>Intenção</th></tr></thead><tbody>${dashboardGerencial.reportRows.slice(0, 80).map((row) => `<tr><td>${formatDateTimeShort(row.data)}</td><td>${row.cliente}</td><td>${row.telefone}</td><td>${row.status}</td><td>${row.etapa}</td><td>${row.intencao}</td></tr>`).join("")}</tbody></table>`);

    const win = window.open("", "_blank", "width=1100,height=800");
    if (!win) {
      showToast("❌ Pop-up bloqueado. Libere pop-ups para gerar PDF.", true);
      return;
    }
    win.document.write(`<!doctype html><html><head><title>Relatório gerencial Angel</title><style>
      body{font-family:Arial,sans-serif;color:#0f172a;margin:32px} h1{margin-bottom:4px} .meta{color:#64748b;margin-bottom:24px}.kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin:16px 0}.kpis div{border:1px solid #cbd5e1;border-radius:12px;padding:14px}.kpis strong{font-size:28px;display:block}table{border-collapse:collapse;width:100%;margin:12px 0 24px}th,td{border-bottom:1px solid #e2e8f0;text-align:left;padding:8px;font-size:12px}th{background:#f8fafc} @media print{button{display:none}}
    </style></head><body><button onclick="window.print()">Salvar/imprimir PDF</button><h1>Relatório gerencial Angel</h1><div class="meta">${dashboardFilterLabel()} · Gerado em ${formatDateTimeShort(dashboardGerencial.generatedAt)}</div>${sections.join("")}</body></html>`);
    win.document.close();
    win.focus();
  }

  async function loadWhatsappDiagnostics() {
    if (!isGlobalAdmin) return;
    setWhatsappDiagnosticsLoading(true);
    try {
      const data = await api<WhatsappDiagnostics>("/api/admin/whatsapp/diagnostico");
      setWhatsappDiagnostics(data);
      setWhatsappDashboardLastUpdatedAt(new Date().toISOString());
      setWhatsappAutoRefreshError(null);
      await loadWhatsappAntiAbuseStatus();
      await loadWhatsappGoLiveChecklist();
    } finally {
      setWhatsappDiagnosticsLoading(false);
    }
  }

  async function handleRunWhatsappChannelTest(event?: React.FormEvent) {
    event?.preventDefault();
    const canalId = Number(whatsappTestForm.canalId);
    if (!canalId) {
      showToast("❌ Selecione um canal para testar", true);
      return;
    }
    setWhatsappTestLoading(true);
    try {
      const data = await api<WhatsappChannelTestResult>("/api/admin/whatsapp/diagnostico/test-message", {
        method: "POST",
        body: JSON.stringify({
          canalId,
          from: whatsappTestForm.from,
          text: whatsappTestForm.text,
        }),
      });
      setWhatsappTestResult(data);
      showToast("✅ Teste de canal executado");
      await loadWhatsappLogs();
    } catch (error) {
      showToast(error instanceof Error ? `❌ ${error.message}` : "❌ Erro ao testar canal", true);
    } finally {
      setWhatsappTestLoading(false);
    }
  }

  function resetWhatsappCanalForm() {
    setEditingWhatsappCanalId(null);
    setWhatsappCanalForm(createEmptyWhatsappCanalForm());
  }

  function handleEditWhatsappCanal(canal: ClienteCanalWhatsapp) {
    setEditingWhatsappCanalId(canal.id);
    setWhatsappCanalForm({
      cliente_id: String(canal.cliente_id || ""),
      nome: canal.nome || "",
      identificador: canal.identificador || "",
      provider: canal.provider || "meta",
      token_ref: canal.token_ref || "",
      modo_atendimento: canal.modo_atendimento || "cliente_direto",
      cliente_ids: (canal.cliente_ids || [])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id)),
      whatsapp_numero: canal.whatsapp_numero || "",
      nome_exibicao: canal.nome_exibicao || canal.nome || "",
      ativo: canal.ativo,
      principal: canal.principal,
    });
  }

  function toggleWhatsappCanalClienteId(clienteId: number) {
    const numericClienteId = Number(clienteId);
    if (!Number.isFinite(numericClienteId)) return;

    setWhatsappCanalForm((current) => {
      const normalizedIds = current.cliente_ids.map((id) => Number(id)).filter((id) => Number.isFinite(id));
      const exists = normalizedIds.includes(numericClienteId);

      return {
        ...current,
        cliente_ids: exists
          ? normalizedIds.filter((id) => id !== numericClienteId)
          : [...normalizedIds, numericClienteId],
      };
    });
  }

  async function handleSaveWhatsappCanal(event: React.FormEvent) {
    event.preventDefault();

    const clienteId = Number(whatsappCanalForm.cliente_id);
    const nome = whatsappCanalForm.nome.trim();
    const identificador = whatsappCanalForm.identificador.trim();

    if (!clienteId) {
      showToast("❌ Selecione o cliente base do canal", true);
      return;
    }

    if (!nome || !identificador) {
      showToast("❌ Informe nome do canal e phone_number_id", true);
      return;
    }

    const normalizedClienteIds = Array.from(
      new Set(
        whatsappCanalForm.cliente_ids
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0)
      )
    );

    if (whatsappCanalForm.modo_atendimento === "grupo_unidades" && normalizedClienteIds.length === 0) {
      showToast("❌ Para grupo de unidades, selecione os clientes/unidades exibidos no menu", true);
      return;
    }

    const payload = {
      id: editingWhatsappCanalId,
      cliente_id: clienteId,
      nome,
      identificador,
      provider: whatsappCanalForm.provider.trim() || "meta",
      token_ref: whatsappCanalForm.token_ref.trim() || null,
      modo_atendimento: whatsappCanalForm.modo_atendimento,
      cliente_ids: whatsappCanalForm.modo_atendimento === "grupo_unidades" ? normalizedClienteIds : [],
      whatsapp_numero: whatsappCanalForm.whatsapp_numero.trim() || null,
      nome_exibicao: whatsappCanalForm.nome_exibicao.trim() || nome,
      ativo: whatsappCanalForm.ativo,
      principal: whatsappCanalForm.principal,
    };

    setLoadingAction("whatsapp.canal.save");
    try {
      await api<ClienteCanalWhatsapp>("/api/admin/whatsapp/canais", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      showToast(editingWhatsappCanalId ? "✅ Canal WhatsApp atualizado" : "✅ Canal WhatsApp criado");
      resetWhatsappCanalForm();
      await refreshWhatsappCanaisArea();
    } catch (error) {
      showToast(error instanceof Error ? `❌ ${error.message}` : "❌ Erro ao salvar canal WhatsApp", true);
    } finally {
      setLoadingAction((current) => (current === "whatsapp.canal.save" ? null : current));
    }
  }

  async function handleToggleWhatsappCanal(canal: ClienteCanalWhatsapp) {
    const nextAtivo = !canal.ativo;
    setLoadingAction(`whatsapp.canal.toggle.${canal.id}`);
    try {
      await api<ClienteCanalWhatsapp>(`/api/admin/whatsapp/canais/${canal.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ativo: nextAtivo }),
      });
      showToast(nextAtivo ? "✅ Canal ativado" : "✅ Canal inativado");
      await refreshWhatsappCanaisArea();
    } catch (error) {
      showToast(error instanceof Error ? `❌ ${error.message}` : "❌ Erro ao alterar canal WhatsApp", true);
    } finally {
      setLoadingAction((current) => (current === `whatsapp.canal.toggle.${canal.id}` ? null : current));
    }
  }

  function getCanalClientesLabel(canal: ClienteCanalWhatsapp) {
    if (canal.modo_atendimento !== "grupo_unidades") {
      return canal.cliente_nome || `Cliente #${canal.cliente_id}`;
    }

    const nomes = (canal.cliente_ids || [])
      .map((rawId) => {
        const id = Number(rawId);
        return clientes.find((cliente) => cliente.id === id)?.nome_fantasia || `#${rawId}`;
      })
      .filter(Boolean);

    return nomes.join(", ") || "Grupo sem unidades configuradas";
  }

  async function loadAdminAuditLogs() {
    if (!isGlobalAdmin) return;
    setAuditLogsLoading(true);
    try {
      const params = new URLSearchParams();
      if (auditFilters.usuarioEmail.trim()) params.set("usuarioEmail", auditFilters.usuarioEmail.trim());
      if (auditFilters.clienteId !== "todos") params.set("clienteId", auditFilters.clienteId);
      if (auditFilters.acao.trim()) params.set("acao", auditFilters.acao.trim());
      if (auditFilters.entidade.trim()) params.set("entidade", auditFilters.entidade.trim());
      if (auditFilters.startDate) params.set("startDate", auditFilters.startDate);
      if (auditFilters.endDate) params.set("endDate", auditFilters.endDate);
      params.set("limit", String(ADMIN_AUDIT_PAGE_SIZE));

      const data = await api<AdminAuditLog[]>(`/api/admin/auditoria?${params.toString()}`);
      setAuditLogs(data);
    } finally {
      setAuditLogsLoading(false);
    }
  }

  useEffect(() => {
    const token = getStoredAdminToken();

    if (!token) {
      setAuthLoading(false);
      return;
    }

    api<AdminUser>("/api/admin/auth/me")
      .then((user) => setAuthUser(user))
      .catch(() => clearStoredAuth())
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    if (!authUser) return;

    Promise.all([loadClientes(), loadEspecialidadesCatalogo()]).catch((error) =>
      showToast(error.message, true),
    );
  }, [authUser]);

  useEffect(() => {
    if (!authUser) {
      setAccessScope(null);
      return;
    }

    api<AdminAccessScope>("/api/admin/auth/access-scope")
      .then((scope) => setAccessScope(scope))
      .catch(() => setAccessScope(null));
  }, [authUser]);


  useEffect(() => {
    if (!authUser) return;
    const allowedIds = new Set(operationalFilterClientes.map((cliente) => cliente.id));

    setDashboardGerencialFilters((current) => {
      if (current.clienteId === "todos") return current;
      return allowedIds.has(Number(current.clienteId)) ? current : { ...current, clienteId: "todos", canalId: "todos", groupId: "todos" };
    });

    setFollowupsFilters((current) => {
      if (current.clienteId === "todos") return current;
      return allowedIds.has(Number(current.clienteId)) ? current : { ...current, clienteId: "todos", page: 1 };
    });
  }, [authUser, operationalFilterClientes]);

  useEffect(() => {
    if (!authUser) return;

    const token = getStoredAdminToken();
    const expiresAtMs = getTokenExpirationMs(token);
    if (!expiresAtMs) return;

    const delayMs = expiresAtMs - Date.now();
    if (delayMs <= 0) {
      scheduleSessionExpiredReload("Sessão expirada por inatividade. Faça login novamente.");
      return;
    }

    const timer = window.setTimeout(() => {
      scheduleSessionExpiredReload("Sessão expirada por inatividade. Faça login novamente.");
    }, delayMs + 500);

    return () => window.clearTimeout(timer);
  }, [authUser]);

  useEffect(() => {
    if (activeTab === "usuarios" && isGlobalAdmin) {
      loadUsuarios().catch((error) => showToast(error.message, true));
    }
  }, [activeTab, isGlobalAdmin]);

  useEffect(() => {
    if (selectedClienteId) {
      Promise.all([
        loadClienteOperacional(selectedClienteId),
        loadFormas(selectedClienteId),
        loadMedicos(selectedClienteId),
      ]).catch((error) => showToast(error.message, true));
    } else {
      setClienteCadastro(null);
      setClienteConfig(null);
    }
  }, [selectedClienteId]);


  useEffect(() => {
    if (activeTab === "whatsapp") {
      Promise.all([loadWhatsappLogs(), loadWhatsappCanais(), loadWhatsappGruposUnidades()]).catch((error) => showToast(error.message, true));
    }
  }, [activeTab, selectedClienteId, isGlobalAdmin]);

  useEffect(() => {
    if (activeTab !== "whatsapp_operacao" || !isGlobalAdmin) return;

    let cancelled = false;

    const refreshDashboardSilently = async () => {
      try {
        const data = await api<WhatsappDiagnostics>("/api/admin/whatsapp/diagnostico");
        if (cancelled) return;
        setWhatsappDiagnostics(data);
        const goLive = await api<WhatsappGoLiveChecklist>("/api/admin/whatsapp/golive-checklist");
        if (cancelled) return;
        setWhatsappGoLiveChecklist(goLive);
        const grupos = await api<WhatsappGruposUnidadesOverview>("/api/admin/whatsapp/grupos-unidades");
        if (cancelled) return;
        setWhatsappGruposUnidades(grupos);
        setWhatsappDashboardLastUpdatedAt(new Date().toISOString());
        setWhatsappAutoRefreshError(null);
      } catch (error) {
        if (!cancelled) {
          setWhatsappAutoRefreshError(error instanceof Error ? error.message : "Falha ao atualizar dashboard");
        }
      }
    };

    const refreshAlertsSilently = async () => {
      try {
        const data = await api<WhatsappAntiAbuseStatus>("/api/admin/whatsapp/anti-abuse/status");
        if (cancelled) return;
        setWhatsappAntiAbuseStatus(data);
        setWhatsappAlertsLastUpdatedAt(new Date().toISOString());
        setWhatsappAutoRefreshError(null);
      } catch (error) {
        if (!cancelled) {
          setWhatsappAutoRefreshError(error instanceof Error ? error.message : "Falha ao atualizar alertas");
        }
      }
    };

    loadWhatsappCanais().catch((error) => {
      if (!cancelled) setWhatsappAutoRefreshError(error instanceof Error ? error.message : "Falha ao carregar canais WhatsApp");
    });
    refreshDashboardSilently();
    refreshAlertsSilently();

    const dashboardTimer = window.setInterval(refreshDashboardSilently, 15000);
    const alertsTimer = window.setInterval(refreshAlertsSilently, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(dashboardTimer);
      window.clearInterval(alertsTimer);
    };
  }, [activeTab, isGlobalAdmin]);

  useEffect(() => {
    if (activeTab !== "whatsapp_operacao") return;
    const timer = window.setInterval(() => setWhatsappCountdownTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "auditoria" && isGlobalAdmin) {
      loadAdminAuditLogs().catch((error) => showToast(error.message, true));
    }
  }, [activeTab, isGlobalAdmin]);

  useEffect(() => {
    if (activeTab === "dashboard_gerencial") {
      const tasks: Array<Promise<unknown>> = [loadDashboardGerencial()];
      if (isGlobalAdmin) {
        tasks.push(loadWhatsappCanais(), loadWhatsappGruposUnidades());
      }
      Promise.all(tasks).catch((error) => showToast(error.message, true));
    }
  }, [activeTab, isGlobalAdmin]);

  useEffect(() => {
    if (activeTab === "followups") {
      loadFollowupsPanel().catch((error) => showToast(error.message, true));
    }
  }, [activeTab, followupsFilters.days, followupsFilters.status, followupsFilters.clienteId, followupsFilters.page, followupsFilters.pageSize]);


  useEffect(() => {
    setAceitePage(1);
    const medicoValido = selectedMedicoId
      ? medicos.find((medico) => medico.id === selectedMedicoId && medico.cliente_id === selectedClienteId)
      : null;

    if (selectedMedicoId && !medicoValido) {
      setAceites([]);
      return;
    }

    if (selectedMedicoId && clienteUsaConvenio) {
      loadAceites(selectedMedicoId).catch((error) => showToast(error.message, true));
    } else {
      setAceites([]);
    }
  }, [selectedMedicoId, selectedClienteId, aceiteFiltro, clienteUsaConvenio, medicos]);

  useEffect(() => {
    const medicoValido = selectedMedicoId
      ? medicos.find((medico) => medico.id === selectedMedicoId && medico.cliente_id === selectedClienteId)
      : null;

    if (selectedMedicoId && !medicoValido) {
      setDisponibilidades(buildDefaultDisponibilidades());
      return;
    }

    if (selectedMedicoId) {
      loadDisponibilidades(selectedMedicoId).catch((error) => {
        setDisponibilidades(buildDefaultDisponibilidades());
        showToast(error.message, true);
      });
    } else {
      setDisponibilidades(buildDefaultDisponibilidades());
    }
  }, [selectedMedicoId, selectedClienteId, medicos]);

  async function toggleCliente(cliente: Cliente) {
    setToast("");
    setLoadingAction(`cliente-${cliente.id}`);

    const shouldDeactivate = cliente.status === "ativo";

    try {
      await api<Cliente>(`/api/admin/clientes/${cliente.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: shouldDeactivate ? "inativo" : "ativo",
          ativo: !shouldDeactivate,
        }),
      });

      showToast(shouldDeactivate ? "✅ Cliente desativado com sucesso" : "✅ Cliente ativado com sucesso");
      await loadClientes();
    } catch (error) {
      showToast(error instanceof Error ? `❌ ${error.message}` : "❌ Erro ao atualizar cliente", true);
    } finally {
      setLoadingAction(null);
    }
  }

  async function salvarCadastroCliente(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedClienteId || !clienteCadastro) return;

    setToast("");
    setLoadingAction("cadastro-cliente");

    try {
      await api<Cliente>(`/api/admin/clientes/${selectedClienteId}`, {
        method: "PATCH",
        body: JSON.stringify({
          nome_fantasia: clienteCadastro.nome_fantasia.trim(),
          telefone_contato: clienteCadastro.telefone_contato.trim() || null,
          whatsapp_contato: clienteCadastro.whatsapp_contato.trim() || null,
          email_contato: clienteCadastro.email_contato.trim() || null,
          site: clienteCadastro.site.trim() || null,
          cep: clienteCadastro.cep.trim() || null,
          logradouro: clienteCadastro.logradouro.trim() || null,
          numero: clienteCadastro.numero.trim() || null,
          complemento: clienteCadastro.complemento.trim() || null,
          bairro: clienteCadastro.bairro.trim() || null,
          cidade: clienteCadastro.cidade.trim() || null,
          estado: clienteCadastro.estado.trim() || null,
        }),
      });

      showToast("✅ Dados da clínica atualizados");
      await loadClientes();
      await loadClienteOperacional(selectedClienteId);
    } catch (error) {
      showToast(error instanceof Error ? `❌ ${error.message}` : "❌ Erro ao atualizar clínica", true);
    } finally {
      setLoadingAction(null);
    }
  }

  async function salvarConfiguracaoCliente(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedClienteId || !clienteConfig) return;

    setToast("");
    setLoadingAction("config-cliente");

    try {
      await api<ClienteConfiguracao>(`/api/admin/clientes/${selectedClienteId}/configuracao`, {
        method: "PATCH",
        body: JSON.stringify({
          usa_convenio: clienteConfig.usa_convenio,
          usa_particular: clienteConfig.usa_particular,
          usa_cartao: clienteConfig.usa_cartao,
          usa_assinatura: Boolean(clienteConfig.usa_assinatura),
          usa_parceria: Boolean(clienteConfig.usa_parceria),
          exige_plano: clienteConfig.usa_convenio ? clienteConfig.exige_plano : false,
          exige_produto_rede: Boolean(clienteConfig.exige_produto_rede),
          exige_medico: Boolean(clienteConfig.exige_medico),
          exige_especialidade: clienteConfig.exige_especialidade,
          exige_data_nascimento: clienteConfig.exige_data_nascimento,
          permitir_validacao_manual: Boolean(clienteConfig.permitir_validacao_manual),
          permitir_agendamento_sem_cobertura_confirmada: Boolean(
            clienteConfig.permitir_agendamento_sem_cobertura_confirmada,
          ),
          encaminhar_humano_quando_nao_encontrar: Boolean(
            clienteConfig.encaminhar_humano_quando_nao_encontrar,
          ),
          usa_agenda_externa: Boolean(clienteConfig.usa_agenda_externa),
          provedor_agenda: clienteConfig.provedor_agenda || "mock",
          agenda_config: {
            ...((clienteConfig.agenda_config || {}) as Record<string, unknown>),
            sessionTimeoutMinutes: getConfigNumber(clienteConfig, SESSION_TIMEOUT_KEYS, 10),
            timeoutAtendimentoMinutos: getConfigNumber(clienteConfig, SESSION_TIMEOUT_KEYS, 10),
          },
          ativo: clienteConfig.ativo !== false,
        }),
      });

      showToast("✅ Regras de atendimento atualizadas");
      await loadClientes();
      await loadClienteOperacional(selectedClienteId);
    } catch (error) {
      showToast(error instanceof Error ? `❌ ${error.message}` : "❌ Erro ao atualizar regras", true);
    } finally {
      setLoadingAction(null);
    }
  }

  async function consultarCnpjNovoCliente() {
    const cnpjDigits = onlyDigits(novoCliente.cnpj);

    if (cnpjDigits.length !== 14) {
      showToast("❌ Informe um CNPJ com 14 dígitos", true);
      return;
    }

    setLoadingCnpj(true);
    setToast("");

    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjDigits}`);
      const data = (await response.json().catch(() => ({}))) as BrasilApiCnpjResponse & { message?: string };

      if (!response.ok) {
        throw new Error(data.message || "CNPJ não encontrado");
      }

      const telefone = getApiText(data.ddd_telefone_1 || data.ddd_telefone_2);

      setNovoCliente((current) => ({
        ...current,
        cnpj: formatCnpj(data.cnpj || cnpjDigits),
        nome_fantasia: getApiText(data.nome_fantasia) || getApiText(data.razao_social) || current.nome_fantasia,
        razao_social: getApiText(data.razao_social) || current.razao_social,
        telefone_contato: telefone ? formatPhone(telefone) : current.telefone_contato,
        whatsapp_contato: current.whatsapp_contato || (telefone ? formatPhone(telefone) : ""),
        email_contato: getApiText(data.email) || current.email_contato,
        cep: data.cep ? formatCep(data.cep) : current.cep,
        logradouro: getApiText(data.logradouro) || current.logradouro,
        numero: getApiText(data.numero) || current.numero,
        complemento: getApiText(data.complemento) || current.complemento,
        bairro: getApiText(data.bairro) || current.bairro,
        cidade: getApiText(data.municipio) || current.cidade,
        estado: getApiText(data.uf).toUpperCase() || current.estado,
      }));

      showToast("✅ Dados do CNPJ preenchidos");
    } catch (error) {
      showToast(error instanceof Error ? `❌ ${error.message}` : "❌ Erro ao consultar CNPJ", true);
    } finally {
      setLoadingCnpj(false);
    }
  }

  async function criarCliente(event: React.FormEvent) {
    event.preventDefault();
    setToast("");
    setLoadingAction("cliente");

    try {
      const cliente = await api<Cliente>("/api/admin/clientes", {
        method: "POST",
        body: JSON.stringify({
          nome_fantasia: novoCliente.nome_fantasia,
          razao_social: novoCliente.razao_social || null,
          documento_tipo: novoCliente.cnpj ? "CNPJ" : null,
          documento: novoCliente.cnpj ? onlyDigits(novoCliente.cnpj) : null,
          cnpj: novoCliente.cnpj ? onlyDigits(novoCliente.cnpj) : null,
          email_contato: novoCliente.email_contato || null,
          telefone_contato: novoCliente.telefone_contato || null,
          whatsapp_contato: novoCliente.whatsapp_contato || novoCliente.telefone_contato || null,
          site: novoCliente.site || null,
          cep: novoCliente.cep ? onlyDigits(novoCliente.cep) : null,
          logradouro: novoCliente.logradouro || null,
          numero: novoCliente.numero || null,
          complemento: novoCliente.complemento || null,
          bairro: novoCliente.bairro || null,
          cidade: novoCliente.cidade || null,
          estado: novoCliente.estado || null,
          configuracao: {
            usa_convenio: novoCliente.usa_convenio,
            usa_particular: novoCliente.usa_particular,
            usa_cartao: novoCliente.usa_cartao,
            exige_plano: novoCliente.exige_plano,
            provedor_agenda: "mock",
          },
        }),
      });

      showToast("✅ Cliente criado com sucesso");
      setNovoCliente(emptyNovoCliente);

      await loadClientes();
      setSelectedClienteId(cliente.id);
    } catch (error) {
      showToast(error instanceof Error ? `❌ ${error.message}` : "❌ Erro ao criar cliente", true);
    } finally {
      setLoadingAction(null);
    }
  }

  async function salvarFormaAtendimento(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedClienteId) return;

    setToast("");
    setLoadingAction("forma");

    const formaAtual = editingFormaId
      ? formas.find((forma) => forma.id === editingFormaId)
      : null;

    const payload = {
      tipo: novaForma.tipo,
      nome: novaForma.nome,
      exige_plano: novaForma.exige_plano,
      permite_agendamento_online: novaForma.permite_agendamento_online,
      ativo: editingFormaId ? formaAtual?.ativo !== false : true,
    };

    try {
      if (editingFormaId) {
        await api<FormaAtendimento>(`/api/admin/formas-atendimento/${editingFormaId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });

        showToast("✅ Forma de atendimento atualizada com sucesso");
      } else {
        await api<FormaAtendimento>(`/api/admin/clientes/${selectedClienteId}/formas-atendimento`, {
          method: "POST",
          body: JSON.stringify(payload),
        });

        showToast("✅ Forma de atendimento criada com sucesso");
      }

      setNovaForma(emptyFormaForm);
      setEditingFormaId(null);
      await loadFormas(selectedClienteId);
    } catch (error) {
      showToast(error instanceof Error ? `❌ ${error.message}` : "❌ Erro ao salvar forma", true);
    } finally {
      setLoadingAction(null);
    }
  }

  function editarForma(forma: FormaAtendimento) {
    setEditingFormaId(forma.id);
    setNovaForma({
      tipo: forma.tipo || "particular",
      nome: forma.nome || "",
      exige_plano: Boolean(forma.exige_plano),
      permite_agendamento_online: forma.permite_agendamento_online !== false,
    });
  }

  function cancelarEdicaoForma() {
    setEditingFormaId(null);
    setNovaForma(emptyFormaForm);
  }

  async function criarProduto(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedForma) return;

    setToast("");
    setLoadingAction("produto");

    try {
      await api<Produto>(`/api/admin/formas-atendimento/${selectedForma.id}/produtos`, {
        method: "POST",
        body: JSON.stringify({
          nome: novoProduto.nome,
          tipo: novoProduto.tipo,
          codigo_operadora: novoProduto.codigo_operadora || null,
          acomodacao_ou_uf: novoProduto.acomodacao_ou_uf || null,
          observacao: novoProduto.observacao || null,
          ativo: true,
        }),
      });

      showToast("✅ Produto criado com sucesso");
      setNovoProduto({
        nome: "",
        tipo: "plano",
        codigo_operadora: "",
        acomodacao_ou_uf: "",
        observacao: "",
      });

      await loadProdutos(selectedForma);
    } catch (error) {
      showToast(error instanceof Error ? `❌ ${error.message}` : "❌ Erro ao criar produto", true);
    } finally {
      setLoadingAction(null);
    }
  }

  async function toggleForma(forma: FormaAtendimento) {
    setToast("");

    try {
      await api<FormaAtendimento>(`/api/admin/formas-atendimento/${forma.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ativo: !forma.ativo }),
      });

      if (selectedClienteId) await loadFormas(selectedClienteId);
    } catch (error) {
      showToast(error instanceof Error ? `❌ ${error.message}` : "❌ Erro ao atualizar forma", true);
    }
  }

  async function toggleProduto(produto: Produto) {
    if (!selectedForma) return;
    setToast("");

    try {
      await api<Produto>(`/api/admin/produtos/${produto.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ativo: !produto.ativo }),
      });

      await loadProdutos(selectedForma);
    } catch (error) {
      showToast(error instanceof Error ? `❌ ${error.message}` : "❌ Erro ao atualizar produto", true);
    }
  }

  function editarMedico(medico: Medico) {
    setSelectedMedicoId(medico.id);
    setEditingMedicoId(medico.id);
    const regrasAtivas = Array.isArray(medico.regras_idade)
      ? medico.regras_idade.filter((regra) => regra?.ativo !== false)
      : [];

    const especialidades = splitEspecialidadesFromMedico(medico.especialidades);
    const especialidadesRegras = (especialidades.length > 0 ? especialidades : [""]).map((nome) => {
      const regra = regrasAtivas.find((item) => normalizeRuleKey(item?.especialidade) === normalizeRuleKey(nome));
      return {
        nome,
        idade_minima: regra?.idade_minima === null || regra?.idade_minima === undefined ? "" : String(regra.idade_minima),
        idade_maxima: regra?.idade_maxima === null || regra?.idade_maxima === undefined ? "" : String(regra.idade_maxima),
        regra_idade_texto: regra?.regra_idade_texto || "",
      };
    });

    setMedicoForm({
      nome: medico.nome || "",
      registro_profissional: medico.registro_profissional || "",
      especialidade: medico.especialidades || "",
      especialidades_regras: especialidadesRegras.length > 0 ? especialidadesRegras : [createEmptyEspecialidadeRegra()],
      dias: medico.dias || "",
      andar: medico.andar || "",
      idade_minima: "",
      idade_maxima: "",
      regra_idade_texto: "",
    });
  }

  function limparFormularioMedico() {
    setEditingMedicoId(null);
    setMedicoForm(emptyMedicoForm);
  }

  function updateMedicoEspecialidadeRegra(index: number, patch: Partial<MedicoEspecialidadeRegraForm>) {
    setMedicoForm((current) => {
      const especialidadesRegras = current.especialidades_regras.map((regra, itemIndex) =>
        itemIndex === index ? { ...regra, ...patch } : regra,
      );
      return {
        ...current,
        especialidades_regras: especialidadesRegras,
        especialidade: especialidadesRegras.map((regra) => regra.nome.trim()).filter(Boolean).join(", "),
      };
    });
  }

  function addMedicoEspecialidadeRegra() {
    setMedicoForm((current) => ({
      ...current,
      especialidades_regras: [...current.especialidades_regras, createEmptyEspecialidadeRegra()],
    }));
  }

  function removeMedicoEspecialidadeRegra(index: number) {
    setMedicoForm((current) => {
      if (current.especialidades_regras.length <= 1) return current;
      const especialidadesRegras = current.especialidades_regras.filter((_, itemIndex) => itemIndex !== index);
      return {
        ...current,
        especialidades_regras: especialidadesRegras,
        especialidade: especialidadesRegras.map((regra) => regra.nome.trim()).filter(Boolean).join(", "),
      };
    });
  }

  async function salvarMedico(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedClienteId) return;

    setToast("");
    setLoadingAction("medico");

    let especialidadePayload = "";
    let especialidadesRegrasPayload: Array<{
      nome: string;
      idade_minima: number | null;
      idade_maxima: number | null;
      regra_idade_texto: string | null;
    }> = [];

    try {
      const regrasForm = medicoForm.especialidades_regras
        .map((regra) => ({ ...regra, nome: regra.nome.trim() }))
        .filter((regra) => regra.nome);

      if (regrasForm.length === 0) {
        throw new Error("Informe ao menos uma especialidade");
      }

      const nomesResolvidos = regrasForm.map((regra) => {
        const existente = resolveEspecialidadeDigitada(regra.nome);
        if (existente) return existente.nome;
        if (!isGlobalAdmin) {
          throw new Error(`Especialidade não cadastrada: ${regra.nome}. Peça ao Admin Global para cadastrar.`);
        }
        return regra.nome;
      });

      especialidadePayload = nomesResolvidos.join(", ");
      especialidadesRegrasPayload = regrasForm.map((regra, index) => {
        const idadeMinima = parseOptionalAge(regra.idade_minima);
        const idadeMaxima = parseOptionalAge(regra.idade_maxima);

        if (idadeMinima !== null && idadeMaxima !== null && idadeMinima > idadeMaxima) {
          throw new Error(`Idade mínima não pode ser maior que a máxima em ${nomesResolvidos[index]}`);
        }

        return {
          nome: nomesResolvidos[index],
          idade_minima: idadeMinima,
          idade_maxima: idadeMaxima,
          regra_idade_texto: regra.regra_idade_texto.trim() || null,
        };
      });
    } catch (error) {
      showToast(error instanceof Error ? `❌ ${error.message}` : "❌ Dados inválidos do médico", true);
      setLoadingAction(null);
      return;
    }

    const payload = {
      nome: medicoForm.nome.trim(),
      registro_profissional: medicoForm.registro_profissional.trim(),
      especialidade: especialidadePayload,
      especialidades_regras: especialidadesRegrasPayload,
      dias: medicoForm.dias.trim() || null,
      andar: medicoForm.andar.trim() || null,
    };

    try {
      const medico = await api<Medico>(
        editingMedicoId
          ? `/api/admin/clientes/${selectedClienteId}/medicos/${editingMedicoId}`
          : `/api/admin/clientes/${selectedClienteId}/medicos`,
        {
          method: editingMedicoId ? "PATCH" : "POST",
          body: JSON.stringify(editingMedicoId ? payload : { ...payload, ativo: true }),
        },
      );

      showToast(editingMedicoId ? "✅ Médico atualizado com sucesso" : "✅ Médico cadastrado com sucesso");
      limparFormularioMedico();
      await loadMedicos(selectedClienteId);
      setSelectedMedicoId(Number(medico.id));
    } catch (error) {
      showToast(error instanceof Error ? `❌ ${error.message}` : "❌ Erro ao salvar médico", true);
    } finally {
      setLoadingAction(null);
    }
  }


  function normalizeImportCell(value: unknown): string {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  async function importarMedicosDePlanilha(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !selectedClienteId) return;
    if (!isGlobalAdmin) {
      showToast("❌ Apenas Admin Global pode importar médicos em massa", true);
      return;
    }

    setToast("");
    setImportacaoMedicosStatus("Lendo planilha...");
    setLoadingAction("importar-medicos");

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames.find((name) => name.toLowerCase().includes("planilha1")) || workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];
      const headerIndex = matrix.findIndex((row) =>
        row.some((cell) => normalizeImportCell(cell).toUpperCase() === "MÉDICOS") &&
        row.some((cell) => normalizeImportCell(cell).toUpperCase() === "ESPECIALIDADES"),
      );

      if (headerIndex < 0) {
        throw new Error("Não encontrei o cabeçalho MÉDICOS / ESPECIALIDADES na planilha");
      }

      const rows = matrix
        .slice(headerIndex + 1)
        .map((row, index) => ({
          nome: normalizeImportCell(row[0]),
          especialidade: normalizeImportCell(row[1]),
          idade: normalizeImportCell(row[2]),
          quantidade: normalizeImportCell(row[3]),
          dias_atendimento: normalizeImportCell(row[4]),
          registro_profissional: String(index).padStart(6, "0"),
        }))
        .filter((row) => row.nome && row.especialidade);

      if (rows.length === 0) {
        throw new Error("Nenhuma linha válida encontrada para importação");
      }

      setImportacaoMedicosStatus(`Planilha lida: ${rows.length} médicos válidos encontrados.`);

      const confirmed = window.confirm(
        `Importar ${rows.length} médicos para ${selectedCliente?.nome_fantasia || "a clínica selecionada"}?\n\n` +
        `CRMs provisórios serão gerados como 000000, 000001, 000002... conforme a ordem da planilha.`,
      );

      if (!confirmed) {
        setImportacaoMedicosStatus("Importação cancelada pelo usuário.");
        return;
      }

      setImportacaoMedicosStatus(`Enviando ${rows.length} médicos para o servidor...`);

      const result = await api<ImportacaoMedicosResultado>(`/api/admin/clientes/${selectedClienteId}/medicos/importar-planilha`, {
        method: "POST",
        body: JSON.stringify({
          periodo_padrao: "manha",
          hora_inicio: "08:00",
          hora_fim: "12:00",
          intervalo_minutos: 30,
          rows,
        }),
      });

      const resumoImportacao = `Importação concluída: ${result.criados} criados, ${result.atualizados} atualizados, ${result.erros} erros, ${result.ignorados} ignorados.`;
      setImportacaoMedicosStatus(resumoImportacao);
      showToast(
        `✅ ${resumoImportacao}`,
        result.erros > 0,
      );
      await loadEspecialidadesCatalogo();
      await loadMedicos(selectedClienteId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao importar planilha";
      setImportacaoMedicosStatus(`Falha na importação: ${errorMessage}`);
      showToast(`❌ ${errorMessage}`, true);
    } finally {
      setLoadingAction(null);
    }
  }

  async function toggleMedico(medico: Medico) {
    if (!selectedClienteId) return;

    const actionText = medico.ativo ? "desativar" : "ativar";
    const confirmed = window.confirm(`Deseja realmente ${actionText} ${medico.nome}?`);

    if (!confirmed) return;

    setToast("");
    setLoadingAction(`medico-${medico.id}`);

    try {
      await api<Medico>(`/api/admin/clientes/${selectedClienteId}/medicos/${medico.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ativo: !medico.ativo }),
      });

      showToast(medico.ativo ? "✅ Médico desativado" : "✅ Médico ativado");
      await loadMedicos(selectedClienteId);
    } catch (error) {
      showToast(error instanceof Error ? `❌ ${error.message}` : "❌ Erro ao atualizar médico", true);
    } finally {
      setLoadingAction(null);
    }
  }

  function updateDisponibilidade(index: number, patch: Partial<MedicoDisponibilidade>) {
    setDisponibilidades((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  }

  async function salvarDisponibilidades() {
    if (!selectedClienteId || !selectedMedicoId) return;

    const payload = disponibilidades
      .filter((item) => item.ativo)
      .map((item) => ({
        dia_semana: item.dia_semana,
        periodo: item.periodo,
        hora_inicio: item.hora_inicio,
        hora_fim: item.hora_fim,
        intervalo_minutos: Number(item.intervalo_minutos || 30),
        ativo: true,
      }));

    setToast("");
    setLoadingAction("disponibilidade");

    try {
      const data = await api<MedicoDisponibilidade[]>(
        `/api/admin/clientes/${selectedClienteId}/medicos/${selectedMedicoId}/disponibilidades`,
        {
          method: "PUT",
          body: JSON.stringify({ disponibilidades: payload }),
        },
      );

      setDisponibilidades(mergeDisponibilidadesFromApi(data));
      showToast("✅ Disponibilidade salva com sucesso");
    } catch (error) {
      showToast(error instanceof Error ? `❌ ${error.message}` : "❌ Erro ao salvar disponibilidade", true);
    } finally {
      setLoadingAction(null);
    }
  }

  async function criarAceite(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedClienteId || !selectedMedicoId || !clienteUsaConvenio) return;

    setToast("");
    setLoadingAction("aceite");

    try {
      await api<AceiteMedico>(`/api/admin/clientes/${selectedClienteId}/medicos/${selectedMedicoId}/aceites`, {
        method: "POST",
        body: JSON.stringify({
          convenio: novoAceite.convenio.trim(),
          plano: novoAceite.plano.trim(),
        }),
      });

      showToast("✅ Aceite criado ou reativado com sucesso");
      setNovoAceite({ convenio: "", plano: "" });
      await loadAceites(selectedMedicoId);
    } catch (error) {
      showToast(error instanceof Error ? `❌ ${error.message}` : "❌ Erro ao criar aceite", true);
    } finally {
      setLoadingAction(null);
    }
  }

  async function toggleAceite(aceite: AceiteMedico) {
    if (!selectedClienteId || !selectedMedicoId || !clienteUsaConvenio) return;

    const actionText = aceite.ativo ? "desativar" : "ativar";
    const confirmed = window.confirm(
      `Você deseja realmente ${actionText} este aceite?\n\n${aceite.convenio} - ${aceite.produto || "Sem plano"}`,
    );

    if (!confirmed) return;

    setToast("");
    setLoadingAction(`aceite-${aceite.id}`);

    try {
      await api<AceiteMedico>(`/api/admin/clientes/${selectedClienteId}/aceites/${aceite.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ativo: !aceite.ativo }),
      });

      showToast(aceite.ativo ? "✅ Aceite desativado" : "✅ Aceite ativado");
      await loadAceites(selectedMedicoId);
    } catch (error) {
      showToast(error instanceof Error ? `❌ ${error.message}` : "❌ Erro ao atualizar aceite", true);
    } finally {
      setLoadingAction(null);
    }
  }


  const whatsappHealthStats = useMemo(() => {
    const total = whatsappDiagnostics?.summary.totalChecks || 0;
    const failed = whatsappDiagnostics?.summary.failedChecks || 0;
    const ok = Math.max(0, total - failed);
    const percent = total > 0 ? Math.round((ok / total) * 100) : 0;
    const level = percent >= 90 ? "ok" : percent >= 70 ? "warning" : "critical";
    const criticalAlerts = failed + (whatsappAntiAbuseStatus?.blockedNow || 0);
    return { total, ok, failed, percent, level, criticalAlerts };
  }, [whatsappDiagnostics, whatsappAntiAbuseStatus]);

  const whatsappGaugeStyle = useMemo(() => ({
    "--gauge-percent": String(whatsappHealthStats.percent),
  }) as React.CSSProperties, [whatsappHealthStats.percent]);

  const whatsappCriticalChecks = useMemo(() => {
    return whatsappDiagnostics?.checks.filter((check) => !check.ok) || [];
  }, [whatsappDiagnostics]);

  const whatsappActiveBlocks = useMemo(() => {
    if (!whatsappAntiAbuseStatus) return [];

    // Bloqueios ativos devem vir somente do backend/Redis.
    // Eventos históricos com blockedUntil futuro não devem recriar uma linha ativa
    // depois que o operador clicar em "Liberar".
    const byKey = new Map<string, WhatsappAntiAbuseEvent & { ttlSeconds?: number }>();

    for (const block of whatsappAntiAbuseStatus.activeBlocks || []) {
      const key = `${block.phoneNumberId}:${block.from}`;
      byKey.set(key, {
        id: key,
        type: block.kind === "manual" ? "manual_block" : "active_block",
        severity: "critical",
        createdAt: undefined,
        phoneNumberId: block.phoneNumberId,
        from: block.from,
        reason: block.reason || (block.kind === "manual" ? "manual_block" : "temporarily_blocked"),
        blockedUntil: block.blockedUntil || null,
        riskScore: null,
        messagePreview: block.note || "",
        ttlSeconds: block.ttlSeconds ?? undefined,
        manual: block.manual || block.kind === "manual",
        note: block.note || "",
      });
    }

    return Array.from(byKey.values());
  }, [whatsappAntiAbuseStatus]);

  const whatsappRecentAntiAbuseHistory = useMemo(() => {
    const activeKeys = new Set(whatsappActiveBlocks.map((event) => `${event.phoneNumberId}:${event.from}:${event.blockedUntil || ""}`));
    return (whatsappAntiAbuseStatus?.recentBlocks || [])
      .filter((event) => !activeKeys.has(`${event.phoneNumberId}:${event.from}:${event.blockedUntil || ""}`))
      .slice(0, 8);
  }, [whatsappAntiAbuseStatus, whatsappActiveBlocks]);

  const whatsappBlockedNowCount = Math.max(whatsappAntiAbuseStatus?.blockedNow || 0, whatsappActiveBlocks.length);

  useEffect(() => {
    setGoLivePage(1);
  }, [goLiveFilters.search, goLiveFilters.status, goLiveFilters.modo, goLiveFilters.canalStatus, goLiveFilters.token, goLivePageSize]);

  const goLiveFilteredItems = useMemo(() => {
    const items = whatsappGoLiveChecklist?.items || [];
    const search = goLiveFilters.search.trim().toLowerCase();

    return items.filter((item) => {
      const haystack = [
        item.clienteNome,
        item.canalNome,
        item.phoneNumberId,
        item.modoAtendimento,
        item.tokenRef || "fallback/global",
      ].join(" ").toLowerCase();

      const matchesSearch = !search || haystack.includes(search);
      const matchesStatus = goLiveFilters.status === "todos" || item.status === goLiveFilters.status;
      const matchesModo = goLiveFilters.modo === "todos" || item.modoAtendimento === goLiveFilters.modo;
      const matchesCanalStatus =
        goLiveFilters.canalStatus === "todos" ||
        (goLiveFilters.canalStatus === "ativos" ? item.ativo : !item.ativo);
      const hasTokenRef = Boolean((item.tokenRef || "").trim());
      const tokenProblem = item.checks.some((check) =>
        check.key.toLowerCase().includes("token") && !check.ok && check.severity === "critical",
      );
      const matchesToken =
        goLiveFilters.token === "todos" ||
        (goLiveFilters.token === "global" && !hasTokenRef) ||
        (goLiveFilters.token === "proprio" && hasTokenRef && !tokenProblem) ||
        (goLiveFilters.token === "problema" && tokenProblem);

      return matchesSearch && matchesStatus && matchesModo && matchesCanalStatus && matchesToken;
    });
  }, [whatsappGoLiveChecklist, goLiveFilters]);

  const goLiveStatusRank: Record<WhatsappGoLiveItem["status"], number> = {
    critico: 0,
    atencao: 1,
    pronto: 2,
  };

  const goLiveSortedItems = useMemo(() => {
    return [...goLiveFilteredItems].sort((a, b) => {
      const rank = goLiveStatusRank[a.status] - goLiveStatusRank[b.status];
      if (rank !== 0) return rank;
      const scoreDiff = (a.okCount / Math.max(a.totalChecks, 1)) - (b.okCount / Math.max(b.totalChecks, 1));
      if (scoreDiff !== 0) return scoreDiff;
      return a.clienteNome.localeCompare(b.clienteNome, "pt-BR");
    });
  }, [goLiveFilteredItems]);

  const goLivePageCount = Math.max(1, Math.ceil(goLiveSortedItems.length / goLivePageSize));
  const goLiveSafePage = Math.min(goLivePage, goLivePageCount);
  const goLiveCurrentPageItems = useMemo(() => {
    const start = (goLiveSafePage - 1) * goLivePageSize;
    return goLiveSortedItems.slice(start, start + goLivePageSize);
  }, [goLiveSortedItems, goLiveSafePage, goLivePageSize]);

  const goLiveFilteredSummary = useMemo(() => {
    return goLiveFilteredItems.reduce(
      (acc, item) => {
        acc.total += 1;
        acc[item.status] += 1;
        return acc;
      },
      { total: 0, pronto: 0, atencao: 0, critico: 0 },
    );
  }, [goLiveFilteredItems]);


  const whatsappGruposOrdenados = useMemo(() => {
    const rank: Record<WhatsappGrupoUnidadeItem["status"], number> = { critico: 0, atencao: 1, pronto: 2 };
    return [...(whatsappGruposUnidades?.items || [])].sort((a, b) => {
      const statusDiff = rank[a.status] - rank[b.status];
      if (statusDiff !== 0) return statusDiff;
      return a.nomeGrupo.localeCompare(b.nomeGrupo, "pt-BR");
    });
  }, [whatsappGruposUnidades]);

  const whatsappTestView = useMemo(() => {
    if (!whatsappTestResult) return null;

    const raw = whatsappTestResult.raw as any;
    const processed = Array.isArray(raw?.processed) ? raw.processed[0] : raw?.processed;
    const flow = processed?.flow || raw?.flow || {};
    const canalContext = (whatsappTestResult.resolved.canalContext as any) || processed?.canalContext || flow?.canalContext || {};
    const selectedCanal = whatsappCanais.find((canal) => String(canal.id) === String(whatsappTestResult.request.canalId || whatsappTestForm.canalId));
    const token = whatsappTestResult.resolved.token || {};
    const sessionId = whatsappTestResult.resolved.sessionId || processed?.sessionId || flow?.session?.sessionId || "-";
    const assistantText = whatsappTestResult.resolved.assistantText || processed?.assistantText || flow?.assistantMessage || flow?.nextPrompt || "Sem resposta";
    const stage = flow?.session?.stage || "-";
    const intent = flow?.parsed?.intencao || "-";
    const confidence = flow?.parsed?.confidence || "-";
    const source = flow?.parsed?.source || "-";
    const missingFields = Array.isArray(flow?.missingFields) ? flow.missingFields : Array.isArray(flow?.parsed?.missingFields) ? flow.parsed.missingFields : [];
    const clienteNome = flow?.clienteSelecionado?.nomeFantasia || canalContext?.clienteNome || selectedCanal?.cliente_nome || "-";
    const modo = canalContext?.modoAtendimento || selectedCanal?.modo_atendimento || "-";
    const tokenLabel = token.token_ref || selectedCanal?.token_ref || "fallback/global";
    const tokenStatus = token.status || (token.literalFalse ? "false" : token.configured || token.present ? "configurado" : token.token_ref ? "ausente" : "ok");
    const tokenOk = tokenStatus === "ok" || tokenStatus === "configurado" || token.present || token.configured || (!token.token_ref && !selectedCanal?.token_ref);
    const antiAbuseBlocked = Boolean((processed?.assistantText || "").toLowerCase().includes("bloque") || (processed?.assistantText || "").toLowerCase().includes("aguarde"));

    return {
      selectedCanal,
      canalContext,
      sessionId,
      assistantText,
      stage,
      intent,
      confidence,
      source,
      missingFields,
      clienteNome,
      modo,
      tokenLabel,
      tokenStatus,
      tokenOk,
      antiAbuseBlocked,
      phoneNumberId: whatsappTestResult.request.phoneNumberId,
      from: whatsappTestResult.request.from,
      text: whatsappTestResult.request.text,
      ok: whatsappTestResult.ok,
    };
  }, [whatsappTestResult, whatsappCanais, whatsappTestForm.canalId]);

  if (authLoading) {
    return <div className="app"><main className="content"><p>Carregando sessão...</p></main></div>;
  }

  if (!authUser) {
    return <LoginScreen onLogin={(result) => setAuthUser(result.user)} />;
  }

  function logout() {
    clearStoredAuth();
    setAuthUser(null);
    setClientes([]);
    setSelectedClienteId(null);
    setShowChangePassword(false);
  }

  if (authUser.primeiro_acesso) {
    return <ChangePasswordScreen user={authUser} required onChanged={(user) => setAuthUser(user)} onLogout={logout} />;
  }

  if (showChangePassword) {
    return <ChangePasswordScreen user={authUser} onChanged={(user) => { setAuthUser(user); setShowChangePassword(false); }} onCancel={() => setShowChangePassword(false)} onLogout={logout} />;
  }


  function formatDateTimeShort(value?: string | null) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function formatTimeOnly(value?: string | null) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  function formatCountdownUntil(value?: string | null, fallbackSeconds?: number | null) {
    if (!value && fallbackSeconds === null) return "Permanente";
    let remainingMs = 0;
    if (value) {
      const target = new Date(value).getTime();
      if (!Number.isNaN(target)) remainingMs = target - whatsappCountdownTick;
    }
    if (remainingMs <= 0 && typeof fallbackSeconds === "number") {
      remainingMs = fallbackSeconds * 1000;
    }
    const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function reasonLabel(reason?: string) {
    const map: Record<string, string> = {
      message_rate_limit: "Muitas mensagens",
      booking_attempt_limit: "Tentativas excessivas",
      risk_score_threshold: "Score de risco alto",
      temporarily_blocked: "Bloqueio vigente",
      manual_block: "Bloqueio manual Angel",
      manual_unblock: "Liberação manual",
      manual_blocked_request: "Bloqueio manual vigente",
      spam: "Spam",
      fake_booking: "Agendamento/reserva fake",
      abuse: "Abuso operacional",
    };
    return map[String(reason || "")] || reason || "Evento anti-abuso";
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebarProfile">
          <h1>AgendAI</h1>
          <p>{authUser.perfil === "global" ? "Admin Global" : "Admin Clínica"}</p>
          <small>{authUser.email}</small>
          <span className={isGlobalAdmin ? "accessScopePill global" : "accessScopePill scoped"}>
            {isGlobalAdmin ? "Escopo global" : "Escopo limitado"}
          </span>
          <small className="sidebarScopeHint">{accessScopeLabel}</small>
          <button className="sidebarPasswordButton" type="button" onClick={() => setShowChangePassword(true)}>
            Trocar minha senha
          </button>
        </div>

        <nav>
          <button
            className={activeTab === "clientes" ? "navActive" : ""}
            onClick={() => setActiveTab("clientes")}
          >
            {isGlobalAdmin ? "Clientes" : "Minhas clínicas"}
          </button>
          <button
            className={activeTab === "medicos" ? "navActive" : ""}
            onClick={() => {
              if (!selectedClienteId && scopedClientes.length > 0) {
                void selecionarClienteParaMedicos(scopedClientes[0].id);
              }
              setActiveTab("medicos");
            }}
          >
            Médicos e aceites
          </button>
          {/* Unidades fica reservado para futura modelagem de redes multiunidade.
              No piloto, cada cliente já representa uma unidade operacional com endereço próprio. */}
          {isGlobalAdmin && (
            <>
              <button
                className={activeTab === "whatsapp" ? "navActive" : ""}
                onClick={() => setActiveTab("whatsapp")}
              >
                WhatsApp
              </button>
              <button
                className={activeTab === "whatsapp_operacao" ? "navActive" : ""}
                onClick={() => setActiveTab("whatsapp_operacao")}
              >
                Operação WhatsApp
              </button>
            </>
          )}
          <button
            className={activeTab === "dashboard_gerencial" ? "navActive" : ""}
            onClick={() => setActiveTab("dashboard_gerencial")}
          >
            Dashboard gerencial
          </button>
          <button
            className={activeTab === "followups" ? "navActive" : ""}
            onClick={() => setActiveTab("followups")}
          >
            Follow-ups
          </button>
          {isGlobalAdmin && (
            <button
              className={activeTab === "usuarios" ? "navActive" : ""}
              onClick={() => setActiveTab("usuarios")}
            >
              Usuários
            </button>
          )}
          {isGlobalAdmin && (
            <button
              className={activeTab === "auditoria" ? "navActive" : ""}
              onClick={() => setActiveTab("auditoria")}
            >
              Auditoria
            </button>
          )}
          {/* Módulos fica reservado para feature flags avançadas por cliente.
              No piloto, os controles ficam dentro do cadastro/configuração do cliente. */}
        </nav>
      </aside>

      <main className="content">
        <header className="header">
          <div>
            <h2>Painel administrativo</h2>
            <p>Cadastro multi-clínica, formas de atendimento e produtos.</p>
          </div>

          <div className="headerActions">
            <button onClick={() => loadClientes()} disabled={loading}>
              {loading ? "Atualizando..." : "Atualizar"}
            </button>
            <button className="passwordTopButton" type="button" onClick={() => setShowChangePassword(true)}>Trocar senha</button>
            <button
              className="themeToggleButton"
              type="button"
              onClick={toggleThemeMode}
              title={themeMode === "dark" ? "Alternar para tema claro" : "Alternar para tema escuro"}
            >
              {themeMode === "dark" ? "☀️ Claro" : "🌙 Escuro"}
            </button>
            <button className="secondary" onClick={logout}>Sair</button>
          </div>
        </header>

        <section className={isGlobalAdmin ? "accessScopeBanner global" : "accessScopeBanner scoped"}>
          <div>
            <strong>{isGlobalAdmin ? "Admin Global" : "Acesso por cliente"}</strong>
            <span>{accessScopeDetail}</span>
          </div>
          <div className="accessScopeStats">
            <span>
              {isGlobalAdmin
                ? `${clientes.length} clientes carregados`
                : `${linkedClientesCount} vinculada(s) · ${operationalClientesCount} operacional(is)`}
            </span>
            {!isGlobalAdmin && linkedClientesCount === 0 && <strong className="criticalText">Nenhuma clínica vinculada</strong>}
            {!isGlobalAdmin && linkedClientesCount > 0 && operationalClientesCount === 0 && (
              <strong className="warningText">Clínica vinculada, mas inativa</strong>
            )}
          </div>
        </section>

        {toast && <div className="toast">{toast}</div>}

        {activeTab === "clientes" && (
          <>
        <section className={isGlobalAdmin ? "grid" : "grid oneColumnGrid"}>
          {isGlobalAdmin && (
            <div className="card">
              <h3>Novo cliente</h3>

            <form onSubmit={criarCliente} className="form">
              <label>
                CNPJ
                <div className="fieldWithButton">
                  <input
                    value={novoCliente.cnpj}
                    onChange={(event) =>
                      setNovoCliente({ ...novoCliente, cnpj: formatCnpj(event.target.value) })
                    }
                    onBlur={() => {
                      if (onlyDigits(novoCliente.cnpj).length === 14 && !novoCliente.nome_fantasia) {
                        void consultarCnpjNovoCliente();
                      }
                    }}
                    placeholder="Ex.: 12.345.678/0001-90"
                    inputMode="numeric"
                    required
                  />
                  <button
                    type="button"
                    className="secondary"
                    onClick={consultarCnpjNovoCliente}
                    disabled={loadingCnpj}
                  >
                    {loadingCnpj ? "Buscando..." : "Buscar CNPJ"}
                  </button>
                </div>
              </label>

              <label>
                Nome fantasia
                <input
                  value={novoCliente.nome_fantasia}
                  onChange={(event) =>
                    setNovoCliente({ ...novoCliente, nome_fantasia: event.target.value })
                  }
                  placeholder="Preenchido pela consulta do CNPJ"
                  required
                />
              </label>

              <label>
                Razão social
                <input
                  value={novoCliente.razao_social}
                  onChange={(event) =>
                    setNovoCliente({ ...novoCliente, razao_social: event.target.value })
                  }
                  placeholder="Preenchido pela consulta do CNPJ"
                />
              </label>

              <div className="twoColumns">
                <label>
                  Telefone
                  <input
                    value={novoCliente.telefone_contato}
                    onChange={(event) =>
                      setNovoCliente({ ...novoCliente, telefone_contato: formatPhone(event.target.value) })
                    }
                    placeholder="Ex.: (11) 3681-1290"
                  />
                </label>

                <label>
                  WhatsApp
                  <input
                    value={novoCliente.whatsapp_contato}
                    onChange={(event) =>
                      setNovoCliente({ ...novoCliente, whatsapp_contato: formatPhone(event.target.value) })
                    }
                    placeholder="Ex.: (11) 99999-9999"
                  />
                </label>
              </div>

              <label>
                E-mail
                <input
                  type="email"
                  value={novoCliente.email_contato}
                  onChange={(event) =>
                    setNovoCliente({ ...novoCliente, email_contato: event.target.value })
                  }
                  placeholder="contato@clinica.com.br"
                />
              </label>

              <label>
                Site
                <input
                  value={novoCliente.site}
                  onChange={(event) =>
                    setNovoCliente({ ...novoCliente, site: event.target.value })
                  }
                  placeholder="https://..."
                />
              </label>

              <div className="twoColumns">
                <label>
                  CEP
                  <input
                    value={novoCliente.cep}
                    onChange={(event) =>
                      setNovoCliente({ ...novoCliente, cep: formatCep(event.target.value) })
                    }
                    placeholder="00000-000"
                  />
                </label>

                <label>
                  Estado
                  <input
                    value={novoCliente.estado}
                    onChange={(event) =>
                      setNovoCliente({ ...novoCliente, estado: event.target.value.toUpperCase().slice(0, 2) })
                    }
                    placeholder="SP"
                    maxLength={2}
                  />
                </label>
              </div>

              <label>
                Logradouro
                <input
                  value={novoCliente.logradouro}
                  onChange={(event) =>
                    setNovoCliente({ ...novoCliente, logradouro: event.target.value })
                  }
                  placeholder="Rua, avenida..."
                />
              </label>

              <div className="twoColumns">
                <label>
                  Número
                  <input
                    value={novoCliente.numero}
                    onChange={(event) =>
                      setNovoCliente({ ...novoCliente, numero: event.target.value })
                    }
                  />
                </label>

                <label>
                  Complemento
                  <input
                    value={novoCliente.complemento}
                    onChange={(event) =>
                      setNovoCliente({ ...novoCliente, complemento: event.target.value })
                    }
                  />
                </label>
              </div>

              <div className="twoColumns">
                <label>
                  Bairro
                  <input
                    value={novoCliente.bairro}
                    onChange={(event) =>
                      setNovoCliente({ ...novoCliente, bairro: event.target.value })
                    }
                  />
                </label>

                <label>
                  Cidade
                  <input
                    value={novoCliente.cidade}
                    onChange={(event) =>
                      setNovoCliente({ ...novoCliente, cidade: event.target.value })
                    }
                  />
                </label>
              </div>

              <div className="checks">
                <label>
                  <input
                    type="checkbox"
                    checked={novoCliente.usa_convenio}
                    onChange={(event) =>
                      setNovoCliente({ ...novoCliente, usa_convenio: event.target.checked })
                    }
                  />
                  Convênio
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={novoCliente.usa_particular}
                    onChange={(event) =>
                      setNovoCliente({ ...novoCliente, usa_particular: event.target.checked })
                    }
                  />
                  Particular
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={novoCliente.usa_cartao}
                    onChange={(event) =>
                      setNovoCliente({ ...novoCliente, usa_cartao: event.target.checked })
                    }
                  />
                  Benefício
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={novoCliente.exige_plano}
                    onChange={(event) =>
                      setNovoCliente({ ...novoCliente, exige_plano: event.target.checked })
                    }
                  />
                  Exige plano
                </label>
              </div>

              <button type="submit" disabled={loadingAction === "cliente"}>
                {loadingAction === "cliente" ? "Criando..." : "Criar cliente"}
              </button>
            </form>
            </div>
          )}

          <div className="card">
            <h3>Clientes</h3>

            <div className="clientFilter">
              <button
                type="button"
                className={clienteFiltro === "todos" ? "active" : ""}
                onClick={() => { setClienteFiltro("todos"); setClientesPage(1); }}
              >
                Todos
              </button>

              <button
                type="button"
                className={clienteFiltro === "ativos" ? "active" : ""}
                onClick={() => { setClienteFiltro("ativos"); setClientesPage(1); }}
              >
                Ativos
              </button>

              <button
                type="button"
                className={clienteFiltro === "inativos" ? "active" : ""}
                onClick={() => { setClienteFiltro("inativos"); setClientesPage(1); }}
              >
                Inativos
              </button>

              <span>{clientesFiltrados.length} clientes</span>
            </div>

            <div className="list">
              {clientesPaginados.map((cliente) => {
                const clienteAtivo = cliente.status === "ativo";

                return (
                  <div
                    key={cliente.id}
                    className={
                      (cliente.id === selectedClienteId ? "listItem selected" : "listItem") +
                      (!clienteAtivo ? " mutedRow" : "")
                    }
                  >
                    <button
                      className="clientOpenButton"
                      type="button"
                      onClick={() => selecionarCliente(cliente.id)}
                    >
                      <strong>{cliente.nome_fantasia}</strong>
                      <span>{cliente.status}</span>
                      <div>
                        <Badge active={cliente.usa_convenio}>convênio</Badge>
                        <Badge active={cliente.usa_particular}>particular</Badge>
                        <Badge active={cliente.usa_cartao}>benefício</Badge>
                      </div>
                    </button>

                    {isGlobalAdmin && (
                      <div className="clientActions">
                        <button
                          type="button"
                          className={clienteAtivo ? "small danger" : "small"}
                          disabled={loadingAction === `cliente-${cliente.id}`}
                          onClick={() => toggleCliente(cliente)}
                        >
                          {loadingAction === `cliente-${cliente.id}`
                            ? "Salvando..."
                            : clienteAtivo
                              ? "Desativar"
                              : "Ativar"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <PaginationBar
              page={clientesPageSafe}
              pageCount={totalClientePages}
              total={clientesFiltrados.length}
              label="Clientes"
              onPrev={() => setClientesPage((page) => Math.max(1, page - 1))}
              onNext={() => setClientesPage((page) => Math.min(totalClientePages, page + 1))}
            />
          </div>
        </section>

        {selectedCliente && clienteCadastro && clienteConfig && (
          <section className="settingsGrid full">
            <div className="card">
              <div className="sectionHeader compact">
                <div>
                  <h3>Dados da clínica</h3>
                  <p>Usados na confirmação do agendamento e no atendimento WhatsApp.</p>
                </div>
              </div>

              <form onSubmit={salvarCadastroCliente} className="clinicForm">
                <label>
                  Nome fantasia
                  <input
                    value={clienteCadastro.nome_fantasia}
                    onChange={(event) =>
                      setClienteCadastro({ ...clienteCadastro, nome_fantasia: event.target.value })
                    }
                    required
                  />
                </label>

                <label>
                  Telefone de contato
                  <input
                    value={clienteCadastro.telefone_contato}
                    onChange={(event) =>
                      setClienteCadastro({ ...clienteCadastro, telefone_contato: event.target.value })
                    }
                    placeholder="Ex.: (11) 3681-1290"
                  />
                </label>

                <label>
                  WhatsApp da unidade
                  <input
                    value={clienteCadastro.whatsapp_contato}
                    onChange={(event) =>
                      setClienteCadastro({ ...clienteCadastro, whatsapp_contato: event.target.value })
                    }
                    placeholder="Ex.: (11) 99999-9999"
                  />
                </label>

                <label>
                  Site
                  <input
                    value={clienteCadastro.site}
                    onChange={(event) =>
                      setClienteCadastro({ ...clienteCadastro, site: event.target.value })
                    }
                    placeholder="https://..."
                  />
                </label>

                <label>
                  CEP
                  <input
                    value={clienteCadastro.cep}
                    onChange={(event) =>
                      setClienteCadastro({ ...clienteCadastro, cep: event.target.value })
                    }
                  />
                </label>

                <label className="wide">
                  Logradouro
                  <input
                    value={clienteCadastro.logradouro}
                    onChange={(event) =>
                      setClienteCadastro({ ...clienteCadastro, logradouro: event.target.value })
                    }
                  />
                </label>

                <label>
                  Número
                  <input
                    value={clienteCadastro.numero}
                    onChange={(event) =>
                      setClienteCadastro({ ...clienteCadastro, numero: event.target.value })
                    }
                  />
                </label>

                <label>
                  Complemento
                  <input
                    value={clienteCadastro.complemento}
                    onChange={(event) =>
                      setClienteCadastro({ ...clienteCadastro, complemento: event.target.value })
                    }
                  />
                </label>

                <label>
                  Bairro
                  <input
                    value={clienteCadastro.bairro}
                    onChange={(event) =>
                      setClienteCadastro({ ...clienteCadastro, bairro: event.target.value })
                    }
                  />
                </label>

                <label>
                  Cidade
                  <input
                    value={clienteCadastro.cidade}
                    onChange={(event) =>
                      setClienteCadastro({ ...clienteCadastro, cidade: event.target.value })
                    }
                  />
                </label>

                <label>
                  Estado
                  <input
                    value={clienteCadastro.estado}
                    onChange={(event) =>
                      setClienteCadastro({ ...clienteCadastro, estado: event.target.value.toUpperCase() })
                    }
                    maxLength={2}
                  />
                </label>

                <button type="submit" disabled={loadingAction === "cadastro-cliente"}>
                  {loadingAction === "cadastro-cliente" ? "Salvando..." : "Salvar dados da clínica"}
                </button>
              </form>
            </div>

            <div className="card">
              <div className="sectionHeader compact">
                <div>
                  <h3>Regras de atendimento</h3>
                  <p>Esses campos controlam o menu e os dados obrigatórios no WhatsApp.</p>
                </div>
              </div>

              <form onSubmit={salvarConfiguracaoCliente} className="rulesForm">
                <div className="ruleGroup">
                  <strong>Formas que esta clínica atende</strong>
                  <label className="inlineCheck">
                    <input
                      type="checkbox"
                      checked={clienteConfig.usa_convenio}
                      onChange={(event) =>
                        setClienteConfig({ ...clienteConfig, usa_convenio: event.target.checked })
                      }
                    />
                    Convênio
                  </label>
                  <label className="inlineCheck">
                    <input
                      type="checkbox"
                      checked={clienteConfig.usa_particular}
                      onChange={(event) =>
                        setClienteConfig({ ...clienteConfig, usa_particular: event.target.checked })
                      }
                    />
                    Particular
                  </label>
                  <label className="inlineCheck">
                    <input
                      type="checkbox"
                      checked={clienteConfig.usa_cartao}
                      onChange={(event) =>
                        setClienteConfig({ ...clienteConfig, usa_cartao: event.target.checked })
                      }
                    />
                    Cartão próprio / benefício
                  </label>
                </div>

                <div className="ruleGroup">
                  <strong>Campos obrigatórios no fluxo</strong>
                  <label className="inlineCheck">
                    <input
                      type="checkbox"
                      checked={clienteConfig.exige_data_nascimento}
                      onChange={(event) =>
                        setClienteConfig({
                          ...clienteConfig,
                          exige_data_nascimento: event.target.checked,
                        })
                      }
                    />
                    Exige data de nascimento
                  </label>
                  <label className="inlineCheck">
                    <input
                      type="checkbox"
                      checked={clienteConfig.exige_especialidade}
                      onChange={(event) =>
                        setClienteConfig({ ...clienteConfig, exige_especialidade: event.target.checked })
                      }
                    />
                    Exige especialidade
                  </label>
                  <label className="inlineCheck">
                    <input
                      type="checkbox"
                      checked={clienteConfig.exige_plano}
                      disabled={!clienteConfig.usa_convenio}
                      onChange={(event) =>
                        setClienteConfig({ ...clienteConfig, exige_plano: event.target.checked })
                      }
                    />
                    Exige plano/rede/produto quando houver convênio
                  </label>
                </div>

                <div className="ruleGroup">
                  <strong>Comportamento operacional</strong>
                  <label className="inlineCheck">
                    <input
                      type="checkbox"
                      checked={Boolean(clienteConfig.encaminhar_humano_quando_nao_encontrar)}
                      onChange={(event) =>
                        setClienteConfig({
                          ...clienteConfig,
                          encaminhar_humano_quando_nao_encontrar: event.target.checked,
                        })
                      }
                    />
                    Encaminhar para humano quando não encontrar atendimento
                  </label>
                  <label>
                    Provedor de agenda
                    <select
                      value={clienteConfig.provedor_agenda || "mock"}
                      onChange={(event) =>
                        setClienteConfig({ ...clienteConfig, provedor_agenda: event.target.value })
                      }
                    >
                      <option value="mock">Mock / homologação</option>
                      <option value="google">Google Calendar</option>
                      <option value="feegow">Feegow</option>
                      <option value="sigma">Sigma</option>
                    </select>
                  </label>
                </div>

                <div className="ruleGroup">
                  <strong>Timeout do atendimento</strong>
                  <label>
                    Encerrar sessão após inatividade de
                    <input
                      type="number"
                      min={1}
                      max={1440}
                      value={getConfigNumber(clienteConfig, SESSION_TIMEOUT_KEYS, 10)}
                      onChange={(event) =>
                        setClienteConfig(
                          updateAgendaConfigNumber(
                            clienteConfig,
                            SESSION_TIMEOUT_KEYS,
                            Number(event.target.value),
                          ),
                        )
                      }
                    />
                    minutos
                  </label>
                </div>

                <div className="helperBox">
                  Regra ativa no WhatsApp: clientes com <strong>status ativo</strong> aparecem na lista.
                  Clínicas sem convênio não mostram menu de convênios e não pedem plano.
                </div>

                <button type="submit" disabled={loadingAction === "config-cliente"}>
                  {loadingAction === "config-cliente" ? "Salvando..." : "Salvar regras de atendimento"}
                </button>
              </form>
            </div>
          </section>
        )}

        {selectedCliente && (
          <section className="card full">
            <div className="sectionHeader">
              <div>
                <h3>Formas de atendimento</h3>
                <p>{medicosClienteSelecionado!.nome_fantasia}</p>
              </div>
            </div>

            <form onSubmit={salvarFormaAtendimento} className="inlineForm formaAtendimentoForm">
              <select
                value={novaForma.tipo}
                onChange={(event) => setNovaForma({ ...novaForma, tipo: event.target.value })}
              >
                <option value="particular">Particular</option>
                <option value="cartao">Cartão próprio / benefício</option>
                <option value="convenio">Convênio</option>
                <option value="assinatura">Assinatura</option>
                <option value="parceria">Parceria</option>
                <option value="outro">Outro</option>
              </select>

              <input
                value={novaForma.nome}
                onChange={(event) => setNovaForma({ ...novaForma, nome: event.target.value })}
                placeholder="Ex.: Cartão de Todos"
                required
              />

              <label className="inlineCheck">
                <input
                  type="checkbox"
                  checked={novaForma.exige_plano}
                  onChange={(event) =>
                    setNovaForma({ ...novaForma, exige_plano: event.target.checked })
                  }
                />
                Exige plano
              </label>

              <label className="inlineCheck">
                <input
                  type="checkbox"
                  checked={novaForma.permite_agendamento_online}
                  onChange={(event) =>
                    setNovaForma({ ...novaForma, permite_agendamento_online: event.target.checked })
                  }
                />
                Exibir no WhatsApp
              </label>

              <div className="formActions compactActions">
                <button type="submit" disabled={loadingAction === "forma"}>
                  {loadingAction === "forma"
                    ? "Salvando..."
                    : editingFormaId
                      ? "Atualizar"
                      : "Adicionar"}
                </button>
                {editingFormaId && (
                  <button type="button" className="secondary" onClick={cancelarEdicaoForma}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>

            <div className="toolbar">
              <input
                value={formasSearch}
                onChange={(event) => { setFormasSearch(event.target.value); setFormasPage(1); }}
                placeholder="Buscar forma de atendimento. Ex.: Bradesco, Sul America, Particular..."
              />
              <span>{formasFiltradas.length} registros</span>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Nome</th>
                  <th>Exige plano</th>
                  <th>WhatsApp</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {formasPaginadas.map((forma) => (
                  <tr key={forma.id}>
                    <td>{forma.tipo}</td>
                    <td>{forma.nome}</td>
                    <td>{forma.exige_plano ? "Sim" : "Não"}</td>
                    <td>{forma.permite_agendamento_online ? "Sim" : "Não"}</td>
                    <td>{forma.ativo ? "Ativo" : "Inativo"}</td>
                    <td className="actions">
                      <button className="small" type="button" onClick={() => editarForma(forma)}>
                        Editar
                      </button>
                      {forma.tipo === "convenio" && (
                        <button className="small" onClick={() => loadProdutos(forma)}>
                          Produtos
                        </button>
                      )}
                      <button className="small danger" onClick={() => toggleForma(forma)}>
                        {forma.ativo ? "Desativar" : "Ativar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PaginationBar
              page={formasPageSafe}
              pageCount={totalFormasPages}
              total={formasFiltradas.length}
              label="Formas de atendimento"
              onPrev={() => setFormasPage((page) => Math.max(1, page - 1))}
              onNext={() => setFormasPage((page) => Math.min(totalFormasPages, page + 1))}
            />
          </section>
        )}

        {selectedForma && (
          <section className="card full">
            <div className="sectionHeader">
              <div>
                <h3>Produtos / planos / redes</h3>
                <p>{selectedForma.nome}</p>
              </div>
              <button className="secondary" onClick={() => setSelectedForma(null)}>
                Fechar
              </button>
            </div>

            <form onSubmit={criarProduto} className="productForm">
              <select
                value={novoProduto.tipo}
                onChange={(event) => setNovoProduto({ ...novoProduto, tipo: event.target.value })}
              >
                <option value="plano">Plano</option>
                <option value="rede">Rede</option>
                <option value="produto">Produto</option>
                <option value="acomodacao">Acomodação</option>
                <option value="texto_livre">Texto livre</option>
              </select>

              <input
                value={novoProduto.nome}
                onChange={(event) => setNovoProduto({ ...novoProduto, nome: event.target.value })}
                placeholder="Nome do produto. Ex.: Executivo II"
                required
              />

              <input
                value={novoProduto.codigo_operadora}
                onChange={(event) =>
                  setNovoProduto({ ...novoProduto, codigo_operadora: event.target.value })
                }
                placeholder="Código"
              />

              <input
                value={novoProduto.acomodacao_ou_uf}
                onChange={(event) =>
                  setNovoProduto({ ...novoProduto, acomodacao_ou_uf: event.target.value })
                }
                placeholder="Acomodação/UF"
              />

              <button type="submit" disabled={loadingAction === "produto"}>
                {loadingAction === "produto" ? "Adicionando..." : "Adicionar produto"}
              </button>
            </form>

            <div className="toolbar">
              <input
                value={produtoSearch}
                onChange={(event) => setProdutoSearch(event.target.value)}
                placeholder="Buscar produto/plano/rede..."
              />
              <span>
                Exibindo {produtosPageStart}–{produtosPageEnd} de {produtosFiltrados.length}
              </span>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Nome</th>
                  <th>Código</th>
                  <th>Acomodação/UF</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {produtosPaginados.map((produto) => (
                  <tr key={produto.id} className={produto.ativo ? "" : "mutedRow"}>
                    <td>{produto.tipo}</td>
                    <td>{produto.nome}</td>
                    <td>{produto.codigo_operadora || "-"}</td>
                    <td>{produto.acomodacao_ou_uf || "-"}</td>
                    <td>{produto.ativo ? "Ativo" : "Inativo"}</td>
                    <td>
                      <button className="small" onClick={() => toggleProduto(produto)}>
                        {produto.ativo ? "Desativar" : "Ativar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pagination">
              <button
                className="secondary"
                disabled={produtoPageSafe <= 1}
                onClick={() => setProdutoPage((page) => Math.max(1, page - 1))}
              >
                Anterior
              </button>

              <span>
                Página {produtoPageSafe} de {totalProdutoPages}
              </span>

              <button
                className="secondary"
                disabled={produtoPageSafe >= totalProdutoPages}
                onClick={() =>
                  setProdutoPage((page) => Math.min(totalProdutoPages, page + 1))
                }
              >
                Próxima
              </button>
            </div>
          </section>
        )}
          </>
        )}


        {activeTab === "usuarios" && isGlobalAdmin && (
          <section className="usersAdminGrid">
            <div className="card userFormCard">
              <div className="cardHeader stackedHeader">
                <div>
                  <h3>{editingUsuarioId ? "Editar usuário" : "Novo usuário"}</h3>
                  <p>Crie operadores, altere status e vincule Admin Clínica a uma ou mais clínicas.</p>
                </div>
              </div>

              <form className="userForm" onSubmit={handleCreateUsuario}>
                <label>
                  Nome
                  <input
                    placeholder="Ex.: Operador Baronesa"
                    value={usuarioForm.nome}
                    onChange={(event) => setUsuarioForm((current) => ({ ...current, nome: event.target.value }))}
                  />
                </label>

                <label>
                  Email
                  <input
                    type="email"
                    placeholder="usuario@clinica.com.br"
                    value={usuarioForm.email}
                    onChange={(event) => setUsuarioForm((current) => ({ ...current, email: event.target.value }))}
                  />
                  {editingUsuarioId && (
                    <span className="fieldHint">
                      Alterar o e-mail muda o login, os convites e os links de recuperação deste usuário.
                    </span>
                  )}
                </label>

                <label>
                  Perfil
                  <select
                    value={usuarioForm.perfil}
                    onChange={(event) => setUsuarioForm((current) => ({
                      ...current,
                      perfil: event.target.value as "global" | "clinica",
                      cliente_ids: event.target.value === "global" ? [] : current.cliente_ids,
                    }))}
                  >
                    <option value="clinica">Admin Clínica</option>
                    <option value="global">Admin Global</option>
                  </select>
                </label>

                <label>
                  Status
                  <select
                    value={usuarioForm.ativo ? "ativo" : "inativo"}
                    onChange={(event) => setUsuarioForm((current) => ({ ...current, ativo: event.target.value === "ativo" }))}
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </label>

                <div className="infoBox">
                  {editingUsuarioId
                    ? "Ao salvar, o e-mail informado passa a ser usado para login, convite e recuperação de senha. Para resetar senha, use o botão Enviar reset por e-mail na tabela."
                    : "Ao criar o usuário, o sistema enviará um convite para o e-mail cadastrado. O usuário definirá a própria senha e configurará MFA no primeiro acesso."}
                </div>

                {usuarioForm.perfil === "clinica" && (
                  <div className="clinicSelectorBox">
                    <strong>Clínicas permitidas</strong>
                    <span>Selecione uma ou mais unidades que este operador poderá acessar.</span>
                    <div className="checkGrid userClinicGrid">
                      {clientes.map((cliente) => (
                        <label key={cliente.id}>
                          <input
                            type="checkbox"
                            checked={usuarioForm.cliente_ids.includes(cliente.id)}
                            onChange={() => toggleUsuarioCliente(cliente.id)}
                          />
                          {cliente.nome_fantasia}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="formActions">
                  <button type="submit" disabled={Boolean(loadingAction)}>
                    {loadingAction === "usuarios.create"
                      ? "Criando usuário..."
                      : loadingAction === "usuarios.save"
                        ? "Salvando usuário..."
                        : editingUsuarioId
                          ? "Salvar usuário"
                          : "Criar usuário e enviar convite"}
                  </button>
                  {editingUsuarioId && (
                    <button className="secondaryButton" type="button" onClick={resetUsuarioForm} disabled={Boolean(loadingAction)}>
                      Cancelar edição
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="card usersListCard">
              <div className="cardHeader usersHeader">
                <div>
                  <h3>Usuários administrativos</h3>
                  <p>MFA/TOTP obrigatório ativo. Admin Global pode resetar o segundo fator dos usuários.</p>
                </div>
                <button onClick={() => loadUsuarios()} disabled={loadingAction === "usuarios.refresh"}>
                  {loadingAction === "usuarios.refresh" ? "Atualizando..." : "Atualizar usuários"}
                </button>
              </div>

              <div className="usersSummary">
                <span>{usuarios.length} usuários</span>
                <span>{usuarios.filter((usuario) => usuario.ativo).length} ativos</span>
                <span>{usuarios.filter((usuario) => !usuario.ativo).length} inativos</span>
                <span>{usuarios.filter((usuario) => usuario.perfil === "clinica").length} clínicas</span>
                <span>{usuarios.filter((usuario) => usuario.perfil === "global").length} globais</span>
              </div>

              <div className="userFilters">
                <button
                  className={usuarioStatusFiltro === "ativos" ? "filterActive" : "secondary"}
                  type="button"
                  onClick={() => setUsuarioStatusFiltro("ativos")}
                >
                  Ativos
                </button>
                <button
                  className={usuarioStatusFiltro === "inativos" ? "filterActive" : "secondary"}
                  type="button"
                  onClick={() => setUsuarioStatusFiltro("inativos")}
                >
                  Inativos
                </button>
                <button
                  className={usuarioStatusFiltro === "todos" ? "filterActive" : "secondary"}
                  type="button"
                  onClick={() => setUsuarioStatusFiltro("todos")}
                >
                  Todos
                </button>
              </div>

              <div className="tableWrap usersTableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Usuário</th>
                      <th>Perfil</th>
                      <th>Clínicas</th>
                      <th>Status</th>
                      <th>MFA</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuariosFiltrados.map((usuario) => (
                      <tr key={usuario.id} className={usuario.ativo ? "" : "mutedRow"}>
                        <td>
                          <strong>{usuario.nome}</strong>
                          <span className="tableHint">{usuario.email}</span>
                        </td>
                        <td>
                          <Badge active={usuario.perfil === "global"}>{usuario.perfil === "global" ? "Global" : "Clínica"}</Badge>
                        </td>
                        <td className="clinicCell">
                          {usuario.perfil === "global"
                            ? "Todas"
                            : (usuario.clientes || []).map((cliente) => cliente.nome_fantasia).join(", ") || "-"}
                        </td>
                        <td><Badge active={usuario.ativo}>{usuario.ativo ? "Ativo" : "Inativo"}</Badge></td>
                        <td><Badge active={usuario.mfa_enabled}>{usuario.mfa_enabled ? "Ativo" : "Pendente"}</Badge></td>
                        <td className="userActionsCell">
                          <button
                            className="tableActionButton"
                            type="button"
                            onClick={() => handleEditUsuario(usuario)}
                            disabled={Boolean(loadingAction)}
                          >
                            Editar
                          </button>
                          <button
                            className="tableActionButton"
                            type="button"
                            onClick={() => handleToggleUsuarioAtivo(usuario)}
                            disabled={loadingAction === `usuarios.toggle.${usuario.id}`}
                          >
                            {loadingAction === `usuarios.toggle.${usuario.id}`
                              ? "Salvando..."
                              : usuario.ativo
                                ? "Inativar"
                                : "Ativar"}
                          </button>
                          <button
                            className="tableActionButton"
                            type="button"
                            onClick={() => handleSendUsuarioInvite(usuario)}
                            disabled={loadingAction === `usuarios.invite.${usuario.id}` || !usuario.ativo}
                          >
                            {loadingAction === `usuarios.invite.${usuario.id}` ? "Enviando..." : "Reenviar convite"}
                          </button>
                          <button
                            className="tableActionButton"
                            type="button"
                            onClick={() => handleSendUsuarioPasswordReset(usuario)}
                            disabled={loadingAction === `usuarios.resetmail.${usuario.id}` || !usuario.ativo}
                          >
                            {loadingAction === `usuarios.resetmail.${usuario.id}` ? "Enviando..." : "Enviar reset senha"}
                          </button>
                          <button
                            className="tableActionButton"
                            type="button"
                            onClick={() => handleResetUsuarioMfa(usuario)}
                            disabled={loadingAction === `usuarios.mfa.${usuario.id}`}
                          >
                            {loadingAction === `usuarios.mfa.${usuario.id}` ? "Resetando..." : "Resetar MFA"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activeTab === "auditoria" && isGlobalAdmin && (
          <section className="card auditCard">
            <div className="sectionHeader">
              <div>
                <h3>Auditoria administrativa</h3>
                <p>Rastro das alterações feitas no painel: usuários, médicos, clientes, formas de atendimento e disponibilidade.</p>
              </div>
              <button onClick={() => loadAdminAuditLogs()} disabled={auditLogsLoading}>
                {auditLogsLoading ? "Atualizando..." : "Atualizar auditoria"}
              </button>
            </div>

            <div className="auditToolbar">
              <input
                value={auditFilters.usuarioEmail}
                onChange={(event) => setAuditFilters({ ...auditFilters, usuarioEmail: event.target.value })}
                placeholder="Filtrar por e-mail do usuário"
              />
              <select
                value={auditFilters.clienteId}
                onChange={(event) => setAuditFilters({ ...auditFilters, clienteId: event.target.value })}
              >
                <option value="todos">Todas as clínicas</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>{cliente.nome_fantasia}</option>
                ))}
              </select>
              <input
                value={auditFilters.acao}
                onChange={(event) => setAuditFilters({ ...auditFilters, acao: event.target.value })}
                list="audit-acoes"
                placeholder="Ação. Ex.: medico.atualizado"
              />
              <datalist id="audit-acoes">
                {auditActionOptions.map((acao) => <option key={acao} value={acao} />)}
              </datalist>
              <input
                value={auditFilters.entidade}
                onChange={(event) => setAuditFilters({ ...auditFilters, entidade: event.target.value })}
                list="audit-entidades"
                placeholder="Entidade. Ex.: medico"
              />
              <datalist id="audit-entidades">
                {auditEntityOptions.map((entidade) => <option key={entidade} value={entidade} />)}
              </datalist>
              <input
                type="date"
                value={auditFilters.startDate}
                onChange={(event) => setAuditFilters({ ...auditFilters, startDate: event.target.value })}
              />
              <input
                type="date"
                value={auditFilters.endDate}
                onChange={(event) => setAuditFilters({ ...auditFilters, endDate: event.target.value })}
              />
              <button className="secondary" onClick={() => loadAdminAuditLogs()} disabled={auditLogsLoading}>Filtrar</button>
            </div>

            <div className="auditSummary">
              <span>Exibindo até {ADMIN_AUDIT_PAGE_SIZE} registros</span>
              <span>Total carregado: {auditLogsResumo.total}</span>
              <span>Usuários: {auditLogsResumo.usuarios}</span>
              <span>Clínicas: {auditLogsResumo.clinicas}</span>
            </div>

            {auditLogs.length > 0 ? (
              <div className="tableWrap auditTableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Data/hora</th>
                      <th>Usuário</th>
                      <th>Ação</th>
                      <th>Entidade</th>
                      <th>Clínica</th>
                      <th>Resumo</th>
                      <th>Antes / Depois</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td>{formatAdminDate(log.created_at)}</td>
                        <td>
                          <strong>{log.usuario_email || "-"}</strong>
                          <span className="tableHint">{log.usuario_perfil || "-"}</span>
                        </td>
                        <td><Badge active>{prettyAuditLabel(log.acao)}</Badge></td>
                        <td>
                          {prettyAuditLabel(log.entidade)}
                          {log.entidade_id ? <span className="tableHint">ID {log.entidade_id}</span> : null}
                        </td>
                        <td>
                          <strong>{getClienteNomeById(log.cliente_id)}</strong>
                          {log.cliente_id ? <span className="tableHint">ID {log.cliente_id}</span> : null}
                        </td>
                        <td>{log.resumo || "-"}</td>
                        <td className="auditJsonCell">
                          <button
                            className="small auditJsonButton"
                            type="button"
                            onClick={() => setSelectedAuditLog(log)}
                          >
                            Ver antes/depois
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="emptyState">
                {auditLogsLoading ? "Carregando auditoria..." : "Nenhum registro encontrado para os filtros atuais."}
              </div>
            )}
          </section>
        )}

        {selectedAuditLog && (
          <div className="modalBackdrop" role="dialog" aria-modal="true" aria-label="Detalhes da auditoria">
            <div className="auditModal">
              <div className="auditModalHeader">
                <div>
                  <h3>Detalhes da auditoria</h3>
                  <p>
                    {formatAdminDate(selectedAuditLog.created_at)} · {selectedAuditLog.usuario_email || "Usuário não identificado"}
                  </p>
                </div>
                <button className="secondary" type="button" onClick={() => setSelectedAuditLog(null)}>
                  Fechar
                </button>
              </div>

              <div className="auditModalMeta">
                <span><strong>Ação:</strong> {prettyAuditLabel(selectedAuditLog.acao)}</span>
                <span><strong>Entidade:</strong> {prettyAuditLabel(selectedAuditLog.entidade)}{selectedAuditLog.entidade_id ? ` #${selectedAuditLog.entidade_id}` : ""}</span>
                <span><strong>Clínica:</strong> {getClienteNomeById(selectedAuditLog.cliente_id)}</span>
                <span><strong>Perfil:</strong> {selectedAuditLog.usuario_perfil || "-"}</span>
              </div>

              <AuditHumanSummary log={selectedAuditLog} />

              <details className="auditTechnicalDetails">
                <summary>Ver dados técnicos em JSON</summary>
                <div className="auditModalGrid">
                  <div>
                    <h4>Antes</h4>
                    <pre>{formatJsonPretty(selectedAuditLog.antes_json)}</pre>
                  </div>
                  <div>
                    <h4>Depois</h4>
                    <pre>{formatJsonPretty(selectedAuditLog.depois_json)}</pre>
                  </div>
                </div>
              </details>
            </div>
          </div>
        )}

        {activeTab === "medicos" && !medicosClienteSelecionado && (
          <section className="card full selectionRequiredCard medicoClinicSelectorCard">
            <div className="selectionRequiredIcon">🏥</div>
            <div>
              <h3>Selecione uma clínica para gerenciar médicos e aceites</h3>
              <p>Escolha a clínica aqui mesmo. Não é necessário voltar para Clientes.</p>
              <label>
                Clínica / unidade
                <select
                  value={selectedClienteId || ""}
                  onChange={(event) => {
                    const id = Number(event.target.value);
                    if (Number.isFinite(id) && id > 0) void selecionarClienteParaMedicos(id);
                  }}
                >
                  <option value="">Selecione</option>
                  {scopedClientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>{cliente.nome_fantasia}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>
        )}

        {activeTab === "medicos" && medicosClienteSelecionado && (
          <section className="grid medicosGrid">

            <div className="card full medicoClinicSelectorCard">
              <label>
                Clínica / unidade em configuração
                <select
                  value={selectedClienteId || ""}
                  onChange={(event) => void selecionarClienteParaMedicos(Number(event.target.value))}
                >
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>{cliente.nome_fantasia}</option>
                  ))}
                </select>
              </label>
              <span>Troque a clínica aqui sem voltar ao menu Clientes.</span>
            </div>

            <div className="card">
              <div className="sectionHeader compact">
                <div>
                  <h3>Médicos</h3>
                  <p>{medicosClienteSelecionado!.nome_fantasia}</p>
                </div>
                <span>{medicosFiltrados.length} registros</span>
              </div>

              <div className="helperBox compactHelper">
                Clique em um médico da lista para carregar os dados no formulário e editar.
                Médico inativo não entra no WhatsApp nem na validação de horários.
              </div>

              {isGlobalAdmin && (
                <div className={`importMedicosBox${loadingAction === "importar-medicos" ? " isImporting" : ""}`}>
                  <div>
                    <strong>Carga em massa</strong>
                    <span>Importa a planilha da unidade. Se não houver CRM, usa 000000, 000001, 000002... pela ordem da planilha.</span>
                    {importacaoMedicosStatus && (
                      <div className="importStatus" role="status" aria-live="polite">
                        {loadingAction === "importar-medicos" && <span className="importSpinner" aria-hidden="true" />}
                        <span>{importacaoMedicosStatus}</span>
                      </div>
                    )}
                  </div>
                  <label className={`importFileButton${loadingAction === "importar-medicos" ? " disabled" : ""}`}>
                    {loadingAction === "importar-medicos" ? "Importando..." : "Importar planilha"}
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      disabled={loadingAction === "importar-medicos"}
                      onChange={importarMedicosDePlanilha}
                    />
                  </label>
                </div>
              )}

              <form onSubmit={salvarMedico} className="medicoForm">
                <input
                  value={medicoForm.nome}
                  onChange={(event) => setMedicoForm({ ...medicoForm, nome: event.target.value })}
                  placeholder="Nome do médico"
                  required
                />
                <input
                  value={medicoForm.registro_profissional}
                  onChange={(event) =>
                    setMedicoForm({ ...medicoForm, registro_profissional: event.target.value })
                  }
                  placeholder="CRM / registro profissional"
                  required
                />
                <div className="especialidadesRulesBox">
                  <div className="rulesBoxHeader">
                    <div>
                      <strong>Especialidades do médico</strong>
                      <span>Cadastre uma regra de idade independente para cada especialidade.</span>
                    </div>
                    <button type="button" className="secondary smallButton" onClick={addMedicoEspecialidadeRegra}>
                      + Especialidade
                    </button>
                  </div>

                  {medicoForm.especialidades_regras.map((regra, index) => (
                    <div className="especialidadeRuleItem" key={`especialidade-regra-${index}`}>
                      <input
                        value={regra.nome}
                        onChange={(event) => updateMedicoEspecialidadeRegra(index, { nome: event.target.value })}
                        onBlur={() => {
                          const especialidade = resolveEspecialidadeDigitada(regra.nome);
                          if (especialidade) {
                            updateMedicoEspecialidadeRegra(index, { nome: especialidade.nome });
                          }
                        }}
                        list="especialidades-catalogo"
                        placeholder="Especialidade. Ex.: Pediatria"
                        required
                      />
                      <div className="twoColumns">
                        <input
                          type="number"
                          min="0"
                          max="130"
                          value={regra.idade_minima}
                          onChange={(event) => updateMedicoEspecialidadeRegra(index, { idade_minima: event.target.value })}
                          placeholder="Idade mínima"
                        />
                        <input
                          type="number"
                          min="0"
                          max="130"
                          value={regra.idade_maxima}
                          onChange={(event) => updateMedicoEspecialidadeRegra(index, { idade_maxima: event.target.value })}
                          placeholder="Idade máxima"
                        />
                      </div>
                      <input
                        value={regra.regra_idade_texto}
                        onChange={(event) => updateMedicoEspecialidadeRegra(index, { regra_idade_texto: event.target.value })}
                        placeholder="Regra/observação. Ex.: atende até 12 anos"
                      />
                      {medicoForm.especialidades_regras.length > 1 && (
                        <button
                          type="button"
                          className="secondary dangerTextButton"
                          onClick={() => removeMedicoEspecialidadeRegra(index)}
                        >
                          Remover especialidade
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <datalist id="especialidades-catalogo">
                  {especialidadeOptions.map((especialidade) => (
                    <option key={especialidade} value={especialidade} />
                  ))}
                </datalist>
                <input
                  value={medicoForm.dias}
                  onChange={(event) => setMedicoForm({ ...medicoForm, dias: event.target.value })}
                  placeholder="Dias/horários. Ex.: 2ª e 4ª M"
                />
                <input
                  value={medicoForm.andar}
                  onChange={(event) => setMedicoForm({ ...medicoForm, andar: event.target.value })}
                  placeholder="Andar/sala"
                />
                <div className="formActions">
                  <button type="submit" disabled={loadingAction === "medico"}>
                    {loadingAction === "medico"
                      ? "Salvando..."
                      : editingMedicoId
                        ? "Atualizar médico"
                        : "Cadastrar médico"}
                  </button>
                  {editingMedicoId && (
                    <button type="button" className="secondary" onClick={limparFormularioMedico}>
                      Cancelar edição
                    </button>
                  )}
                </div>
              </form>

              <div className="toolbar single medicoToolbar">
                <input
                  value={medicoSearch}
                  onChange={(event) => { setMedicoSearch(event.target.value); setMedicosPage(1); }}
                  placeholder="Buscar médico, CRM, especialidade, dia..."
                />
                <div className="clientFilter medicoStatusFilter">
                  <button
                    type="button"
                    className={medicoStatusFiltro === "ativos" ? "active" : ""}
                    onClick={() => { setMedicoStatusFiltro("ativos"); setMedicosPage(1); }}
                  >
                    Ativos
                  </button>
                  <button
                    type="button"
                    className={medicoStatusFiltro === "inativos" ? "active" : ""}
                    onClick={() => { setMedicoStatusFiltro("inativos"); setMedicosPage(1); }}
                  >
                    Inativos
                  </button>
                  <button
                    type="button"
                    className={medicoStatusFiltro === "todos" ? "active" : ""}
                    onClick={() => { setMedicoStatusFiltro("todos"); setMedicosPage(1); }}
                  >
                    Todos
                  </button>
                </div>
              </div>

              <div className="list medicosList">
                {medicosPaginados.map((medico) => (
                  <button
                    key={medico.id}
                    className={
                      (medico.id === selectedMedicoId ? "listItem selected" : "listItem") +
                      (!medico.ativo ? " mutedRow" : "")
                    }
                    type="button"
                    onClick={() => editarMedico(medico)}
                  >
                    <strong>{medico.nome}</strong>
                    <span>{medico.registro_profissional ? `CRM/Registro: ${medico.registro_profissional}` : "Sem CRM/registro informado"}</span>
                    <div>
                      <Badge active={medico.ativo}>{medico.ativo ? "ativo" : "inativo"}</Badge>
                      {medico.especialidades && <Badge>{medico.especialidades}</Badge>}
                    </div>
                    {(medico.dias || medico.andar) && (
                      <span>
                        {[medico.dias, medico.andar].filter(Boolean).join(" - ")}
                      </span>
                    )}
                    <span className="listItemHint">Clique para editar cadastro</span>
                    <span
                      className={medico.ativo ? "small danger inlineListAction" : "small success inlineListAction"}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleMedico(medico);
                      }}
                    >
                      {loadingAction === `medico-${medico.id}`
                        ? "Salvando..."
                        : medico.ativo
                          ? "Desativar médico"
                          : "Ativar médico"}
                    </span>
                  </button>
                ))}
              </div>
                <PaginationBar
                  page={medicosPageSafe}
                  pageCount={totalMedicosPages}
                  total={medicosFiltrados.length}
                  label="Médicos"
                  onPrev={() => setMedicosPage((page) => Math.max(1, page - 1))}
                  onNext={() => setMedicosPage((page) => Math.min(totalMedicosPages, page + 1))}
                />
            </div>

            <div className="card">
              <div className="sectionHeader compact">
                <div>
                  <h3>Aceites do médico</h3>
                  <p>
                    {selectedMedico
                      ? `${selectedMedico.nome} — ${selectedMedico.especialidades || "sem especialidade"}`
                      : "Selecione um médico"}
                  </p>
                </div>
              </div>

              {selectedMedico && (
                <div className="availabilityBox">
                  <div className="sectionHeader compact">
                    <div>
                      <h4>Disponibilidade para agenda online</h4>
                      <p>Use manhã, tarde e noite com horários reais por médico.</p>
                    </div>
                    <button
                      type="button"
                      className="small success"
                      disabled={loadingAction === "disponibilidade"}
                      onClick={salvarDisponibilidades}
                    >
                      {loadingAction === "disponibilidade" ? "Salvando..." : "Salvar disponibilidade"}
                    </button>
                  </div>

                  <div className="availabilityTable">
                    <div className="availabilityHead">
                      <span>Dia</span>
                      <span>Período</span>
                      <span>Atende</span>
                      <span>Início</span>
                      <span>Fim</span>
                      <span>Slot</span>
                    </div>

                    {disponibilidades.map((item, index) => {
                      const dia = DIAS_SEMANA.find((option) => option.value === item.dia_semana)?.label || item.dia_semana;
                      const periodo = PERIODOS_DISPONIBILIDADE.find((option) => option.value === item.periodo)?.label || item.periodo;

                      return (
                        <div key={`${item.dia_semana}-${item.periodo}`} className="availabilityRow">
                          <span>{dia}</span>
                          <span>{periodo}</span>
                          <label className="miniCheck">
                            <input
                              type="checkbox"
                              checked={item.ativo}
                              onChange={(event) => updateDisponibilidade(index, { ativo: event.target.checked })}
                            />
                          </label>
                          <input
                            type="time"
                            value={item.hora_inicio}
                            disabled={!item.ativo}
                            onChange={(event) => updateDisponibilidade(index, { hora_inicio: event.target.value })}
                          />
                          <input
                            type="time"
                            value={item.hora_fim}
                            disabled={!item.ativo}
                            onChange={(event) => updateDisponibilidade(index, { hora_fim: event.target.value })}
                          />
                          <select
                            value={item.intervalo_minutos}
                            disabled={!item.ativo}
                            onChange={(event) =>
                              updateDisponibilidade(index, { intervalo_minutos: Number(event.target.value) })
                            }
                          >
                            <option value={15}>15 min</option>
                            <option value={20}>20 min</option>
                            <option value={30}>30 min</option>
                            <option value={45}>45 min</option>
                            <option value={60}>60 min</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>

                  <div className="helperBox compactHelper">
                    Quando houver disponibilidade estruturada, o WhatsApp passa a priorizar estes horários.
                    Sem cadastro estruturado, continua valendo o fallback de homologação/controlado.
                  </div>
                </div>
              )}

              {!clienteUsaConvenio ? (
                <div className="emptyState leftText">
                  <strong>Aceites por convênio não se aplicam a esta unidade.</strong>
                  <p>
                    Esta clínica está configurada sem atendimento por convênio.
                    Para atendimento particular, cartão próprio ou benefício, use apenas o cadastro
                    do médico, especialidade e formas de atendimento da clínica.
                  </p>
                </div>
              ) : selectedMedico ? (
                <>
                  {!clienteTemFormaConvenio && (
                    <div className="infoBox">
                      Convênio está habilitado nas regras da clínica. Você já pode cadastrar aceites
                      para este médico. Para que o menu comercial fique completo, mantenha também
                      uma forma de atendimento do tipo Convênio ativa em Formas de atendimento.
                    </div>
                  )}
                  <form onSubmit={criarAceite} className="inlineForm aceiteForm">
                    <input
                      value={novoAceite.convenio}
                      onChange={(event) =>
                        setNovoAceite({ ...novoAceite, convenio: event.target.value })
                      }
                      placeholder="Convênio exato. Ex.: ASSEFAZ"
                      required
                    />
                    <input
                      value={novoAceite.plano}
                      onChange={(event) =>
                        setNovoAceite({ ...novoAceite, plano: event.target.value })
                      }
                      placeholder="Plano/produto exato. Ex.: DIAMANTE"
                      required
                    />
                    <button type="submit" disabled={loadingAction === "aceite"}>
                      {loadingAction === "aceite" ? "Salvando..." : "Adicionar aceite"}
                    </button>
                  </form>

                  <div className="helperBox">
                    A criação por nome usa a regra atual do backend: médico + especialidade ativa + convênio + plano.
                    Se já existir inativo, o aceite é reativado automaticamente.
                  </div>

                  <div className="clientFilter aceiteFilter">
                    <button
                      type="button"
                      className={aceiteFiltro === "ativos" ? "active" : ""}
                      onClick={() => setAceiteFiltro("ativos")}
                    >
                      Ativos
                    </button>
                    <button
                      type="button"
                      className={aceiteFiltro === "inativos" ? "active" : ""}
                      onClick={() => setAceiteFiltro("inativos")}
                    >
                      Desativados
                    </button>
                    <button
                      type="button"
                      className={aceiteFiltro === "todos" ? "active" : ""}
                      onClick={() => setAceiteFiltro("todos")}
                    >
                      Todos
                    </button>
                    <span>{aceitesFiltrados.length} aceites</span>
                  </div>

                  <div className="toolbar">
                    <input
                      value={aceiteSearch}
                      onChange={(event) => {
                        setAceiteSearch(event.target.value);
                        setAceitePage(1);
                      }}
                      placeholder="Buscar aceite por convênio, plano, especialidade, código..."
                    />
                    <span>
                      Exibindo {aceitesPageStart}–{aceitesPageEnd} de {aceitesFiltrados.length}
                    </span>
                  </div>

                  <table>
                    <thead>
                      <tr>
                        <th>Convênio</th>
                        <th>Plano/produto</th>
                        <th>Especialidade</th>
                        <th>Origem</th>
                        <th>Status</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aceitesPaginados.map((aceite) => (
                        <tr key={aceite.id} className={aceite.ativo ? "" : "mutedRow"}>
                          <td>{aceite.convenio}</td>
                          <td>
                            <strong>{aceite.produto || "Sem plano"}</strong>
                            <span className="tableHint">
                              {[aceite.produto_tipo, aceite.codigo_operadora, aceite.acomodacao_ou_uf]
                                .filter(Boolean)
                                .join(" - ") || "-"}
                            </span>
                          </td>
                          <td>{aceite.especialidade || "-"}</td>
                          <td>{aceite.origem_regra || aceite.fonte_tipo || "-"}</td>
                          <td>{aceite.ativo ? "Ativo" : "Inativo"}</td>
                          <td>
                            <button
                              className={aceite.ativo ? "small danger" : "small success"}
                              disabled={loadingAction === `aceite-${aceite.id}`}
                              onClick={() => toggleAceite(aceite)}
                            >
                              {loadingAction === `aceite-${aceite.id}`
                                ? "Salvando..."
                                : aceite.ativo
                                  ? "Desativar"
                                  : "Ativar"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="pagination">
                    <button
                      className="secondary"
                      disabled={aceitePageSafe <= 1}
                      onClick={() => setAceitePage((page) => Math.max(1, page - 1))}
                    >
                      Anterior
                    </button>

                    <span>
                      Página {aceitePageSafe} de {totalAceitePages}
                    </span>

                    <button
                      className="secondary"
                      disabled={aceitePageSafe >= totalAceitePages}
                      onClick={() =>
                        setAceitePage((page) => Math.min(totalAceitePages, page + 1))
                      }
                    >
                      Próxima
                    </button>
                  </div>
                </>
              ) : (
                <div className="emptyState">Nenhum médico encontrado para este cliente.</div>
              )}
            </div>
          </section>
        )}

        {activeTab === "whatsapp" && isGlobalAdmin && (
          <>
            <section className="card">
              <div className="sectionHeader">
                <div>
                  <h3>Canais WhatsApp por cliente</h3>
                  <p>
                    Configure vários telefones Meta Cloud API na mesma Railway. O backend resolve o cliente ou grupo pelo phone_number_id recebido no webhook.
                  </p>
                </div>
                <button onClick={() => refreshWhatsappCanaisArea()} disabled={whatsappCanaisLoading || whatsappGruposLoading || whatsappGoLiveLoading}>
                  {whatsappCanaisLoading || whatsappGruposLoading || whatsappGoLiveLoading ? "Atualizando..." : "Atualizar canais"}
                </button>
              </div>

              <div className="helperBox compactHelper">
                Total: {whatsappCanaisResumo.total}. Ativos: {whatsappCanaisResumo.ativos}. Grupos/unidades: {whatsappCanaisResumo.grupos}.
                Em staging, simule cada número chamando <strong>/api/whatsapp/test-message</strong> com o campo <strong>phoneNumberId</strong>.
              </div>


              <div className="groupOverviewPanel">
                <div className="groupOverviewHeader">
                  <div>
                    <span className="sectionEyebrow">Multi-clínica agrupada</span>
                    <h4>Grupos e unidades derivados dos canais</h4>
                    <p>Visualize redes que usam um WhatsApp único com menu de escolha de unidade, sem alterar a estrutura atual do banco.</p>
                  </div>
                  <button type="button" className="secondary" onClick={() => loadWhatsappGruposUnidades()} disabled={whatsappGruposLoading}>
                    {whatsappGruposLoading ? "Atualizando..." : "Atualizar grupos"}
                  </button>
                </div>

                {whatsappGruposUnidades ? (
                  <>
                    <div className="groupOverviewSummary">
                      <div><strong>{whatsappGruposUnidades.summary.totalGrupos}</strong><span>Grupos</span></div>
                      <div><strong>{whatsappGruposUnidades.summary.unidadesOperacionais}/{whatsappGruposUnidades.summary.totalUnidades}</strong><span>Unidades operacionais</span></div>
                      <div><strong>{whatsappGruposUnidades.summary.gruposCriticos}</strong><span>Críticos</span></div>
                      <div><strong>{whatsappGruposUnidades.summary.gruposProntos}</strong><span>Prontos</span></div>
                    </div>

                    {whatsappGruposOrdenados.length ? (
                      <div className="groupOverviewList">
                        {whatsappGruposOrdenados.map((grupo) => {
                          const expanded = Boolean(whatsappGrupoExpanded[grupo.grupoId]);
                          return (
                            <article key={grupo.grupoId} className={`groupOverviewItem ${grupo.status}`}>
                              <button
                                type="button"
                                className="groupOverviewToggle"
                                onClick={() => setWhatsappGrupoExpanded((current) => ({ ...current, [grupo.grupoId]: !current[grupo.grupoId] }))}
                                aria-expanded={expanded}
                              >
                                <span className="conversationChevron">{expanded ? "▾" : "▸"}</span>
                                <div>
                                  <strong>{grupo.nomeGrupo}</strong>
                                  <span>{grupo.canalNome} · {grupo.phoneNumberId || "sem phone_number_id"} · {grupo.totalUnidades} unidade(s)</span>
                                </div>
                                <span className={`severityBadge ${grupo.status === "pronto" ? "success" : grupo.status === "atencao" ? "warning" : "critical"}`}>
                                  {grupo.status === "pronto" ? "PRONTO" : grupo.status === "atencao" ? "ATENÇÃO" : "CRÍTICO"}
                                </span>
                              </button>

                              {grupo.alerts.length > 0 && (
                                <div className="groupAlertRow">
                                  {grupo.alerts.slice(0, 2).map((alert, index) => (
                                    <span key={`${grupo.grupoId}-alert-${index}`} className={alert.severity === "critical" ? "dangerText" : "warningText"}>
                                      {alert.severity === "critical" ? "🚨" : "⚠️"} {alert.message}
                                    </span>
                                  ))}
                                  {grupo.alerts.length > 2 && <span>+{grupo.alerts.length - 2} alerta(s)</span>}
                                </div>
                              )}

                              {expanded && (
                                <div className="groupUnitsGrid">
                                  {grupo.unidades.map((unidade) => (
                                    <div key={`${grupo.grupoId}-${unidade.id}`} className={`groupUnitCard ${unidade.operacional ? "ok" : "critical"}`}>
                                      <strong>{unidade.nomeFantasia}</strong>
                                      <span>{unidade.papel === "base" ? "Cliente base" : "Unidade"} · {unidade.status || "sem status"}</span>
                                      <small>{unidade.operacional ? "Operacional" : "Inativa / fora de operação"}</small>
                                      {unidade.duplicadoEmOutrosGrupos && <small className="warningText">Também vinculada a outro grupo</small>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="emptyState">Nenhum canal configurado como grupo de unidades.</div>
                    )}
                  </>
                ) : (
                  <div className="emptyState">Atualize os grupos para visualizar a estrutura multi-clínica.</div>
                )}
              </div>

              <form className="form whatsappCanalForm" onSubmit={handleSaveWhatsappCanal}>
                <div className="twoColumns">
                  <label>
                    Cliente base
                    <select
                      value={whatsappCanalForm.cliente_id}
                      onChange={(event) => setWhatsappCanalForm({ ...whatsappCanalForm, cliente_id: event.target.value })}
                      required
                    >
                      <option value="">Selecione</option>
                      {clientes.map((cliente) => (
                        <option key={cliente.id} value={cliente.id}>{cliente.nome_fantasia}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Modo de atendimento
                    <select
                      value={whatsappCanalForm.modo_atendimento}
                      onChange={(event) => setWhatsappCanalForm({
                        ...whatsappCanalForm,
                        modo_atendimento: event.target.value as WhatsappCanalModo,
                      })}
                    >
                      <option value="cliente_direto">Cliente direto — não pergunta unidade</option>
                      <option value="grupo_unidades">Grupo de unidades — mostra só o grupo</option>
                      <option value="unidade_direta">Unidade direta — reservado/futuro</option>
                    </select>
                  </label>
                </div>

                <div className="twoColumns">
                  <label>
                    Nome do canal
                    <input
                      value={whatsappCanalForm.nome}
                      onChange={(event) => setWhatsappCanalForm({ ...whatsappCanalForm, nome: event.target.value })}
                      placeholder="Ex.: Amor e Saúde Osasco"
                      required
                    />
                  </label>

                  <label>
                    phone_number_id da Meta
                    <input
                      value={whatsappCanalForm.identificador}
                      onChange={(event) => setWhatsappCanalForm({ ...whatsappCanalForm, identificador: event.target.value.trim() })}
                      placeholder="Ex.: 123456789012345"
                      required
                    />
                  </label>
                </div>

                <div className="twoColumns">
                  <label>
                    token_ref do Railway (opcional)
                    <input
                      value={whatsappCanalForm.token_ref}
                      onChange={(event) => setWhatsappCanalForm({ ...whatsappCanalForm, token_ref: event.target.value.trim().toUpperCase() })}
                      placeholder="Ex.: WHATSAPP_ACCESS_TOKEN_AMORSAUDE"
                    />
                    <span className="fieldHint">Guarde aqui só o nome da variável. Nunca cole o token real da Meta.</span>
                  </label>

                  <label>
                    Número exibido
                    <input
                      value={whatsappCanalForm.whatsapp_numero}
                      onChange={(event) => setWhatsappCanalForm({ ...whatsappCanalForm, whatsapp_numero: event.target.value })}
                      placeholder="Ex.: 5511999999999"
                    />
                  </label>
                </div>

                <div className="twoColumns">
                  <label>
                    Nome exibido ao paciente
                    <input
                      value={whatsappCanalForm.nome_exibicao}
                      onChange={(event) => setWhatsappCanalForm({ ...whatsappCanalForm, nome_exibicao: event.target.value })}
                      placeholder="Ex.: Amor e Saúde Osasco"
                    />
                  </label>

                  <label>
                    Provider
                    <input
                      value={whatsappCanalForm.provider}
                      onChange={(event) => setWhatsappCanalForm({ ...whatsappCanalForm, provider: event.target.value })}
                      placeholder="meta"
                    />
                  </label>
                </div>

                {whatsappCanalForm.modo_atendimento === "grupo_unidades" && (
                  <div className="checkboxPanel whatsappUnitsSelector">
                    <strong>Clientes/unidades que aparecem neste telefone</strong>
                    <p>Use este campo para o cenário Amor e Saúde com várias unidades no mesmo WhatsApp.</p>
                    <div className="checkboxGrid whatsappUnitsGrid">
                      {clientes.map((cliente) => (
                        <label key={cliente.id} className="inlineCheck">
                          <input
                            type="checkbox"
                            checked={whatsappCanalForm.cliente_ids.map((id) => Number(id)).includes(Number(cliente.id))}
                            onChange={() => toggleWhatsappCanalClienteId(cliente.id)}
                          />
                          {cliente.nome_fantasia}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="toolbar compactToolbar">
                  <label className="inlineCheck">
                    <input
                      type="checkbox"
                      checked={whatsappCanalForm.ativo}
                      onChange={(event) => setWhatsappCanalForm({ ...whatsappCanalForm, ativo: event.target.checked })}
                    />
                    Ativo
                  </label>
                  <label className="inlineCheck">
                    <input
                      type="checkbox"
                      checked={whatsappCanalForm.principal}
                      onChange={(event) => setWhatsappCanalForm({ ...whatsappCanalForm, principal: event.target.checked })}
                    />
                    Principal
                  </label>
                  <button type="submit" disabled={loadingAction === "whatsapp.canal.save"}>
                    {loadingAction === "whatsapp.canal.save" ? "Salvando..." : editingWhatsappCanalId ? "Salvar canal" : "Criar canal"}
                  </button>
                  {editingWhatsappCanalId && (
                    <button type="button" className="secondary" onClick={resetWhatsappCanalForm}>Cancelar edição</button>
                  )}
                </div>
              </form>

              {whatsappCanais.length > 0 ? (
                <div className="tableWrap whatsappCanaisTableWrap">
                <table className="whatsappCanaisTable">
                  <thead>
                    <tr>
                      <th>Canal</th>
                      <th>phone_number_id</th>
                      <th>token_ref</th>
                      <th>Modo</th>
                      <th>Cliente/unidades</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {whatsappCanais.map((canal) => (
                      <tr key={canal.id}>
                        <td>
                          <strong>{canal.nome}</strong>
                          <span className="tableHint">{canal.nome_exibicao || canal.whatsapp_numero || canal.provider}</span>
                        </td>
                        <td>{canal.identificador}</td>
                        <td>{canal.token_ref || "fallback/global"}</td>
                        <td>{canal.modo_atendimento}</td>
                        <td>{getCanalClientesLabel(canal)}</td>
                        <td><Badge active={canal.ativo}>{canal.ativo ? "ativo" : "inativo"}</Badge></td>
                        <td>
                          <button className="tableActionButton" type="button" onClick={() => handleEditWhatsappCanal(canal)}>
                            Editar
                          </button>
                          <button
                            className="tableActionButton"
                            type="button"
                            onClick={() => handleToggleWhatsappCanal(canal)}
                            disabled={loadingAction === `whatsapp.canal.toggle.${canal.id}`}
                          >
                            {canal.ativo ? "Inativar" : "Ativar"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              ) : (
                <div className="emptyState">
                  {whatsappCanaisLoading ? "Carregando canais..." : "Nenhum canal WhatsApp configurado ainda."}
                </div>
              )}
            </section>


          </>
        )}

        {activeTab === "dashboard_gerencial" && (
          <>
            <section className="card managementDashboardCard">
              <div className="sectionHeader dashboardHeaderRow">
                <div>
                  <h3>Dashboard gerencial</h3>
                  <p>Visão comercial por empresa/unidade. Selecione a empresa, monte o dashboard e exporte o mesmo recorte em Excel ou PDF.</p>
                </div>
                <div className="headerActions">
                  <button type="button" onClick={() => loadDashboardGerencial()} disabled={dashboardGerencialLoading}>
                    {dashboardGerencialLoading ? "Atualizando..." : "Atualizar dashboard"}
                  </button>
                  <button type="button" className="secondaryButton" onClick={exportDashboardExcel} disabled={!dashboardGerencial}>Excel</button>
                  <button type="button" className="secondaryButton" onClick={printDashboardPdf} disabled={!dashboardGerencial}>PDF</button>
                </div>
              </div>

              <div className="dashboardFiltersGrid dashboardFiltersGridCompanyOnly">
                <label>
                  Período
                  <select
                    value={dashboardGerencialFilters.days}
                    onChange={(event) => {
                      setDashboardGerencial(null);
                      setDashboardGerencialFilters((current) => ({
                        ...current,
                        days: event.target.value,
                        canalId: "todos",
                        groupId: "todos",
                      }));
                    }}
                  >
                    <option value="1">Hoje</option>
                    <option value="7">Últimos 7 dias</option>
                    <option value="30">Últimos 30 dias</option>
                    <option value="90">Últimos 90 dias</option>
                  </select>
                </label>
                <label>
                  Empresa / cliente / unidade
                  <select
                    value={dashboardGerencialFilters.clienteId}
                    onChange={(event) => {
                      setDashboardGerencial(null);
                      setDashboardGerencialFilters((current) => ({
                        ...current,
                        clienteId: event.target.value,
                        canalId: "todos",
                        groupId: "todos",
                      }));
                    }}
                  >
                    <option value="todos">Todos os permitidos</option>
                    {operationalFilterClientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome_fantasia}</option>)}
                  </select>
                </label>
              </div>

              <div className="dashboardScopeNotice">
                Relatório por empresa: grupo e canal não entram mais como filtro aqui. O recorte do dashboard é sempre pelo cliente_id da empresa/unidade selecionada.
              </div>

              <div className="reportBuilderBox">
                <strong>Montar relatório</strong>
                <span>Marque o que deve aparecer no Excel/PDF.</span>
                <div className="reportSectionToggles">
                  {([
                    ["resumo", "Resumo"],
                    ["evolucao", "Evolução"],
                    ["unidades", "Unidades"],
                    ["especialidades", "Especialidades"],
                    ["convenios", "Convênios"],
                    ["etapas", "Etapas"],
                    ["logs", "Logs"],
                  ] as Array<[DashboardSectionKey, string]>).map(([key, label]) => (
                    <label key={key} className="inlineCheckbox">
                      <input type="checkbox" checked={dashboardReportSections[key]} onChange={() => toggleDashboardReportSection(key)} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {!dashboardGerencial && (
                <div className="emptyStateBox">Clique em Atualizar dashboard para carregar os indicadores gerenciais.</div>
              )}

              {dashboardGerencial && (
                <>
                  <div className="managementKpiGrid">
                    <div className="managementKpi"><span>💬</span><strong>{dashboardGerencial.summary.totalMensagens}</strong><small>Mensagens</small></div>
                    <div className="managementKpi"><span>👤</span><strong>{dashboardGerencial.summary.pacientesUnicos}</strong><small>Pacientes únicos</small></div>
                    <div className="managementKpi"><span>📌</span><strong>{dashboardGerencial.summary.agendamentosIniciados}</strong><small>Agendamentos iniciados</small></div>
                    <div className="managementKpi success"><span>✅</span><strong>{dashboardGerencial.summary.agendamentosConcluidos}</strong><small>Agendamentos concluídos</small></div>
                    <div className="managementKpi warning"><span>↩️</span><strong>{dashboardGerencial.summary.conversasAbandonadas}</strong><small>Abandonadas</small></div>
                    <div className="managementKpi"><span>📈</span><strong>{dashboardGerencial.summary.taxaConversao}%</strong><small>Conversão</small></div>
                  </div>

                  {dashboardReportSections.evolucao && (
                    <div className="dashboardPanel">
                      <h4>Evolução no período</h4>
                      <div className="dayTrendGrid">
                        {dashboardGerencial.breakdowns.byDay.length ? dashboardGerencial.breakdowns.byDay.map((day) => {
                          const max = Math.max(...dashboardGerencial.breakdowns.byDay.map((item) => item.mensagens), 1);
                          return (
                            <div className="dayTrendItem" key={day.date}>
                              <span>{day.label}</span>
                              <div className="miniBar"><i style={{ width: `${Math.max(4, (day.mensagens / max) * 100)}%` }} /></div>
                              <strong>{day.mensagens}</strong>
                              <small>{day.agendamentosConcluidos} concluído(s)</small>
                            </div>
                          );
                        }) : <p>Sem dados no período.</p>}
                      </div>
                    </div>
                  )}

                  <div className="dashboardSplitGrid">
                    {dashboardReportSections.unidades && <TopListPanel title="Unidades / clientes" rows={dashboardGerencial.breakdowns.byCliente} />}
                    {dashboardReportSections.especialidades && <TopListPanel title="Atendimentos por especialidade" rows={dashboardGerencial.breakdowns.byEspecialidade} />}
                    {dashboardReportSections.convenios && <TopListPanel title="Atendimentos por convênio/plano" rows={dashboardGerencial.breakdowns.byConvenioPlano} />}
                    {dashboardReportSections.etapas && <TopListPanel title="Atendimentos por etapa final" rows={dashboardGerencial.breakdowns.byStage} />}
                  </div>

                  {dashboardReportSections.logs && (
                    <div className="dashboardPanel dashboardTableWrap">
                      <h4>Logs recentes no relatório</h4>
                      <table>
                        <thead><tr><th>Data</th><th>Cliente</th><th>Telefone</th><th>Status</th><th>Etapa</th><th>Intenção</th></tr></thead>
                        <tbody>
                          {dashboardGerencial.reportRows.slice(0, 80).map((row, index) => (
                            <tr key={`${row.data}-${index}`}><td>{formatDateTimeShort(row.data)}</td><td>{row.cliente}</td><td>{row.telefone}</td><td>{row.status}</td><td>{row.etapa}</td><td>{row.intencao}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </section>
          </>
        )}


        {activeTab === "followups" && (
          <section className="card followupOperationalPanel">
            <div className="sectionHeader dashboardHeaderRow">
              <div>
                <h3>Follow-ups operacionais</h3>
                <p>Fila de lembretes, confirmações, pedidos de remarcação e cancelamento por cliente.</p>
              </div>
              <div className="headerActions">
                <button type="button" onClick={() => loadFollowupsPanel()} disabled={followupsLoading}>
                  {followupsLoading ? "Atualizando..." : "Atualizar follow-ups"}
                </button>
              </div>
            </div>

            <div className="dashboardFiltersGrid followupFiltersGrid">
              <label>
                Período
                <select value={followupsFilters.days} onChange={(event) => setFollowupsFilters((current) => ({ ...current, days: event.target.value, page: 1 }))}>
                  <option value="1">Hoje</option>
                  <option value="7">Últimos 7 dias</option>
                  <option value="30">Últimos 30 dias</option>
                  <option value="90">Últimos 90 dias</option>
                </select>
              </label>
              <label>
                Cliente
                <select value={followupsFilters.clienteId} onChange={(event) => setFollowupsFilters((current) => ({ ...current, clienteId: event.target.value, page: 1 }))}>
                  <option value="todos">Todos os permitidos</option>
                  {operationalFilterClientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome_fantasia}</option>)}
                </select>
              </label>
              <label>
                Status
                <select value={followupsFilters.status} onChange={(event) => setFollowupsFilters((current) => ({ ...current, status: event.target.value, page: 1 }))}>
                  <option value="todos">Todos</option>
                  <option value="pending">Pendentes</option>
                  <option value="sent">Enviados sem resposta</option>
                  <option value="confirmed">Confirmados</option>
                  <option value="reschedule_requested">Pedidos de remarcação</option>
                  <option value="cancel_requested">Pedidos de cancelamento</option>
                  <option value="failed">Falhas</option>
                  <option value="cancelled">Cancelados</option>
                  <option value="expired">Expirados</option>
                </select>
              </label>
              <label>
                Buscar
                <input
                  value={followupsFilters.q}
                  onChange={(event) => setFollowupsFilters((current) => ({ ...current, q: event.target.value }))}
                  onKeyDown={(event) => { if (event.key === "Enter") setFollowupsFilters((current) => ({ ...current, page: 1 })); }}
                  placeholder="Paciente, telefone, clínica, erro ou payload"
                />
              </label>
              <label>
                Por página
                <select value={followupsFilters.pageSize} onChange={(event) => setFollowupsFilters((current) => ({ ...current, pageSize: Number(event.target.value), page: 1 }))}>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
            </div>

            {!followupsPanel && <div className="emptyStateBox">Clique em Atualizar follow-ups para carregar a fila operacional.</div>}

            {followupsPanel && (
              <>
                <div className="followupSummaryGrid">
                  <div className="followupSummaryCard"><strong>{followupsPanel.summary.total}</strong><span>Total</span></div>
                  <div className="followupSummaryCard warning"><strong>{followupsPanel.summary.pending}</strong><span>Pendentes</span></div>
                  <div className="followupSummaryCard info"><strong>{followupsPanel.summary.semResposta}</strong><span>Sem resposta</span></div>
                  <div className="followupSummaryCard success"><strong>{followupsPanel.summary.confirmed}</strong><span>Confirmados</span></div>
                  <div className="followupSummaryCard warning"><strong>{followupsPanel.summary.rescheduleRequested}</strong><span>Remarcação</span></div>
                  <div className="followupSummaryCard critical"><strong>{followupsPanel.summary.cancelRequested}</strong><span>Cancelamento</span></div>
                  <div className="followupSummaryCard critical"><strong>{followupsPanel.summary.failed}</strong><span>Falhas</span></div>
                </div>

                <div className="followupStatusLine">
                  {(followupsPanel.byStatus || []).map((item) => (
                    <span key={item.status} className={`followupStatusBadge ${followupStatusClass(item.status)}`}>
                      {item.label}: {item.total}
                    </span>
                  ))}
                </div>

                <div className="goLivePaginationBar">
                  <span>Página {followupsPanel.pagination.page} de {followupsPanel.pagination.totalPages} · {followupsPanel.pagination.total} registro(s)</span>
                  <div className="buttonRow compactButtonRow">
                    <button type="button" className="secondary" disabled={followupsPanel.pagination.page <= 1 || followupsLoading} onClick={() => setFollowupsFilters((current) => ({ ...current, page: Math.max(1, current.page - 1) }))}>Anterior</button>
                    <button type="button" className="secondary" disabled={followupsPanel.pagination.page >= followupsPanel.pagination.totalPages || followupsLoading} onClick={() => setFollowupsFilters((current) => ({ ...current, page: Math.min(followupsPanel.pagination.totalPages, current.page + 1) }))}>Próxima</button>
                  </div>
                </div>

                <div className="dashboardTableWrap followupTableWrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Paciente</th>
                        <th>Cliente</th>
                        <th>Telefone</th>
                        <th>Consulta</th>
                        <th>Agendado/envio</th>
                        <th>Resposta</th>
                        <th>Erro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {followupsPanel.items.length ? followupsPanel.items.map((item) => (
                        <tr key={item.id}>
                          <td><span className={`followupStatusBadge ${followupStatusClass(item.status)}`}>{followupStatusLabel(item.status)}</span></td>
                          <td>
                            <strong>{item.pacienteNome || "Paciente sem nome"}</strong>
                            <span className="tableHint">Job #{item.id} · {item.tipo}</span>
                          </td>
                          <td>{item.clienteNome || getClienteNomeById(item.clienteId)}</td>
                          <td>{item.telefone}</td>
                          <td>
                            <strong>{asPayloadText(item.payload, ["especialidade", "especialidadeNome", "especialidade_normalizada"])}</strong>
                            <span className="tableHint">
                              {asPayloadText(item.payload, ["medico", "medicoNome"])} · {asPayloadText(item.payload, ["horario", "slotLabel", "dataHora"])}
                            </span>
                          </td>
                          <td>
                            <span>Agendado: {formatDateTimeShort(item.scheduledAt)}</span>
                            <span className="tableHint">Enviado: {formatDateTimeShort(item.sentAt)} · Tentativas: {item.attempts}/{item.maxAttempts}</span>
                          </td>
                          <td>
                            <span>{formatDateTimeShort(item.respondedAt)}</span>
                            <span className="tableHint">{String(item.metadata?.responseText || item.metadata?.responseAction || "Sem resposta")}</span>
                          </td>
                          <td>{item.lastError ? <span className="dangerText">{item.lastError}</span> : "-"}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={8}>Nenhum follow-up encontrado para os filtros.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}

        {activeTab === "whatsapp_operacao" && isGlobalAdmin && (
          <>
            <section className="card operationDashboardCard">
              <div className="sectionHeader dashboardHeader">
                <div>
                  <h3>Operação WhatsApp</h3>
                  <p>Dashboard de saúde, segurança, testes de canal e logs de atendimento. Esta área substitui o uso diário de PowerShell/Postman.</p>
                </div>
                <div className="buttonRow">
                  <button onClick={() => loadWhatsappDiagnostics()} disabled={whatsappDiagnosticsLoading || whatsappAntiAbuseLoading}>
                    {whatsappDiagnosticsLoading ? "Diagnosticando..." : "Atualizar dashboard"}
                  </button>
                  <button className="secondary" onClick={() => loadWhatsappLogs()} disabled={whatsappLogsLoading}>
                    {whatsappLogsLoading ? "Atualizando..." : "Atualizar logs"}
                  </button>
                </div>
              </div>

              <div className={whatsappBlockedNowCount > 0 ? "opsLiveMonitor alert" : "opsLiveMonitor ok"}>
                <div>
                  <strong>{whatsappBlockedNowCount > 0 ? "Alerta ativo" : "Monitoramento ativo"}</strong>
                  <span>Dashboard atualiza a cada 15s; alertas anti-abuso a cada 5s, sem recarregar a página.</span>
                </div>
                <div className="opsLiveMeta">
                  <span>Dashboard: {formatTimeOnly(whatsappDashboardLastUpdatedAt)}</span>
                  <span>Alertas: {formatTimeOnly(whatsappAlertsLastUpdatedAt)}</span>
                  {whatsappAutoRefreshError && <span className="dangerText">Falha: {whatsappAutoRefreshError}</span>}
                </div>
              </div>

              {whatsappDiagnostics ? (
                <>
                  <div className="opsHeroGrid">
                    <div className={`opsGaugeCard ${whatsappHealthStats.level}`}>
                      <div className="gaugeWrap" style={whatsappGaugeStyle}>
                        <div className="gaugeArc" />
                        <div className="gaugeNeedle" />
                        <div className="gaugeCenter">
                          <strong>{whatsappHealthStats.ok}/{whatsappHealthStats.total || 0}</strong>
                          <span>checks OK</span>
                        </div>
                      </div>
                      <div>
                        <h4>Saúde operacional</h4>
                        <p>{whatsappHealthStats.percent}% saudável</p>
                        <span className={`severityBadge ${whatsappHealthStats.level}`}>
                          {whatsappHealthStats.level === "ok" ? "ESTÁVEL" : whatsappHealthStats.level === "warning" ? "ATENÇÃO" : "CRÍTICO"}
                        </span>
                      </div>
                    </div>

                    <div className="opsKpiGrid">
                      <div className="opsKpiCard ok"><span>🟢</span><strong>{whatsappDiagnostics.summary.canaisAtivos}/{whatsappDiagnostics.summary.canaisTotal}</strong><small>Canais ativos</small></div>
                      <div className={whatsappDiagnostics.summary.failedChecks ? "opsKpiCard warning" : "opsKpiCard ok"}><span>🧪</span><strong>{whatsappDiagnostics.summary.failedChecks}</strong><small>Checks com alerta</small></div>
                      <div className={whatsappBlockedNowCount > 0 ? "opsKpiCard critical pulse" : "opsKpiCard ok"}><span className="opsTextIcon">SEG</span><strong>{whatsappBlockedNowCount}</strong><small>Bloqueios ativos</small></div>
                      <div className="opsKpiCard info"><span className="opsTextIcon">DIAG</span><strong>{formatDateTimeShort(whatsappDiagnostics.generatedAt)}</strong><small>Último diagnóstico</small></div>
                    </div>
                  </div>

                  <div className="opsAlertBoard">
                    {whatsappCriticalChecks.length === 0 && whatsappBlockedNowCount === 0 ? (
                      <div className="opsAlert ok">
                        <strong>✅ Nenhum alerta crítico ativo</strong>
                        <span>Ambiente operacional sem falhas críticas. Canais: {whatsappDiagnostics.summary.canaisAtivos}/{whatsappDiagnostics.summary.canaisTotal} ativos.</span>
                      </div>
                    ) : (
                      <>
                        {whatsappCriticalChecks.map((check) => (
                          <div key={check.key} className="opsAlert critical pulseSoft">
                            <strong>🚨 {check.label}</strong>
                            <span>{check.details !== undefined ? String(check.details) : "Verifique a configuração do ambiente."}</span>
                          </div>
                        ))}
                        {whatsappBlockedNowCount > 0 && (
                          <div className="opsAlert critical pulseSoft">
                            <strong>🚨 Anti-abuso bloqueando contatos agora</strong>
                            <span>{whatsappBlockedNowCount} telefone(s) temporariamente bloqueado(s). Verifique a seção Segurança WhatsApp.</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="diagnosticGrid modernDiagnosticGrid">
                    {whatsappDiagnostics.checks.map((check) => (
                      <div key={check.key} className={check.ok ? "diagnosticCard ok" : "diagnosticCard fail pulseSoft"}>
                        <strong>{check.ok ? "✅" : "⚠️"} {check.label}</strong>
                        {check.details !== undefined && <span>{String(check.details)}</span>}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="emptyState">Clique em Atualizar dashboard para verificar o ambiente.</div>
              )}
            </section>

            <section className="card groupOverviewPanel operationalGroupPanel">
              <div className="groupOverviewHeader">
                <div>
                  <span className="sectionEyebrow">Rede / grupo de unidades</span>
                  <h3>Multi-clínica agrupada</h3>
                  <p>Resumo dos canais que roteiam um único WhatsApp para múltiplas unidades.</p>
                </div>
                <button type="button" className="secondary" onClick={() => loadWhatsappGruposUnidades()} disabled={whatsappGruposLoading}>
                  {whatsappGruposLoading ? "Atualizando..." : "Atualizar grupos"}
                </button>
              </div>
              {whatsappGruposUnidades ? (
                <div className="groupOverviewSummary large">
                  <div><strong>{whatsappGruposUnidades.summary.totalGrupos}</strong><span>Grupos</span></div>
                  <div><strong>{whatsappGruposUnidades.summary.unidadesOperacionais}/{whatsappGruposUnidades.summary.totalUnidades}</strong><span>Unidades operacionais</span></div>
                  <div><strong>{whatsappGruposUnidades.summary.gruposCriticos}</strong><span>Grupos críticos</span></div>
                  <div><strong>{whatsappGruposUnidades.summary.gruposAtencao}</strong><span>Com atenção</span></div>
                </div>
              ) : (
                <div className="emptyState">Sem resumo de grupos carregado.</div>
              )}
            </section>

            <section className="card goLiveChecklistCard">
              <div className="sectionHeader">
                <div>
                  <h3>Checklist Go-Live por cliente</h3>
                  <p>Validação operacional para liberar um cliente/canal para WhatsApp real. Corrija itens críticos antes de produção.</p>
                </div>
                <button className="secondary" onClick={() => loadWhatsappGoLiveChecklist()} disabled={whatsappGoLiveLoading}>
                  {whatsappGoLiveLoading ? "Validando..." : "Atualizar checklist"}
                </button>
              </div>

              {whatsappGoLiveChecklist ? (
                <>
                  <div className="goLiveSummaryGrid">
                    <div className="goLiveSummaryCard success"><strong>{whatsappGoLiveChecklist.summary.pronto}</strong><span>Prontos</span></div>
                    <div className="goLiveSummaryCard warning"><strong>{whatsappGoLiveChecklist.summary.atencao}</strong><span>Com avisos</span></div>
                    <div className="goLiveSummaryCard critical"><strong>{whatsappGoLiveChecklist.summary.critico}</strong><span>Críticos</span></div>
                    <div className="goLiveSummaryCard info"><strong>{whatsappGoLiveChecklist.summary.total}</strong><span>Total canais</span></div>
                  </div>

                  <div className="goLiveFiltersPanel">
                    <div className="goLiveFilterTopline">
                      <strong>Filtrar checklist</strong>
                      <span>
                        Exibindo {goLiveFilteredSummary.total} de {whatsappGoLiveChecklist.summary.total} canais ·
                        {" "}{goLiveFilteredSummary.critico} crítico(s), {goLiveFilteredSummary.atencao} aviso(s), {goLiveFilteredSummary.pronto} pronto(s)
                      </span>
                    </div>
                    <div className="goLiveFiltersGrid">
                      <label>
                        Buscar
                        <input
                          value={goLiveFilters.search}
                          onChange={(event) => setGoLiveFilters({ ...goLiveFilters, search: event.target.value })}
                          placeholder="Cliente, canal, phone_number_id ou token_ref"
                        />
                      </label>
                      <label>
                        Status
                        <select value={goLiveFilters.status} onChange={(event) => setGoLiveFilters({ ...goLiveFilters, status: event.target.value })}>
                          <option value="todos">Todos</option>
                          <option value="critico">Críticos</option>
                          <option value="atencao">Com avisos</option>
                          <option value="pronto">Prontos</option>
                        </select>
                      </label>
                      <label>
                        Modo
                        <select value={goLiveFilters.modo} onChange={(event) => setGoLiveFilters({ ...goLiveFilters, modo: event.target.value })}>
                          <option value="todos">Todos</option>
                          <option value="cliente_direto">Cliente direto</option>
                          <option value="grupo_unidades">Grupo de unidades</option>
                        </select>
                      </label>
                      <label>
                        Canal
                        <select value={goLiveFilters.canalStatus} onChange={(event) => setGoLiveFilters({ ...goLiveFilters, canalStatus: event.target.value })}>
                          <option value="todos">Todos</option>
                          <option value="ativos">Ativos</option>
                          <option value="inativos">Inativos</option>
                        </select>
                      </label>
                      <label>
                        Token
                        <select value={goLiveFilters.token} onChange={(event) => setGoLiveFilters({ ...goLiveFilters, token: event.target.value })}>
                          <option value="todos">Todos</option>
                          <option value="global">Fallback/global</option>
                          <option value="proprio">Token próprio</option>
                          <option value="problema">Token com problema</option>
                        </select>
                      </label>
                      <label>
                        Por página
                        <select value={goLivePageSize} onChange={(event) => setGoLivePageSize(Number(event.target.value))}>
                          <option value={10}>10</option>
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                        </select>
                      </label>
                    </div>
                    <div className="goLiveFilterActions">
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setGoLiveFilters({ search: "", status: "todos", modo: "todos", canalStatus: "todos", token: "todos" })}
                      >
                        Limpar filtros
                      </button>
                    </div>
                  </div>

                  <div className="goLivePaginationBar">
                    <span>Página {goLiveSafePage} de {goLivePageCount}</span>
                    <div className="buttonRow compactButtonRow">
                      <button type="button" className="secondary" disabled={goLiveSafePage <= 1} onClick={() => setGoLivePage((page) => Math.max(1, page - 1))}>Anterior</button>
                      <button type="button" className="secondary" disabled={goLiveSafePage >= goLivePageCount} onClick={() => setGoLivePage((page) => Math.min(goLivePageCount, page + 1))}>Próxima</button>
                    </div>
                  </div>

                  <div className="goLiveChecklistList compactGoLiveList">
                    {goLiveCurrentPageItems.length ? goLiveCurrentPageItems.map((item) => {
                      const expanded = Boolean(goLiveExpanded[item.canalId]);
                      const problematicChecks = item.checks.filter((check) => !check.ok);
                      return (
                        <article key={item.canalId} className={`goLiveItem compact ${item.status}`}>
                          <button
                            type="button"
                            className="goLiveItemHeader compactHeader"
                            onClick={() => setGoLiveExpanded((current) => ({ ...current, [item.canalId]: !current[item.canalId] }))}
                            aria-expanded={expanded}
                          >
                            <span className="conversationChevron">{expanded ? "▾" : "▸"}</span>
                            <div>
                              <span className={`severityBadge ${item.status === "pronto" ? "success" : item.status === "atencao" ? "warning" : "critical"}`}>
                                {item.status === "pronto" ? "PRONTO" : item.status === "atencao" ? "ATENÇÃO" : "CRÍTICO"}
                              </span>
                              <h4>{item.clienteNome}</h4>
                              <p>{item.canalNome} · {item.phoneNumberId || "sem phone_number_id"} · {item.modoAtendimento} · {item.ativo ? "canal ativo" : "canal inativo"}</p>
                            </div>
                            <div className="goLiveCompactMeta">
                              <strong>{item.okCount}/{item.totalChecks}</strong>
                              <span>checks OK</span>
                              {problematicChecks.length > 0 ? <small>{problematicChecks.length} pendência(s)</small> : <small>sem pendências</small>}
                            </div>
                          </button>

                          {problematicChecks.length > 0 && !expanded && (
                            <div className="goLiveCompactProblems">
                              {problematicChecks.slice(0, 3).map((check) => (
                                <span key={`${item.canalId}-compact-${check.key}`} className={check.severity === "critical" ? "dangerText" : "warningText"}>
                                  {check.severity === "critical" ? "🚨" : "⚠️"} {check.label}
                                </span>
                              ))}
                              {problematicChecks.length > 3 && <span>+{problematicChecks.length - 3} pendência(s)</span>}
                            </div>
                          )}

                          {expanded && (
                            <div className="goLiveExpandedBody">
                              <p className="goLiveRecommendation">{item.recommendation}</p>
                              <div className="goLiveChecksGrid">
                                {item.checks.map((check) => (
                                  <div key={`${item.canalId}-${check.key}`} className={`goLiveCheck ${check.ok ? "ok" : check.severity}`}>
                                    <strong>{check.ok ? "✅" : check.severity === "critical" ? "🚨" : "⚠️"} {check.label}</strong>
                                    {check.details && <span>{check.details}</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </article>
                      );
                    }) : (
                      <div className="emptyState">Nenhum canal encontrado com os filtros atuais.</div>
                    )}
                  </div>

                  <div className="goLivePaginationBar bottom">
                    <span>{goLiveSortedItems.length} resultado(s) filtrado(s)</span>
                    <div className="buttonRow compactButtonRow">
                      <button type="button" className="secondary" disabled={goLiveSafePage <= 1} onClick={() => setGoLivePage((page) => Math.max(1, page - 1))}>Anterior</button>
                      <button type="button" className="secondary" disabled={goLiveSafePage >= goLivePageCount} onClick={() => setGoLivePage((page) => Math.min(goLivePageCount, page + 1))}>Próxima</button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="emptyState">Clique em Atualizar checklist para validar clientes/canais antes do go-live.</div>
              )}
            </section>

            <section className="card securityDashboardCard">
              <div className="sectionHeader">
                <div>
                  <h3>Segurança WhatsApp / Anti-abuso</h3>
                  <p>Monitoramento de rate limit por canal + telefone, tentativas repetidas e bloqueios temporários.</p>
                </div>
                <button className="secondary" onClick={() => loadWhatsappAntiAbuseStatus()} disabled={whatsappAntiAbuseLoading}>
                  {whatsappAntiAbuseLoading ? "Atualizando..." : "Atualizar alertas"}
                </button>
              </div>

              {whatsappAntiAbuseStatus ? (
                <>
                  <div className="antiAbuseSummary">
                    <div className="antiAbuseMetric"><strong>{whatsappAntiAbuseStatus.config.enabled ? "Ativo" : "Desligado"}</strong><span>Status</span></div>
                    <div className="antiAbuseMetric"><strong>{whatsappAntiAbuseStatus.config.maxMessages}</strong><span>msg/{whatsappAntiAbuseStatus.config.windowSeconds}s</span></div>
                    <div className="antiAbuseMetric"><strong>{whatsappAntiAbuseStatus.config.maxBookingAttemptsPerDay}</strong><span>tentativas/dia</span></div>
                    <div className={whatsappBlockedNowCount > 0 ? "antiAbuseMetric critical pulse" : "antiAbuseMetric"}><strong>{whatsappBlockedNowCount}</strong><span>bloqueados agora</span></div>
                  </div>

                  <form className="manualBlockPanel" onSubmit={handleCreateWhatsappManualBlock}>
                    <div>
                      <h4>Bloqueio manual no Angel</h4>
                      <p>Bloqueia atendimento automático por canal + telefone sem chamar a Meta. Use para spam recorrente, reserva fake ou abuso operacional.</p>
                    </div>
                    <div className="manualBlockGrid">
                      <label>Canal
                        <select value={whatsappManualBlockForm.phoneNumberId} onChange={(event) => setWhatsappManualBlockForm((current) => ({ ...current, phoneNumberId: event.target.value }))}>
                          <option value="">Selecione...</option>
                          {whatsappCanais.filter((canal) => canal.ativo).map((canal) => (
                            <option key={canal.id} value={canal.identificador}>{canal.nome} — {canal.identificador}</option>
                          ))}
                        </select>
                      </label>
                      <label>Telefone
                        <input value={whatsappManualBlockForm.from} onChange={(event) => setWhatsappManualBlockForm((current) => ({ ...current, from: event.target.value }))} placeholder="5511999999999" />
                      </label>
                      <label>Duração
                        <select value={whatsappManualBlockForm.durationSeconds} onChange={(event) => setWhatsappManualBlockForm((current) => ({ ...current, durationSeconds: event.target.value }))}>
                          <option value="3600">1 hora</option>
                          <option value="86400">24 horas</option>
                          <option value="604800">7 dias</option>
                          <option value="permanent">Permanente</option>
                        </select>
                      </label>
                      <label>Motivo
                        <select value={whatsappManualBlockForm.reason} onChange={(event) => setWhatsappManualBlockForm((current) => ({ ...current, reason: event.target.value }))}>
                          <option value="manual_block">Bloqueio manual</option>
                          <option value="spam">Spam</option>
                          <option value="fake_booking">Agendamento/reserva fake</option>
                          <option value="abuse">Abuso operacional</option>
                        </select>
                      </label>
                    </div>
                    <label>Observação
                      <input value={whatsappManualBlockForm.note} onChange={(event) => setWhatsappManualBlockForm((current) => ({ ...current, note: event.target.value }))} placeholder="Opcional: contexto do bloqueio" />
                    </label>
                    <div className="manualBlockActions">
                      <button type="submit" className="dangerButton" disabled={whatsappManualBlockLoading}>{whatsappManualBlockLoading ? "Processando..." : "Bloquear no Angel"}</button>
                    </div>
                  </form>

                  {whatsappActiveBlocks.length > 0 ? (
                    <div className="activeBlockPanel">
                      <div className="activeBlockHeader">
                        <div>
                          <h4>🚨 Bloqueios ativos agora</h4>
                          <p>Uma linha por telefone/canal bloqueado. O cronômetro usa o horário de expiração recebido do backend.</p>
                        </div>
                        <span className="severityBadge critical">{whatsappActiveBlocks.length} ativo(s)</span>
                      </div>
                      <table className="opsTable activeBlocksTable">
                        <thead>
                          <tr>
                            <th>Telefone</th><th>Canal</th><th>Motivo atual</th><th>Score</th><th>Desbloqueia em</th><th>Expira</th><th>Status</th><th>Ação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {whatsappActiveBlocks.map((event, index) => (
                            <tr key={event.id || `${event.phoneNumberId}-${event.from}-${index}`} className="criticalRow">
                              <td>{event.from}</td>
                              <td>{event.phoneNumberId}</td>
                              <td>{reasonLabel(event.reason)}<span className="tableHint">{event.messagePreview || ""}</span></td>
                              <td>{event.riskScore ?? "-"}</td>
                              <td><span className="countdownBadge">Expira em {formatCountdownUntil(event.blockedUntil, (event as any).ttlSeconds)}</span></td>
                              <td>{formatDateTimeShort(event.blockedUntil)}</td>
                              <td><span className="severityBadge critical">{event.manual ? "MANUAL" : "BLOQUEADO"}</span></td>
                              <td><button type="button" className="miniActionButton" onClick={() => handleReleaseWhatsappManualBlock(event.phoneNumberId, event.from)} disabled={whatsappManualBlockLoading}>Liberar</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="emptyState">Nenhum telefone bloqueado agora.</div>
                  )}

                  {whatsappRecentAntiAbuseHistory.length > 0 && (
                    <div className="antiAbuseHistoryPanel">
                      <h4>Histórico anti-abuso recente</h4>
                      <table className="opsTable">
                        <thead>
                          <tr>
                            <th>Quando</th><th>Telefone</th><th>Canal</th><th>Evento</th><th>Score</th><th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {whatsappRecentAntiAbuseHistory.map((event, index) => (
                            <tr key={event.id || `${event.from}-history-${index}`} className={event.severity === "critical" ? "criticalRow" : ""}>
                              <td>{formatDateTimeShort(event.createdAt)}</td>
                              <td>{event.from}</td>
                              <td>{event.phoneNumberId}</td>
                              <td>{reasonLabel(event.reason)}<span className="tableHint">{event.messagePreview || ""}</span></td>
                              <td>{event.riskScore ?? "-"}</td>
                              <td>
                                <span className={event.severity === "critical" ? "severityBadge critical" : "severityBadge warning"}>{event.severity === "critical" ? "ALERTA" : "EVENTO"}</span>
                                <button type="button" className="miniActionButton inline" onClick={() => fillManualBlockFromEvent(event.phoneNumberId, event.from)}>Usar no bloqueio</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : (
                <div className="emptyState">Clique em Atualizar alertas para consultar bloqueios anti-abuso.</div>
              )}
            </section>

            <section className="card">
              <div className="sectionHeader">
                <div>
                  <h3>Testar canal WhatsApp</h3>
                  <p>Simula uma mensagem entrando por um canal cadastrado e mostra o roteamento, sessão, token_ref e resposta gerada.</p>
                </div>
              </div>

              <form className="form" onSubmit={handleRunWhatsappChannelTest}>
                <div className="threeColumns">
                  <label>
                    Canal
                    <select value={whatsappTestForm.canalId} onChange={(event) => setWhatsappTestForm({ ...whatsappTestForm, canalId: event.target.value })} required>
                      <option value="">Selecione</option>
                      {whatsappCanais.map((canal) => (
                        <option key={canal.id} value={canal.id}>{canal.nome} — {canal.identificador}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Telefone simulado
                    <input value={whatsappTestForm.from} onChange={(event) => setWhatsappTestForm({ ...whatsappTestForm, from: event.target.value })} placeholder="5511999999999" />
                  </label>
                  <label>
                    Mensagem
                    <input value={whatsappTestForm.text} onChange={(event) => setWhatsappTestForm({ ...whatsappTestForm, text: event.target.value })} placeholder="oi" />
                  </label>
                </div>
                <button type="submit" disabled={whatsappTestLoading}>{whatsappTestLoading ? "Testando..." : "Testar canal"}</button>
              </form>

              {whatsappTestView && (
                <div className="channelTestDashboard">
                  <div className="channelTestHeader">
                    <div>
                      <span className={whatsappTestView.antiAbuseBlocked ? "severityBadge critical pulse" : "severityBadge success"}>
                        {whatsappTestView.antiAbuseBlocked ? "BLOQUEADO" : "ROTEAMENTO OK"}
                      </span>
                      <h4>Resultado do teste do canal</h4>
                      <p>Simulação executada sem usar a Meta. Use este painel para validar roteamento, sessão, token e resposta do Angel.</p>
                    </div>
                    <div className="channelTestScore">
                      <strong>{whatsappTestView.ok ? "OK" : "ERRO"}</strong>
                      <span>Status do teste</span>
                    </div>
                  </div>

                  <div className="channelTestGrid">
                    <div className="channelTestCard">
                      <span className="channelTestIcon">📡</span>
                      <small>Canal</small>
                      <strong>{whatsappTestView.selectedCanal?.nome || "Canal resolvido"}</strong>
                      <span>{whatsappTestView.phoneNumberId}</span>
                    </div>
                    <div className="channelTestCard">
                      <span className="channelTestIcon">🏢</span>
                      <small>Cliente</small>
                      <strong>{whatsappTestView.clienteNome}</strong>
                      <span>{whatsappTestView.modo}</span>
                    </div>
                    <div className="channelTestCard">
                      <span className="channelTestIcon">🔐</span>
                      <small>Token</small>
                      <strong className={whatsappTestView.tokenOk ? "okText" : "dangerText"}>{whatsappTestView.tokenLabel}</strong>
                      <span>{whatsappTestView.tokenStatus}</span>
                    </div>
                    <div className="channelTestCard">
                      <span className="channelTestIcon">🧠</span>
                      <small>Fluxo</small>
                      <strong>{whatsappTestView.stage}</strong>
                      <span>{whatsappTestView.intent}</span>
                    </div>
                  </div>

                  <div className="channelTestDetails">
                    <div className="channelTestPanel">
                      <h5>Roteamento e sessão</h5>
                      <dl>
                        <div><dt>SessionId</dt><dd>{whatsappTestView.sessionId}</dd></div>
                        <div><dt>Telefone simulado</dt><dd>{whatsappTestView.from}</dd></div>
                        <div><dt>Mensagem enviada</dt><dd>{whatsappTestView.text}</dd></div>
                        <div><dt>Origem da intenção</dt><dd>{whatsappTestView.source}</dd></div>
                        <div><dt>Confiança</dt><dd>{whatsappTestView.confidence}</dd></div>
                        <div><dt>Campos faltantes</dt><dd>{whatsappTestView.missingFields.length ? whatsappTestView.missingFields.join(", ") : "Nenhum"}</dd></div>
                      </dl>
                    </div>

                    <div className="channelTestPanel answer">
                      <h5>Resposta que o Angel enviaria</h5>
                      <pre>{whatsappTestView.assistantText}</pre>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="card">
              <div className="sectionHeader">
                <div>
                  <h3>Logs WhatsApp</h3>
                  <p>Auditoria das mensagens, etapas do fluxo, respostas enviadas e erros. A consulta é global; use filtros para investigar.</p>
                </div>
                <button onClick={() => loadWhatsappLogs()} disabled={whatsappLogsLoading}>
                  {whatsappLogsLoading ? "Atualizando..." : "Atualizar logs"}
                </button>
              </div>

              <div className="toolbar">
                <input value={whatsappLogFilters.phone} onChange={(event) => { setWhatsappLogFilters({ ...whatsappLogFilters, phone: event.target.value }); setWhatsappLogGroupsPage(1); }} placeholder="Buscar por telefone" />
                <select value={whatsappLogFilters.status} onChange={(event) => { setWhatsappLogFilters({ ...whatsappLogFilters, status: event.target.value }); setWhatsappLogGroupsPage(1); }}>
                  <option value="todos">Todos os status</option>
                  <option value="received">received</option><option value="queued">queued</option><option value="processing">processing</option><option value="processed">processed</option><option value="sent">sent</option><option value="failed">failed</option><option value="duplicate">duplicate</option><option value="ignored">ignored</option>
                </select>
                <label className="inlineCheckbox"><input type="checkbox" checked={whatsappLogFilters.onlyErrors} onChange={(event) => setWhatsappLogFilters({ ...whatsappLogFilters, onlyErrors: event.target.checked })} /> Só erros</label>
                <button type="button" className="secondary" onClick={() => loadWhatsappLogs()}>Filtrar</button>
              </div>

              {whatsappLogs.length ? (
                <>
                <PaginationBar
                  page={whatsappLogGroupsPageSafe}
                  pageCount={totalWhatsappLogGroupPages}
                  total={whatsappLogGroups.length}
                  label="Conversas/logs"
                  onPrev={() => setWhatsappLogGroupsPage((page) => Math.max(1, page - 1))}
                  onNext={() => setWhatsappLogGroupsPage((page) => Math.min(totalWhatsappLogGroupPages, page + 1))}
                />
                <div className="conversationLogList">
                  {whatsappLogGroupsPaginados.map((group) => {
                    const expanded = Boolean(expandedWhatsappLogGroups[group.key]);
                    const hasErrors = group.errorCount > 0;
                    const latestInbound = group.latest.inbound_text || "";
                    const latestOutbound = group.latest.outbound_text || "";
                    const previewText = latestInbound || latestOutbound || group.latest.error_message || "Sem texto registrado";
                    const orderedLogs = [...group.logs].sort((a, b) => {
                      const aTime = new Date(a.created_at).getTime();
                      const bTime = new Date(b.created_at).getTime();
                      return (Number.isNaN(aTime) ? 0 : aTime) - (Number.isNaN(bTime) ? 0 : bTime);
                    });

                    return (
                      <article key={group.key} className={hasErrors ? "conversationGroup criticalConversation" : "conversationGroup"}>
                        <button
                          type="button"
                          className="conversationGroupHeader"
                          onClick={() => setExpandedWhatsappLogGroups((current) => ({ ...current, [group.key]: !current[group.key] }))}
                          aria-expanded={expanded}
                        >
                          <span className="conversationChevron">{expanded ? "▾" : "▸"}</span>
                          <span className="conversationAvatar">{hasErrors ? "⚠️" : "💬"}</span>
                          <span className="conversationMain">
                            <strong>{group.phone}</strong>
                            <span>{group.cliente} · canal {group.canal}</span>
                          </span>
                          <span className="conversationMeta">
                            <strong>{group.count} evento(s)</strong>
                            <span>{formatDateTimeShort(group.latest.created_at)}</span>
                          </span>
                          <span className={hasErrors ? "conversationStatus danger" : "conversationStatus ok"}>
                            {hasErrors ? `${group.errorCount} alerta(s)` : (group.statuses[0] || "ok")}
                          </span>
                        </button>

                        <div className="conversationPreview">
                          <span className="conversationPreviewLabel">Último registro</span>
                          <span>{previewText}</span>
                        </div>

                        {expanded && (
                          <div className="conversationTimeline">
                            {orderedLogs.map((log) => {
                              const inbound = log.inbound_text;
                              const outbound = log.outbound_text;
                              const isSystem = Boolean(log.error_message) || log.status === "ignored" || log.status === "failed";
                              const displayPhone = log.from_number || log.from_phone || log.to_phone || group.phone;
                              return (
                                <div key={`${group.key}-${log.id}`} className={isSystem ? "timelineEvent systemEvent" : "timelineEvent"}>
                                  <div className="timelineMarker">{isSystem ? "🛡️" : inbound ? "👤" : "🤖"}</div>
                                  <div className="timelineContent">
                                    <div className="timelineTopline">
                                      <strong>{isSystem ? "Sistema" : inbound ? "Paciente" : "Angel"}</strong>
                                      <span>{formatDateTimeShort(log.created_at)}</span>
                                      <Badge active={!log.error_message}>{log.status || "-"}</Badge>
                                    </div>
                                    <div className="timelineDetails">
                                      <span>{displayPhone}</span>
                                      {log.intent ? <span>Intenção: {log.intent}</span> : null}
                                      {log.stage ? <span>Etapa: {log.stage}</span> : null}
                                    </div>
                                    {inbound ? (
                                      <div className="chatBubble patientBubble">
                                        <span>Paciente</span>
                                        <p>{inbound}</p>
                                      </div>
                                    ) : null}
                                    {outbound ? (
                                      <div className="chatBubble botBubble">
                                        <span>Angel</span>
                                        <p>{outbound}</p>
                                      </div>
                                    ) : null}
                                    {log.error_message ? (
                                      <div className="chatBubble systemBubble">
                                        <span>Evento do sistema</span>
                                        <p>{log.error_message}</p>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
                </>
              ) : (
                <div className="emptyState">{whatsappLogsLoading ? "Carregando logs..." : "Nenhum log encontrado."}</div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);



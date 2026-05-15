import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const ADMIN_TOKEN_STORAGE_KEY = "agendai_admin_token";
const ADMIN_USER_STORAGE_KEY = "agendai_admin_user";
const PRODUTOS_PAGE_SIZE = 25;
const ACEITES_PAGE_SIZE = 25;
const WHATSAPP_LOGS_PAGE_SIZE = 50;
const ADMIN_AUDIT_PAGE_SIZE = 80;
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

type Medico = {
  id: number;
  cliente_id: number;
  nome: string;
  registro_profissional?: string | null;
  dias?: string | null;
  andar?: string | null;
  ativo: boolean;
  especialidades: string;
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
  from_phone?: string | null;
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
}

function clearStoredAuth() {
  window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(ADMIN_USER_STORAGE_KEY);
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
    clearStoredAuth();
    throw new Error("Sessão expirada. Faça login novamente.");
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
        body: JSON.stringify({ email, password }),
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
        body: JSON.stringify({ email, password, mfaCode: code }),
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

        {!mfaSetup && !mfaChallengeActive && (
          <form onSubmit={submitCredentials} className="formCard">
            <label>
              Email
              <input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" />
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
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteFiltro, setClienteFiltro] = useState<"todos" | "ativos" | "inativos">("todos");
  const [selectedClienteId, setSelectedClienteId] = useState<number | null>(null);
  const [formas, setFormas] = useState<FormaAtendimento[]>([]);
  const [formasSearch, setFormasSearch] = useState("");
  const [selectedForma, setSelectedForma] = useState<FormaAtendimento | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtoSearch, setProdutoSearch] = useState("");
  const [produtoPage, setProdutoPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [activeTab, setActiveTab] = useState<"clientes" | "medicos" | "whatsapp" | "usuarios" | "auditoria">("clientes");
  const [authUser, setAuthUser] = useState<AdminUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [usuarios, setUsuarios] = useState<AdminUsuario[]>([]);
  const [usuarioStatusFiltro, setUsuarioStatusFiltro] = useState<"ativos" | "inativos" | "todos">("ativos");
  const [editingUsuarioId, setEditingUsuarioId] = useState<number | null>(null);
  const [usuarioForm, setUsuarioForm] = useState({
    nome: "",
    email: "",
    perfil: "clinica" as "global" | "clinica",
    senha_provisoria: "Admin@2026!",
    ativo: true,
    cliente_ids: [] as number[],
  });
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [especialidadesCatalogo, setEspecialidadesCatalogo] = useState<EspecialidadeCatalogo[]>([]);
  const [medicoSearch, setMedicoSearch] = useState("");
  const [medicoStatusFiltro, setMedicoStatusFiltro] = useState<"ativos" | "inativos" | "todos">("ativos");
  const [selectedMedicoId, setSelectedMedicoId] = useState<number | null>(null);
  const [aceites, setAceites] = useState<AceiteMedico[]>([]);
  const [aceiteSearch, setAceiteSearch] = useState("");
  const [aceiteFiltro, setAceiteFiltro] = useState<"ativos" | "inativos" | "todos">("ativos");
  const [aceitePage, setAceitePage] = useState(1);
  const [clienteConfig, setClienteConfig] = useState<ClienteConfiguracao | null>(null);
  const [clienteCadastro, setClienteCadastro] = useState<ClienteCadastroDraft | null>(null);
  const [whatsappLogs, setWhatsappLogs] = useState<WhatsappMessageLog[]>([]);
  const [whatsappLogFilters, setWhatsappLogFilters] = useState({
    phone: "",
    status: "todos",
    startDate: "",
    endDate: "",
    onlyErrors: false,
  });
  const [whatsappLogsLoading, setWhatsappLogsLoading] = useState(false);
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
    dias: "",
    andar: "",
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

  const clientesFiltrados = useMemo(() => {
    return clientes.filter((cliente) => {
      const clienteAtivo = cliente.status === "ativo" && cliente.ativo !== false;
      if (clienteFiltro === "ativos") return clienteAtivo;
      if (clienteFiltro === "inativos") return !clienteAtivo;
      return true;
    });
  }, [clientes, clienteFiltro]);


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
        cliente_id: clienteId,
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
      senha_provisoria: "Admin@2026!",
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
    const payload: Record<string, unknown> = {
      nome: usuarioForm.nome,
      perfil: usuarioForm.perfil,
      ativo: usuarioForm.ativo,
      cliente_ids: usuarioForm.perfil === "clinica" ? usuarioForm.cliente_ids : [],
    };

    if (!isEditing) {
      payload.email = usuarioForm.email;
      payload.senha_provisoria = usuarioForm.senha_provisoria;
    } else if (usuarioForm.senha_provisoria.trim()) {
      payload.senha_provisoria = usuarioForm.senha_provisoria.trim();
    }

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
        showToast("✅ Usuário criado");
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
      loadWhatsappLogs().catch((error) => showToast(error.message, true));
    }
  }, [activeTab, selectedClienteId]);

  useEffect(() => {
    if (activeTab === "auditoria" && isGlobalAdmin) {
      loadAdminAuditLogs().catch((error) => showToast(error.message, true));
    }
  }, [activeTab, isGlobalAdmin]);

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
    setMedicoForm({
      nome: medico.nome || "",
      registro_profissional: medico.registro_profissional || "",
      especialidade: medico.especialidades || "",
      dias: medico.dias || "",
      andar: medico.andar || "",
    });
  }

  function limparFormularioMedico() {
    setEditingMedicoId(null);
    setMedicoForm(emptyMedicoForm);
  }

  async function salvarMedico(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedClienteId) return;

    setToast("");
    setLoadingAction("medico");

    const especialidadeSelecionada = resolveEspecialidadeDigitada(medicoForm.especialidade);

    if (!especialidadeSelecionada) {
      showToast("❌ Selecione uma especialidade válida da lista", true);
      setLoadingAction(null);
      return;
    }

    const payload = {
      nome: medicoForm.nome.trim(),
      registro_profissional: medicoForm.registro_profissional.trim(),
      especialidade: especialidadeSelecionada.nome,
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
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div>
          <h1>AgendAI</h1>
          <p>{authUser.perfil === "global" ? "Admin Global" : "Admin Clínica"}</p>
          <small>{authUser.email}</small>
        </div>

        <nav>
          <button
            className={activeTab === "clientes" ? "navActive" : ""}
            onClick={() => setActiveTab("clientes")}
          >
            Clientes
          </button>
          <button
            className={activeTab === "medicos" ? "navActive" : ""}
            onClick={() => setActiveTab("medicos")}
          >
            Médicos e aceites
          </button>
          <button disabled>Unidades</button>
          {isGlobalAdmin && (
            <button
              className={activeTab === "whatsapp" ? "navActive" : ""}
              onClick={() => setActiveTab("whatsapp")}
            >
              WhatsApp
            </button>
          )}
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
          <button disabled>Módulos</button>
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
            <button className="secondary" onClick={logout}>Sair</button>
          </div>
        </header>

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
                onClick={() => setClienteFiltro("todos")}
              >
                Todos
              </button>

              <button
                type="button"
                className={clienteFiltro === "ativos" ? "active" : ""}
                onClick={() => setClienteFiltro("ativos")}
              >
                Ativos
              </button>

              <button
                type="button"
                className={clienteFiltro === "inativos" ? "active" : ""}
                onClick={() => setClienteFiltro("inativos")}
              >
                Inativos
              </button>

              <span>{clientesFiltrados.length} clientes</span>
            </div>

            <div className="list">
              {clientesFiltrados.map((cliente) => {
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
                <p>{selectedCliente.nome_fantasia}</p>
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
                onChange={(event) => setFormasSearch(event.target.value)}
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
                {formasFiltradas.map((forma) => (
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
                    placeholder="usuario@clinica.com.br"
                    value={usuarioForm.email}
                    disabled={Boolean(editingUsuarioId)}
                    onChange={(event) => setUsuarioForm((current) => ({ ...current, email: event.target.value }))}
                  />
                  {editingUsuarioId && <span className="fieldHint">O e-mail identifica o usuário e não é alterado por esta tela.</span>}
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

                <label>
                  Senha provisória
                  <input
                    placeholder={editingUsuarioId ? "Deixe em branco para manter a senha atual" : "Senha provisória"}
                    value={usuarioForm.senha_provisoria}
                    onChange={(event) => setUsuarioForm((current) => ({ ...current, senha_provisoria: event.target.value }))}
                  />
                  {editingUsuarioId && <span className="fieldHint">Preencha somente se também quiser resetar a senha.</span>}
                </label>

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
                          : "Criar usuário"}
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

        {activeTab === "whatsapp" && isGlobalAdmin && (
          <section className="card">
            <div className="sectionHeader">
              <div>
                <h3>Atendimentos WhatsApp</h3>
                <p>
                  Auditoria das mensagens, etapas do fluxo, respostas enviadas e erros.
                  A consulta é global; use o telefone, status ou período para filtrar.
                </p>
              </div>
              <button onClick={() => loadWhatsappLogs()} disabled={whatsappLogsLoading}>
                {whatsappLogsLoading ? "Atualizando..." : "Atualizar logs"}
              </button>
            </div>

            <div className="toolbar">
              <input
                value={whatsappLogFilters.phone}
                onChange={(event) => setWhatsappLogFilters({ ...whatsappLogFilters, phone: event.target.value })}
                placeholder="Buscar por telefone. Ex.: 5511999999999"
              />
              <select
                value={whatsappLogFilters.status}
                onChange={(event) => setWhatsappLogFilters({ ...whatsappLogFilters, status: event.target.value })}
              >
                <option value="todos">Todos os status</option>
                <option value="received">received</option>
                <option value="queued">queued</option>
                <option value="processing">processing</option>
                <option value="processed">processed</option>
                <option value="sent">sent</option>
                <option value="failed">failed</option>
                <option value="duplicate">duplicate</option>
                <option value="ignored">ignored</option>
              </select>
              <input
                type="date"
                value={whatsappLogFilters.startDate}
                onChange={(event) => setWhatsappLogFilters({ ...whatsappLogFilters, startDate: event.target.value })}
              />
              <input
                type="date"
                value={whatsappLogFilters.endDate}
                onChange={(event) => setWhatsappLogFilters({ ...whatsappLogFilters, endDate: event.target.value })}
              />
              <label className="inlineCheck">
                <input
                  type="checkbox"
                  checked={whatsappLogFilters.onlyErrors}
                  onChange={(event) => setWhatsappLogFilters({ ...whatsappLogFilters, onlyErrors: event.target.checked })}
                />
                Só erros
              </label>
              <button className="secondary" onClick={() => loadWhatsappLogs()} disabled={whatsappLogsLoading}>
                Filtrar
              </button>
            </div>

            <div className="helperBox compactHelper">
              Exibindo até {WHATSAPP_LOGS_PAGE_SIZE} registros mais recentes. Total carregado: {whatsappLogsResumo.total}. Enviadas: {whatsappLogsResumo.sent}. Erros: {whatsappLogsResumo.failed}.
            </div>

            {whatsappLogs.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Data/hora</th>
                    <th>Telefone</th>
                    <th>Cliente</th>
                    <th>Direção</th>
                    <th>Status</th>
                    <th>Etapa</th>
                    <th>Intenção</th>
                    <th>Mensagem</th>
                    <th>Resposta / Erro</th>
                  </tr>
                </thead>
                <tbody>
                  {whatsappLogs.map((log) => (
                    <tr key={log.id} className={log.status === "failed" || log.error_message ? "mutedRow" : ""}>
                      <td>{new Date(log.created_at).toLocaleString("pt-BR")}</td>
                      <td>{log.from_phone || "-"}</td>
                      <td>{log.cliente_nome || (log.cliente_id ? `#${log.cliente_id}` : "-")}</td>
                      <td>{log.direction}</td>
                      <td>{log.status}</td>
                      <td>{log.stage || "-"}</td>
                      <td>{log.intent || "-"}</td>
                      <td title={log.inbound_text || ""}>{(log.inbound_text || "-").slice(0, 120)}</td>
                      <td title={log.error_message || log.outbound_text || ""}>
                        {(log.error_message || log.outbound_text || "-").slice(0, 160)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="emptyState">
                {whatsappLogsLoading ? "Carregando logs..." : "Nenhum log encontrado para os filtros atuais."}
              </div>
            )}
          </section>
        )}

        {activeTab === "medicos" && selectedCliente && (
          <section className="grid medicosGrid">
            <div className="card">
              <div className="sectionHeader compact">
                <div>
                  <h3>Médicos</h3>
                  <p>{selectedCliente.nome_fantasia}</p>
                </div>
                <span>{medicosFiltrados.length} registros</span>
              </div>

              <div className="helperBox compactHelper">
                Clique em um médico da lista para carregar os dados no formulário e editar.
                Médico inativo não entra no WhatsApp nem na validação de horários.
              </div>

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
                <input
                  value={medicoForm.especialidade}
                  onChange={(event) =>
                    setMedicoForm({ ...medicoForm, especialidade: event.target.value })
                  }
                  onBlur={() => {
                    const especialidade = resolveEspecialidadeDigitada(medicoForm.especialidade);
                    if (especialidade) {
                      setMedicoForm((current) => ({ ...current, especialidade: especialidade.nome }));
                    }
                  }}
                  list="especialidades-catalogo"
                  placeholder="Especialidade. Ex.: Cardiologia"
                  required
                />
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
                  onChange={(event) => setMedicoSearch(event.target.value)}
                  placeholder="Buscar médico, CRM, especialidade, dia..."
                />
                <div className="clientFilter medicoStatusFilter">
                  <button
                    type="button"
                    className={medicoStatusFiltro === "ativos" ? "active" : ""}
                    onClick={() => setMedicoStatusFiltro("ativos")}
                  >
                    Ativos
                  </button>
                  <button
                    type="button"
                    className={medicoStatusFiltro === "inativos" ? "active" : ""}
                    onClick={() => setMedicoStatusFiltro("inativos")}
                  >
                    Inativos
                  </button>
                  <button
                    type="button"
                    className={medicoStatusFiltro === "todos" ? "active" : ""}
                    onClick={() => setMedicoStatusFiltro("todos")}
                  >
                    Todos
                  </button>
                </div>
              </div>

              <div className="list medicosList">
                {medicosFiltrados.map((medico) => (
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
                        {[medico.dias, medico.andar].filter(Boolean).join(" • ")}
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
                                .join(" • ") || "-"}
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
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);

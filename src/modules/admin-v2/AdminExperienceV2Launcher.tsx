import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import PeriodRangePicker, {
  defaultDateRange,
  rangeDays,
  type DateRangeValue,
} from "./PeriodRangePicker";
import "./adminExperienceV2.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const ADMIN_TOKEN_STORAGE_KEY = "agendai_admin_token";
const NAV_HOST_ATTRIBUTE = "data-angel-admin-v2-nav-host";

type TabKey = "overview" | "conversations" | "coverage" | "confirmations" | "audit";

type ConversationMessage = {
  role: "patient" | "angel";
  text: string;
  at: string;
};

type ConversationGroup = {
  key: string;
  phone: string;
  cliente: string;
  startedAt: string;
  lastAt: string;
  stage: string;
  intent: string;
  messages: ConversationMessage[];
  technicalEvents: any[];
  errors: any[];
};

function apiHeaders() {
  const token = window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) || "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiRequest(path: string) {
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: apiHeaders() });
  const raw = await response.text();
  let payload: any = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    payload = raw;
  }
  if (!response.ok) {
    throw new Error(payload?.details || payload?.error || payload?.message || `Falha HTTP ${response.status}`);
  }
  return payload && typeof payload === "object" && Object.prototype.hasOwnProperty.call(payload, "data")
    ? payload.data
    : payload;
}

function asArray(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function safeText(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function formatDateTime(value: unknown): string {
  const date = new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function inRange(value: unknown, range: DateRangeValue): boolean {
  if (!value) return true;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return true;
  const localKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return localKey >= range.startDate && localKey <= range.endDate;
}

function buildConversationGroups(logs: any[]): ConversationGroup[] {
  const groups = new Map<string, any[]>();
  for (const log of logs) {
    const key = safeText(log.session_id) || `${safeText(log.from_phone || log.from_number)}:${safeText(log.phone_number_id)}`;
    if (!key) continue;
    const bucket = groups.get(key) || [];
    bucket.push(log);
    groups.set(key, bucket);
  }

  return Array.from(groups.entries())
    .map(([key, rows]) => {
      const ordered = [...rows].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const messages: ConversationMessage[] = [];
      const technicalEvents: any[] = [];
      const errors: any[] = [];
      let previous: ConversationMessage | null = null;

      const pushMessage = (role: "patient" | "angel", textValue: unknown, at: string) => {
        const text = safeText(textValue);
        if (!text) return;
        const next: ConversationMessage = { role, text, at };
        if (previous && previous.role === next.role && previous.text === next.text) {
          const delta = Math.abs(new Date(next.at).getTime() - new Date(previous.at).getTime());
          if (delta <= 10000) return;
        }
        messages.push(next);
        previous = next;
      };

      for (const row of ordered) {
        pushMessage("patient", row.inbound_text, row.created_at);
        pushMessage("angel", row.outbound_text, row.created_at);
        const status = safeText(row.status).toLowerCase();
        if (row.error_message) errors.push(row);
        if (!row.inbound_text && !row.outbound_text || ["queued", "processing", "processed", "sent", "received", "duplicate", "ignored"].includes(status)) {
          technicalEvents.push(row);
        }
      }

      const latest = ordered.at(-1) || {};
      const first = ordered[0] || {};
      return {
        key,
        phone: safeText(latest.from_phone || latest.from_number || first.from_phone || first.from_number) || "Telefone não identificado",
        cliente: safeText(latest.cliente_nome || first.cliente_nome) || "Polibon",
        startedAt: first.created_at,
        lastAt: latest.created_at,
        stage: safeText(latest.stage),
        intent: safeText(latest.intent),
        messages,
        technicalEvents,
        errors,
      } satisfies ConversationGroup;
    })
    .filter((group) => group.messages.length > 0 || group.errors.length > 0)
    .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
}

function statusLabel(value: any) {
  const status = safeText(value).toLowerCase();
  if (status === "pronto") return "Pronto";
  if (status === "suspenso") return "Fora do WhatsApp";
  if (status === "em_configuracao") return "Em configuração";
  if (status === "ativo_parcial") return "Ativo parcial";
  if (status === "sem_aceites") return "Sem aceites";
  if (status === "nao_mapeado_feegow") return "Revisar vínculo Feegow";
  return status ? status.replaceAll("_", " ") : "—";
}

export default function AdminExperienceV2Launcher() {
  const [navHost, setNavHost] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>("overview");
  const [range, setRange] = useState<DateRangeValue>(() => defaultDateRange(7));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [overview, setOverview] = useState<any>(null);
  const [conversationLogs, setConversationLogs] = useState<any[]>([]);
  const [conversationSearch, setConversationSearch] = useState("");
  const [expandedConversation, setExpandedConversation] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);
  const [aceites, setAceites] = useState<any[]>([]);
  const [coverageSearch, setCoverageSearch] = useState("");
  const [followups, setFollowups] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);

  useEffect(() => {
    let disposed = false;
    const attach = () => {
      if (disposed || document.querySelector(`[${NAV_HOST_ATTRIBUTE}]`)) return;
      const navs = Array.from(document.querySelectorAll("nav"));
      for (const nav of navs) {
        const buttons = Array.from(nav.querySelectorAll("button"));
        const anchor = buttons.find((button) => (button.textContent || "").toLowerCase().includes("controle de agendamento"))
          || buttons.find((button) => (button.textContent || "").toLowerCase().includes("visão do dia"));
        if (!anchor) continue;
        const host = document.createElement("div");
        host.setAttribute(NAV_HOST_ATTRIBUTE, "true");
        host.style.display = "contents";
        anchor.insertAdjacentElement("afterend", host);
        setNavHost(host);
        return;
      }
    };
    attach();
    const observer = new MutationObserver(attach);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      disposed = true;
      observer.disconnect();
      document.querySelector(`[${NAV_HOST_ATTRIBUTE}]`)?.remove();
      setNavHost(null);
    };
  }, []);

  async function loadCurrentTab() {
    setLoading(true);
    setError("");
    try {
      const query = `startDate=${encodeURIComponent(range.startDate)}&endDate=${encodeURIComponent(range.endDate)}`;
      if (tab === "overview") {
        const [nextProfile, nextOverview] = await Promise.all([
          apiRequest("/api/admin/experience-v2/data-profile"),
          apiRequest(`/api/admin/operacao/visao-periodo?${query}`),
        ]);
        setProfile(nextProfile);
        setOverview(nextOverview);
      } else if (tab === "conversations") {
        const data = await apiRequest(`/api/admin/whatsapp/logs?clienteId=1&${query}&limit=5000`);
        setConversationLogs(asArray(data));
      } else if (tab === "coverage") {
        const [catalogData, mappingData, aceiteData] = await Promise.all([
          apiRequest("/api/admin/clientes/1/convenios/catalogo"),
          apiRequest("/api/admin/clientes/1/convenios/correspondencias-feegow"),
          apiRequest("/api/admin/clientes/1/aceites?status=todos"),
        ]);
        setCatalog(asArray(catalogData));
        setMappings(asArray(mappingData));
        setAceites(asArray(aceiteData));
      } else if (tab === "confirmations") {
        const days = Math.min(366, Math.max(1, rangeDays(range)));
        const data = await apiRequest(`/api/admin/followups?days=${days}&status=todos&clienteId=1&page=1&pageSize=500`);
        const source = asArray(data?.items ? data.items : data);
        setFollowups(source.filter((item) => inRange(item.created_at || item.createdAt || item.scheduled_for || item.scheduledFor, range)));
      } else if (tab === "audit") {
        const data = await apiRequest(`/api/admin/auditoria?clienteId=1&${query}&limit=1000`);
        setAudit(asArray(data));
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : String(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) void loadCurrentTab();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab]);

  const conversations = useMemo(() => {
    const search = conversationSearch.trim().toLowerCase();
    return buildConversationGroups(conversationLogs).filter((group) => {
      if (!search) return true;
      return [group.phone, group.cliente, group.stage, group.intent, ...group.messages.map((item) => item.text)]
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
  }, [conversationLogs, conversationSearch]);

  const filteredCatalog = useMemo(() => {
    const search = coverageSearch.trim().toLowerCase();
    return catalog.filter((item) => !search || [item.nome_exibicao, item.nome_oficial, item.feegow_nome, item.registro_ans, item.situacao]
      .join(" ")
      .toLowerCase()
      .includes(search));
  }, [catalog, coverageSearch]);

  const technicalMappingSummary = useMemo(() => {
    const ready = mappings.filter((item) => item.booking_ready).length;
    const pending = mappings.length - ready;
    return { ready, pending, total: mappings.length };
  }, [mappings]);

  const launcher = navHost
    ? createPortal(
        <button type="button" onClick={() => setOpen(true)} title="Nova experiência administrativa em homologação">
          <span aria-hidden="true">✨</span>
          <span>Admin simplificado · Beta</span>
        </button>,
        navHost,
      )
    : null;

  return (
    <>
      {launcher}
      {open && createPortal(
        <div className="adminV2Overlay" role="dialog" aria-modal="true" aria-label="Admin simplificado">
          <section className="adminV2Shell">
            <header className="adminV2Header">
              <div>
                <span className="adminV2Eyebrow">HOMOLOGAÇÃO · EXPERIÊNCIA V2</span>
                <h2>Painel administrativo simplificado</h2>
                <p>Mesmos dados operacionais, com foco em consulta, clareza e rastreabilidade.</p>
              </div>
              <button type="button" className="adminV2Close" onClick={() => setOpen(false)} aria-label="Fechar">×</button>
            </header>

            <nav className="adminV2Tabs">
              {([
                ["overview", "Visão por período"],
                ["conversations", "Conversas WhatsApp"],
                ["coverage", "Convênios e aceites"],
                ["confirmations", "Confirmações"],
                ["audit", "Auditoria"],
              ] as Array<[TabKey, string]>).map(([key, label]) => (
                <button key={key} type="button" className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{label}</button>
              ))}
            </nav>

            {tab !== "coverage" && (
              <div className="adminV2PeriodBar">
                <PeriodRangePicker value={range} onChange={setRange} onApply={() => void loadCurrentTab()} loading={loading} />
              </div>
            )}

            {error && <div className="adminV2Error"><strong>Não foi possível carregar esta consulta.</strong><span>{error}</span></div>}

            <main className="adminV2Content" aria-busy={loading}>
              {tab === "overview" && overview && (
                <>
                  <div className="adminV2Kpis">
                    <article><span>Iniciaram agendamento</span><strong>{overview.summary?.iniciaramAgendamento ?? 0}</strong></article>
                    <article><span>Bookings Feegow</span><strong>{overview.summary?.agendadosFeegow ?? 0}</strong></article>
                    <article><span>Taxa de conclusão</span><strong>{overview.summary?.taxaConclusao ?? 0}%</strong></article>
                    <article><span>Recepção</span><strong>{overview.summary?.orientadosRecepcao ?? 0}</strong></article>
                    <article><span>Falhas técnicas</span><strong>{overview.summary?.falhasTecnicas ?? 0}</strong></article>
                  </div>
                  <section className="adminV2Card">
                    <header><div><h3>Funil real do período</h3><p>Calculado pelas mesmas evidências de sessão usadas na Visão do dia.</p></div></header>
                    <div className="adminV2Funnel">
                      {asArray(overview.funnel).map((item) => <div key={item.key}><span>{item.label}</span><strong>{item.total}</strong><small>{item.conversionFromPrevious == null ? "início" : `${item.conversionFromPrevious}% da etapa anterior`}</small></div>)}
                    </div>
                  </section>
                  {profile && (
                    <section className="adminV2Card adminV2DataProfile">
                      <header><div><h3>Dados disponíveis nesta homologação</h3><p>Ajuda a saber se o intervalo escolhido realmente possui dados para teste.</p></div></header>
                      <div className="adminV2DataGrid">
                        {Object.entries(profile.sources || {}).map(([key, value]: any) => (
                          <div key={key}><strong>{key}</strong><span>{value?.total ?? 0} registro(s)</span><small>{value?.min_at ? `${formatDateTime(value.min_at)} → ${formatDateTime(value.max_at)}` : "sem faixa temporal"}</small></div>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}

              {tab === "conversations" && (
                <>
                  <section className="adminV2ToolbarCard">
                    <input value={conversationSearch} onChange={(event) => setConversationSearch(event.target.value)} placeholder="Buscar telefone, etapa, intenção ou texto da conversa" />
                    <span>{conversations.length} conversa(s) · eventos técnicos ocultados por padrão</span>
                  </section>
                  <div className="adminV2ConversationList">
                    {conversations.map((group) => {
                      const expanded = expandedConversation === group.key;
                      return (
                        <article className={group.errors.length ? "hasError" : ""} key={group.key}>
                          <button type="button" className="adminV2ConversationHeader" onClick={() => setExpandedConversation(expanded ? null : group.key)}>
                            <span className="adminV2ConversationAvatar">💬</span>
                            <span className="adminV2ConversationIdentity"><strong>{group.phone}</strong><small>{group.cliente} · {formatDateTime(group.lastAt)}</small></span>
                            <span><strong>{group.messages.length} mensagem(ns)</strong><small>{group.stage || group.intent || "sem etapa"}</small></span>
                            <span className={group.errors.length ? "adminV2Badge danger" : "adminV2Badge success"}>{group.errors.length ? `${group.errors.length} erro(s)` : "Conversa"}</span>
                          </button>
                          {expanded && (
                            <div className="adminV2ConversationBody">
                              <div className="adminV2Chat">
                                {group.messages.map((message, index) => (
                                  <div className={`adminV2Bubble ${message.role}`} key={`${message.at}-${index}`}>
                                    <strong>{message.role === "patient" ? "Paciente" : "Angel"}</strong>
                                    <p>{message.text}</p>
                                    <small>{formatDateTime(message.at)}</small>
                                  </div>
                                ))}
                              </div>
                              {(group.technicalEvents.length > 0 || group.errors.length > 0) && (
                                <details className="adminV2TechnicalDetails">
                                  <summary>Diagnóstico técnico · {group.technicalEvents.length} evento(s) interno(s){group.errors.length ? ` · ${group.errors.length} erro(s)` : ""}</summary>
                                  {group.errors.map((item, index) => <div className="adminV2TechError" key={`error-${index}`}>{formatDateTime(item.created_at)} · {item.error_message}</div>)}
                                  {group.technicalEvents.slice(0, 100).map((item, index) => <div key={`tech-${index}`}>{formatDateTime(item.created_at)} · {item.status || "evento"} · {item.stage || item.intent || "—"}</div>)}
                                </details>
                              )}
                            </div>
                          )}
                        </article>
                      );
                    })}
                    {!loading && conversations.length === 0 && <div className="adminV2Empty">Nenhuma conversa encontrada neste período.</div>}
                  </div>
                </>
              )}

              {tab === "coverage" && (
                <>
                  <div className="adminV2CoverageNotice">
                    <strong>Regra de leitura atualizada</strong>
                    <span>O <b>feegow_plano_id</b> abaixo é tratado como <b>ID técnico de booking</b>. Ele não redefine sozinho o nome comercial de produto, rede ou plano informado pelo paciente.</span>
                  </div>
                  <section className="adminV2ToolbarCard">
                    <input value={coverageSearch} onChange={(event) => setCoverageSearch(event.target.value)} placeholder="Buscar convênio, ANS ou situação" />
                    <span>{filteredCatalog.length} convênio(s) · {technicalMappingSummary.ready}/{technicalMappingSummary.total} opções técnicas prontas</span>
                  </section>
                  <div className="adminV2CoverageList">
                    {filteredCatalog.map((item) => (
                      <article key={`${item.forma_id || item.feegow_convenio_id}-${item.nome_exibicao}`}>
                        <header><div><span className="adminV2Eyebrow">OPERADORA</span><h3>{item.nome_exibicao || item.nome_oficial || item.feegow_nome}</h3><small>{item.registro_ans ? `ANS ${item.registro_ans}` : "ANS não informado"} · Convênio Feegow ID {item.feegow_convenio_id || "—"}</small></div><span className="adminV2Badge">{statusLabel(item.situacao)}</span></header>
                        <div className="adminV2CoverageFacts">
                          <div><span>Estrutura comercial</span><strong>{safeText(item.estrutura).replaceAll("_", " + ") || "—"}</strong></div>
                          <div><span>Aceites médicos ativos</span><strong>{item.aceites_ativos ?? 0}</strong></div>
                          <div><span>Opções comerciais usadas</span><strong>{item.opcoes_aceitas ?? 0}</strong></div>
                          <div><span>Mapeamentos técnicos validados</span><strong>{item.crosswalk_validado ?? 0}</strong></div>
                          <div><span>Mapeamentos pendentes</span><strong>{item.crosswalk_pendente ?? 0}</strong></div>
                        </div>
                        <details>
                          <summary>Ver IDs técnicos e opções usadas neste convênio</summary>
                          <div className="adminV2MappingTable">
                            <div className="head"><span>Opção comercial</span><span>ID técnico Feegow</span><span>Nome técnico Feegow</span><span>Aceites</span><span>Booking</span></div>
                            {mappings.filter((mapping) => Number(mapping.forma_id) === Number(item.forma_id)).map((mapping) => (
                              <div key={mapping.produto_id}><span>{mapping.codigo_produto || mapping.rede_nome || mapping.plano_nome || mapping.produto_nome || "Convênio inteiro"}</span><strong>{mapping.feegow_plano_id || "—"}</strong><span>{mapping.feegow_plano_nome || "—"}</span><span>{mapping.aceites_ativos ?? 0}</span><span className={mapping.booking_ready ? "okText" : "warningText"}>{mapping.booking_ready ? "Pronto" : "Revisar"}</span></div>
                            ))}
                          </div>
                        </details>
                      </article>
                    ))}
                  </div>
                  <section className="adminV2Card"><header><div><h3>Resumo de aceites</h3><p>Aceite continua sendo médico + especialidade + cobertura comercial; o ID técnico é atributo do booking.</p></div><strong>{aceites.filter((item) => item.ativo !== false).length} ativos</strong></header></section>
                </>
              )}

              {tab === "confirmations" && (
                <section className="adminV2Card">
                  <header><div><h3>Confirmações e follow-ups</h3><p>Consulta filtrada pelo intervalo escolhido.</p></div><strong>{followups.length}</strong></header>
                  <div className="adminV2SimpleRows">
                    {followups.map((item, index) => <div key={item.id || index}><strong>{item.paciente_nome || item.patientName || item.telefone || item.phone || "Paciente"}</strong><span>{item.status || item.tipo || "—"}</span><small>{formatDateTime(item.scheduled_for || item.scheduledFor || item.created_at || item.createdAt)}</small></div>)}
                    {!loading && followups.length === 0 && <div className="adminV2Empty">Nenhuma confirmação no período.</div>}
                  </div>
                </section>
              )}

              {tab === "audit" && (
                <section className="adminV2Card">
                  <header><div><h3>Auditoria administrativa</h3><p>Alterações reais do painel no intervalo selecionado.</p></div><strong>{audit.length}</strong></header>
                  <div className="adminV2AuditRows">
                    {audit.map((item, index) => <div key={item.id || index}><time>{formatDateTime(item.created_at || item.createdAt)}</time><strong>{item.resumo || item.acao || "Ação administrativa"}</strong><span>{item.usuario_email || item.usuarioEmail || "sistema"} · {item.entidade || "—"}</span></div>)}
                    {!loading && audit.length === 0 && <div className="adminV2Empty">Nenhum evento de auditoria neste período.</div>}
                  </div>
                </section>
              )}

              {loading && <div className="adminV2Loading">Consultando dados reais da homologação…</div>}
            </main>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}

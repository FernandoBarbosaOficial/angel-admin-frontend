import React, { useEffect, useMemo, useState } from "react";
import "./adminV3Preview.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const TOKEN_KEY = "agendai_admin_token";
const CLIENTE_ID = 1;

type PreviewSection = "coverage" | "conversations";

type CoverageOption = {
  produtoId: number;
  nome: string;
  tipo?: string | null;
  codigoOperadora?: string | null;
  codigoProduto?: string | null;
  planoNome?: string | null;
  redeNome?: string | null;
  acomodacaoOuUf?: string | null;
  ativo: boolean;
  technical: {
    feegowPlanoId?: number | null;
    feegowPlanoNome?: string | null;
    bookingReady?: boolean;
    mappingStatus?: string | null;
    mappingOrigin?: string | null;
  };
};

type CoverageConvenio = {
  formaId: number;
  convenioId: number | null;
  nome: string;
  estrutura?: string | null;
  ativo: boolean;
  permiteAgendamentoOnline: boolean;
  exigePlano: boolean;
  technical: { feegowConvenioId?: number | null };
  opcoes: CoverageOption[];
};

type CoverageAceite = {
  aceiteId: number;
  especialidadeId?: number | null;
  especialidade?: string | null;
  convenioId: number;
  convenio?: string | null;
  produtoId?: number | null;
  produto?: string | null;
  produtoTipo?: string | null;
  ativo: boolean;
  convenioAtivo: boolean;
  regra: {
    fonte?: string | null;
    origem?: string | null;
    observacao?: string | null;
  };
};

type CoverageDoctor = {
  medicoId: number;
  nome: string;
  ativo: boolean;
  especialidades: unknown;
  regrasIdade: unknown[];
  aceites: CoverageAceite[];
};

type CoverageMatrix = {
  clienteId: number;
  sourceOfTruth: string;
  semantics: Record<string, string>;
  doctors: CoverageDoctor[];
  convenios: CoverageConvenio[];
};

type ConversationMessage = {
  id: number;
  messageId?: string | null;
  direction: "patient" | "angel";
  actor: string;
  text: string;
  createdAt: string;
  stage?: string | null;
  intent?: string | null;
};

type Conversation = {
  conversationKey: string;
  sessionId?: string | null;
  phone?: string | null;
  clienteNome?: string | null;
  startedAt?: string | null;
  updatedAt?: string | null;
  stage?: string | null;
  intent?: string | null;
  result: string;
  lastMessage?: ConversationMessage | null;
  messages: ConversationMessage[];
  technical: {
    eventCount: number;
    hiddenEventCount: number;
    events: Array<{
      id: number;
      createdAt?: string | null;
      status?: string | null;
      direction?: string | null;
      stage?: string | null;
      intent?: string | null;
      messageId?: string | null;
      error?: string | null;
    }>;
  };
};

type ConversationsResponse = {
  startDate?: string | null;
  endDate?: string | null;
  total: number;
  conversations: Conversation[];
};

function isoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysAgo(days: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return isoDate(date);
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatPhone(value?: string | null) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("55")) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 12 && digits.startsWith("55")) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
  }
  return value || "Telefone não identificado";
}

function specialtyLabels(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "nome" in item) return String((item as { nome?: unknown }).nome || "");
        return "";
      })
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(/[,;/]/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

async function apiGet<T>(path: string): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) throw new Error("Sessão administrativa não encontrada. Entre no painel normal antes de abrir a prévia V3.");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.details || payload?.error || `Erro HTTP ${response.status}`);
  }
  return (payload?.data ?? payload) as T;
}

function AcceptanceBadge({ accepted, inherited }: { accepted: boolean; inherited?: boolean }) {
  return (
    <span className={`v3Acceptance ${accepted ? "yes" : "no"}`}>
      {accepted ? (inherited ? "ACEITA · regra geral" : "ACEITA") : "NÃO ACEITA"}
    </span>
  );
}

function CoveragePreview() {
  const [data, setData] = useState<CoverageMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [doctorQuery, setDoctorQuery] = useState("");
  const [coverageQuery, setCoverageQuery] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [onlyAccepted, setOnlyAccepted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiGet<CoverageMatrix>(`/api/admin/clientes/${CLIENTE_ID}/experience-v3/coverage-matrix`)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setSelectedDoctorId((current) => current ?? result.doctors.find((item) => item.ativo)?.medicoId ?? result.doctors[0]?.medicoId ?? null);
        setError("");
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : String(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const doctors = useMemo(() => {
    const query = doctorQuery.trim().toLocaleLowerCase("pt-BR");
    return (data?.doctors || []).filter((doctor) => {
      const specialties = specialtyLabels(doctor.especialidades).join(" ");
      return !query || `${doctor.nome} ${specialties}`.toLocaleLowerCase("pt-BR").includes(query);
    });
  }, [data, doctorQuery]);

  const doctor = data?.doctors.find((item) => item.medicoId === selectedDoctorId) || null;

  const acceptanceFor = (convenio: CoverageConvenio, option: CoverageOption) => {
    if (!doctor || !convenio.convenioId) return { accepted: false, inherited: false, rows: [] as CoverageAceite[] };
    const exact = doctor.aceites.filter((item) => item.convenioId === convenio.convenioId && item.produtoId === option.produtoId && item.ativo && item.convenioAtivo);
    const wildcard = doctor.aceites.filter((item) => item.convenioId === convenio.convenioId && item.produtoId == null && item.ativo && item.convenioAtivo);
    return {
      accepted: exact.length > 0 || wildcard.length > 0,
      inherited: exact.length === 0 && wildcard.length > 0,
      rows: exact.length ? exact : wildcard,
    };
  };

  const visibleConvenios = useMemo(() => {
    const query = coverageQuery.trim().toLocaleLowerCase("pt-BR");
    if (!data) return [];
    return data.convenios
      .map((convenio) => ({
        ...convenio,
        opcoes: convenio.opcoes.filter((option) => {
          const text = `${convenio.nome} ${option.nome} ${option.planoNome || ""} ${option.redeNome || ""} ${option.codigoOperadora || ""}`.toLocaleLowerCase("pt-BR");
          if (query && !text.includes(query)) return false;
          if (!onlyAccepted) return true;
          return acceptanceFor(convenio, option).accepted;
        }),
      }))
      .filter((convenio) => convenio.opcoes.length > 0 || (!query && !onlyAccepted));
  }, [data, doctor, coverageQuery, onlyAccepted]);

  if (loading) return <div className="v3State">Carregando a matriz real de cobertura…</div>;
  if (error) return <div className="v3Error"><strong>Não foi possível carregar a matriz.</strong><span>{error}</span></div>;
  if (!data) return null;

  const activeAcceptances = doctor?.aceites.filter((item) => item.ativo && item.convenioAtivo).length || 0;

  return (
    <div className="v3CoverageLayout">
      <aside className="v3DoctorsPanel">
        <div className="v3PanelTitle">
          <div>
            <span className="v3Eyebrow">MÉDICOS</span>
            <h2>Quem atende?</h2>
          </div>
          <span className="v3CountBadge">{data.doctors.length}</span>
        </div>
        <input
          className="v3Input"
          value={doctorQuery}
          onChange={(event) => setDoctorQuery(event.target.value)}
          placeholder="Buscar médico ou especialidade"
        />
        <div className="v3DoctorsList">
          {doctors.map((item) => {
            const labels = specialtyLabels(item.especialidades);
            const count = item.aceites.filter((acceptance) => acceptance.ativo && acceptance.convenioAtivo).length;
            return (
              <button
                type="button"
                key={item.medicoId}
                className={`v3DoctorCard ${selectedDoctorId === item.medicoId ? "selected" : ""}`}
                onClick={() => setSelectedDoctorId(item.medicoId)}
              >
                <strong>{item.nome}</strong>
                <span>{labels.join(" · ") || "Especialidade não informada"}</span>
                <small>{count} aceite(s) ativo(s)</small>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="v3CoveragePanel">
        {doctor ? (
          <>
            <div className="v3SelectedDoctor">
              <div>
                <span className="v3Eyebrow">MÉDICO SELECIONADO</span>
                <h2>{doctor.nome}</h2>
                <p>{specialtyLabels(doctor.especialidades).join(" · ") || "Especialidade não informada"}</p>
              </div>
              <div className="v3DoctorStats">
                <strong>{activeAcceptances}</strong>
                <span>aceites ativos</span>
              </div>
            </div>

            <div className="v3CoverageToolbar">
              <input
                className="v3Input"
                value={coverageQuery}
                onChange={(event) => setCoverageQuery(event.target.value)}
                placeholder="Buscar convênio, plano, produto ou rede"
              />
              <label className="v3CheckLabel">
                <input type="checkbox" checked={onlyAccepted} onChange={(event) => setOnlyAccepted(event.target.checked)} />
                Mostrar apenas o que aceita
              </label>
            </div>

            <div className="v3InfoStrip">
              <strong>Fonte de verdade:</strong> medico_convenio_aceites. O nome comercial vem de convenio_produtos; IDs Feegow aparecem apenas no detalhe técnico.
            </div>

            <div className="v3ConvenioList">
              {visibleConvenios.map((convenio) => (
                <article className="v3ConvenioCard" key={convenio.formaId}>
                  <header>
                    <div>
                      <span className="v3Eyebrow">CONVÊNIO</span>
                      <h3>{convenio.nome}</h3>
                      <p>{convenio.opcoes.length} opção(ões) comercial(is) · estrutura {convenio.estrutura || "não informada"}</p>
                    </div>
                    <span className={`v3StatusPill ${convenio.permiteAgendamentoOnline ? "good" : "warn"}`}>
                      {convenio.permiteAgendamentoOnline ? "AGENDAMENTO ONLINE" : "NÃO OFERTAR ONLINE"}
                    </span>
                  </header>

                  <div className="v3OptionTable">
                    <div className="v3OptionHeader">
                      <span>Plano / produto / rede comercial</span>
                      <span>Especialidade / regra</span>
                      <span>Aceite</span>
                    </div>
                    {convenio.opcoes.map((option) => {
                      const acceptance = acceptanceFor(convenio, option);
                      const specialties = Array.from(new Set(acceptance.rows.map((row) => row.especialidade).filter(Boolean))) as string[];
                      const notes = Array.from(new Set(acceptance.rows.map((row) => row.regra?.observacao).filter(Boolean))) as string[];
                      return (
                        <div className="v3OptionRow" key={option.produtoId}>
                          <div className="v3OptionCommercial">
                            <strong>{option.nome}</strong>
                            <span>
                              {[option.redeNome && `Rede: ${option.redeNome}`, option.planoNome && `Plano: ${option.planoNome}`, option.codigoProduto && `Código: ${option.codigoProduto}`]
                                .filter(Boolean)
                                .join(" · ") || option.tipo || "Opção comercial"}
                            </span>
                            <details className="v3TechnicalDetails">
                              <summary>Integração Feegow</summary>
                              <div>
                                <span>Convênio técnico: {convenio.technical?.feegowConvenioId ?? "não vinculado"}</span>
                                <span>Plano técnico: {option.technical?.feegowPlanoId ?? "não vinculado"}</span>
                                <span>Nome Feegow: {option.technical?.feegowPlanoNome || "—"}</span>
                                <span>Booking ready: {option.technical?.bookingReady ? "sim" : "não"}</span>
                              </div>
                            </details>
                          </div>
                          <div className="v3RuleCell">
                            <strong>{specialties.join(" · ") || (acceptance.accepted ? "Regra geral do convênio" : "—")}</strong>
                            {notes.map((note) => <span key={note}>{note}</span>)}
                          </div>
                          <div className="v3AcceptanceCell">
                            <AcceptanceBadge accepted={acceptance.accepted} inherited={acceptance.inherited} />
                            <small>Edição desabilitada nesta prévia</small>
                          </div>
                        </div>
                      );
                    })}
                    {convenio.opcoes.length === 0 && <div className="v3EmptyInline">Nenhuma opção comercial corresponde aos filtros.</div>}
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className="v3State">Selecione um médico para visualizar seus aceites.</div>
        )}
      </section>
    </div>
  );
}

function ConversationsPreview() {
  const [startDate, setStartDate] = useState(daysAgo(6));
  const [endDate, setEndDate] = useState(isoDate(new Date()));
  const [appliedStart, setAppliedStart] = useState(startDate);
  const [appliedEnd, setAppliedEnd] = useState(endDate);
  const [data, setData] = useState<ConversationsResponse | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = (from = appliedStart, to = appliedEnd) => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ startDate: from, endDate: to, limit: "5000" });
    apiGet<ConversationsResponse>(`/api/admin/clientes/${CLIENTE_ID}/experience-v3/conversations?${params.toString()}`)
      .then((result) => {
        setData(result);
        setSelectedKey((current) => current && result.conversations.some((item) => item.conversationKey === current)
          ? current
          : result.conversations[0]?.conversationKey ?? null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(appliedStart, appliedEnd); }, [appliedStart, appliedEnd]);

  const conversations = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    return (data?.conversations || []).filter((conversation) => {
      if (!term) return true;
      const text = [
        conversation.phone,
        conversation.stage,
        conversation.intent,
        conversation.lastMessage?.text,
        ...conversation.messages.map((message) => message.text),
      ].filter(Boolean).join(" ").toLocaleLowerCase("pt-BR");
      return text.includes(term);
    });
  }, [data, query]);

  const selected = data?.conversations.find((item) => item.conversationKey === selectedKey) || null;

  const applyPreset = (days: number) => {
    const to = isoDate(new Date());
    const from = daysAgo(days - 1);
    setStartDate(from);
    setEndDate(to);
    setAppliedStart(from);
    setAppliedEnd(to);
  };

  return (
    <div className="v3ConversationPage">
      <div className="v3PeriodBar">
        <div className="v3QuickPeriods">
          <button type="button" onClick={() => applyPreset(1)}>Hoje</button>
          <button type="button" onClick={() => applyPreset(7)}>7 dias</button>
          <button type="button" onClick={() => applyPreset(30)}>30 dias</button>
        </div>
        <label>De<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
        <label>Até<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
        <button
          className="v3PrimaryButton"
          type="button"
          onClick={() => {
            if (!startDate || !endDate) return;
            setAppliedStart(startDate);
            setAppliedEnd(endDate);
          }}
        >Aplicar período</button>
      </div>

      {error && <div className="v3Error"><strong>Não foi possível carregar as conversas.</strong><span>{error}</span></div>}

      <div className="v3ConversationLayout">
        <aside className="v3ConversationListPanel">
          <div className="v3PanelTitle">
            <div>
              <span className="v3Eyebrow">WHATSAPP</span>
              <h2>Conversas</h2>
            </div>
            <span className="v3CountBadge">{data?.total ?? 0}</span>
          </div>
          <input className="v3Input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar telefone ou texto" />
          <div className="v3ConversationList">
            {loading && <div className="v3State small">Carregando…</div>}
            {!loading && conversations.map((conversation) => (
              <button
                type="button"
                className={`v3ConversationItem ${selectedKey === conversation.conversationKey ? "selected" : ""}`}
                key={conversation.conversationKey}
                onClick={() => setSelectedKey(conversation.conversationKey)}
              >
                <div>
                  <strong>{formatPhone(conversation.phone)}</strong>
                  <span>{formatDateTime(conversation.updatedAt)}</span>
                </div>
                <p>{conversation.lastMessage?.text || "Sem mensagem textual"}</p>
                <div className="v3ConversationMeta">
                  <span>{conversation.result === "agendado" ? "Agendado" : conversation.result === "erro" ? "Com erro" : "Atendimento"}</span>
                  <small>{conversation.messages.length} mensagem(ns)</small>
                </div>
              </button>
            ))}
            {!loading && conversations.length === 0 && <div className="v3State small">Nenhuma conversa no período selecionado.</div>}
          </div>
        </aside>

        <section className="v3ChatPanel">
          {selected ? (
            <>
              <header className="v3ChatHeader">
                <div>
                  <span className="v3Eyebrow">CONVERSA REAL</span>
                  <h2>{formatPhone(selected.phone)}</h2>
                  <p>{selected.stage || "Sem etapa"} · {selected.intent || "sem intenção registrada"}</p>
                </div>
                <div className="v3ChatStats">
                  <strong>{selected.messages.length}</strong>
                  <span>mensagens visíveis</span>
                </div>
              </header>

              <div className="v3MessageTimeline">
                {selected.messages.map((message) => (
                  <div className={`v3BubbleRow ${message.direction}`} key={`${message.id}-${message.messageId || "no-id"}`}>
                    <div className="v3Bubble">
                      <div className="v3BubbleMeta">
                        <strong>{message.actor}</strong>
                        <span>{formatDateTime(message.createdAt)}</span>
                      </div>
                      <p>{message.text}</p>
                    </div>
                  </div>
                ))}
                {selected.messages.length === 0 && <div className="v3State">Esta sessão não possui mensagens textuais aproveitáveis.</div>}
              </div>

              <details className="v3DiagnosticBox">
                <summary>Diagnóstico técnico desta conversa · {selected.technical.hiddenEventCount} evento(s) oculto(s)</summary>
                <div className="v3DiagnosticTable">
                  <div className="v3DiagnosticHeader"><span>Horário</span><span>Status</span><span>Direção</span><span>Etapa / intenção</span><span>Erro</span></div>
                  {selected.technical.events.map((event) => (
                    <div className="v3DiagnosticRow" key={event.id}>
                      <span>{formatDateTime(event.createdAt)}</span>
                      <span>{event.status || "—"}</span>
                      <span>{event.direction || "—"}</span>
                      <span>{[event.stage, event.intent].filter(Boolean).join(" / ") || "—"}</span>
                      <span>{event.error || "—"}</span>
                    </div>
                  ))}
                </div>
              </details>
            </>
          ) : (
            <div className="v3State">Selecione uma conversa.</div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function AdminV3Preview({ initialSection }: { initialSection: PreviewSection }) {
  const [section, setSection] = useState<PreviewSection>(initialSection);

  const go = (next: PreviewSection) => {
    setSection(next);
    const url = new URL(window.location.href);
    url.searchParams.set("adminv3", next);
    window.history.replaceState({}, "", url);
  };

  const exitPreview = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("adminv3");
    window.location.href = `${url.pathname}${url.search}${url.hash}`;
  };

  return (
    <main className="v3Page">
      <header className="v3Topbar">
        <div>
          <span className="v3Environment">HOMOLOGAÇÃO · ADMIN V3</span>
          <h1>AgendAI · Polibon</h1>
          <p>Prévia isolada para validar dados e usabilidade antes de substituir qualquer menu atual.</p>
        </div>
        <button type="button" className="v3ExitButton" onClick={exitPreview}>Voltar ao painel atual</button>
      </header>

      <nav className="v3Tabs" aria-label="Prévia Admin V3">
        <button className={section === "coverage" ? "active" : ""} onClick={() => go("coverage")}>Convênios e aceites</button>
        <button className={section === "conversations" ? "active" : ""} onClick={() => go("conversations")}>Conversas WhatsApp</button>
      </nav>

      <section className="v3Intro">
        {section === "coverage" ? (
          <>
            <span className="v3Eyebrow">GESTÃO ASSISTENCIAL</span>
            <h2>Convênios e aceites pela realidade comercial</h2>
            <p>Escolha um médico e veja, dentro de cada convênio, a qual plano/produto/rede cada aceite pertence. O crosswalk Feegow fica separado como dado técnico.</p>
          </>
        ) : (
          <>
            <span className="v3Eyebrow">OPERAÇÃO CLÍNICA</span>
            <h2>Conversas WhatsApp sem ruído de processamento</h2>
            <p>A visão principal contém somente Paciente e Angel. Queue, sent, processing, duplicate e demais eventos ficam no diagnóstico técnico.</p>
          </>
        )}
      </section>

      {section === "coverage" ? <CoveragePreview /> : <ConversationsPreview />}
    </main>
  );
}

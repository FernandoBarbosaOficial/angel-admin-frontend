import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const ADMIN_TOKEN_STORAGE_KEY = "agendai_admin_token";
const NAV_HOST_ATTRIBUTE = "data-angel-whatsapp-billing-nav-host";

type BillingDashboard = {
  instrumentationReady?: boolean;
  flowInstrumentationReady?: boolean;
  generatedAt?: string;
  message?: string;
  pricing?: {
    currency?: string;
    serviceUnitRate?: number;
    configuredServiceUnitRate?: number;
    monthlyFreeAllowancePerPhone?: number;
    effectiveDate?: string;
    effectiveNow?: boolean;
  };
  metaActual?: {
    available?: boolean;
    source?: string;
    asOf?: string;
    currency?: string;
    volume?: number;
    freeVolume?: number;
    paidVolume?: number;
    actualCostBrl?: number;
    brazilVolume?: number;
    brazilCostBrl?: number;
    observedBrazilUnitRate?: number;
    error?: string | null;
  };
  flowProjection?: {
    confidence?: "baixa" | "media" | "alta" | string;
    healthyFlowDays?: number;
    observedMessagesPerJourney?: number;
    weekdayAverageJourneys?: number;
    weekendAverageJourneys?: number;
    projectedMonthCloseCostBrl?: number;
    projectedAdditionalMonthMessages?: number;
    projected30DayJourneys?: number;
    projected30DayMessages?: number;
    projected30DayPaid?: number;
    projected30DayFlowCostBrl?: number;
    freeAllowance?: number;
    unitRateBrl?: number;
  };
  reconciliation?: {
    localDeliveredMonth?: number;
    metaVolumeMonth?: number | null;
    volumeDelta?: number | null;
  };
  currentMonth?: {
    accepted?: number;
    delivered?: number;
    read?: number;
    failed?: number;
    pending?: number;
    serviceDelivered?: number;
  };
  trailing30Days?: {
    accepted?: number;
    deliveredObserved?: number;
    failedObserved?: number;
  };
  deliveryQuality?: {
    liveAccepted?: number;
    liveDelivered?: number;
    liveFailed?: number;
    callbackCoverage?: number;
    observedDeliveryRatio?: number;
    forecastDeliveryRatio?: number;
    adjustmentApplied?: boolean;
    confidence?: "baixa" | "media" | "alta" | string;
  };
  forecastComparable30Days?: {
    projectedServiceDelivered?: number;
    projectedTariffed?: number;
    projectedFree?: number;
    projectedCostBrl?: number;
    currentPolicyServiceCostBrl?: number;
    postEffectiveSimulationCostBrl?: number;
  };
  byPhone?: Array<{
    phoneNumberId?: string;
    accepted30d?: number;
    projectedDelivered30d?: number;
    freeAllowance?: number;
    projectedTariffed30d?: number;
  }>;
  bySourceCurrentMonth?: Array<{
    source?: string;
    accepted?: number;
    deliveredObserved?: number;
    failedObserved?: number;
  }>;
  bySource30Days?: Array<{
    source?: string;
    accepted?: number;
    deliveredObserved?: number;
  }>;
  flow?: {
    sessions30d?: number;
    completed30d?: number;
    abandoned30d?: number;
    actualOutbound30d?: number;
    avoidedOutbound30d?: number;
    completionRate?: number | null;
    estimatedSavingsBrl?: number;
  };
  notes?: string[];
};

function token() {
  return window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) || "";
}

async function loadBillingDashboard(): Promise<BillingDashboard> {
  const authToken = token();
  const response = await fetch(`${API_BASE_URL}/api/admin/whatsapp/faturamento`, {
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
  });
  const raw = await response.text();
  let payload: any = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    payload = raw;
  }
  if (!response.ok) {
    const message = payload?.message || payload?.error || (typeof payload === "string" ? payload : "") || `Falha HTTP ${response.status}`;
    throw new Error(message);
  }
  return payload?.data ?? payload ?? {};
}

function brl(value: unknown) {
  const number = Number(value || 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number.isFinite(number) ? number : 0);
}

function integer(value: unknown) {
  const number = Number(value || 0);
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(Number.isFinite(number) ? number : 0);
}

function percent(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 }).format(number);
}

function dateTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}

function sourceLabel(value?: string) {
  const labels: Record<string, string> = {
    angel_text: "Angel — conversa normal",
    flow_launch: "WhatsApp Flow",
    session_timeout: "Sessão expirada",
    followup: "Follow-up",
    anti_abuse: "Antiabuso",
    operational_gate: "Controle operacional",
    failure_handoff: "Falha / recepção",
    template: "Template",
    unknown: "Não classificada",
  };
  return labels[value || ""] || value || "Não classificada";
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 100001,
    background: "rgba(15,23,42,.62)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  panel: {
    width: "min(1120px, 98vw)",
    maxHeight: "94vh",
    overflowY: "auto",
    background: "#fff",
    color: "#0f172a",
    borderRadius: 18,
    boxShadow: "0 24px 70px rgba(15,23,42,.3)",
    padding: 24,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: 12,
  },
  card: {
    border: "1px solid #e2e8f0",
    borderRadius: 13,
    padding: 14,
    background: "#f8fafc",
  },
  label: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: ".06em",
    textTransform: "uppercase",
    color: "#64748b",
    marginBottom: 6,
  },
};

function Metric({ label, value, detail }: { label: string; value: React.ReactNode; detail?: React.ReactNode }) {
  return (
    <div style={styles.card}>
      <div style={styles.label}>{label}</div>
      <div style={{ fontSize: 25, fontWeight: 850 }}>{value}</div>
      {detail ? <div style={{ marginTop: 5, color: "#64748b", fontSize: 12 }}>{detail}</div> : null}
    </div>
  );
}

export default function WhatsAppBillingLauncher() {
  const [navHost, setNavHost] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<BillingDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let disposed = false;
    const attach = () => {
      if (disposed || document.querySelector(`[${NAV_HOST_ATTRIBUTE}]`)) return;
      const navs = Array.from(document.querySelectorAll("nav"));
      for (const nav of navs) {
        const buttons = Array.from(nav.querySelectorAll("button"));
        const anchor = buttons.find((button) => {
          const value = (button.textContent || "").toLowerCase();
          return value.includes("controle de agendamento") || value.includes("visão do dia") || value.includes("visao do dia");
        });
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

  async function refresh(showSpinner = true) {
    if (showSpinner) setLoading(true);
    try {
      const next = await loadBillingDashboard();
      setData(next);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (showSpinner) setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    void refresh(true);
    const timer = window.setInterval(() => void refresh(false), 30000);
    return () => window.clearInterval(timer);
  }, [open]);

  const projectionConfidence = data?.flowProjection?.confidence || "baixa";
  const projectionConfidenceText = useMemo(
    () => projectionConfidence === "alta" ? "Alta" : projectionConfidence === "media" ? "Média" : "Baixa",
    [projectionConfidence],
  );

  const launcher = navHost
    ? createPortal(
        <button type="button" onClick={() => setOpen(true)} title="Previsão de faturamento do WhatsApp">
          <span aria-hidden="true">R$</span>
          <span>Faturamento WhatsApp</span>
        </button>,
        navHost,
      )
    : null;

  return (
    <>
      {launcher}
      {open && createPortal(
        <div style={styles.overlay} role="dialog" aria-modal="true" aria-label="Faturamento WhatsApp">
          <section style={styles.panel}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
              <div>
                <div style={{ ...styles.label, marginBottom: 3 }}>ADMINISTRAÇÃO TÉCNICA</div>
                <h2 style={{ margin: "3px 0 4px", fontSize: 27 }}>Faturamento WhatsApp</h2>
                <p style={{ margin: 0, color: "#64748b", maxWidth: 780 }}>
                  Custo realizado direto da Meta Graph API e projeção baseada na operação atual com WhatsApp Flow, sem contaminar a estimativa com o tráfego legado.
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => void refresh(true)} disabled={loading}>Atualizar</button>
                <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" style={{ border: 0, background: "transparent", fontSize: 28, cursor: "pointer" }}>×</button>
              </div>
            </div>

            {error && <div style={{ marginTop: 16, padding: 12, borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b" }}>{error}</div>}
            {loading && !data ? <p style={{ marginTop: 22 }}>Carregando ledger de faturamento...</p> : null}

            {data && !data.instrumentationReady ? (
              <div style={{ marginTop: 18, padding: 16, borderRadius: 12, background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e" }}>
                {data.message || "A instrumentação de faturamento ainda não está pronta."}
              </div>
            ) : null}

            {data?.instrumentationReady ? (
              <>
                <div style={{ marginTop: 18, padding: 14, borderRadius: 12, background: data.metaActual?.available ? "#ecfdf5" : "#fffbeb", border: `1px solid ${data.metaActual?.available ? "#a7f3d0" : "#fde68a"}`, color: data.metaActual?.available ? "#065f46" : "#92400e" }}>
                  <strong>{data.metaActual?.available ? "Meta Graph conectado" : "Meta Graph indisponível"}:</strong>{" "}
                  {data.metaActual?.available
                    ? `custo real no mês ${brl(data.metaActual?.actualCostBrl)} · projeção de fechamento ${brl(data.flowProjection?.projectedMonthCloseCostBrl)}`
                    : "usando ledger local como contingência; o custo oficial será exibido assim que a leitura da Meta voltar."}
                </div>

                <h3 style={{ margin: "22px 0 10px" }}>Custo real Meta — mês atual</h3>
                <div style={styles.grid}>
                  <Metric label="Volume Meta" value={integer(data.metaActual?.volume)} detail="pricing_analytics oficial" />
                  <Metric label="Gratuitas" value={integer(data.metaActual?.freeVolume)} detail="FREE_CUSTOMER_SERVICE" />
                  <Metric label="Cobradas" value={integer(data.metaActual?.paidVolume)} detail={`tarifa BR observada ${brl(data.metaActual?.observedBrazilUnitRate)}`} />
                  <Metric label="Custo real Meta" value={brl(data.metaActual?.actualCostBrl)} detail={`atualizado ${dateTime(data.metaActual?.asOf)}`} />
                </div>

                <h3 style={{ margin: "22px 0 10px" }}>Projeção na realidade do Flow</h3>
                <div style={styles.grid}>
                  <Metric label="Fechamento do mês" value={brl(data.flowProjection?.projectedMonthCloseCostBrl)} detail={`confiança ${projectionConfidenceText.toLowerCase()}`} />
                  <Metric label="30 dias estabilizados" value={brl(data.flowProjection?.projected30DayFlowCostBrl)} detail="sem tráfego legado no cálculo" />
                  <Metric label="Mensagens em 30 dias" value={integer(data.flowProjection?.projected30DayMessages)} detail={`${integer(data.flowProjection?.projected30DayJourneys)} jornadas projetadas`} />
                  <Metric label="Mensagens / jornada" value={Number(data.flowProjection?.observedMessagesPerJourney || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} detail={`${integer(data.flowProjection?.healthyFlowDays)} dia(s) saudável(is) de Flow`} />
                </div>

                <h3 style={{ margin: "22px 0 10px" }}>Ledger local — mês atual</h3>
                <div style={styles.grid}>
                  <Metric label="Aceitas pela Meta" value={integer(data.currentMonth?.accepted)} />
                  <Metric label="Entregues" value={integer(data.currentMonth?.delivered)} />
                  <Metric label="Lidas" value={integer(data.currentMonth?.read)} />
                  <Metric label="Falhas" value={integer(data.currentMonth?.failed)} />
                  <Metric label="Status pendente" value={integer(data.currentMonth?.pending)} />
                </div>

                <h3 style={{ margin: "22px 0 10px" }}>Base da projeção Flow</h3>
                <div style={styles.grid}>
                  <Metric label="Jornadas / dia útil" value={Number(data.flowProjection?.weekdayAverageJourneys || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} detail="média histórica anterior ao Flow" />
                  <Metric label="Jornadas / fim de semana" value={Number(data.flowProjection?.weekendAverageJourneys || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} detail="média histórica anterior ao Flow" />
                  <Metric label="Dias Flow saudáveis" value={integer(data.flowProjection?.healthyFlowDays)} detail="sem falha operacional relevante" />
                  <Metric label="Confiança da projeção" value={projectionConfidenceText} detail={`Meta x ledger: diferença ${integer(data.reconciliation?.volumeDelta)} msg`} />
                </div>

                <h3 style={{ margin: "22px 0 10px" }}>Origem das mensagens — mês atual</h3>
                <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 12 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
                    <thead><tr style={{ background: "#f8fafc", textAlign: "left" }}><th style={{ padding: 10 }}>Origem</th><th style={{ padding: 10 }}>Aceitas</th><th style={{ padding: 10 }}>Entregues</th><th style={{ padding: 10 }}>Falhas</th></tr></thead>
                    <tbody>{(data.bySourceCurrentMonth || data.bySource30Days || []).map((row: any, index) => <tr key={`${row.source}-${index}`} style={{ borderTop: "1px solid #e2e8f0" }}><td style={{ padding: 10 }}>{sourceLabel(row.source)}</td><td style={{ padding: 10 }}>{integer(row.accepted)}</td><td style={{ padding: 10 }}>{integer(row.deliveredObserved)}</td><td style={{ padding: 10 }}>{integer(row.failedObserved)}</td></tr>)}</tbody>
                  </table>
                </div>

                <h3 style={{ margin: "22px 0 10px" }}>WhatsApp Flow — economia medida</h3>
                <div style={styles.grid}>
                  <Metric label="Sessões Flow" value={integer(data.flow?.sessions30d)} />
                  <Metric label="Concluídas" value={integer(data.flow?.completed30d)} detail={`conversão ${data.flow?.completionRate == null ? "—" : percent(data.flow.completionRate)}`} />
                  <Metric label="Outbound real" value={integer(data.flow?.actualOutbound30d)} />
                  <Metric label="Mensagens evitadas" value={integer(data.flow?.avoidedOutbound30d)} detail={`economia estimada ${brl(data.flow?.estimatedSavingsBrl)}`} />
                </div>

                <div style={{ marginTop: 18, fontSize: 12, color: "#64748b" }}>
                  Atualizado em {dateTime(data.generatedAt)}. A cobrança efetiva continua sendo a da Meta; esta tela é uma reconciliação operacional para previsão e auditoria.
                </div>
              </>
            ) : null}
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}

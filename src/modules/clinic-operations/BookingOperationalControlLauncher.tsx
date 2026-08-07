import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const ADMIN_TOKEN_STORAGE_KEY = "agendai_admin_token";
const ADMIN_USER_STORAGE_KEY = "agendai_admin_user";
const NAV_HOST_ATTRIBUTE = "data-angel-booking-control-nav-host";

type ClientOption = {
  id: number;
  nome: string;
};

type BookingControlStatus = {
  clienteId: number;
  whatsappConnected: boolean;
  automaticBookingEnabled: boolean;
  dailyLimit: number | null;
  businessDate: string;
  confirmedToday: number;
  reservedNow: number;
  ambiguousNow: number;
  occupiedCapacity: number;
  remaining: number | null;
  limitReached: boolean;
  usagePercent: number | null;
  status: "normal" | "warning" | "paused" | "limit_reached";
  version: number;
  updatedByEmail?: string | null;
  updatedAt?: string | null;
};

function readStoredUser(): any | null {
  try {
    const raw = window.localStorage.getItem(ADMIN_USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getToken() {
  return window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) || "";
}

function apiHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function readJsonResponse(response: Response) {
  const raw = await response.text();
  let payload: any = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    payload = raw;
  }

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.error ||
      payload?.details ||
      (typeof payload === "string" ? payload : "") ||
      `Falha HTTP ${response.status}.`;
    throw new Error(message);
  }

  return payload && typeof payload === "object" && Object.prototype.hasOwnProperty.call(payload, "data")
    ? payload.data
    : payload;
}

function normalizeClientOptions(payload: any): ClientOption[] {
  const source = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.clientes)
        ? payload.clientes
        : [];

  return source
    .map((item: any) => ({
      id: Number(item?.id || item?.cliente_id || 0),
      nome: String(item?.nome_fantasia || item?.nomeFantasia || item?.nome || "").trim(),
      ativo: item?.ativo !== false && String(item?.status || "ativo").toLowerCase() === "ativo",
    }))
    .filter((item: any) => Number.isInteger(item.id) && item.id > 0 && item.ativo)
    .map(({ id, nome }: any) => ({ id, nome: nome || `Cliente #${id}` }));
}

async function loadAccessibleClients(): Promise<ClientOption[]> {
  const storedUser = readStoredUser();
  const storedIds = Array.isArray(storedUser?.clienteIds)
    ? storedUser.clienteIds
        .map((value: unknown) => Number(value))
        .filter((value: number) => Number.isInteger(value) && value > 0)
    : [];

  const response = await fetch(`${API_BASE_URL}/api/admin/clientes`, {
    headers: apiHeaders(),
  });
  const payload = await readJsonResponse(response);
  const options = normalizeClientOptions(payload);

  if (!storedIds.length) return options;
  const allowed = new Set(storedIds);
  return options.filter((item) => allowed.has(item.id));
}

async function loadStatus(clienteId: number): Promise<BookingControlStatus> {
  const response = await fetch(
    `${API_BASE_URL}/api/admin/clientes/${clienteId}/whatsapp/booking-control`,
    { headers: apiHeaders() },
  );
  return readJsonResponse(response);
}

async function saveStatus(
  clienteId: number,
  body: {
    automaticBookingEnabled?: boolean;
    dailyLimit?: number | null;
    expectedVersion?: number;
  },
): Promise<BookingControlStatus> {
  const response = await fetch(
    `${API_BASE_URL}/api/admin/clientes/${clienteId}/whatsapp/booking-control`,
    {
      method: "PATCH",
      headers: apiHeaders(),
      body: JSON.stringify(body),
    },
  );
  return readJsonResponse(response);
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}

function statusPalette(status?: BookingControlStatus["status"]) {
  if (status === "paused" || status === "limit_reached") {
    return { background: "#fef2f2", border: "#fecaca", text: "#991b1b", dot: "#dc2626" };
  }
  if (status === "warning") {
    return { background: "#fffbeb", border: "#fde68a", text: "#92400e", dot: "#d97706" };
  }
  return { background: "#f0fdf4", border: "#bbf7d0", text: "#166534", dot: "#16a34a" };
}

const modalStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 100000,
    background: "rgba(15, 23, 42, 0.58)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  panel: {
    width: "min(760px, 96vw)",
    maxHeight: "92vh",
    overflowY: "auto",
    background: "#ffffff",
    borderRadius: 18,
    boxShadow: "0 24px 70px rgba(15, 23, 42, 0.28)",
    padding: 24,
    color: "#0f172a",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: 12,
  },
  metric: {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 14,
    background: "#f8fafc",
  },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: ".04em",
    textTransform: "uppercase",
    color: "#64748b",
    marginBottom: 6,
  },
};

export default function BookingOperationalControlLauncher() {
  const [navHost, setNavHost] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState<number | null>(null);
  const [status, setStatus] = useState<BookingControlStatus | null>(null);
  const [limitMode, setLimitMode] = useState<"limited" | "unlimited">("unlimited");
  const [limitDraft, setLimitDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let disposed = false;
    let observer: MutationObserver | null = null;

    const attach = () => {
      if (disposed || document.querySelector(`[${NAV_HOST_ATTRIBUTE}]`)) return;
      const navs = Array.from(document.querySelectorAll("nav"));
      for (const nav of navs) {
        const buttons = Array.from(nav.querySelectorAll("button"));
        const anchor = buttons.find((button) =>
          (button.textContent || "").toLowerCase().includes("visão do dia") ||
          (button.textContent || "").toLowerCase().includes("visao do dia"),
        );
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
    observer = new MutationObserver(attach);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      disposed = true;
      observer?.disconnect();
      const host = document.querySelector(`[${NAV_HOST_ATTRIBUTE}]`);
      host?.remove();
      setNavHost(null);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError("");

    loadAccessibleClients()
      .then((items) => {
        if (cancelled) return;
        setClients(items);
        setSelectedClienteId((current) => current || items[0]?.id || null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !selectedClienteId) return;
    let cancelled = false;

    const refresh = async (showSpinner: boolean) => {
      if (showSpinner) setLoading(true);
      try {
        const next = await loadStatus(selectedClienteId);
        if (cancelled) return;
        setStatus(next);
        setLimitMode(next.dailyLimit === null ? "unlimited" : "limited");
        setLimitDraft(next.dailyLimit === null ? "" : String(next.dailyLimit));
        setError("");
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (showSpinner && !cancelled) setLoading(false);
      }
    };

    void refresh(true);
    const timer = window.setInterval(() => void refresh(false), 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [open, selectedClienteId]);

  const palette = useMemo(() => statusPalette(status?.status), [status?.status]);

  async function applyPatch(body: Parameters<typeof saveStatus>[1]) {
    if (!selectedClienteId || !status) return;
    setSaving(true);
    setError("");
    try {
      const next = await saveStatus(selectedClienteId, {
        ...body,
        expectedVersion: status.version,
      });
      setStatus(next);
      setLimitMode(next.dailyLimit === null ? "unlimited" : "limited");
      setLimitDraft(next.dailyLimit === null ? "" : String(next.dailyLimit));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      try {
        const fresh = await loadStatus(selectedClienteId);
        setStatus(fresh);
      } catch {
        // O próximo refresh automático tentará novamente.
      }
    } finally {
      setSaving(false);
    }
  }

  async function saveLimit() {
    if (limitMode === "unlimited") {
      await applyPatch({ dailyLimit: null });
      return;
    }
    const value = Number(limitDraft);
    if (!Number.isInteger(value) || value <= 0) {
      setError("Informe um limite diário inteiro maior que zero ou selecione SEM LIMITE.");
      return;
    }
    await applyPatch({ dailyLimit: value });
  }

  const launcher = navHost
    ? createPortal(
        <button type="button" onClick={() => setOpen(true)} title="Controle operacional do agendamento automático">
          <span aria-hidden="true">⏱</span>
          <span>Controle de agendamento</span>
        </button>,
        navHost,
      )
    : null;

  return (
    <>
      {launcher}
      {open && createPortal(
        <div style={modalStyles.overlay} role="dialog" aria-modal="true" aria-label="Controle de agendamento">
          <section style={modalStyles.panel}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b", letterSpacing: ".08em" }}>OPERAÇÃO CLÍNICA</div>
                <h2 style={{ margin: "5px 0 5px", fontSize: 26 }}>Controle de agendamento</h2>
                <p style={{ margin: 0, color: "#64748b" }}>
                  Pausa e limite diário do agendamento automático pelo WhatsApp, sem desligar o canal Meta.
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} style={{ border: 0, background: "transparent", fontSize: 28, cursor: "pointer", color: "#475569" }} aria-label="Fechar">×</button>
            </div>

            {clients.length > 1 && (
              <label style={{ display: "block", marginTop: 20 }}>
                <span style={modalStyles.label}>Clínica</span>
                <select
                  value={selectedClienteId || ""}
                  onChange={(event) => setSelectedClienteId(Number(event.target.value) || null)}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 10 }}
                >
                  {clients.map((client) => <option key={client.id} value={client.id}>{client.nome}</option>)}
                </select>
              </label>
            )}

            {error && (
              <div style={{ marginTop: 18, padding: 12, borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b" }}>
                {error}
              </div>
            )}

            {loading && !status ? (
              <p style={{ marginTop: 24 }}>Carregando controle operacional...</p>
            ) : status ? (
              <>
                <div style={{ marginTop: 20, padding: 16, borderRadius: 14, background: palette.background, border: `1px solid ${palette.border}`, color: palette.text }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 800 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 999, background: palette.dot, display: "inline-block" }} />
                      {status.automaticBookingEnabled
                        ? status.limitReached ? "LIMITE ATINGIDO" : "AGENDAMENTO AUTOMÁTICO ATIVO"
                        : "AGENDAMENTO AUTOMÁTICO PAUSADO"}
                    </div>
                    <div style={{ fontWeight: 700 }}>
                      WhatsApp conectado: {status.whatsappConnected ? "SIM" : "NÃO"}
                    </div>
                  </div>
                </div>

                <div style={{ ...modalStyles.row, marginTop: 16 }}>
                  <div style={modalStyles.metric}>
                    <span style={modalStyles.label}>Bookings confirmados hoje</span>
                    <strong style={{ fontSize: 26 }}>{status.confirmedToday}</strong>
                    {status.dailyLimit !== null && <span style={{ color: "#64748b" }}> / {status.dailyLimit}</span>}
                  </div>
                  <div style={modalStyles.metric}>
                    <span style={modalStyles.label}>Disponíveis</span>
                    <strong style={{ fontSize: 26 }}>{status.remaining === null ? "∞" : status.remaining}</strong>
                  </div>
                  <div style={modalStyles.metric}>
                    <span style={modalStyles.label}>Em confirmação</span>
                    <strong style={{ fontSize: 26 }}>{status.reservedNow + status.ambiguousNow}</strong>
                  </div>
                </div>

                <div style={{ marginTop: 22, paddingTop: 20, borderTop: "1px solid #e2e8f0" }}>
                  <span style={modalStyles.label}>Agendamento automático</span>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void applyPatch({ automaticBookingEnabled: !status.automaticBookingEnabled })}
                    style={{
                      padding: "11px 16px",
                      borderRadius: 10,
                      border: 0,
                      cursor: saving ? "wait" : "pointer",
                      fontWeight: 800,
                      background: status.automaticBookingEnabled ? "#dc2626" : "#16a34a",
                      color: "#ffffff",
                    }}
                  >
                    {status.automaticBookingEnabled ? "Pausar agendamento" : "Ativar agendamento"}
                  </button>
                  <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 13 }}>
                    A pausa é operacional. O número, webhook e conexão com a Meta permanecem ativos.
                  </p>
                </div>

                <div style={{ marginTop: 22, paddingTop: 20, borderTop: "1px solid #e2e8f0" }}>
                  <span style={modalStyles.label}>Limite diário</span>
                  <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                    <label style={{ display: "flex", gap: 7, alignItems: "center" }}>
                      <input type="radio" checked={limitMode === "unlimited"} onChange={() => setLimitMode("unlimited")} />
                      Sem limite
                    </label>
                    <label style={{ display: "flex", gap: 7, alignItems: "center" }}>
                      <input type="radio" checked={limitMode === "limited"} onChange={() => setLimitMode("limited")} />
                      Limitar por dia
                    </label>
                    {limitMode === "limited" && (
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={limitDraft}
                        onChange={(event) => setLimitDraft(event.target.value)}
                        placeholder="Ex.: 50"
                        style={{ width: 130, padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 9 }}
                      />
                    )}
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void saveLimit()}
                      style={{ padding: "9px 14px", borderRadius: 9, border: "1px solid #0f172a", background: "#0f172a", color: "white", cursor: saving ? "wait" : "pointer", fontWeight: 700 }}
                    >
                      Salvar limite
                    </button>
                  </div>
                  <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 13 }}>
                    O dia operacional segue America/Sao_Paulo. Apenas bookings confirmados aparecem no total; reservas em andamento ocupam capacidade para impedir excesso por concorrência.
                  </p>
                </div>

                <div style={{ marginTop: 22, paddingTop: 16, borderTop: "1px solid #e2e8f0", color: "#64748b", fontSize: 13 }}>
                  <strong>Última alteração:</strong> {status.updatedByEmail || "sistema"} · {formatDateTime(status.updatedAt)} · dia operacional {status.businessDate}
                </div>
              </>
            ) : !loading && (
              <p style={{ marginTop: 24, color: "#64748b" }}>Nenhuma clínica operacional disponível para este usuário.</p>
            )}
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}

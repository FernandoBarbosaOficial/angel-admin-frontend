import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  normalizeOperationRealtimePayload,
  OperationItem,
  OperationSnapshot,
} from "./operationRealtime.model";
import "./OperationRealtimePanel.css";

export { normalizeOperationRealtimePayload } from "./operationRealtime.model";

const POLIBON_TIME_ZONE = "America/Sao_Paulo";
const DEFAULT_REFRESH_SECONDS = 5;

type AdminApiRequest = <T>(path: string, options?: RequestInit) => Promise<T>;

type OperationRealtimePanelProps = {
  apiRequest: AdminApiRequest;
  onOpenIndicators: () => void;
};

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatClock(value: Date): string {
  return value.toLocaleTimeString("pt-BR", {
    timeZone: POLIBON_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDate(value: Date): string {
  return value.toLocaleDateString("pt-BR", {
    timeZone: POLIBON_TIME_ZONE,
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function formatDateTime(value: string | null): string {
  const parsed = parseDate(value);
  if (!parsed) return "Horário não informado";
  return parsed.toLocaleString("pt-BR", {
    timeZone: POLIBON_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatElapsed(value: string, now: Date): string {
  const parsed = parseDate(value);
  if (!parsed) return "Sem horário de atualização";

  const seconds = Math.max(
    0,
    Math.floor((now.getTime() - parsed.getTime()) / 1000),
  );
  if (seconds < 5) return "Atualizado agora";
  if (seconds < 60) return `Atualizado há ${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Atualizado há ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  return `Atualizado há ${hours} h`;
}

function statusTone(item: OperationItem): string {
  if (item.status === "atencao") return "warning";
  if (item.status === "encaminhado") return "handoff";
  if (item.status === "agendado") return "booked";
  if (item.status === "gravando_feegow") return "processing";
  if (item.status === "aguardando_paciente") return "waiting";
  if (item.status === "expirado") return "expired";
  return "active";
}

function OperationRow({
  item,
  now,
  showAppointment = false,
}: {
  item: OperationItem;
  now: Date;
  showAppointment?: boolean;
}) {
  return (
    <article className={`operationBoardRow ${statusTone(item)}`}>
      <div className="operationBoardIdentity">
        <strong>{item.patientLabel}</strong>
        <span>{item.specialty || "Especialidade ainda não informada"}</span>
      </div>

      <div className="operationBoardContext">
        <strong>{item.nextAction}</strong>
        <span>
          {[item.coverage, item.doctor].filter(Boolean).join(" · ") ||
            "Dados clínicos em coleta"}
        </span>
      </div>

      <div className="operationBoardTime">
        {showAppointment ? (
          <>
            <strong>{formatDateTime(item.appointmentStartAt)}</strong>
            <span>Consulta marcada</span>
          </>
        ) : (
          <>
            <strong>{formatElapsed(item.updatedAt, now)}</strong>
            <span>Última movimentação</span>
          </>
        )}
      </div>

      <div className="operationBoardStatus">
        <span className={`operationBoardBadge ${statusTone(item)}`}>
          {item.statusLabel}
        </span>
        {showAppointment && (
          <small>Gravado {formatElapsed(item.updatedAt, now).toLowerCase()}</small>
        )}
      </div>
    </article>
  );
}

function OperationLane({
  title,
  description,
  items,
  now,
  emptyTitle,
  emptyDescription,
  showAppointment = false,
  className = "",
}: {
  title: string;
  description: string;
  items: OperationItem[];
  now: Date;
  emptyTitle: string;
  emptyDescription: string;
  showAppointment?: boolean;
  className?: string;
}) {
  return (
    <section className={`operationBoardLane ${className}`.trim()}>
      <header>
        <div>
          <h4>{title}</h4>
          <p>{description}</p>
        </div>
        <strong className="operationBoardLaneCount">{items.length}</strong>
      </header>

      {items.length === 0 ? (
        <div className="operationBoardEmpty">
          <strong>{emptyTitle}</strong>
          <span>{emptyDescription}</span>
        </div>
      ) : (
        <div className="operationBoardRows">
          {items.map((item) => (
            <OperationRow
              key={item.id}
              item={item}
              now={now}
              showAppointment={showAppointment}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default function OperationRealtimePanel({
  apiRequest,
  onOpenIndicators,
}: OperationRealtimePanelProps) {
  const [snapshot, setSnapshot] = useState<OperationSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastSuccessAt, setLastSuccessAt] = useState<Date | null>(null);
  const [clock, setClock] = useState(() => new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [tvMode, setTvMode] = useState(false);
  const [nextRefreshAt, setNextRefreshAt] = useState(
    Date.now() + DEFAULT_REFRESH_SECONDS * 1000,
  );
  const requestSequence = useRef(0);

  const refreshSeconds =
    snapshot?.refreshAfterSeconds || DEFAULT_REFRESH_SECONDS;

  const loadSnapshot = useCallback(
    async (manual = false) => {
      const sequence = ++requestSequence.current;
      if (manual) setRefreshing(true);

      try {
        const payload = await apiRequest<unknown>(
          "/api/admin/operacao/tempo-real",
        );
        if (sequence !== requestSequence.current) return;

        const normalized = normalizeOperationRealtimePayload(payload);
        setSnapshot(normalized);
        setLastSuccessAt(new Date());
        setNextRefreshAt(
          Date.now() + normalized.refreshAfterSeconds * 1000,
        );
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
      if (document.visibilityState === "visible") {
        void loadSnapshot();
      }
    }, refreshSeconds * 1000);

    return () => window.clearInterval(timer);
  }, [autoRefresh, loadSnapshot, refreshSeconds]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && autoRefresh) {
        void loadSnapshot();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [autoRefresh, loadSnapshot]);

  useEffect(() => {
    document.documentElement.classList.toggle("operation-tv-mode", tvMode);
    return () =>
      document.documentElement.classList.remove("operation-tv-mode");
  }, [tvMode]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) setTvMode(false);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange,
      );
  }, []);

  const active = snapshot?.lanes.active || [];
  const booked = snapshot?.lanes.booked || [];

  const receptionAttention = useMemo(
    () =>
      [
        ...(snapshot?.lanes.attention || []),
        ...(snapshot?.lanes.handoffs || []),
      ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [snapshot],
  );

  const summary = snapshot?.summary || {
    emAtendimento: 0,
    aguardandoPaciente: 0,
    processando: 0,
    agendadosHoje: 0,
    atencoes: 0,
    encaminhadosHoje: 0,
    expiradosHoje: 0,
  };

  const attentionTotal = summary.atencoes + summary.encaminhadosHoje;
  const secondsToRefresh = autoRefresh
    ? Math.max(
        0,
        Math.ceil((nextRefreshAt - clock.getTime()) / 1000),
      )
    : null;
  const isStale = Boolean(
    lastSuccessAt &&
      clock.getTime() - lastSuccessAt.getTime() > 90 * 1000,
  );

  async function enterTvMode() {
    setTvMode(true);
    try {
      if (
        !document.fullscreenElement &&
        document.documentElement.requestFullscreen
      ) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // O layout de TV permanece ativo mesmo quando o navegador bloqueia fullscreen.
    }
  }

  async function exitTvMode() {
    setTvMode(false);
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {
      // O estado visual já foi restaurado.
    }
  }

  async function openIndicators() {
    await exitTvMode();
    onOpenIndicators();
  }

  return (
    <section
      className={`operationRealtimePanel operationBoard${tvMode ? " tvMode" : ""}`}
      aria-live="polite"
    >
      <header className="operationRealtimeHeader operationBoardHeader">
        <div className="operationRealtimeTitleBlock">
          <div className="operationRealtimeEyebrow">
            <span
              className={`operationRealtimeLiveDot${
                error || isStale ? " warning" : ""
              }`}
            />
            OPERAÇÃO POLIBON
          </div>
          <h3>Operação em tempo real</h3>
          <p>
            Atendimentos do Angel, ocorrências que exigem atenção e consultas
            gravadas hoje na Feegow.
          </p>
        </div>

        <div
          className="operationRealtimeClock"
          aria-label={`Horário atual ${formatClock(clock)}`}
        >
          <strong>{formatClock(clock)}</strong>
          <span>{formatDate(clock)}</span>
          <small className={error || isStale ? "warning" : "healthy"}>
            {error || isStale ? "Sincronização com atenção" : "Sincronização ativa"}
          </small>
        </div>

        <div className="operationRealtimeActions">
          {!tvMode && (
            <button
              type="button"
              className="secondaryButton"
              onClick={() => void openIndicators()}
            >
              Indicadores do dia
            </button>
          )}
          <button
            type="button"
            className="secondaryButton"
            onClick={() => {
              setAutoRefresh((current) => !current);
              setNextRefreshAt(Date.now() + refreshSeconds * 1000);
            }}
            title={
              autoRefresh
                ? "Pausar atualização automática"
                : "Retomar atualização automática"
            }
          >
            {autoRefresh
              ? `Automático · ${secondsToRefresh}s`
              : "Atualização pausada"}
          </button>
          <button
            type="button"
            onClick={() => void loadSnapshot(true)}
            disabled={refreshing}
          >
            {refreshing ? "Atualizando..." : "Atualizar agora"}
          </button>
          <button
            type="button"
            className={
              tvMode
                ? "operationTvExitButton"
                : "operationTvButton"
            }
            onClick={() =>
              void (tvMode ? exitTvMode() : enterTvMode())
            }
          >
            {tvMode ? "Sair do modo TV" : "Modo TV"}
          </button>
        </div>
      </header>

      {(error || isStale) && (
        <div className="operationRealtimeAlert" role="alert">
          <strong>
            {error ? "Falha na atualização" : "Atualização atrasada"}
          </strong>
          <span>
            {error ||
              "O painel manteve a última leitura válida. Verifique a conexão se a atualização não normalizar."}
          </span>
        </div>
      )}

      <div className="operationRealtimeSummaryGrid operationBoardSummary">
        <article>
          <span>Em atendimento</span>
          <strong>{summary.emAtendimento}</strong>
          <small>Sessões ativas agora</small>
        </article>
        <article>
          <span>Aguardando paciente</span>
          <strong>{summary.aguardandoPaciente}</strong>
          <small>Dependem de uma resposta</small>
        </article>
        <article>
          <span>Processando</span>
          <strong>{summary.processando}</strong>
          <small>Validação, busca ou gravação</small>
        </article>
        <article className={attentionTotal > 0 ? "warning" : ""}>
          <span>Atenções</span>
          <strong>{attentionTotal}</strong>
          <small>
            {summary.atencoes} falha(s) · {summary.encaminhadosHoje} orientação(ões)
          </small>
        </article>
        <article className="healthy">
          <span>Agendados hoje</span>
          <strong>{summary.agendadosHoje}</strong>
          <small>Gravados pelo Angel na Feegow</small>
        </article>
      </div>

      {loading && !snapshot ? (
        <div className="operationBoardLoading">
          <strong>Carregando a operação da Polibon...</strong>
          <span>Consultando atendimentos e agendamentos do Angel.</span>
        </div>
      ) : (
        <div className="operationBoardLanes">
          <OperationLane
            title="Atendimentos em andamento"
            description="O que o Angel está processando ou aguardando agora."
            items={active}
            now={clock}
            emptyTitle="Nenhum atendimento ativo agora."
            emptyDescription="Novas conversas aparecerão automaticamente nesta área."
            className="primary"
          />

          <OperationLane
            title="Atenções e orientações à recepção"
            description="Falhas operacionais e pacientes orientados a procurar atendimento humano."
            items={receptionAttention}
            now={clock}
            emptyTitle="Nenhuma atenção pendente."
            emptyDescription="Não há falhas nem orientações à recepção registradas hoje."
            className="attention"
          />

          <OperationLane
            title="Agendamentos gravados hoje"
            description="Consultas criadas pelo Angel hoje, independentemente da data futura da consulta."
            items={booked}
            now={clock}
            emptyTitle="Nenhum agendamento gravado hoje."
            emptyDescription="Um booking confirmado pela Feegow aparecerá aqui automaticamente."
            showAppointment
            className="booked"
          />
        </div>
      )}

      <footer className="operationRealtimeFooter">
        <span>
          Atualização automática a cada {refreshSeconds} segundos.
        </span>
        <span>
          {summary.expiradosHoje} atendimento(s) expirado(s) hoje · dados
          pessoais restritos ao mínimo operacional.
        </span>
      </footer>
    </section>
  );
}

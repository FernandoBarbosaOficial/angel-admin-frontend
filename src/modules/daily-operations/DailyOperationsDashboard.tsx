import { useCallback, useEffect, useMemo, useState } from "react";
import AngelIcon from "../../ui/AngelIcon";
import type { AngelIconName } from "../../ui/AngelIcon";
import {
  DAILY_OPERATIONS_PERIOD_OPTIONS,
  normalizeDailyOperationsPayload,
} from "./dailyOperations.model";
import type {
  DailyOperationsFunnelItem,
  DailyOperationsFunnelKey,
  DailyOperationsOutcomeItem,
  DailyOperationsOutcomeKey,
  DailyOperationsPeriodDays,
  DailyOperationsSnapshot,
  DailyOperationsTopItem,
} from "./dailyOperations.model";
import "./DailyOperationsDashboard.css";

type AdminApiRequest = <T>(
  path: string,
  options?: RequestInit,
) => Promise<T>;

type DailyOperationsDashboardProps = {
  apiRequest: AdminApiRequest;
};

type KpiTone =
  | "primary"
  | "success"
  | "trend"
  | "warning"
  | "purple"
  | "critical";

const POLIBON_TIME_ZONE = "America/Sao_Paulo";

const FUNNEL_ICONS: Record<DailyOperationsFunnelKey, AngelIconName> = {
  iniciaram_agendamento: "play",
  paciente_identificado: "user",
  cobertura_informada: "insurance",
  especialidade_informada: "specialty",
  horarios_exibidos: "slots",
  horario_escolhido: "clock",
  agendado_feegow: "booking",
};

const OUTCOME_ICONS: Record<DailyOperationsOutcomeKey, AngelIconName> = {
  agendado: "booking",
  orientado_recepcao: "reception",
  saida_paciente: "logout",
  timeout: "clock",
  regra_assistencial: "shield",
  cobertura_nao_validada: "insurance",
  sem_horarios: "calendar",
  falha_tecnica: "alert",
  sem_desfecho_registrado: "info",
};

function formatGeneratedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Horário indisponível";

  return date.toLocaleString("pt-BR", {
    timeZone: POLIBON_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatPercent(value: number | null): string {
  if (value === null) return "—";
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  })}%`;
}

function outcomeTone(
  key: DailyOperationsOutcomeItem["key"],
): string {
  if (key === "agendado") return "success";
  if (key === "falha_tecnica") return "critical";
  if (key === "orientado_recepcao") return "reception";
  if (
    key === "regra_assistencial" ||
    key === "cobertura_nao_validada" ||
    key === "sem_horarios"
  ) {
    return "warning";
  }
  if (key === "sem_desfecho_registrado") return "neutral";
  return "muted";
}

function KpiCard({
  label,
  value,
  description,
  icon,
  tone,
  progress,
}: {
  label: string;
  value: string | number;
  description: string;
  icon: AngelIconName;
  tone: KpiTone;
  progress?: number;
}) {
  const safeProgress =
    typeof progress === "number"
      ? Math.max(0, Math.min(100, progress))
      : null;

  return (
    <article className={`dailyKpiCard ${tone}`}>
      <div className="dailyKpiHeading">
        <span className="dailyKpiIcon" aria-hidden="true">
          <AngelIcon name={icon} size={19} />
        </span>
        <span className="dailyKpiLabel">{label}</span>
      </div>

      <strong>{value}</strong>

      {safeProgress !== null && (
        <div
          className="dailyKpiProgress"
          aria-label={`${formatPercent(safeProgress)} de conclusão`}
        >
          <i style={{ width: `${safeProgress}%` }} />
        </div>
      )}

      <small>{description}</small>
    </article>
  );
}

function FunnelRow({
  item,
  firstTotal,
}: {
  item: DailyOperationsFunnelItem;
  firstTotal: number;
}) {
  const width =
    firstTotal > 0
      ? Math.max(item.total > 0 ? 3 : 0, Math.min(100, (item.total / firstTotal) * 100))
      : 0;

  return (
    <article className={`dailyFunnelRow stage-${item.key}`}>
      <div className="dailyFunnelIdentity">
        <span className="dailyFunnelIcon" aria-hidden="true">
          <AngelIcon name={FUNNEL_ICONS[item.key]} size={17} />
        </span>
        <div className="dailyFunnelLabel">
          <strong>{item.label}</strong>
          <span>{item.evidenceDefinition}</span>
        </div>
      </div>

      <div className="dailyFunnelMeasure">
        <div className="dailyFunnelTrack" aria-hidden="true">
          <i style={{ width: `${width}%` }} />
        </div>

        <div className="dailyFunnelNumbers">
          <strong>{item.total}</strong>
          {item.previousTotal !== null && (
            <span>
              {formatPercent(item.conversionFromPrevious)}
              {item.lossFromPrevious !== null &&
                item.lossFromPrevious > 0 && (
                  <em>perda de {item.lossFromPrevious}</em>
                )}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function TopList({
  title,
  description,
  rows,
  icon,
}: {
  title: string;
  description: string;
  rows: DailyOperationsTopItem[];
  icon: AngelIconName;
}) {
  const max = Math.max(...rows.map((item) => item.total), 1);

  return (
    <section className="dailyPanel dailyTopList">
      <header>
        <div className="dailySectionTitle">
          <span aria-hidden="true">
            <AngelIcon name={icon} size={18} />
          </span>
          <div>
            <h4>{title}</h4>
            <p>{description}</p>
          </div>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="dailyEmptyCompact">
          Nenhum agendamento com esse dado no período.
        </div>
      ) : (
        <div className="dailyTopRows">
          {rows.map((item) => (
            <div className="dailyTopRow" key={item.label}>
              <div>
                <strong>{item.label}</strong>
                <span>{item.total}</span>
              </div>
              <div className="dailyTopTrack" aria-hidden="true">
                <i
                  style={{
                    width: `${Math.max(
                      4,
                      (item.total / max) * 100,
                    )}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function DailyOperationsDashboard({
  apiRequest,
}: DailyOperationsDashboardProps) {
  const [periodDays, setPeriodDays] =
    useState<DailyOperationsPeriodDays>(1);
  const [snapshot, setSnapshot] =
    useState<DailyOperationsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(
    async (manual = false) => {
      if (manual) setRefreshing(true);
      else setLoading(true);

      try {
        const payload = await apiRequest<unknown>(
          `/api/admin/operacao/visao-dia?days=${periodDays}`,
        );
        const normalized = normalizeDailyOperationsPayload(payload);
        setSnapshot(normalized);
        setError("");
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Não foi possível carregar a Visão do dia.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [apiRequest, periodDays],
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const firstFunnelTotal =
    snapshot?.funnel[0]?.total ||
    snapshot?.summary.iniciaramAgendamento ||
    0;

  const evolutionMax = useMemo(
    () =>
      Math.max(
        ...(snapshot?.breakdowns.evolucao || []).flatMap((item) => [
          item.iniciados,
          item.agendados,
        ]),
        1,
      ),
    [snapshot],
  );

  if (loading && !snapshot) {
    return (
      <section className="dailyOperationsRoot" aria-busy="true">
        <div className="dailyLoading">
          <span className="dailyLoadingIcon" aria-hidden="true">
            <AngelIcon name="dashboard" size={28} />
          </span>
          <strong>Carregando a Visão do dia</strong>
          <span>Consolidando sessões e agendamentos da Polibon.</span>
        </div>
      </section>
    );
  }

  return (
    <section className="dailyOperationsRoot">
      <header className="dailyOperationsHeader">
        <div className="dailyHeaderCopy">
          <span className="dailyEyebrow">OPERAÇÃO POLIBON</span>
          <h3>Visão do dia</h3>
          <p>
            Resultado dos fluxos de agendamento conduzidos pelo Angel,
            consolidado por atendimento e booking real.
          </p>
        </div>

        <div className="dailyHeaderVisual" aria-hidden="true">
          <div className="dailyVisualScreen">
            <div className="dailyVisualDots">
              <i />
              <i />
              <i />
            </div>
            <AngelIcon name="trend" size={40} />
            <span className="dailyVisualBar barOne" />
            <span className="dailyVisualBar barTwo" />
            <span className="dailyVisualBar barThree" />
          </div>
          <span className="dailyVisualLeaf leafOne" />
          <span className="dailyVisualLeaf leafTwo" />
        </div>

        <div className="dailyHeaderActions">
          <label>
            Período
            <select
              value={periodDays}
              onChange={(event) =>
                setPeriodDays(
                  Number(event.target.value) as DailyOperationsPeriodDays,
                )
              }
            >
              {DAILY_OPERATIONS_PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => void loadDashboard(true)}
            disabled={refreshing}
          >
            <AngelIcon name="refresh" size={16} />
            {refreshing ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
      </header>

      {error && (
        <div className="dailyError" role="alert">
          <span className="dailyErrorIcon" aria-hidden="true">
            <AngelIcon name="alert" size={19} />
          </span>
          <div>
            <strong>Não foi possível atualizar os indicadores</strong>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => void loadDashboard(true)}
            disabled={refreshing}
          >
            <AngelIcon name="refresh" size={16} />
            Tentar novamente
          </button>
        </div>
      )}

      {snapshot && (
        <>
          <div className="dailyContextBar">
            <div>
              <strong>{snapshot.scope.clienteNome}</strong>
              <span>{snapshot.period.label}</span>
            </div>
            <span className="dailyUpdatedAt">
              <AngelIcon name="clock" size={14} />
              Atualizado em {formatGeneratedAt(snapshot.generatedAt)}
            </span>
          </div>

          <div className="dailyKpiGrid">
            <KpiCard
              label="Iniciaram agendamento"
              value={snapshot.summary.iniciaramAgendamento}
              description="Sessões que entraram efetivamente no fluxo de marcação."
              icon="play"
              tone="primary"
            />
            <KpiCard
              label="Agendados na Feegow"
              value={snapshot.summary.agendadosFeegow}
              description="Bookings únicos gravados com sucesso."
              icon="booking"
              tone="success"
            />
            <KpiCard
              label="Taxa de conclusão"
              value={formatPercent(snapshot.summary.taxaConclusao)}
              description="Agendados divididos pelos fluxos iniciados."
              icon="trend"
              tone="trend"
              progress={snapshot.summary.taxaConclusao}
            />
            <KpiCard
              label="Encerrados sem agendamento"
              value={snapshot.summary.encerradosSemAgendamento}
              description="Somente sessões com desfecho terminal conhecido."
              icon="flag"
              tone="warning"
            />
            <KpiCard
              label="Orientados à recepção"
              value={snapshot.summary.orientadosRecepcao}
              description="Atendimentos que exigiram continuidade humana."
              icon="reception"
              tone="purple"
            />
            <KpiCard
              label="Falhas técnicas"
              value={snapshot.summary.falhasTecnicas}
              description="Erros técnicos terminais, sem misturar regras assistenciais."
              icon="alert"
              tone="critical"
            />
          </div>

          <div className="dailyPrimaryGrid">
            <section className="dailyPanel dailyFunnelPanel">
              <header>
                <div>
                  <h4>Funil de agendamento</h4>
                  <p>
                    Cada etapa representa evidência persistida na sessão.
                    As perdas mostram onde o fluxo deixou de avançar.
                  </p>
                </div>
                <span className="dailyPanelBadge">
                  {snapshot.summary.iniciaramAgendamento} iniciados
                </span>
              </header>

              <div className="dailyFunnelRows">
                {snapshot.funnel.map((item) => (
                  <FunnelRow
                    key={item.key}
                    item={item}
                    firstTotal={firstFunnelTotal}
                  />
                ))}
              </div>
            </section>

            <section className="dailyPanel dailyOutcomesPanel">
              <header>
                <div className="dailySectionTitle">
                  <span aria-hidden="true">
                    <AngelIcon name="flag" size={18} />
                  </span>
                  <div>
                    <h4>Desfechos do período</h4>
                    <p>
                      Resultado terminal de cada fluxo iniciado, sem presumir
                      abandono de sessões ainda abertas.
                    </p>
                  </div>
                </div>
              </header>

              {snapshot.outcomes.length === 0 ? (
                <div className="dailyEmptyCompact">
                  Nenhum desfecho registrado no período.
                </div>
              ) : (
                <div className="dailyOutcomeRows">
                  {snapshot.outcomes.map((item) => (
                    <div
                      className={`dailyOutcomeRow ${outcomeTone(
                        item.key,
                      )}`}
                      key={item.key}
                    >
                      <span className="dailyOutcomeIdentity">
                        <i aria-hidden="true">
                          <AngelIcon
                            name={OUTCOME_ICONS[item.key]}
                            size={15}
                          />
                        </i>
                        <span>{item.label}</span>
                      </span>
                      <strong>{item.total}</strong>
                    </div>
                  ))}
                </div>
              )}

              <div className="dailyOpenSessions">
                <span className="dailyOpenIdentity">
                  <i aria-hidden="true">
                    <AngelIcon name="info" size={15} />
                  </i>
                  <span>Sem desfecho registrado</span>
                </span>
                <strong>
                  {snapshot.summary.semDesfechoRegistrado}
                </strong>
                <small>
                  Pode representar sessão ativa ou ausência de evento
                  terminal. Não é contabilizado como abandono.
                </small>
              </div>
            </section>
          </div>

          <section className="dailyPanel dailyEvolutionPanel">
            <header>
              <div className="dailySectionTitle">
                <span aria-hidden="true">
                  <AngelIcon name="trend" size={18} />
                </span>
                <div>
                  <h4>Evolução no período</h4>
                  <p>
                    Comparação entre fluxos iniciados e bookings concluídos.
                  </p>
                </div>
              </div>
              <div className="dailyLegend" aria-label="Legenda">
                <span className="started">Iniciados</span>
                <span className="booked">Agendados</span>
              </div>
            </header>

            {snapshot.breakdowns.evolucao.length === 0 ? (
              <div className="dailyEmptyCompact">
                Sem evolução disponível no período.
              </div>
            ) : (
              <div className="dailyEvolutionRows">
                {snapshot.breakdowns.evolucao.map((item) => (
                  <div className="dailyEvolutionRow" key={item.date}>
                    <strong>{item.label}</strong>
                    <div className="dailyEvolutionBars">
                      <div>
                        <i
                          className="started"
                          style={{
                            width: `${Math.max(
                              item.iniciados > 0 ? 3 : 0,
                              (item.iniciados / evolutionMax) * 100,
                            )}%`,
                          }}
                        />
                        <span>{item.iniciados} iniciados</span>
                      </div>
                      <div>
                        <i
                          className="booked"
                          style={{
                            width: `${Math.max(
                              item.agendados > 0 ? 3 : 0,
                              (item.agendados / evolutionMax) * 100,
                            )}%`,
                          }}
                        />
                        <span>{item.agendados} agendados</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="dailyBreakdownGrid">
            <TopList
              title="Agendamentos por especialidade"
              description="Somente especialidades do booking final."
              rows={
                snapshot.breakdowns.agendadosPorEspecialidade
              }
              icon="specialty"
            />
            <TopList
              title="Agendamentos por médico"
              description="Somente profissionais do booking final."
              rows={snapshot.breakdowns.agendadosPorMedico}
              icon="doctor"
            />
            <TopList
              title="Agendamentos por convênio"
              description="Operadora, produto, rede ou plano do booking final."
              rows={snapshot.breakdowns.agendadosPorConvenio}
              icon="insurance"
            />
          </div>

          <details className="dailyQualityPanel">
            <summary>
              <span className="dailyQualityTitle">
                <i aria-hidden="true">
                  <AngelIcon name="shield" size={18} />
                </i>
                <span>
                  <strong>Qualidade e limitações dos dados</strong>
                  <small>Como estes indicadores são calculados</small>
                </span>
              </span>
              <strong>
                {snapshot.dataQuality.sessionsRead} sessões analisadas
              </strong>
            </summary>
            <div>
              <p>
                A medição é agregada por sessão. Bookings são
                deduplicados por {snapshot.dataQuality.bookingDeduplication}.
              </p>
              <div className="dailyQualityStats">
                <span>
                  {snapshot.dataQuality.rowsRead} registros lidos
                </span>
                <span>
                  {
                    snapshot.dataQuality
                      .sessionsWithBookingEvidence
                  }{" "}
                  sessões com evidência de booking
                </span>
                <span>
                  {
                    snapshot.dataQuality
                      .sessionsWithFinalBookingPayload
                  }{" "}
                  bookings com payload final
                </span>
              </div>
              {snapshot.dataQuality.limitations.length > 0 && (
                <ul>
                  {snapshot.dataQuality.limitations.map(
                    (limitation) => (
                      <li key={limitation}>{limitation}</li>
                    ),
                  )}
                </ul>
              )}
            </div>
          </details>
        </>
      )}
    </section>
  );
}

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import AngelIcon from "../../ui/AngelIcon";
import "./ConversationsPanel.css";

type AdminApiRequest = <T>(
  path: string,
  options?: RequestInit,
) => Promise<T>;

type ConversationsPanelProps = {
  apiRequest: AdminApiRequest;
};

type ConversationStatus =
  | "todos"
  | "agendado"
  | "recepcao"
  | "expirado"
  | "encerrado"
  | "em_andamento";

type PeriodMode =
  | "1"
  | "7"
  | "30"
  | "custom";

type Filters = {
  phone: string;
  period: PeriodMode;
  startDate: string;
  endDate: string;
  status: ConversationStatus;
};

type ConversationItem = {
  clienteId: number | null;
  clienteNome: string | null;
  sessionId: string;
  telefone: string | null;
  firstAt: string;
  lastAt: string;
  logCount: number;
  inboundCount: number;
  outboundCount: number;
  hasError: boolean;
  referredReception?: boolean;
  expired?: boolean;
  booked: boolean;
  status: ConversationStatus;
  lastStatus: string | null;
  lastStage: string | null;
  lastIntent: string | null;
  lastInboundText: string | null;
  lastOutboundText: string | null;
};

type ConversationMessage = {
  id: string;
  sourceLogId: string;
  createdAt: string;
  direction: "inbound" | "outbound";
  author: "patient" | "angel";
  text: string;
  messageId: string | null;
};

type ConversationSummary = {
  clienteId: number | null;
  clienteNome: string | null;
  sessionId: string;
  telefone: string | null;
  firstAt: string;
  lastAt: string;
  totalLogs: number;
  returnedLogs: number;
  returnedMessages: number;
  suppressedTechnicalDuplicates: number;
  truncated: boolean;
  transcriptTruncated: boolean;
  booked: boolean;
  hasError: boolean;
  referredReception?: boolean;
  expired?: boolean;
  status: ConversationStatus;
  lastStatus: string | null;
  lastStage: string | null;
  lastIntent: string | null;
};

type ConversationDetail = {
  conversation: ConversationSummary;
  messages: ConversationMessage[];
  logs?: unknown[];
};

type ConversationList = {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  items: ConversationItem[];
};

const BUSINESS_TIME_ZONE =
  "America/Sao_Paulo";

function unwrap<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload)
  ) {
    const record =
      payload as Record<string, unknown>;

    if (
      record.ok === true &&
      record.data !== undefined
    ) {
      return record.data as T;
    }
  }

  return payload as T;
}

function businessToday(): string {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: BUSINESS_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).format(new Date());
}

function formatDateTime(
  value?: string | null,
): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(
    "pt-BR",
    {
      timeZone: BUSINESS_TIME_ZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

function formatPhone(
  value?: string | null,
): string {
  const original = String(
    value || "",
  ).trim();

  const digits =
    original.replace(/\D/g, "");

  const local =
    digits.startsWith("55")
      ? digits.slice(2)
      : digits;

  if (local.length === 11) {
    return `(${local.slice(
      0,
      2,
    )}) ${local.slice(
      2,
      7,
    )}-${local.slice(7)}`;
  }

  if (local.length === 10) {
    return `(${local.slice(
      0,
      2,
    )}) ${local.slice(
      2,
      6,
    )}-${local.slice(6)}`;
  }

  return (
    original ||
    "Telefone não identificado"
  );
}

function statusLabel(
  value: ConversationStatus,
): string {
  switch (value) {
    case "agendado":
      return "Agendado";

    case "recepcao":
      return "Recepção";

    case "expirado":
      return "Expirado";

    case "encerrado":
      return "Encerrado";

    case "em_andamento":
      return "Em andamento";

    default:
      return "Todos";
  }
}

function preview(
  item: ConversationItem,
): string {
  return (
    item.lastInboundText ||
    item.lastOutboundText ||
    "Conversa sem texto disponível."
  );
}

export default function ConversationsPanel({
  apiRequest,
}: ConversationsPanelProps) {
  const today = useMemo(
    () => businessToday(),
    [],
  );

  const initialFilters =
    useMemo<Filters>(
      () => ({
        phone: "",
        period: "1",
        startDate: today,
        endDate: today,
        status: "todos",
      }),
      [today],
    );

  const [filters, setFilters] =
    useState<Filters>(
      initialFilters,
    );

  const [appliedFilters, setAppliedFilters] =
    useState<Filters>(
      initialFilters,
    );

  const [page, setPage] =
    useState(1);

  const [list, setList] =
    useState<ConversationList | null>(
      null,
    );

  const [
    selectedSessionId,
    setSelectedSessionId,
  ] = useState<string | null>(
    null,
  );

  const [detail, setDetail] =
    useState<ConversationDetail | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [
    detailLoading,
    setDetailLoading,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const validateFilters =
    useCallback(
      (value: Filters) => {
        if (
          value.period === "custom"
        ) {
          if (
            !value.startDate ||
            !value.endDate
          ) {
            throw new Error(
              "Informe a data inicial e a data final.",
            );
          }

          if (
            value.startDate >
            value.endDate
          ) {
            throw new Error(
              "A data inicial não pode ser posterior à data final.",
            );
          }
        }
      },
      [],
    );

  const buildParams =
    useCallback(() => {
      const params =
        new URLSearchParams();

      if (
        appliedFilters.period ===
        "custom"
      ) {
        params.set(
          "startDate",
          appliedFilters.startDate,
        );

        params.set(
          "endDate",
          appliedFilters.endDate,
        );
      } else {
        params.set(
          "days",
          appliedFilters.period,
        );
      }

      if (
        appliedFilters.phone.trim()
      ) {
        params.set(
          "q",
          appliedFilters.phone.trim(),
        );
      }

      if (
        appliedFilters.status !==
        "todos"
      ) {
        params.set(
          "status",
          appliedFilters.status,
        );
      }

      params.set(
        "page",
        String(page),
      );

      params.set(
        "pageSize",
        "25",
      );

      return params;
    }, [
      appliedFilters,
      page,
    ]);

  const loadConversations =
    useCallback(async () => {
      setLoading(true);

      try {
        const params =
          buildParams();

        const payload =
          await apiRequest<unknown>(
            `/api/admin/operacao/conversas?${params.toString()}`,
          );

        setList(
          unwrap<ConversationList>(
            payload,
          ),
        );

        setError("");
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Não foi possível carregar as conversas.",
        );
      } finally {
        setLoading(false);
      }
    }, [
      apiRequest,
      buildParams,
    ]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  const applyFilters = () => {
    try {
      validateFilters(filters);

      setPage(1);
      setSelectedSessionId(null);
      setDetail(null);

      setAppliedFilters({
        ...filters,
      });

      setError("");
    } catch (filterError) {
      setError(
        filterError instanceof Error
          ? filterError.message
          : "Filtros inválidos.",
      );
    }
  };

  const openConversation =
    useCallback(
      async (
        sessionId: string,
        clienteId: number | null,
      ) => {
        setSelectedSessionId(
          sessionId,
        );

        setDetailLoading(true);

        try {
          const params =
            new URLSearchParams();

          if (clienteId) {
            params.set(
              "clienteId",
              String(clienteId),
            );
          }

          const suffix =
            params.toString()
              ? `?${params.toString()}`
              : "";

          const payload =
            await apiRequest<unknown>(
              `/api/admin/operacao/conversas/${encodeURIComponent(
                sessionId,
              )}${suffix}`,
            );

          setDetail(
            unwrap<ConversationDetail>(
              payload,
            ),
          );

          setError("");
        } catch (requestError) {
          setDetail(null);

          setError(
            requestError instanceof Error
              ? requestError.message
              : "Não foi possível abrir a conversa.",
          );
        } finally {
          setDetailLoading(false);
        }
      },
      [apiRequest],
    );

  const pagination =
    list?.pagination || {
      page: 1,
      pageSize: 25,
      total: 0,
      totalPages: 1,
    };

  const totalPages =
    Math.max(
      1,
      pagination.totalPages || 1,
    );

  return (
    <section className="conversationsRoot">
      <header className="conversationsHeader">
        <div>
          <span className="conversationsEyebrow">
            OPERAÇÃO CLÍNICA
          </span>

          <h3>Conversas</h3>

          <p>
            Histórico real das conversas
            conduzidas pelo Angel. Eventos
            técnicos do processamento são
            consolidados para mostrar o que
            realmente foi dito pelo paciente
            e pela clínica.
          </p>
        </div>

        <button
          type="button"
          className="conversationsRefresh"
          onClick={() =>
            void loadConversations()
          }
          disabled={loading}
        >
          <AngelIcon
            name="refresh"
            size={16}
          />

          {loading
            ? "Atualizando..."
            : "Atualizar"}
        </button>
      </header>

      <section className="conversationsFilters">
        <label className="conversationSearch">
          Telefone
          <div>
            <AngelIcon
              name="whatsapp"
              size={17}
            />

            <input
              value={filters.phone}
              onChange={(event) =>
                setFilters(
                  (current) => ({
                    ...current,
                    phone:
                      event.target
                        .value,
                  }),
                )
              }
              placeholder="Buscar por telefone"
              onKeyDown={(event) => {
                if (
                  event.key === "Enter"
                ) {
                  applyFilters();
                }
              }}
            />
          </div>
        </label>

        <label>
          Período
          <select
            value={filters.period}
            onChange={(event) =>
              setFilters(
                (current) => ({
                  ...current,
                  period:
                    event.target
                      .value as PeriodMode,
                }),
              )
            }
          >
            <option value="1">
              Hoje
            </option>

            <option value="7">
              Últimos 7 dias
            </option>

            <option value="30">
              Últimos 30 dias
            </option>

            <option value="custom">
              Personalizado
            </option>
          </select>
        </label>

        {filters.period ===
          "custom" && (
          <>
            <label>
              Data inicial
              <input
                type="date"
                value={
                  filters.startDate
                }
                max={
                  filters.endDate ||
                  undefined
                }
                onChange={(event) =>
                  setFilters(
                    (current) => ({
                      ...current,
                      startDate:
                        event.target
                          .value,
                    }),
                  )
                }
              />
            </label>

            <label>
              Data final
              <input
                type="date"
                value={
                  filters.endDate
                }
                min={
                  filters.startDate ||
                  undefined
                }
                onChange={(event) =>
                  setFilters(
                    (current) => ({
                      ...current,
                      endDate:
                        event.target
                          .value,
                    }),
                  )
                }
              />
            </label>
          </>
        )}

        <label>
          Desfecho
          <select
            value={filters.status}
            onChange={(event) =>
              setFilters(
                (current) => ({
                  ...current,
                  status:
                    event.target
                      .value as ConversationStatus,
                }),
              )
            }
          >
            <option value="todos">
              Todos
            </option>

            <option value="agendado">
              Agendado
            </option>

            <option value="recepcao">
              Encaminhado à recepção
            </option>

            <option value="expirado">
              Expirado
            </option>

            <option value="encerrado">
              Encerrado
            </option>

            <option value="em_andamento">
              Em andamento
            </option>
          </select>
        </label>

        <button
          type="button"
          onClick={applyFilters}
          disabled={loading}
        >
          Filtrar
        </button>
      </section>

      {error && (
        <div
          className="conversationsError"
          role="alert"
        >
          <AngelIcon
            name="alert"
            size={18}
          />
          <span>{error}</span>
        </div>
      )}

      <div className="conversationsLayout">
        <section className="conversationListPanel">
          <header>
            <strong>
              {pagination.total.toLocaleString(
                "pt-BR",
              )}{" "}
              conversas
            </strong>

            <span>
              Página {pagination.page} de{" "}
              {totalPages}
            </span>
          </header>

          {loading && !list ? (
            <div className="conversationEmpty">
              Carregando conversas...
            </div>
          ) : list?.items.length ? (
            <div className="conversationList">
              {list.items.map(
                (item) => (
                  <button
                    type="button"
                    key={`${item.clienteId || 0}:${item.sessionId}`}
                    className={
                      selectedSessionId ===
                      item.sessionId
                        ? "conversationListItem active"
                        : "conversationListItem"
                    }
                    onClick={() =>
                      void openConversation(
                        item.sessionId,
                        item.clienteId,
                      )
                    }
                  >
                    <div className="conversationListTop">
                      <strong>
                        {formatPhone(
                          item.telefone,
                        )}
                      </strong>

                      <span
                        className={`conversationStatus status-${item.status}`}
                      >
                        {statusLabel(
                          item.status,
                        )}
                      </span>
                    </div>

                    <p>
                      {preview(item)}
                    </p>

                    <div className="conversationListMeta">
                      <span>
                        {formatDateTime(
                          item.lastAt,
                        )}
                      </span>

                      {item.clienteNome && (
                        <span>
                          {
                            item.clienteNome
                          }
                        </span>
                      )}
                    </div>
                  </button>
                ),
              )}
            </div>
          ) : (
            <div className="conversationEmpty">
              Nenhuma conversa encontrada
              para os filtros
              selecionados.
            </div>
          )}

          <footer className="conversationPagination">
            <button
              type="button"
              disabled={
                loading ||
                pagination.page <= 1
              }
              onClick={() => {
                setSelectedSessionId(
                  null,
                );
                setDetail(null);

                setPage(
                  (current) =>
                    Math.max(
                      1,
                      current - 1,
                    ),
                );
              }}
            >
              Anterior
            </button>

            <span>
              {pagination.page} /{" "}
              {totalPages}
            </span>

            <button
              type="button"
              disabled={
                loading ||
                pagination.page >=
                  totalPages
              }
              onClick={() => {
                setSelectedSessionId(
                  null,
                );
                setDetail(null);

                setPage(
                  (current) =>
                    Math.min(
                      totalPages,
                      current + 1,
                    ),
                );
              }}
            >
              Próxima
            </button>
          </footer>
        </section>

        <section className="conversationDetailPanel">
          {!selectedSessionId ? (
            <div className="conversationEmpty conversationSelectHint">
              <AngelIcon
                name="whatsapp"
                size={34}
              />

              <strong>
                Selecione uma conversa
              </strong>

              <span>
                O diálogo completo aparece
                aqui sem queued, processing,
                sent ou outros eventos
                técnicos repetidos.
              </span>
            </div>
          ) : detailLoading ? (
            <div className="conversationEmpty">
              Carregando conversa...
            </div>
          ) : detail ? (
            <>
              <header className="conversationDetailHeader">
                <div>
                  <span>
                    Atendimento
                  </span>

                  <strong>
                    {formatPhone(
                      detail
                        .conversation
                        .telefone,
                    )}
                  </strong>
                </div>

                <span
                  className={`conversationStatus status-${detail.conversation.status}`}
                >
                  {statusLabel(
                    detail
                      .conversation
                      .status,
                  )}
                </span>
              </header>

              <div className="conversationDetailMeta">
                <span>
                  Início:{" "}
                  {formatDateTime(
                    detail
                      .conversation
                      .firstAt,
                  )}
                </span>

                <span>
                  Última interação:{" "}
                  {formatDateTime(
                    detail
                      .conversation
                      .lastAt,
                  )}
                </span>

                {detail.conversation
                  .suppressedTechnicalDuplicates >
                  0 && (
                  <span>
                    {
                      detail
                        .conversation
                        .suppressedTechnicalDuplicates
                    }{" "}
                    repetições técnicas
                    ocultadas
                  </span>
                )}
              </div>

              <div className="conversationTranscript">
                {detail.messages.length ? (
                  detail.messages.map(
                    (message) => (
                      <article
                        key={message.id}
                        className={`conversationBubble ${
                          message.direction ===
                          "inbound"
                            ? "patient"
                            : "angel"
                        }`}
                      >
                        <span>
                          {message.direction ===
                          "inbound"
                            ? "Paciente"
                            : "Angel"}
                        </span>

                        <p>
                          {message.text}
                        </p>

                        <time>
                          {formatDateTime(
                            message.createdAt,
                          )}
                        </time>
                      </article>
                    ),
                  )
                ) : (
                  <div className="conversationEmpty">
                    Nenhuma mensagem textual
                    encontrada.
                  </div>
                )}
              </div>

              {Array.isArray(
                detail.logs,
              ) && (
                <details className="conversationTechnical">
                  <summary>
                    Detalhes técnicos
                  </summary>

                  <p>
                    JSON técnico disponível
                    somente para administração.
                  </p>

                  <pre>
                    {JSON.stringify(
                      detail.logs,
                      null,
                      2,
                    )}
                  </pre>
                </details>
              )}
            </>
          ) : (
            <div className="conversationEmpty">
              Não foi possível carregar a
              conversa.
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

import { useMemo, useState } from "react";

export type DateRangeValue = {
  startDate: string;
  endDate: string;
};

const TIME_ZONE = "America/Sao_Paulo";

function zonedToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function shiftDate(dateText: string, amount: number): string {
  const [year, month, day] = dateText.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount, 12, 0, 0));
  return date.toISOString().slice(0, 10);
}

export function defaultDateRange(days = 7): DateRangeValue {
  const endDate = zonedToday();
  return {
    endDate,
    startDate: shiftDate(endDate, -(Math.max(1, days) - 1)),
  };
}

export function rangeDays(value: DateRangeValue): number {
  const start = new Date(`${value.startDate}T12:00:00Z`).getTime();
  const end = new Date(`${value.endDate}T12:00:00Z`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.floor((end - start) / 86400000) + 1;
}

export default function PeriodRangePicker({
  value,
  onChange,
  onApply,
  loading = false,
  maxDays = 366,
}: {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  onApply?: () => void;
  loading?: boolean;
  maxDays?: number;
}) {
  const [open, setOpen] = useState(false);
  const days = useMemo(() => rangeDays(value), [value]);
  const invalid = days < 1 || days > maxDays;

  function preset(periodDays: number) {
    onChange(defaultDateRange(periodDays));
  }

  return (
    <div className="adminV2PeriodPicker">
      <div className="adminV2PeriodPresets" aria-label="Atalhos de período">
        <button type="button" onClick={() => preset(1)}>Hoje</button>
        <button type="button" onClick={() => preset(7)}>7 dias</button>
        <button type="button" onClick={() => preset(30)}>30 dias</button>
        <button type="button" className="adminV2CalendarButton" onClick={() => setOpen((current) => !current)}>
          <span aria-hidden="true">📅</span>
          Personalizado
        </button>
      </div>

      <div className="adminV2PeriodSummary">
        <strong>{value.startDate === value.endDate ? value.startDate : `${value.startDate} → ${value.endDate}`}</strong>
        <span>{days || 0} dia(s)</span>
      </div>

      {open && (
        <div className="adminV2CalendarPopover">
          <label>
            Data inicial
            <input
              type="date"
              value={value.startDate}
              onChange={(event) => onChange({ ...value, startDate: event.target.value })}
              max={value.endDate || undefined}
            />
          </label>
          <label>
            Data final
            <input
              type="date"
              value={value.endDate}
              onChange={(event) => onChange({ ...value, endDate: event.target.value })}
              min={value.startDate || undefined}
            />
          </label>
          <small className={invalid ? "adminV2PeriodError" : ""}>
            {invalid ? `Escolha um intervalo entre 1 e ${maxDays} dias.` : `Consulta em America/Sao_Paulo · ${days} dia(s).`}
          </small>
        </div>
      )}

      {onApply && (
        <button type="button" className="adminV2ApplyPeriod" disabled={invalid || loading} onClick={onApply}>
          {loading ? "Consultando..." : "Aplicar período"}
        </button>
      )}
    </div>
  );
}

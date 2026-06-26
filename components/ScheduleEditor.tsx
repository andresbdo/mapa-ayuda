import {
  DAY_LABELS,
  type DayKey,
  type DaySchedule,
  type ScheduleMode,
} from "@/lib/schedule";
import { DAYS } from "@/lib/types";

export default function ScheduleEditor({
  mode,
  onModeChange,
  generalDays,
  onGeneralDaysChange,
  generalOpenTime,
  onGeneralOpenTimeChange,
  generalCloseTime,
  onGeneralCloseTimeChange,
  byDay,
  onByDayChange,
}: {
  mode: ScheduleMode;
  onModeChange: (mode: ScheduleMode) => void;
  generalDays: DayKey[];
  onGeneralDaysChange: (days: DayKey[]) => void;
  generalOpenTime: string;
  onGeneralOpenTimeChange: (time: string) => void;
  generalCloseTime: string;
  onGeneralCloseTimeChange: (time: string) => void;
  byDay: DaySchedule[];
  onByDayChange: (schedule: DaySchedule[]) => void;
}) {
  const toggleGeneralDay = (day: DayKey) => {
    onGeneralDaysChange(
      generalDays.includes(day)
        ? generalDays.filter((item) => item !== day)
        : [...generalDays, day]
    );
  };

  const updateDay = (day: DayKey, patch: Partial<DaySchedule>) => {
    onByDayChange(
      byDay.map((row) => (row.day === day ? { ...row, ...patch } : row))
    );
  };

  return (
    <div className="mb-3">
      <span className="mb-2 block text-sm font-medium text-black/70">
        Horario
      </span>

      <div className="mb-3 grid grid-cols-3 rounded-2xl bg-black/5 p-1">
        <ModeButton active={mode === "GENERAL"} onClick={() => onModeChange("GENERAL")}>
          General
        </ModeButton>
        <ModeButton active={mode === "BY_DAY"} onClick={() => onModeChange("BY_DAY")}>
          Por día
        </ModeButton>
        <ModeButton active={mode === "ALWAYS"} onClick={() => onModeChange("ALWAYS")}>
          24 hs
        </ModeButton>
      </div>

      {mode === "GENERAL" && (
        <div className="rounded-2xl border border-black/10 bg-white p-3">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {DAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleGeneralDay(day)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                  generalDays.includes(day)
                    ? "bg-black text-white"
                    : "bg-black/5 text-black/55"
                }`}
              >
                {DAY_LABELS[day]}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <input
              type="time"
              value={generalOpenTime}
              onChange={(e) => onGeneralOpenTimeChange(e.target.value)}
              className="min-w-0 rounded-xl border border-black/10 px-2 py-2 text-sm outline-none focus:border-blue-500"
              aria-label="Hora de apertura"
            />
            <span className="text-xs font-medium text-black/35">a</span>
            <input
              type="time"
              value={generalCloseTime}
              onChange={(e) => onGeneralCloseTimeChange(e.target.value)}
              className="min-w-0 rounded-xl border border-black/10 px-2 py-2 text-sm outline-none focus:border-blue-500"
              aria-label="Hora de cierre"
            />
          </div>
        </div>
      )}

      {mode === "ALWAYS" && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-800">
            Abierto 24 horas, todos los días
          </p>
          <p className="mt-1 text-xs text-blue-700/70">
            Se mostrará como disponible toda la semana.
          </p>
        </div>
      )}

      {mode === "BY_DAY" && (
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
          <div className="grid grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)_3rem] gap-1 border-b border-black/5 bg-black/[0.025] px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-black/40">
            <span>Día</span>
            <span>Abre</span>
            <span>Cierra</span>
            <span className="text-center">24h</span>
          </div>
          {byDay.map((row) => (
            <div
              key={row.day}
              className={`grid grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)_3rem] items-center gap-1 border-b border-black/5 px-2 py-2 last:border-0 ${
                row.enabled ? "bg-white" : "bg-black/[0.018]"
              }`}
            >
              <button
                type="button"
                onClick={() => updateDay(row.day, { enabled: !row.enabled })}
                className={`h-9 rounded-xl text-xs font-bold ${
                  row.enabled ? "bg-black text-white" : "bg-black/5 text-black/40"
                }`}
              >
                {DAY_LABELS[row.day]}
              </button>
              <input
                type="time"
                value={row.openTime}
                onChange={(e) =>
                  updateDay(row.day, { openTime: e.target.value, open24: false })
                }
                disabled={!row.enabled || row.open24}
                className="min-w-0 rounded-xl border border-black/10 px-2 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-black/5 disabled:text-black/30"
                aria-label={`Apertura ${DAY_LABELS[row.day]}`}
              />
              <input
                type="time"
                value={row.closeTime}
                onChange={(e) =>
                  updateDay(row.day, { closeTime: e.target.value, open24: false })
                }
                disabled={!row.enabled || row.open24}
                className="min-w-0 rounded-xl border border-black/10 px-2 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-black/5 disabled:text-black/30"
                aria-label={`Cierre ${DAY_LABELS[row.day]}`}
              />
              <button
                type="button"
                disabled={!row.enabled}
                onClick={() =>
                  updateDay(row.day, {
                    open24: !row.open24,
                    openTime: "",
                    closeTime: "",
                  })
                }
                className={`h-9 rounded-xl text-xs font-bold disabled:bg-black/5 disabled:text-black/25 ${
                  row.open24 ? "bg-blue-600 text-white" : "bg-black/5 text-black/50"
                }`}
              >
                24
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-2 py-2 text-xs font-semibold transition ${
        active ? "bg-white text-black shadow-sm" : "text-black/50"
      }`}
    >
      {children}
    </button>
  );
}

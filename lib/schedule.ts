import { DAYS } from "./types";

export type DayKey = (typeof DAYS)[number];

export type DaySchedule = {
  day: DayKey;
  enabled: boolean;
  open24: boolean;
  openTime: string;
  closeTime: string;
};

export type ScheduleMode = "GENERAL" | "BY_DAY" | "ALWAYS";

export type ScheduleState = {
  mode: ScheduleMode;
  generalDays: DayKey[];
  generalOpenTime: string;
  generalCloseTime: string;
  byDay: DaySchedule[];
};

type StoredDay = {
  open24?: boolean;
  open?: string;
  close?: string;
};

type StoredSchedule = {
  v?: number;
  days?: Partial<Record<DayKey, StoredDay>>;
};

export const DAY_LABELS: Record<DayKey, string> = {
  lun: "Lun",
  mar: "Mar",
  mie: "Mié",
  jue: "Jue",
  vie: "Vie",
  sab: "Sáb",
  dom: "Dom",
};

export const DAY_SHORT_LABELS: Record<DayKey, string> = {
  lun: "L",
  mar: "M",
  mie: "X",
  jue: "J",
  vie: "V",
  sab: "S",
  dom: "D",
};

export function emptySchedule(): DaySchedule[] {
  return DAYS.map((day) => ({
    day,
    enabled: false,
    open24: false,
    openTime: "",
    closeTime: "",
  }));
}

export function parseLegacyHours(hours: string | null) {
  if (hours === "24 horas") return { open24: true, openTime: "", closeTime: "" };
  const m = hours?.match(/^(\d{2}:\d{2}) a (\d{2}:\d{2})$/);
  if (m) return { open24: false, openTime: m[1], closeTime: m[2] };
  const from = hours?.match(/^Desde (\d{2}:\d{2})$/);
  if (from) return { open24: false, openTime: from[1], closeTime: "" };
  return { open24: false, openTime: "", closeTime: "" };
}

export function parseSchedule(days: string[], hours: string | null): DaySchedule[] {
  const base = emptySchedule();
  let parsed: StoredSchedule | null = null;

  if (hours?.startsWith("{")) {
    try {
      parsed = JSON.parse(hours) as StoredSchedule;
    } catch {
      parsed = null;
    }
  }

  if (parsed?.days) {
    return base.map((row) => {
      const stored = parsed.days?.[row.day];
      return {
        ...row,
        enabled: !!stored,
        open24: !!stored?.open24,
        openTime: stored?.open ?? "",
        closeTime: stored?.close ?? "",
      };
    });
  }

  const legacy = parseLegacyHours(hours);
  return base.map((row) => ({
    ...row,
    enabled: days.includes(row.day),
    ...legacy,
  }));
}

export function serializeSchedule(schedule: DaySchedule[]) {
  const active = schedule.filter((row) => row.enabled);
  return {
    days: active.map((row) => row.day),
    hours:
      active.length > 0
        ? JSON.stringify({
            v: 1,
            days: Object.fromEntries(
              active.map((row) => [
                row.day,
                {
                  open24: row.open24,
                  open: row.open24 ? "" : row.openTime,
                  close: row.open24 ? "" : row.closeTime,
                },
              ])
            ),
          })
        : "",
  };
}

export function inferScheduleState(days: string[], hours: string | null): ScheduleState {
  const parsed = parseSchedule(days, hours);
  const legacy = parseLegacyHours(hours);
  const hasStoredPerDay = !!hours?.startsWith("{");
  const active = parsed.filter((row) => row.enabled);
  const allDaysOpen = active.length === DAYS.length;
  const all24 = active.length > 0 && active.every((row) => row.open24);

  if (hasStoredPerDay) {
    return {
      mode: "BY_DAY",
      generalDays: [],
      generalOpenTime: "",
      generalCloseTime: "",
      byDay: parsed,
    };
  }

  if ((hours === "24 horas" && allDaysOpen) || (allDaysOpen && all24)) {
    return {
      mode: "ALWAYS",
      generalDays: [...DAYS],
      generalOpenTime: "",
      generalCloseTime: "",
      byDay: parsed,
    };
  }

  return {
    mode: "GENERAL",
    generalDays: days.filter((day): day is DayKey =>
      DAYS.includes(day as DayKey)
    ),
    generalOpenTime: legacy.openTime,
    generalCloseTime: legacy.closeTime,
    byDay: parsed,
  };
}

export function serializeScheduleState(state: ScheduleState) {
  if (state.mode === "ALWAYS") {
    return { days: [...DAYS], hours: "24 horas" };
  }

  if (state.mode === "GENERAL") {
    const hours =
      state.generalOpenTime && state.generalCloseTime
        ? `${state.generalOpenTime} a ${state.generalCloseTime}`
        : state.generalOpenTime
          ? `Desde ${state.generalOpenTime}`
          : "";
    return { days: state.generalDays, hours };
  }

  return serializeSchedule(state.byDay);
}

export function formatDayHours(row: DaySchedule): string {
  if (!row.enabled) return "Cerrado";
  if (row.open24) return "24 horas";
  if (row.openTime && row.closeTime) return `${row.openTime} a ${row.closeTime}`;
  if (row.openTime) return `Desde ${row.openTime}`;
  return "Horario no indicado";
}

export function scheduleSummary(days: string[], hours: string | null): string {
  const rows = parseSchedule(days, hours).filter((row) => row.enabled);
  if (rows.length === 0) return "";

  const first = formatDayHours(rows[0]);
  const allSame = rows.every((row) => formatDayHours(row) === first);
  if (allSame) return first;
  return "Horarios por día";
}

export function todayScheduleSummary(days: string[], hours: string | null) {
  if (days.length === 0 && !hours) return "";
  const jsDayToDayKey: DayKey[] = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];
  const today = jsDayToDayKey[new Date().getDay()];
  const row = parseSchedule(days, hours).find((item) => item.day === today);
  if (!row) return "";
  return `Hoy: ${formatDayHours(row)}`;
}

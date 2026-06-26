export function isoToDisplayDate(value: string | null): string {
  if (!value) return "";
  const isoDate = new Date(value).toISOString().slice(0, 10);
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

export function isoToDisplayTime(value: string | null): string {
  if (!value) return "";
  return new Date(value).toTimeString().slice(0, 5);
}

export function displayDateToIso(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  const year = match[3];
  const date = new Date(`${year}-${month}-${day}T00:00:00.000Z`);

  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() + 1 !== Number(month) ||
    date.getUTCDate() !== Number(day)
  ) {
    return null;
  }

  return `${year}-${month}-${day}`;
}

export function displayDeadlineToIso(dateValue: string, timeValue: string): string | null {
  const dateIso = displayDateToIso(dateValue);
  if (dateIso == null) return null;
  if (!dateIso) return timeValue ? null : "";

  const time = timeValue.trim() || "23:59";
  if (!/^\d{2}:\d{2}$/.test(time)) return null;

  const [year, month, day] = dateIso.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  if (hour > 23 || minute > 59) return null;

  return new Date(year, month - 1, day, hour, minute).toISOString();
}

export function formatDateInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

"use client";

import { contactPhonesFromPoint, phoneToWaMe } from "@/lib/contact";
import { shortAddress } from "@/lib/address";
import { DAY_LABELS, formatDayHours, parseSchedule } from "@/lib/schedule";
import { TYPE_LABELS } from "@/lib/types";
import type { Point } from "./MapView";

export default function PointDetails({
  point,
  onClose,
  onEdit,
}: {
  point: Point;
  onClose: () => void;
  onEdit: () => void;
}) {
  const isCollection = point.type === "COLLECTION";
  const accent = isCollection ? "text-blue-700" : "text-red-700";
  const dot = isCollection ? "bg-blue-600" : "bg-red-600";
  const contacts = contactPhonesFromPoint(point.contacts, point.contact);
  const schedule = parseSchedule(point.days, point.hours);

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <span
              className={`mb-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${accent}`}
            >
              <span className={`h-2 w-2 rounded-full ${dot}`} />
              {TYPE_LABELS[point.type]}
            </span>
            <h2 className="text-xl font-bold">{point.name}</h2>
            {point.temporarilyUnavailable && (
              <span className="mt-1 inline-flex rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold uppercase text-white">
                No disponible
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-2xl leading-none text-black/40">
            ×
          </button>
        </div>

        {point.items.length > 0 && (
          <div className="mb-3">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-black/40">
              {isCollection ? "Reciben" : "Entregan"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {point.items.map((it) => (
                <span
                  key={it}
                  className="rounded-full bg-black/5 px-2.5 py-1 text-sm"
                >
                  {it}
                </span>
              ))}
            </div>
          </div>
        )}

        <dl className="space-y-2 text-sm">
          {(point.startDate || point.endDate) && (
            <Row label="Fechas" value={formatRange(point.startDate, point.endDate)} />
          )}
          {point.days.length > 0 && (
            <div className="grid gap-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-black/40">
                Horario
              </dt>
              <dd className="grid gap-1.5">
                {schedule.map((row) => (
                  <div
                    key={row.day}
                    className={`grid grid-cols-[2.5rem_1fr] items-center gap-2 rounded-xl px-2.5 py-2 ${
                      row.enabled ? "bg-black/[0.04]" : "bg-black/[0.02]"
                    }`}
                  >
                    <span
                      className={`rounded-md px-1.5 py-1 text-center text-[11px] font-bold ${
                        row.enabled
                          ? "bg-black text-white"
                          : "bg-black/10 text-black/35"
                      }`}
                    >
                      {DAY_LABELS[row.day]}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 ${
                        row.enabled ? "text-black/75" : "text-black/35"
                      }`}
                    >
                      <ClockIcon />
                      {formatDayHours(row)}
                    </span>
                  </div>
                ))}
              </dd>
            </div>
          )}
          {point.address && (
            <Row label="Dirección" value={shortAddress(point.address)} />
          )}
          {point.description && <Row label="Notas" value={point.description} />}
        </dl>

        <div className="mt-4 grid gap-2">
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-xl bg-blue-600 py-3 text-center text-sm font-semibold text-white"
          >
            Abrir en Google Maps
          </a>

          {contacts.length > 0 && (
            <div className="grid gap-2">
              {contacts.map((contact) => (
                <a
                  key={contact.phone}
                  href={
                    contact.whatsapp
                      ? `https://wa.me/${phoneToWaMe(contact.phone)}`
                      : `tel:${contact.phone}`
                  }
                  target={contact.whatsapp ? "_blank" : undefined}
                  rel={contact.whatsapp ? "noopener noreferrer" : undefined}
                  className={`block w-full rounded-xl py-3 text-center text-sm font-semibold text-white ${
                    contact.whatsapp ? "bg-green-600" : "bg-black"
                  }`}
                >
                  {contact.whatsapp ? "WhatsApp" : "Llamar"} {contact.phone}
                </a>
              ))}
            </div>
          )}

          {point.instagram && (
            <a
              href={`https://www.instagram.com/${point.instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-xl bg-pink-600 py-3 text-center text-sm font-semibold text-white"
            >
              Instagram @{point.instagram}
            </a>
          )}
        </div>

        <button
          onClick={onEdit}
          className="mt-2 w-full rounded-xl border border-black/10 py-3 text-sm font-medium"
        >
          Editar punto
        </button>
      </div>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5 shrink-0 text-black/45"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <path d="M8 14.25A6.25 6.25 0 1 0 8 1.75a6.25 6.25 0 0 0 0 12.5Z" />
      <path d="M8 4.75V8l2.2 1.3" />
    </svg>
  );
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("es", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function fmtWithTime(d: string) {
  return new Date(d).toLocaleString("es", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRange(start: string | null, end: string | null) {
  if (start && end) return `${fmt(start)} – ${fmtWithTime(end)}`;
  if (start) return `Desde ${fmt(start)}`;
  return `Hasta ${fmtWithTime(end!)}`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-20 shrink-0 text-black/40">{label}</dt>
      <dd className="flex-1">{value}</dd>
    </div>
  );
}

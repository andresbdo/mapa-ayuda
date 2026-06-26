"use client";

import { TYPE_LABELS } from "@/lib/types";
import type { Point } from "./MapView";

export default function PointDetails({
  point,
  onClose,
}: {
  point: Point;
  onClose: () => void;
}) {
  const isCollection = point.type === "COLLECTION";
  const accent = isCollection ? "text-blue-700" : "text-red-700";
  const dot = isCollection ? "bg-blue-600" : "bg-red-600";

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
            <Row label="Días" value={point.days.join(", ")} />
          )}
          {point.hours && <Row label="Horario" value={point.hours} />}
          {point.address && <Row label="Dirección" value={point.address} />}
          {point.description && <Row label="Notas" value={point.description} />}
        </dl>

        {point.contact && (
          <a
            href={`https://wa.me/${point.contact.replace(/[^0-9]/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 block w-full rounded-xl bg-green-600 py-3 text-center text-sm font-semibold text-white"
          >
            Contactar: {point.contact}
          </a>
        )}

        <a
          href={`https://www.openstreetmap.org/?mlat=${point.lat}&mlon=${point.lng}#map=17/${point.lat}/${point.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block w-full rounded-xl border border-black/10 py-3 text-center text-sm font-medium"
        >
          Cómo llegar
        </a>
      </div>
    </div>
  );
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("es", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function formatRange(start: string | null, end: string | null) {
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `Desde ${fmt(start)}`;
  return `Hasta ${fmt(end!)}`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-20 shrink-0 text-black/40">{label}</dt>
      <dd className="flex-1">{value}</dd>
    </div>
  );
}

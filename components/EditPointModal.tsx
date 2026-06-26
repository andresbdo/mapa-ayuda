"use client";

import { useState } from "react";
import { TYPE_LABELS, type PointType } from "@/lib/types";
import {
  displayDateToIso,
  displayDeadlineToIso,
  isoToDisplayDate,
  isoToDisplayTime,
} from "@/lib/dates";
import {
  contactPhonesFromPoint,
  normalizeContactPhones,
  normalizeInstagramHandle,
  type ContactPhone,
} from "@/lib/contact";
import { readApiError } from "@/lib/form-errors";
import { inferScheduleState, serializeScheduleState } from "@/lib/schedule";
import { haversineKm, formatKm } from "@/lib/geo";
import ContactPhonesEditor from "./ContactPhonesEditor";
import ScheduleEditor from "./ScheduleEditor";
import type { Point } from "./MapView";

type GeoResult = {
  lat: string;
  lon: string;
  display_name: string;
  km?: number;
};

export default function EditPointModal({
  point,
  userLoc,
  onClose,
  onSaved,
}: {
  point: Point;
  userLoc?: { lat: number; lng: number } | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<PointType>(point.type);
  const [name, setName] = useState(point.name);
  const [items, setItems] = useState<string[]>(point.items);
  const [itemInput, setItemInput] = useState("");
  const [scheduleState, setScheduleState] = useState(() =>
    inferScheduleState(point.days, point.hours)
  );
  const [startDate, setStartDate] = useState(isoToDisplayDate(point.startDate));
  const [endDate, setEndDate] = useState(isoToDisplayDate(point.endDate));
  const [endTime, setEndTime] = useState(isoToDisplayTime(point.endDate));
  const [loc, setLoc] = useState<{ lat: number; lng: number }>({
    lat: point.lat,
    lng: point.lng,
  });
  const [locLocked, setLocLocked] = useState(true);
  const [geoQuery, setGeoQuery] = useState("");
  const [geoResults, setGeoResults] = useState<GeoResult[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [address, setAddress] = useState(point.address ?? "");
  const [contacts, setContacts] = useState<ContactPhone[]>(
    contactPhonesFromPoint(point.contacts, point.contact)
  );
  const [instagram, setInstagram] = useState(point.instagram ?? "");
  const [instagramPost, setInstagramPost] = useState(point.instagramPost ?? "");
  const [description, setDescription] = useState(point.description ?? "");
  const [temporarilyUnavailable, setTemporarilyUnavailable] = useState(
    point.temporarilyUnavailable
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const geocode = async () => {
    if (!geoQuery.trim()) return;
    setGeoLoading(true);
    try {
      const viewbox = userLoc
        ? `&viewbox=${userLoc.lng - 1},${userLoc.lat + 1},${userLoc.lng + 1},${userLoc.lat - 1}&bounded=0`
        : "";
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=8&accept-language=${encodeURIComponent(navigator.language)}${viewbox}&q=${encodeURIComponent(geoQuery)}`
      );
      let results: GeoResult[] = res.ok ? await res.json() : [];
      if (userLoc) {
        results = results
          .map((r) => ({
            ...r,
            km: haversineKm(userLoc, { lat: parseFloat(r.lat), lng: parseFloat(r.lon) }),
          }))
          .sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity));
      }
      setGeoResults(results);
    } finally {
      setGeoLoading(false);
    }
  };

  const pickResult = (r: GeoResult) => {
    setLoc({ lat: parseFloat(r.lat), lng: parseFloat(r.lon) });
    setAddress(r.display_name);
    setGeoResults([]);
    setGeoQuery("");
    setLocLocked(true);
  };

  const addItem = () => {
    const v = itemInput.trim();
    if (!v) return;
    setItems((prev) => (prev.includes(v) ? prev : [...prev, v]));
    setItemInput("");
  };
  const removeItem = (i: number) =>
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  const save = async () => {
    setError(null);
    const startDateIso = displayDateToIso(startDate);
    const endDateIso = displayDeadlineToIso(endDate, endTime);
    if (startDateIso == null || endDateIso == null) {
      setError("Revisá las fechas. Usá el selector de calendario.");
      return;
    }
    if (startDateIso && endDateIso && endDateIso < startDateIso) {
      setError("La fecha límite no puede ser anterior a la fecha de inicio.");
      return;
    }
    const { days, hours } = serializeScheduleState(scheduleState);
    const normalizedContacts = normalizeContactPhones(contacts);
    setSaving(true);
    try {
      const res = await fetch(`/api/points/${point.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          name,
          description,
          lat: loc.lat,
          lng: loc.lng,
          address,
          items: itemInput.trim() ? [...items, itemInput.trim()] : items,
          days,
          hours,
          startDate: startDateIso,
          endDate: endDateIso,
          contact: normalizedContacts[0]?.phone ?? "",
          contacts: normalizedContacts,
          instagram: normalizeInstagramHandle(instagram),
          instagramPost: instagramPost.trim() || "",
          temporarilyUnavailable,
        }),
      });
      if (!res.ok) {
        setError(await readApiError(res, "No se pudo guardar. Revisá los campos."));
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Editar punto</h2>
          <button onClick={onClose} className="text-2xl leading-none text-black/40">
            ×
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          {(Object.keys(TYPE_LABELS) as PointType[]).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`rounded-xl border-2 px-3 py-3 text-sm font-medium transition ${
                type === t
                  ? t === "COLLECTION"
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-red-600 bg-red-50 text-red-700"
                  : "border-black/10 text-black/60"
              }`}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        <Field label="Nombre">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
          />
        </Field>

        <Field label={type === "COLLECTION" ? "¿Qué reciben?" : "¿Qué entregan?"}>
          {items.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {items.map((it, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 rounded-full bg-black/5 py-1 pl-3 pr-1.5 text-sm text-black/70"
                >
                  {it}
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="flex h-4 w-4 items-center justify-center rounded-full text-black/40 hover:bg-black/10"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={itemInput}
              onChange={(e) => setItemInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addItem();
                }
              }}
              placeholder="Ej: agua, comida…"
              className="input"
            />
            <button
              type="button"
              onClick={addItem}
              className="shrink-0 rounded-xl bg-black/5 px-4 text-sm font-medium text-black/70"
            >
              Agregar
            </button>
          </div>
        </Field>

        <ScheduleEditor
          mode={scheduleState.mode}
          onModeChange={(mode) => setScheduleState((state) => ({ ...state, mode }))}
          generalDays={scheduleState.generalDays}
          onGeneralDaysChange={(generalDays) =>
            setScheduleState((state) => ({ ...state, generalDays }))
          }
          generalOpenTime={scheduleState.generalOpenTime}
          onGeneralOpenTimeChange={(generalOpenTime) =>
            setScheduleState((state) => ({ ...state, generalOpenTime }))
          }
          generalCloseTime={scheduleState.generalCloseTime}
          onGeneralCloseTimeChange={(generalCloseTime) =>
            setScheduleState((state) => ({ ...state, generalCloseTime }))
          }
          byDay={scheduleState.byDay}
          onByDayChange={(byDay) =>
            setScheduleState((state) => ({ ...state, byDay }))
          }
        />

        <div className="mb-3 grid gap-2 sm:grid-cols-2">
          <Field label="Inicio">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input"
            />
          </Field>
          <div>
            <span className="mb-1 block text-sm font-medium text-black/70">
              Fecha límite
            </span>
            <div className="grid gap-2">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input"
                aria-label="Fecha límite"
              />
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="input"
                aria-label="Hora límite"
              />
            </div>
          </div>
        </div>

        <div className="mb-4">
          <span className="mb-1 block text-sm font-medium text-black/70">
            Ubicación
          </span>
          {locLocked ? (
            <div className="flex items-start justify-between gap-2 rounded-xl bg-green-50 p-3">
              <div className="text-sm">
                <p className="font-medium text-green-800">📍 Ubicación fijada</p>
                {address && (
                  <p className="mt-0.5 text-green-700/80">{address}</p>
                )}
                <p className="mt-0.5 text-xs text-green-700/60">
                  {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
                </p>
              </div>
              <button
                onClick={() => {
                  setLocLocked(false);
                  setGeoQuery("");
                  setGeoResults([]);
                }}
                className="shrink-0 text-sm font-medium text-green-700 underline"
              >
                cambiar
              </button>
            </div>
          ) : (
            <div>
              <div className="flex gap-2">
                <input
                  value={geoQuery}
                  onChange={(e) => setGeoQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      geocode();
                    }
                  }}
                  placeholder="Buscá una dirección o lugar…"
                  className="input"
                />
                <button
                  type="button"
                  onClick={geocode}
                  disabled={geoLoading}
                  className="shrink-0 rounded-xl bg-black px-4 text-sm font-medium text-white disabled:opacity-50"
                >
                  {geoLoading ? "…" : "Buscar"}
                </button>
              </div>
              {geoResults.length > 0 && (
                <ul className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-black/10">
                  {geoResults.map((r, i) => (
                    <li key={i} className="border-b border-black/5 last:border-0">
                      <button
                        type="button"
                        onClick={() => pickResult(r)}
                        className="flex w-full items-start justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-black/5"
                      >
                        <span className="flex-1">{r.display_name}</span>
                        {r.km != null && (
                          <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                            {formatKm(r.km)}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => setLocLocked(true)}
                className="mt-2 w-full rounded-xl border border-black/10 py-2.5 text-sm font-medium text-black/70"
              >
                cancelar
              </button>
            </div>
          )}
        </div>

        <Field label="Referencia">
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Calle, barrio, referencia"
            className="input"
          />
        </Field>

        <ContactPhonesEditor contacts={contacts} onChange={setContacts} />

        <Field label="Instagram (perfil)">
          <input
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            onBlur={() => setInstagram(normalizeInstagramHandle(instagram))}
            placeholder="@usuario"
            className="input"
          />
        </Field>

        <Field label="Instagram (publicación o reel)">
          <input
            value={instagramPost}
            onChange={(e) => setInstagramPost(e.target.value)}
            placeholder="https://www.instagram.com/p/..."
            className="input"
          />
        </Field>

        <div className="mb-3 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-3">
          <div>
            <p className="text-sm font-semibold text-red-700">
              No disponible temporalmente
            </p>
            <p className="text-xs text-red-700/70">
              Mostrará una etiqueta roja en el mapa.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTemporarilyUnavailable((v) => !v)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${
              temporarilyUnavailable ? "bg-red-600" : "bg-black/20"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                temporarilyUnavailable ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </div>

        <Field label="Notas">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="input resize-none"
          />
        </Field>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-black/10 py-3 text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-sm font-medium text-black/70">{label}</span>
      {children}
    </label>
  );
}

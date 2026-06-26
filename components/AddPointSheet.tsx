"use client";

import { useState } from "react";
import { TYPE_LABELS, type PointType } from "@/lib/types";
import { haversineKm, formatKm } from "@/lib/geo";
import { displayDateToIso, displayDeadlineToIso } from "@/lib/dates";
import { normalizeContactPhones, normalizeInstagramHandle, type ContactPhone } from "@/lib/contact";
import { readApiError } from "@/lib/form-errors";
import {
  emptySchedule,
  serializeScheduleState,
  type DayKey,
  type ScheduleMode,
} from "@/lib/schedule";
import ContactPhonesEditor from "./ContactPhonesEditor";
import ScheduleEditor from "./ScheduleEditor";

type GeoResult = {
  lat: string;
  lon: string;
  display_name: string;
  km?: number;
};

export default function AddPointSheet({
  initialLat,
  initialLng,
  userLoc,
  onClose,
  onCreated,
  onPickOnMap,
}: {
  initialLat?: number | null;
  initialLng?: number | null;
  userLoc?: { lat: number; lng: number } | null;
  onClose: () => void;
  onCreated: () => void;
  onPickOnMap: () => void;
}) {
  const [type, setType] = useState<PointType>("COLLECTION");
  const [name, setName] = useState("");
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(
    initialLat != null && initialLng != null
      ? { lat: initialLat, lng: initialLng }
      : null
  );
  const [geoQuery, setGeoQuery] = useState("");
  const [geoResults, setGeoResults] = useState<GeoResult[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [items, setItems] = useState<string[]>([]);
  const [itemInput, setItemInput] = useState("");
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("GENERAL");
  const [generalDays, setGeneralDays] = useState<DayKey[]>([]);
  const [generalOpenTime, setGeneralOpenTime] = useState("");
  const [generalCloseTime, setGeneralCloseTime] = useState("");
  const [byDaySchedule, setByDaySchedule] = useState(emptySchedule);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [address, setAddress] = useState("");
  const [contacts, setContacts] = useState<ContactPhone[]>([]);
  const [instagram, setInstagram] = useState("");
  const [instagramPost, setInstagramPost] = useState("");
  const [description, setDescription] = useState("");
  const [temporarilyUnavailable, setTemporarilyUnavailable] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | "PENDING" | "APPROVED">(null);

  const addItem = () => {
    const v = itemInput.trim();
    if (!v) return;
    setItems((prev) => (prev.includes(v) ? prev : [...prev, v]));
    setItemInput("");
  };

  const removeItem = (i: number) =>
    setItems((prev) => prev.filter((_, idx) => idx !== i));

  const geocode = async () => {
    if (!geoQuery.trim()) return;
    setGeoLoading(true);
    try {
      const viewbox = userLoc
        ? `&viewbox=${userLoc.lng - 1},${userLoc.lat + 1},${userLoc.lng + 1},${
            userLoc.lat - 1
          }&bounded=0`
        : "";
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=8&accept-language=${encodeURIComponent(
          navigator.language
        )}${viewbox}&q=${encodeURIComponent(geoQuery)}`
      );
      let results: GeoResult[] = res.ok ? await res.json() : [];
      if (userLoc) {
        results = results
          .map((r) => ({
            ...r,
            km: haversineKm(userLoc, {
              lat: parseFloat(r.lat),
              lng: parseFloat(r.lon),
            }),
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
  };

  const submit = async () => {
    setError(null);
    if (!loc) {
      setError("Fijá la ubicación: buscá una dirección o tocá el mapa.");
      return;
    }
    if (name.trim().length < 2) {
      setError("Poné un nombre.");
      return;
    }
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
    const { days, hours } = serializeScheduleState({
      mode: scheduleMode,
      generalDays,
      generalOpenTime,
      generalCloseTime,
      byDay: byDaySchedule,
    });
    const normalizedContacts = normalizeContactPhones(contacts);
    setSubmitting(true);
    try {
      const res = await fetch("/api/points", {
        method: "POST",
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
        setError(
          await readApiError(res, "No se pudo guardar. Revisá los campos marcados.")
        );
        return;
      }
      const point = (await res.json()) as { status: "PENDING" | "APPROVED" };
      setDone(point.status);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <Backdrop onClose={onCreated}>
        <div className="p-6 text-center">
          <div className="mb-2 text-4xl">{done === "PENDING" ? "🕓" : "✅"}</div>
          <h2 className="text-lg font-semibold">
            {done === "PENDING" ? "¡Gracias! Punto enviado" : "¡Punto publicado!"}
          </h2>
          <p className="mt-1 text-sm text-black/60">
            {done === "PENDING"
              ? "Lo vamos a revisar y aparecerá en el mapa en breve."
              : "Ya está visible en el mapa."}
          </p>
          <button
            onClick={onCreated}
            className="mt-5 w-full rounded-xl bg-black py-3 text-sm font-semibold text-white"
          >
            Listo
          </button>
        </div>
      </Backdrop>
    );
  }

  return (
    <Backdrop onClose={onClose}>
      <div className="max-h-[80vh] overflow-y-auto p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Agregar punto</h2>
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
              <span
                className={`mr-1.5 inline-block h-2.5 w-2.5 rounded-full ${
                  t === "COLLECTION" ? "bg-blue-600" : "bg-red-600"
                }`}
              />
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        <div className="mb-4">
          <span className="mb-1 block text-sm font-medium text-black/70">
            Ubicación *
          </span>
          {loc ? (
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
                onClick={() => setLoc(null)}
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
                onClick={onPickOnMap}
                className="mt-2 w-full rounded-xl border border-black/10 py-2.5 text-sm font-medium text-black/70"
              >
                o tocá el punto en el mapa
              </button>
            </div>
          )}
        </div>

        <Field label="Nombre del lugar *">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Parroquia San José"
            className="input"
          />
        </Field>

        <Field
          label={type === "COLLECTION" ? "¿Qué reciben?" : "¿Qué entregan?"}
        >
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
                    className="flex h-4 w-4 items-center justify-center rounded-full text-black/40 hover:bg-black/10 hover:text-black/70"
                    aria-label={`Quitar ${it}`}
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
              placeholder="Ej: agua, comida, ropa…"
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
          mode={scheduleMode}
          onModeChange={setScheduleMode}
          generalDays={generalDays}
          onGeneralDaysChange={setGeneralDays}
          generalOpenTime={generalOpenTime}
          onGeneralOpenTimeChange={setGeneralOpenTime}
          generalCloseTime={generalCloseTime}
          onGeneralCloseTimeChange={setGeneralCloseTime}
          byDay={byDaySchedule}
          onByDayChange={setByDaySchedule}
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

        <Field label="Notas (opcional)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="input resize-none"
          />
        </Field>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <button
          onClick={submit}
          disabled={submitting}
          className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {submitting ? "Guardando…" : "Publicar punto"}
        </button>
      </div>
    </Backdrop>
  );
}

function Backdrop({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        {children}
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

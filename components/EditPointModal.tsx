"use client";

import { useState } from "react";
import { DAYS, TYPE_LABELS, type PointType } from "@/lib/types";
import {
  displayDateToIso,
  displayDeadlineToIso,
  formatDateInput,
  isoToDisplayDate,
  isoToDisplayTime,
} from "@/lib/dates";
import type { Point } from "./MapView";

function parseHours(hours: string | null) {
  if (hours === "24 horas") return { open24: true, openTime: "", closeTime: "" };
  const m = hours?.match(/^(\d{2}:\d{2}) a (\d{2}:\d{2})$/);
  if (m) return { open24: false, openTime: m[1], closeTime: m[2] };
  return { open24: false, openTime: "", closeTime: "" };
}

export default function EditPointModal({
  point,
  onClose,
  onSaved,
}: {
  point: Point;
  onClose: () => void;
  onSaved: () => void;
}) {
  const h = parseHours(point.hours);
  const [type, setType] = useState<PointType>(point.type);
  const [name, setName] = useState(point.name);
  const [items, setItems] = useState<string[]>(point.items);
  const [itemInput, setItemInput] = useState("");
  const [days, setDays] = useState<string[]>(point.days);
  const [open24, setOpen24] = useState(h.open24);
  const [openTime, setOpenTime] = useState(h.openTime);
  const [closeTime, setCloseTime] = useState(h.closeTime);
  const [startDate, setStartDate] = useState(isoToDisplayDate(point.startDate));
  const [endDate, setEndDate] = useState(isoToDisplayDate(point.endDate));
  const [endTime, setEndTime] = useState(isoToDisplayTime(point.endDate));
  const [address, setAddress] = useState(point.address ?? "");
  const [contact, setContact] = useState(point.contact ?? "");
  const [description, setDescription] = useState(point.description ?? "");
  const [lat, setLat] = useState(String(point.lat));
  const [lng, setLng] = useState(String(point.lng));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addItem = () => {
    const v = itemInput.trim();
    if (!v) return;
    setItems((prev) => (prev.includes(v) ? prev : [...prev, v]));
    setItemInput("");
  };
  const removeItem = (i: number) =>
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  const toggleDay = (d: string) =>
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );

  const save = async () => {
    setError(null);
    const latN = parseFloat(lat);
    const lngN = parseFloat(lng);
    if (Number.isNaN(latN) || Number.isNaN(lngN)) {
      setError("Coordenadas inválidas.");
      return;
    }
    const startDateIso = displayDateToIso(startDate);
    const endDateIso = displayDeadlineToIso(endDate, endTime);
    if (startDateIso == null || endDateIso == null) {
      setError("Usá fechas con formato día/mes/año, por ejemplo 31/12/2026.");
      return;
    }
    if (startDateIso && endDateIso && endDateIso < startDateIso) {
      setError("La fecha límite no puede ser anterior a la fecha de inicio.");
      return;
    }
    const hours = open24
      ? "24 horas"
      : openTime && closeTime
        ? `${openTime} a ${closeTime}`
        : openTime
          ? `Desde ${openTime}`
          : "";
    setSaving(true);
    try {
      const res = await fetch(`/api/points/${point.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          name,
          description,
          lat: latN,
          lng: lngN,
          address,
          items: itemInput.trim() ? [...items, itemInput.trim()] : items,
          days,
          hours,
          startDate: startDateIso,
          endDate: endDateIso,
          contact,
        }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => null)) as {
          issues?: { fieldErrors?: Record<string, string[]> };
        } | null;
        const fe = b?.issues?.fieldErrors
          ? Object.values(b.issues.fieldErrors).flat()[0]
          : null;
        setError(fe || "No se pudo guardar.");
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

        <Field label="Días">
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map((d) => (
              <button
                key={d}
                onClick={() => toggleDay(d)}
                className={`rounded-full px-3 py-1.5 text-sm capitalize ${
                  days.includes(d) ? "bg-black text-white" : "bg-black/5 text-black/60"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </Field>

        <div className="mb-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-black/70">Horario</span>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <span className="text-black/60">Abierto 24 horas</span>
              <button
                type="button"
                onClick={() => setOpen24((v) => !v)}
                className={`relative h-6 w-11 rounded-full transition ${
                  open24 ? "bg-blue-600" : "bg-black/20"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                    open24 ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </label>
          </div>
          {!open24 && (
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
                className="input"
              />
              <span className="text-black/40">a</span>
              <input
                type="time"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
                className="input"
              />
            </div>
          )}
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <Field label="Inicio">
            <input
              inputMode="numeric"
              value={startDate}
              onChange={(e) => setStartDate(formatDateInput(e.target.value))}
              placeholder="dd/mm/aaaa"
              className="input"
            />
          </Field>
          <div>
            <span className="mb-1 block text-sm font-medium text-black/70">
              Fecha límite
            </span>
            <div className="grid grid-cols-[1fr_6.25rem] gap-2">
              <input
                inputMode="numeric"
                value={endDate}
                onChange={(e) => setEndDate(formatDateInput(e.target.value))}
                placeholder="dd/mm/aaaa"
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

        <Field label="Dirección / referencia">
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="input"
          />
        </Field>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <Field label="Latitud">
            <input
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Longitud">
            <input
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              className="input"
            />
          </Field>
        </div>

        <Field label="Contacto (WhatsApp / teléfono)">
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="input"
          />
        </Field>

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

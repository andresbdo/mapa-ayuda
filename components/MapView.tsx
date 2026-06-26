"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import AddPointSheet from "./AddPointSheet";
import EditPointModal from "./EditPointModal";
import PointDetails from "./PointDetails";
import { shortAddress } from "@/lib/address";
import type { ContactPhone } from "@/lib/contact";
import { TYPE_LABELS, type PointType } from "@/lib/types";
import { DAY_SHORT_LABELS, parseSchedule, todayScheduleSummary } from "@/lib/schedule";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
const LOCATION_ENABLED_KEY = "mapa-ayuda-location-enabled";
const SEARCH_PARAM = "q";
const TYPE_PARAM = "type";
const GEOLOCATION_TIMEOUT_MS = 10000;

function getInitialSearch(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(SEARCH_PARAM) ?? "";
}

function parseFilter(value: string | null): Filter {
  if (value === "COLLECTION" || value === "DELIVERY") return value;
  return "ALL";
}

function getInitialFilter(): Filter {
  if (typeof window === "undefined") return "ALL";
  return parseFilter(new URLSearchParams(window.location.search).get(TYPE_PARAM));
}

function updateShareUrl(search: string, filter: Filter, replace = false) {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  const trimmedSearch = search.trim();
  if (trimmedSearch) {
    url.searchParams.set(SEARCH_PARAM, trimmedSearch);
  } else {
    url.searchParams.delete(SEARCH_PARAM);
  }
  if (filter === "ALL") {
    url.searchParams.delete(TYPE_PARAM);
  } else {
    url.searchParams.set(TYPE_PARAM, filter);
  }

  const method = replace ? "replaceState" : "pushState";
  window.history[method](null, "", `${url.pathname}${url.search}${url.hash}`);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("es", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function fmtDateTime(d: string): string {
  return new Date(d).toLocaleString("es", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dateRange(start: string | null, end: string | null): string {
  if (start && end) return `${fmtDate(start)} – ${fmtDateTime(end)}`;
  if (start) return `desde ${fmtDate(start)}`;
  if (end) return `hasta ${fmtDateTime(end)}`;
  return "";
}

function labelHtml(p: Point): string {
  const color = p.type === "COLLECTION" ? "#2563eb" : "#dc2626";
  const dates = dateRange(p.startDate, p.endDate);
  const schedule = parseSchedule(p.days, p.hours);
  const hours = todayScheduleSummary(p.days, p.hours);
  const calendarIcon =
    '<span class="ml-icon" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M4 1.75v2.5M12 1.75v2.5M2.75 6.25h10.5M3.5 3.25h9A1.75 1.75 0 0 1 14.25 5v7.5a1.75 1.75 0 0 1-1.75 1.75h-9a1.75 1.75 0 0 1-1.75-1.75V5A1.75 1.75 0 0 1 3.5 3.25Z"/></svg></span>';
  const clockIcon =
    '<span class="ml-icon" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M8 14.25A6.25 6.25 0 1 0 8 1.75a6.25 6.25 0 0 0 0 12.5Z"/><path d="M8 4.75V8l2.2 1.3"/></svg></span>';
  const pinIcon =
    '<span class="ml-icon" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M12.75 6.75c0 3.25-4.75 7.5-4.75 7.5s-4.75-4.25-4.75-7.5a4.75 4.75 0 1 1 9.5 0Z"/><path d="M8 8.25a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"/></svg></span>';
  const dayGrid = `<div class="ml-days">${schedule
    .map(
      (row) =>
        `<span class="ml-day ${row.enabled ? "ml-day-open" : "ml-day-closed"}">${DAY_SHORT_LABELS[row.day]}</span>`
    )
    .join("")}</div>`;
  const itemChips =
    p.items.length > 0
      ? `<div class="ml-items"><div class="ml-items-label">${
          p.type === "COLLECTION" ? "Reciben" : "Entregan"
        }</div><div class="ml-item-list">${p.items
          .slice(0, 4)
          .map((item) => `<strong>${escapeHtml(item)}</strong>`)
          .join('<span class="ml-comma">, </span>')}</div></div>`
      : "";
  const rows = [
    itemChips,
    p.days.length > 0 ? dayGrid : "",
    dates ? `<span class="ml-row-with-icon">${calendarIcon}${escapeHtml(dates)}</span>` : "",
    hours ? `<span class="ml-row-with-icon">${clockIcon}${escapeHtml(hours)}</span>` : "",
    p.address
      ? `<span class="ml-row-with-icon ml-address-row">${pinIcon}${escapeHtml(shortAddress(p.address))}</span>`
      : "",
  ].filter(Boolean);
  return `
    <div class="ml-type" style="color:${color}">${escapeHtml(TYPE_LABELS[p.type])}</div>
    ${p.temporarilyUnavailable ? '<div class="ml-unavailable">No disponible</div>' : ""}
    <div class="ml-name">${escapeHtml(p.name)}</div>
    ${rows.map((r) => `<div class="ml-row">${r}</div>`).join("")}`;
}

export type Point = {
  id: string;
  type: PointType;
  name: string;
  description: string | null;
  lat: number;
  lng: number;
  address: string | null;
  items: string[];
  days: string[];
  hours: string | null;
  startDate: string | null;
  endDate: string | null;
  contact: string | null;
  contacts: ContactPhone[];
  instagram: string | null;
  temporarilyUnavailable: boolean;
};

type Filter = "ALL" | PointType;

export default function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const geolocateRef = useRef<maplibregl.GeolocateControl | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const appliedInitialSearchRef = useRef(false);

  const [points, setPoints] = useState<Point[]>([]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [adding, setAdding] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null);
  const [selected, setSelected] = useState<Point | null>(null);
  const [editing, setEditing] = useState<Point | null>(null);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(true);

  const loadPoints = useCallback(async () => {
    const res = await fetch("/api/points");
    if (res.ok) setPoints(await res.json());
  }, []);

  const locateUser = useCallback((rememberChoice: boolean) => {
    if (!navigator.geolocation) {
      setLocating(false);
      setShowLocationPrompt(false);
      localStorage.removeItem(LOCATION_ENABLED_KEY);
      return;
    }

    setLocating(true);
    setShowLocationPrompt(false);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLoc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLoc(nextLoc);
        setLocating(false);
        if (rememberChoice) localStorage.setItem(LOCATION_ENABLED_KEY, "true");
        mapRef.current?.flyTo({
          center: [nextLoc.lng, nextLoc.lat],
          zoom: Math.max(mapRef.current.getZoom(), 13),
        });
      },
      () => {
        setLocating(false);
        localStorage.removeItem(LOCATION_ENABLED_KEY);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60000,
        timeout: GEOLOCATION_TIMEOUT_MS,
      }
    );
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(getInitialSearch());
      setFilter(getInitialFilter());
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const geocodeSearch = useCallback(
    async (
      value: string,
      options?: { replaceUrl?: boolean; filterForUrl?: Filter }
    ) => {
      const query = value.trim();
      if (!query) return;

      setSearching(true);
      try {
        const language =
          typeof navigator === "undefined" ? "es" : navigator.language;
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=${encodeURIComponent(
            language
          )}&q=${encodeURIComponent(query)}`
        );
        const data = (await res.json()) as Array<{ lat: string; lon: string }>;
        if (data[0] && mapRef.current) {
          mapRef.current.flyTo({
            center: [parseFloat(data[0].lon), parseFloat(data[0].lat)],
            zoom: 14,
          });
          updateShareUrl(
            query,
            options?.filterForUrl ?? filter,
            options?.replaceUrl
          );
        }
      } finally {
        setSearching(false);
      }
    },
    [filter]
  );

  useEffect(() => {
    if (mapRef.current || !mapContainer.current) return;
    let cancelled = false;

    const initMap = (center: [number, number], zoom: number) => {
      if (cancelled || !mapContainer.current || mapRef.current) return;

      const map = new maplibregl.Map({
        container: mapContainer.current,
        style: MAP_STYLE,
        center,
        zoom,
        attributionControl: { compact: true },
      });
      map.addControl(new maplibregl.NavigationControl(), "bottom-right");
      const geolocate = new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        fitBoundsOptions: { maxZoom: 15, animate: false },
      });
      map.addControl(geolocate, "bottom-right");
      geolocateRef.current = geolocate;
      map.on("load", () => {
        if (cancelled) return;
        const shouldLocate =
          "geolocation" in navigator &&
          localStorage.getItem(LOCATION_ENABLED_KEY) === "true";
        const initialSearch = getInitialSearch();
        setShowLocationPrompt(
          "geolocation" in navigator && !shouldLocate && !initialSearch
        );
        if (shouldLocate) {
          locateUser(false);
        }
        if (initialSearch && !appliedInitialSearchRef.current) {
          appliedInitialSearchRef.current = true;
          void geocodeSearch(initialSearch, {
            replaceUrl: true,
            filterForUrl: getInitialFilter(),
          });
        }
      });

      mapRef.current = map;
      loadPoints();
    };

    initMap([-66.9, 10.5], 5);

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      geolocateRef.current = null;
    };
  }, [geocodeSearch, loadPoints, locateUser]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const onClick = (e: maplibregl.MapMouseEvent) => {
      if (!adding) return;
      setDraft({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      setAdding(false);
      setShowSheet(true);
    };

    map.on("click", onClick);
    map.getCanvas().style.cursor = adding ? "crosshair" : "";
    return () => {
      map.off("click", onClick);
    };
  }, [adding]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const visible = points.filter((p) => filter === "ALL" || p.type === filter);

    for (const point of visible) {
      const el = document.createElement("div");
      el.className =
        "marker-pin " +
        (point.type === "COLLECTION" ? "marker-collection" : "marker-delivery");
      el.textContent = point.type === "DELIVERY" ? "✚" : "";

      const label = document.createElement("div");
      label.className = `marker-label${
        point.temporarilyUnavailable ? " marker-label-unavailable" : ""
      }`;
      label.innerHTML = labelHtml(point);
      el.appendChild(label);

      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        setSelected(point);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([point.lng, point.lat])
        .addTo(map);
      markersRef.current.push(marker);
    }
  }, [points, filter]);

  const requestLocation = () => {
    locateUser(true);
  };

  const runSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await geocodeSearch(search);
  };

  const selectFilter = (nextFilter: Filter) => {
    setFilter(nextFilter);
    updateShareUrl(search, nextFilter);
  };

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="h-full w-full" />

      {locating && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-3xl bg-white px-8 py-7 text-black/60 shadow-2xl">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-black/15 border-t-blue-600" />
            <p className="text-sm">Ubicándote…</p>
            <button
              type="button"
              onClick={() => {
                setLocating(false);
                localStorage.removeItem(LOCATION_ENABLED_KEY);
              }}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-black/45 hover:bg-black/5"
            >
              Usar sin ubicación
            </button>
          </div>
        </div>
      )}

      {showLocationPrompt && !locating && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 p-5 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-3xl">
              📍
            </div>
            <h1 className="text-3xl font-bold leading-tight text-black">
              ¿Activar tu ubicación?
            </h1>
            <p className="mt-3 text-sm leading-6 text-black/60">
              Usamos tu ubicación para acercar el mapa a tu zona y mostrarte los
              puntos más cercanos.
            </p>
            <button
              onClick={requestLocation}
              className="mt-6 w-full rounded-full bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg active:scale-95"
            >
              Activar ubicación
            </button>
            <button
              onClick={() => setShowLocationPrompt(false)}
              className="mt-3 w-full rounded-full px-5 py-3 text-sm font-medium text-black/55"
            >
              Ahora no
            </button>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 p-3">
        <form onSubmit={runSearch} className="pointer-events-auto flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar dirección o ciudad…"
            className="flex-1 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm shadow-lg outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={searching}
            className="rounded-full bg-black px-4 py-2.5 text-sm font-medium text-white shadow-lg disabled:opacity-50"
          >
            {searching ? "…" : "Ir"}
          </button>
        </form>

        <div className="pointer-events-auto flex gap-1.5 self-center rounded-full bg-white p-1 shadow-lg">
          <FilterButton active={filter === "ALL"} onClick={() => selectFilter("ALL")}>
            Todo
          </FilterButton>
          <FilterButton
            active={filter === "COLLECTION"}
            onClick={() => selectFilter("COLLECTION")}
            dot="bg-blue-600"
          >
            Centro de acopio
          </FilterButton>
          <FilterButton
            active={filter === "DELIVERY"}
            onClick={() => selectFilter("DELIVERY")}
            dot="bg-red-600"
          >
            Entrega de ayuda
          </FilterButton>
        </div>
      </div>

      {adding && (
        <div className="absolute inset-x-0 top-32 z-10 flex justify-center px-4">
          <div className="rounded-full bg-black/85 px-4 py-2 text-sm text-white shadow-lg">
            Tocá el mapa donde está el punto
          </div>
        </div>
      )}

      <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2">
        <button
          onClick={() => {
            if (adding) {
              setAdding(false);
            } else {
              setSelected(null);
              setShowSheet(true);
            }
          }}
          className="rounded-full bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-xl active:scale-95"
        >
          {adding ? "Cancelar" : "+ Agregar punto"}
        </button>
      </div>

      {showSheet && (
        <AddPointSheet
          initialLat={draft?.lat ?? null}
          initialLng={draft?.lng ?? null}
          userLoc={userLoc}
          onClose={() => {
            setShowSheet(false);
            setDraft(null);
          }}
          onCreated={() => {
            setShowSheet(false);
            setDraft(null);
            loadPoints();
          }}
          onPickOnMap={() => {
            setShowSheet(false);
            setAdding(true);
          }}
        />
      )}

      {selected && (
        <PointDetails
          point={selected}
          onClose={() => setSelected(null)}
          onEdit={() => {
            setEditing(selected);
            setSelected(null);
          }}
        />
      )}

      {editing && (
        <EditPointModal
          point={editing}
          userLoc={userLoc}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            loadPoints();
          }}
        />
      )}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
  dot,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  dot?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
        active ? "bg-black text-white" : "text-black/70 hover:bg-black/5"
      }`}
    >
      {dot && <span className={`h-2 w-2 rounded-full ${dot}`} />}
      {children}
    </button>
  );
}

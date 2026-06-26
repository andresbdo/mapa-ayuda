"use client";

import { useEffect, useState, useCallback } from "react";
import { TYPE_LABELS } from "@/lib/types";
import type { Point } from "@/components/MapView";
import EditPointModal from "@/components/EditPointModal";

type Tab = "PENDING" | "APPROVED";

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [token, setToken] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  const [moderation, setModeration] = useState(true);
  const [savedMod, setSavedMod] = useState(true);
  const [savingMod, setSavingMod] = useState(false);
  const [tab, setTab] = useState<Tab>("PENDING");
  const [points, setPoints] = useState<Point[]>([]);
  const [editing, setEditing] = useState<Point | null>(null);

  useEffect(() => {
    fetch("/api/admin/login")
      .then((r) => r.json())
      .then((d) => setAuthed(!!d.admin));
  }, []);

  const loadSettings = useCallback(async () => {
    const r = await fetch("/api/settings");
    if (!r.ok) return;
    const d = await r.json();
    setModeration(!!d.moderationEnabled);
    setSavedMod(!!d.moderationEnabled);
  }, []);

  const loadPoints = useCallback(async () => {
    const r = await fetch(`/api/points?status=${tab}`);
    if (r.ok) setPoints(await r.json());
  }, [tab]);

  useEffect(() => {
    if (authed) {
      loadSettings();
      loadPoints();
    }
  }, [authed, loadSettings, loadPoints]);

  const login = async () => {
    setLoginError(null);
    const r = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (r.ok) setAuthed(true);
    else setLoginError("Token incorrecto.");
  };

  const saveModeration = async () => {
    setSavingMod(true);
    try {
      const r = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moderationEnabled: moderation }),
      });
      if (r.ok) setSavedMod(moderation);
    } finally {
      setSavingMod(false);
    }
  };

  const setStatus = async (id: string, status: string) => {
    await fetch(`/api/points/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadPoints();
  };

  const remove = async (id: string) => {
    if (!confirm("¿Borrar este punto?")) return;
    await fetch(`/api/points/${id}`, { method: "DELETE" });
    loadPoints();
  };

  if (authed === null) {
    return <div className="p-8 text-center text-black/50">Cargando…</div>;
  }

  if (!authed) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center p-6">
        <h1 className="mb-1 text-xl font-bold">Panel de administración</h1>
        <p className="mb-4 text-sm text-black/60">Ingresá el token de admin.</p>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && login()}
          placeholder="ADMIN_TOKEN"
          className="input mb-3"
        />
        {loginError && <p className="mb-3 text-sm text-red-600">{loginError}</p>}
        <button
          onClick={login}
          className="rounded-xl bg-black py-3 text-sm font-semibold text-white"
        >
          Entrar
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <h1 className="mb-4 text-xl font-bold">Panel de administración</h1>

      <div className="mb-5 rounded-2xl border border-black/10 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Moderación</p>
            <p className="text-sm text-black/55">
              {moderation
                ? "Los puntos nuevos quedan pendientes hasta aprobar."
                : "Modo libre: los puntos se publican al instante."}
            </p>
          </div>
          <button
            onClick={() => setModeration((v) => !v)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${
              moderation ? "bg-blue-600" : "bg-black/20"
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
                moderation ? "left-6" : "left-1"
              }`}
            />
          </button>
        </div>
        <div className="mt-3 flex items-center justify-end gap-3">
          {moderation !== savedMod && (
            <span className="text-xs text-amber-600">Cambios sin guardar</span>
          )}
          <button
            onClick={saveModeration}
            disabled={savingMod || moderation === savedMod}
            className="rounded-lg bg-black px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            {savingMod ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-1.5">
        {(["PENDING", "APPROVED"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              tab === t ? "bg-black text-white" : "bg-black/5 text-black/60"
            }`}
          >
            {t === "PENDING" ? "Pendientes" : "Aprobados"}
          </button>
        ))}
      </div>

      {points.length === 0 ? (
        <p className="py-12 text-center text-sm text-black/40">
          No hay puntos {tab === "PENDING" ? "pendientes" : "aprobados"}.
        </p>
      ) : (
        <ul className="space-y-3">
          {points.map((p) => (
            <li key={p.id} className="rounded-2xl border border-black/10 p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <span
                    className={`text-xs font-semibold uppercase ${
                      p.type === "COLLECTION" ? "text-blue-700" : "text-red-700"
                    }`}
                  >
                    {TYPE_LABELS[p.type]}
                  </span>
                  <p className="font-semibold">{p.name}</p>
                  {p.address && (
                    <p className="text-sm text-black/55">{p.address}</p>
                  )}
                </div>
              </div>
              {p.items.length > 0 && (
                <p className="mb-2 text-sm text-black/70">{p.items.join(", ")}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {tab === "PENDING" && (
                  <button
                    onClick={() => setStatus(p.id, "APPROVED")}
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white"
                  >
                    Aprobar
                  </button>
                )}
                {tab === "APPROVED" && (
                  <button
                    onClick={() => setStatus(p.id, "PENDING")}
                    className="rounded-lg bg-black/10 px-3 py-1.5 text-sm font-medium"
                  >
                    Ocultar
                  </button>
                )}
                <button
                  onClick={() => setEditing(p)}
                  className="rounded-lg border border-black/15 px-3 py-1.5 text-sm font-medium"
                >
                  Editar
                </button>
                <button
                  onClick={() => remove(p.id)}
                  className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600"
                >
                  Borrar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <EditPointModal
          point={editing}
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

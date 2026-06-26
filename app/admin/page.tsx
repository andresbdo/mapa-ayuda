"use client";

import { useEffect, useState, useCallback } from "react";
import { TYPE_LABELS } from "@/lib/types";
import type { Point } from "@/components/MapView";
import EditPointModal from "@/components/EditPointModal";

type Tab = "PENDING" | "APPROVED";
type Section = "points" | "stats" | "tokens";

type PointsResponse = {
  points: Point[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

type StatsData = {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  byCountry: Record<string, number>;
  recentDays: { date: string; count: number }[];
};

type AdminTokenRow = {
  id: string;
  name: string;
  email: string;
  token: string;
  createdAt: string;
};

const PAGE_SIZE = 10;

function randomToken() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [superAdmin, setSuperAdmin] = useState(false);
  const [token, setToken] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [section, setSection] = useState<Section>("points");

  useEffect(() => {
    fetch("/api/admin/login")
      .then((r) => r.json())
      .then((d: { admin: boolean; superAdmin: boolean }) => {
        setAuthed(!!d.admin);
        setSuperAdmin(!!d.superAdmin);
      });
  }, []);

  const login = async () => {
    setLoginError(null);
    const r = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (r.ok) {
      const d = (await r.json()) as { ok: boolean };
      if (d.ok) {
        const check = await fetch("/api/admin/login").then((x) => x.json()) as { admin: boolean; superAdmin: boolean };
        setAuthed(true);
        setSuperAdmin(!!check.superAdmin);
      }
    } else {
      setLoginError("Token incorrecto.");
    }
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
          placeholder="Token"
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
    <div className="w-full min-w-full p-4 sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold">Panel de administración</h1>
        {superAdmin && (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
            Super admin
          </span>
        )}
      </div>

      <div className="mb-6 flex gap-1.5">
        {(["points", "stats", ...(superAdmin ? ["tokens"] : [])] as Section[]).map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              section === s ? "bg-black text-white" : "bg-black/5 text-black/60"
            }`}
          >
            {s === "points" ? "Puntos" : s === "stats" ? "Estadísticas" : "Tokens"}
          </button>
        ))}
      </div>

      {section === "points" && <PointsSection superAdmin={superAdmin} />}
      {section === "stats" && <StatsSection />}
      {section === "tokens" && superAdmin && <TokensSection />}
    </div>
  );
}

function PointsSection({ superAdmin }: { superAdmin: boolean }) {
  const [moderation, setModeration] = useState(true);
  const [savedMod, setSavedMod] = useState(true);
  const [restrictDeliveryToVenezuela, setRestrictDeliveryToVenezuela] = useState(true);
  const [savedRestrictDeliveryToVenezuela, setSavedRestrictDeliveryToVenezuela] = useState(true);
  const [savingMod, setSavingMod] = useState(false);
  const [tab, setTab] = useState<Tab>("PENDING");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [points, setPoints] = useState<Point[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [editing, setEditing] = useState<Point | null>(null);

  const loadPoints = useCallback(async () => {
    const params = new URLSearchParams({ status: tab, page: String(page), pageSize: String(PAGE_SIZE) });
    if (search.trim()) params.set("q", search.trim());
    const r = await fetch(`/api/points?${params}`);
    if (!r.ok) return;
    const d = (await r.json()) as PointsResponse;
    setPoints(d.points);
    setTotal(d.pagination.total);
    setTotalPages(d.pagination.totalPages);
  }, [page, search, tab]);

  useEffect(() => {
    void fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { moderationEnabled: boolean; restrictDeliveryToVenezuela: boolean } | null) => {
        if (!d) return;
        setModeration(!!d.moderationEnabled);
        setSavedMod(!!d.moderationEnabled);
        setRestrictDeliveryToVenezuela(!!d.restrictDeliveryToVenezuela);
        setSavedRestrictDeliveryToVenezuela(!!d.restrictDeliveryToVenezuela);
      });
  }, []);

  useEffect(() => { void loadPoints(); }, [loadPoints]);

  const saveModeration = async () => {
    setSavingMod(true);
    try {
      const r = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moderationEnabled: moderation, restrictDeliveryToVenezuela }),
      });
      if (r.ok) {
        setSavedMod(moderation);
        setSavedRestrictDeliveryToVenezuela(restrictDeliveryToVenezuela);
      }
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
    void loadPoints();
  };

  const remove = async (id: string) => {
    if (!confirm("¿Borrar este punto?")) return;
    await fetch(`/api/points/${id}`, { method: "DELETE" });
    void loadPoints();
  };

  return (
    <>
      {superAdmin && (
        <div className="mb-5 rounded-2xl border border-black/10 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">Moderación</p>
              <p className="text-sm text-black/55">
                {moderation
                  ? "Los puntos nuevos quedan pendientes hasta aprobar."
                  : "Modo libre: los puntos se publican al instante."}
              </p>
            </div>
            <Toggle value={moderation} onChange={setModeration} />
          </div>
          <div className="mt-4 flex items-center justify-between gap-4 border-t border-black/10 pt-4">
            <div>
              <p className="font-medium">Entregas sólo en Venezuela</p>
              <p className="text-sm text-black/55">
                {restrictDeliveryToVenezuela
                  ? "Bloquea crear puntos de entrega fuera de Venezuela."
                  : "Permite crear puntos de entrega en cualquier país."}
              </p>
            </div>
            <Toggle value={restrictDeliveryToVenezuela} onChange={setRestrictDeliveryToVenezuela} />
          </div>
          <div className="mt-3 flex items-center justify-end gap-3">
            {(moderation !== savedMod || restrictDeliveryToVenezuela !== savedRestrictDeliveryToVenezuela) && (
              <span className="text-xs text-amber-600">Cambios sin guardar</span>
            )}
            <button
              onClick={saveModeration}
              disabled={savingMod || (moderation === savedMod && restrictDeliveryToVenezuela === savedRestrictDeliveryToVenezuela)}
              className="rounded-lg bg-black px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {savingMod ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      )}

      <div className="mb-3 flex gap-1.5">
        {(["PENDING", "APPROVED"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(1); }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              tab === t ? "bg-black text-white" : "bg-black/5 text-black/60"
            }`}
          >
            {t === "PENDING" ? "Pendientes" : "Aprobados"}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Buscar por nombre o dirección…"
          className="input"
        />
        <p className="mt-2 text-xs text-black/45">
          {total} punto{total === 1 ? "" : "s"} encontrado{total === 1 ? "" : "s"}
        </p>
      </div>

      {points.length === 0 ? (
        <p className="py-12 text-center text-sm text-black/40">
          No hay puntos {tab === "PENDING" ? "pendientes" : "aprobados"}
          {search.trim() ? " para esa búsqueda" : ""}.
        </p>
      ) : (
        <>
          <ul className="space-y-3">
            {points.map((p) => (
              <li key={p.id} className="rounded-2xl border border-black/10 p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <span className={`text-xs font-semibold uppercase ${p.type === "COLLECTION" ? "text-blue-700" : "text-red-700"}`}>
                      {TYPE_LABELS[p.type]}
                    </span>
                    <p className="font-semibold">{p.name}</p>
                    {p.address && <p className="text-sm text-black/55">{p.address}</p>}
                  </div>
                </div>
                {p.items.length > 0 && (
                  <p className="mb-2 text-sm text-black/70">{p.items.join(", ")}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {tab === "PENDING" && (
                    <button onClick={() => setStatus(p.id, "APPROVED")} className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white">
                      Aprobar
                    </button>
                  )}
                  {tab === "APPROVED" && (
                    <button onClick={() => setStatus(p.id, "PENDING")} className="rounded-lg bg-black/10 px-3 py-1.5 text-sm font-medium">
                      Ocultar
                    </button>
                  )}
                  <button onClick={() => setEditing(p)} className="rounded-lg border border-black/15 px-3 py-1.5 text-sm font-medium">
                    Editar
                  </button>
                  <button onClick={() => remove(p.id)} className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600">
                    Borrar
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex items-center justify-between gap-3">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium disabled:opacity-40">
              Anterior
            </button>
            <span className="text-sm text-black/55">Página {page} de {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium disabled:opacity-40">
              Siguiente
            </button>
          </div>
        </>
      )}

      {editing && (
        <EditPointModal
          point={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); void loadPoints(); }}
        />
      )}
    </>
  );
}

function StatsSection() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: StatsData | null) => { setStats(d); setLoading(false); });
  }, []);

  if (loading) return <p className="py-12 text-center text-sm text-black/40">Cargando estadísticas…</p>;
  if (!stats) return <p className="py-12 text-center text-sm text-red-500">No se pudieron cargar las estadísticas.</p>;

  const maxDay = Math.max(...stats.recentDays.map((d) => d.count), 1);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Aprobados" value={stats.byStatus["APPROVED"] ?? 0} color="text-green-700" />
        <StatCard label="Pendientes" value={stats.byStatus["PENDING"] ?? 0} color="text-amber-600" />
        <StatCard label="Rechazados" value={stats.byStatus["REJECTED"] ?? 0} color="text-red-600" />
      </div>

      <div className="rounded-2xl border border-black/10 p-4">
        <p className="mb-3 text-sm font-semibold">Por tipo</p>
        <div className="space-y-2">
          {Object.entries(stats.byType).map(([type, count]) => (
            <BarRow
              key={type}
              label={type === "COLLECTION" ? "Centro de acopio" : "Entrega de ayuda"}
              count={count}
              total={stats.total}
              color={type === "COLLECTION" ? "bg-blue-500" : "bg-red-500"}
            />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-black/10 p-4">
        <p className="mb-3 text-sm font-semibold">Por ubicación</p>
        <div className="space-y-2">
          {Object.entries(stats.byCountry).map(([country, count]) => (
            <BarRow
              key={country}
              label={country}
              count={count}
              total={stats.total}
              color="bg-black"
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-black/40">Extraído del último segmento de la dirección. Puntos sin dirección se clasifican por coordenadas.</p>
      </div>

      <div className="rounded-2xl border border-black/10 p-4">
        <p className="mb-3 text-sm font-semibold">Últimos 30 días</p>
        <div className="flex items-end gap-0.5" style={{ height: 80 }}>
          {stats.recentDays.map((d) => (
            <div
              key={d.date}
              title={`${d.date}: ${d.count}`}
              className="flex-1 rounded-t bg-blue-500 transition-all"
              style={{ height: `${Math.round((d.count / maxDay) * 100)}%`, minHeight: d.count > 0 ? 2 : 0 }}
            />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-xs text-black/35">
          <span>{stats.recentDays[0]?.date?.slice(5)}</span>
          <span>{stats.recentDays[stats.recentDays.length - 1]?.date?.slice(5)}</span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color = "text-black" }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-2xl border border-black/10 p-4">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-black/50">{label}</p>
    </div>
  );
}

function BarRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="text-black/50">{count} ({pct}%)</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-black/8">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function TokensSection() {
  const [tokens, setTokens] = useState<AdminTokenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AdminTokenRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/admin/tokens");
    const d = (await r.json()) as { tokens: AdminTokenRow[] };
    setTokens(d.tokens ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const remove = async (id: string) => {
    if (!confirm("¿Borrar este token?")) return;
    await fetch(`/api/admin/tokens/${id}`, { method: "DELETE" });
    void load();
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-black/60">
          {tokens.length} token{tokens.length === 1 ? "" : "s"} de admin
        </p>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
        >
          + Nuevo token
        </button>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-black/40">Cargando…</p>
      ) : tokens.length === 0 ? (
        <p className="py-8 text-center text-sm text-black/40">No hay tokens creados.</p>
      ) : (
        <ul className="space-y-3">
          {tokens.map((t) => (
            <li key={t.id} className="rounded-2xl border border-black/10 p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-sm text-black/55">{t.email}</p>
                  <p className="mt-1 font-mono text-xs text-black/40">
                    {t.token.slice(0, 8)}{"…"}{t.token.slice(-4)}
                  </p>
                </div>
                <p className="shrink-0 text-xs text-black/35">
                  {new Date(t.createdAt).toLocaleDateString("es")}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditing(t); setShowForm(true); }}
                  className="rounded-lg border border-black/15 px-3 py-1.5 text-sm font-medium"
                >
                  Editar
                </button>
                <button
                  onClick={() => remove(t.id)}
                  className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600"
                >
                  Borrar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <TokenForm
          initial={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); void load(); }}
        />
      )}
    </div>
  );
}

function TokenForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: AdminTokenRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [token, setToken] = useState(initial?.token ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(!initial);

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      const url = initial ? `/api/admin/tokens/${initial.id}` : "/api/admin/tokens";
      const method = initial ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, token }),
      });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) { setError(d.error ?? "Error al guardar."); return; }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{initial ? "Editar token" : "Nuevo token"}</h2>
          <button onClick={onClose} className="text-2xl leading-none text-black/40">×</button>
        </div>

        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-medium text-black/70">Nombre</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Juan Pérez" className="input" />
        </label>

        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-medium text-black/70">Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="juan@example.com" className="input" />
        </label>

        <div className="mb-4">
          <span className="mb-1 block text-sm font-medium text-black/70">Token</span>
          <div className="flex gap-2">
            <input
              type={showToken ? "text" : "password"}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="input font-mono"
            />
            <button
              type="button"
              onClick={() => setShowToken((v) => !v)}
              className="shrink-0 rounded-xl border border-black/10 px-3 text-sm text-black/60"
            >
              {showToken ? "Ocultar" : "Ver"}
            </button>
          </div>
          <button
            type="button"
            onClick={() => { setToken(randomToken()); setShowToken(true); }}
            className="mt-1.5 text-xs font-medium text-blue-600 underline"
          >
            Generar token aleatorio
          </button>
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-black/10 py-3 text-sm font-medium">
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 rounded-xl bg-black py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${value ? "bg-blue-600" : "bg-black/20"}`}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${value ? "left-6" : "left-1"}`} />
    </button>
  );
}

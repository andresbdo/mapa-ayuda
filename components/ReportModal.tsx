"use client";

import { useState } from "react";

export default function ReportModal({
  pointId,
  pointName,
  onClose,
}: {
  pointId: string;
  pointName: string;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (text.trim().length < 5) {
      setError("Describí el problema (mínimo 5 caracteres).");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/points/${pointId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (!res.ok) {
        setError("No se pudo enviar el reporte. Intentá de nuevo.");
        return;
      }
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
        {done ? (
          <div className="py-4 text-center">
            <div className="mb-2 text-4xl">✅</div>
            <h2 className="text-lg font-semibold">Reporte enviado</h2>
            <p className="mt-1 text-sm text-black/60">Lo vamos a revisar. Gracias.</p>
            <button
              onClick={onClose}
              className="mt-5 w-full rounded-xl bg-black py-3 text-sm font-semibold text-white"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Reportar punto</h2>
              <button onClick={onClose} className="text-2xl leading-none text-black/40">
                ×
              </button>
            </div>
            <p className="mb-3 text-sm text-black/55">{pointName}</p>
            <label className="mb-3 block">
              <span className="mb-1 block text-sm font-medium text-black/70">
                ¿Qué problema encontraste?
              </span>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                placeholder="Ej: la información está desactualizada, el lugar ya no existe…"
                className="input resize-none"
              />
            </label>
            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
            <button
              onClick={submit}
              disabled={submitting}
              className="w-full rounded-xl bg-black py-3.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting ? "Enviando…" : "Enviar reporte"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

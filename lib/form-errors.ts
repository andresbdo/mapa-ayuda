const FIELD_LABELS: Record<string, string> = {
  type: "Tipo",
  name: "Nombre",
  description: "Notas",
  lat: "Latitud",
  lng: "Longitud",
  address: "Dirección",
  items: "Qué reciben/entregan",
  days: "Días",
  hours: "Horario",
  startDate: "Inicio",
  endDate: "Fecha límite",
  contact: "Celular",
  contacts: "Celulares",
  instagram: "Instagram",
};

type ApiErrorBody = {
  error?: string;
  issues?: {
    fieldErrors?: Record<string, string[]>;
    formErrors?: string[];
  };
};

export function formatApiError(body: ApiErrorBody | null, fallback: string): string {
  const fieldErrors = body?.issues?.fieldErrors;
  if (fieldErrors) {
    const messages = Object.entries(fieldErrors)
      .flatMap(([field, errors]) =>
        errors.map((error) => `${FIELD_LABELS[field] ?? field}: ${error}`)
      )
      .filter(Boolean);
    if (messages.length > 0) return messages.slice(0, 3).join(" ");
  }

  const formError = body?.issues?.formErrors?.[0];
  if (formError) return formError;

  return body?.error || fallback;
}

export async function readApiError(res: Response, fallback: string): Promise<string> {
  const text = await res.text().catch(() => "");
  if (!text) return `${fallback} Código ${res.status}.`;

  try {
    return formatApiError(JSON.parse(text) as ApiErrorBody, fallback);
  } catch {
    const shortText = text.replace(/\s+/g, " ").trim().slice(0, 180);
    return `${fallback} Código ${res.status}: ${shortText}`;
  }
}

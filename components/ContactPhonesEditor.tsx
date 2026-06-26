"use client";

import { formatPhoneInput, type ContactPhone } from "@/lib/contact";

export default function ContactPhonesEditor({
  contacts,
  onChange,
}: {
  contacts: ContactPhone[];
  onChange: (contacts: ContactPhone[]) => void;
}) {
  const update = (index: number, next: ContactPhone) => {
    onChange(contacts.map((contact, i) => (i === index ? next : contact)));
  };

  const remove = (index: number) => {
    onChange(contacts.filter((_, i) => i !== index));
  };

  return (
    <div className="mb-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-black/70">Celulares</span>
        {contacts.length < 3 && (
          <button
            type="button"
            onClick={() => onChange([...contacts, { phone: "", whatsapp: true }])}
            className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-black/65"
          >
            Agregar
          </button>
        )}
      </div>

      <div className="space-y-2">
        {contacts.length === 0 && (
          <button
            type="button"
            onClick={() => onChange([{ phone: "", whatsapp: true }])}
            className="w-full rounded-xl border border-dashed border-black/15 py-3 text-sm font-medium text-black/55"
          >
            Agregar celular
          </button>
        )}

        {contacts.map((contact, index) => (
          <div key={index} className="rounded-xl border border-black/10 p-2">
            <div className="flex gap-2">
              <input
                value={contact.phone}
                onChange={(e) =>
                  update(index, {
                    ...contact,
                    phone: formatPhoneInput(e.target.value),
                  })
                }
                placeholder="+584121234567"
                inputMode="tel"
                className="input"
              />
              {contacts.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="shrink-0 rounded-xl bg-black/5 px-3 text-sm font-medium text-black/55"
                  aria-label="Quitar celular"
                >
                  ×
                </button>
              )}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5 rounded-full bg-black/5 p-1">
              <button
                type="button"
                onClick={() => update(index, { ...contact, whatsapp: true })}
                className={`rounded-full py-1.5 text-xs font-semibold ${
                  contact.whatsapp ? "bg-green-600 text-white" : "text-black/55"
                }`}
              >
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => update(index, { ...contact, whatsapp: false })}
                className={`rounded-full py-1.5 text-xs font-semibold ${
                  !contact.whatsapp ? "bg-black text-white" : "text-black/55"
                }`}
              >
                Sólo llamada
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

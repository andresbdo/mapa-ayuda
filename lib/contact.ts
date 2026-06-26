export type ContactPhone = {
  phone: string;
  whatsapp: boolean;
};

export function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 15);
  return digits ? `+${digits}` : "";
}

export function phoneToWaMe(value: string): string {
  return value.replace(/\D/g, "");
}

export function normalizeInstagramHandle(value: string): string {
  return value.trim().replace(/^@+/, "");
}

export function normalizeContactPhones(contacts: ContactPhone[]): ContactPhone[] {
  const seen = new Set<string>();
  return contacts
    .map((contact) => ({
      phone: formatPhoneInput(contact.phone),
      whatsapp: contact.whatsapp,
    }))
    .filter((contact) => contact.phone)
    .filter((contact) => {
      if (seen.has(contact.phone)) return false;
      seen.add(contact.phone);
      return true;
    })
    .slice(0, 3);
}

export function contactPhonesFromPoint(
  contacts: ContactPhone[] | null | undefined,
  legacyContact: string | null | undefined
): ContactPhone[] {
  const normalized = normalizeContactPhones(contacts ?? []);
  if (normalized.length > 0) return normalized;
  return legacyContact
    ? normalizeContactPhones([{ phone: legacyContact, whatsapp: true }])
    : [];
}

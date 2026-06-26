export function shortAddress(address: string) {
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length <= 3) return address;

  const first = parts[0] ?? "";
  const second = parts[1] ?? "";
  const firstIsNumber = isStreetNumber(first);
  const secondIsNumber = isStreetNumber(second);
  const streetLine =
    firstIsNumber && second
      ? `${second} ${first}`
      : secondIsNumber
        ? `${first} ${second}`
        : first;
  const neighborhood =
    parts.find((part, index) => index > 1 && isLikelyNeighborhood(part)) ??
    parts[2];
  const city = parts.find((part) => isLikelyCity(part)) ?? "";
  const normalizedCity = /ciudad aut[oó]noma|buenos aires/i.test(city)
    ? "CABA"
    : city;

  return [streetLine, neighborhood, normalizedCity]
    .filter(Boolean)
    .filter((value, index, arr) => arr.indexOf(value) === index)
    .slice(0, 3)
    .join(", ");
}

function isStreetNumber(value: string) {
  return /^\d+[A-Za-z]?$/.test(value);
}

function isLikelyNeighborhood(value: string) {
  return /palermo|recoleta|belgrano|caballito|flores|almagro|villa|barracas|san telmo|retiro|monserrat|boedo|chacarita|colegiales|constituci[oó]n|mataderos|n[uú][ñn]ez|saavedra|versalles|devoto|liniers|pompeya|paternal|agronom[ií]a|parque|pac[ií]fico/i.test(
    value
  );
}

function isLikelyCity(value: string) {
  return /caba|ciudad aut[oó]noma|buenos aires|caracas|bogot[aá]|medell[ií]n|quito|lima|santiago|montevideo|madrid|par[ií]s|paris/i.test(
    value
  );
}

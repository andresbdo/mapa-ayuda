const VENEZUELA_BOUNDS = {
  minLat: 0.5,
  maxLat: 12.6,
  minLng: -73.6,
  maxLng: -59.6,
};

// Rough country outline, enough to reject obviously external delivery points.
const VENEZUELA_POLYGON: Array<[number, number]> = [
  [-73.4, 9.2],
  [-72.1, 11.8],
  [-70.0, 12.3],
  [-67.0, 11.7],
  [-64.0, 10.8],
  [-60.0, 8.7],
  [-60.7, 6.8],
  [-61.4, 5.0],
  [-61.1, 4.0],
  [-62.8, 3.5],
  [-64.2, 2.0],
  [-66.8, 1.1],
  [-69.9, 1.7],
  [-71.7, 5.4],
  [-72.9, 7.2],
];

export function isInsideVenezuela(lat: number, lng: number): boolean {
  if (
    lat < VENEZUELA_BOUNDS.minLat ||
    lat > VENEZUELA_BOUNDS.maxLat ||
    lng < VENEZUELA_BOUNDS.minLng ||
    lng > VENEZUELA_BOUNDS.maxLng
  ) {
    return false;
  }

  let inside = false;
  for (
    let i = 0, j = VENEZUELA_POLYGON.length - 1;
    i < VENEZUELA_POLYGON.length;
    j = i++
  ) {
    const [xi, yi] = VENEZUELA_POLYGON[i];
    const [xj, yj] = VENEZUELA_POLYGON[j];
    const intersects =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

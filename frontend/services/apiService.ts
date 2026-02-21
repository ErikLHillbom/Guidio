import { Coordinates, GuideResponse, PointOfInterest } from '../types';

let cachedPois: PointOfInterest[] = [];
let cacheOrigin: Coordinates | null = null;
const CACHE_RADIUS_METERS = 200;

function distanceMeters(a: Coordinates, b: Coordinates): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinLon * sinLon;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function isCacheValid(coords: Coordinates): boolean {
  if (!cacheOrigin || cachedPois.length === 0) return false;
  return distanceMeters(cacheOrigin, coords) < CACHE_RADIUS_METERS;
}

export async function fetchNearbyPOIs(
  serverUrl: string,
  coordinates: Coordinates,
  userId: string,
): Promise<PointOfInterest[]> {
  if (isCacheValid(coordinates)) {
    return cachedPois;
  }

  const response = await fetch(`${serverUrl}/location`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ coordinates, userId }),
  });

  if (!response.ok) {
    throw new Error(`Location request failed: ${response.status}`);
  }

  const data = await response.json();
  cachedPois = data.pois;
  cacheOrigin = coordinates;
  return cachedPois;
}

export async function fetchGuideInfo(
  serverUrl: string,
  poiId: string,
  poiName: string,
  userCoordinates: Coordinates,
): Promise<GuideResponse> {
  const response = await fetch(`${serverUrl}/guide`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ poiId, poiName, userCoordinates }),
  });

  if (!response.ok) {
    throw new Error(`Guide request failed: ${response.status}`);
  }

  return await response.json();
}

export function clearPOICache(): void {
  cachedPois = [];
  cacheOrigin = null;
}

import { Coordinates } from '../types';

const EARTH_RADIUS_M = 6371000;
const M_PER_DEG_LAT = 111320;

export function geodesicDistanceMeters(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const sinHalfDLat = Math.sin(dLat / 2);
  const sinHalfDLon = Math.sin(dLon / 2);
  const h =
    sinHalfDLat * sinHalfDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinHalfDLon * sinHalfDLon;

  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function offsetCoordinates(
  base: Coordinates,
  dxMeters: number,
  dyMeters: number,
): Coordinates {
  const latDeg = dyMeters / M_PER_DEG_LAT;
  const lonDeg = dxMeters / (M_PER_DEG_LAT * Math.cos((base.latitude * Math.PI) / 180));
  return {
    latitude: base.latitude + latDeg,
    longitude: base.longitude + lonDeg,
  };
}

import { Coordinates, PointOfInterest } from '../types';

const BUCKET_SIZE_M = 2000;
const M_PER_DEG_LAT = 111_320;
const BUCKET_LAT_DEG = BUCKET_SIZE_M / M_PER_DEG_LAT;

function bucketLngDeg(row: number): number {
  const centerLat = (row + 0.5) * BUCKET_LAT_DEG;
  const clamped = Math.min(Math.max(centerLat, -85), 85);
  return BUCKET_LAT_DEG / Math.cos((clamped * Math.PI) / 180);
}

function getBucket(lat: number, lng: number): { row: number; col: number } {
  const row = Math.floor(lat / BUCKET_LAT_DEG);
  const col = Math.floor(lng / bucketLngDeg(row));
  return { row, col };
}

function bkey(row: number, col: number): string {
  return `${row}:${col}`;
}

export function getBucketKey(coords: Coordinates): string {
  const { row, col } = getBucket(coords.latitude, coords.longitude);
  return bkey(row, col);
}

export function getActiveKeys(coords: Coordinates): Set<string> {
  const center = getBucket(coords.latitude, coords.longitude);
  const keys = new Set<string>();
  for (let dr = -1; dr <= 1; dr++) {
    const r = center.row + dr;
    const lngDeg = bucketLngDeg(r);
    const c = Math.floor(coords.longitude / lngDeg);
    for (let dc = -1; dc <= 1; dc++) {
      keys.add(bkey(r, c + dc));
    }
  }
  return keys;
}

export type BucketIndex = Map<string, PointOfInterest[]>;

export function buildBucketIndex(pois: PointOfInterest[]): BucketIndex {
  const index: BucketIndex = new Map();
  for (const poi of pois) {
    const { row, col } = getBucket(
      poi.coordinates.latitude,
      poi.coordinates.longitude,
    );
    const key = bkey(row, col);
    let arr = index.get(key);
    if (!arr) {
      arr = [];
      index.set(key, arr);
    }
    arr.push(poi);
  }
  return index;
}

export function getActivePOIs(
  index: BucketIndex,
  keys: Set<string>,
): PointOfInterest[] {
  const result: PointOfInterest[] = [];
  for (const key of keys) {
    const bucket = index.get(key);
    if (bucket) result.push(...bucket);
  }
  return result;
}

export interface BucketGridLines {
  horizontalLines: { latitude: number; lngMin: number; lngMax: number }[];
  verticalLines: { longitude: number; latMin: number; latMax: number }[];
}

export function getGridLines(coords: Coordinates): BucketGridLines {
  const { row } = getBucket(coords.latitude, coords.longitude);
  const lngDeg = bucketLngDeg(row);
  const col = Math.floor(coords.longitude / lngDeg);

  const latMin = (row - 1) * BUCKET_LAT_DEG;
  const latMax = (row + 2) * BUCKET_LAT_DEG;
  const lngMin = (col - 1) * lngDeg;
  const lngMax = (col + 2) * lngDeg;

  const horizontalLines: BucketGridLines['horizontalLines'] = [];
  for (let i = -1; i <= 2; i++) {
    horizontalLines.push({
      latitude: (row + i) * BUCKET_LAT_DEG,
      lngMin,
      lngMax,
    });
  }

  const verticalLines: BucketGridLines['verticalLines'] = [];
  for (let i = -1; i <= 2; i++) {
    verticalLines.push({
      longitude: (col + i) * lngDeg,
      latMin,
      latMax,
    });
  }

  return { horizontalLines, verticalLines };
}

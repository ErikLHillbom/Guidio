import { Coordinates, PointOfInterest } from '../types';

export async function fetchNearbyPOIs(
  serverUrl: string,
  coordinates: Coordinates,
  userId: string,
): Promise<PointOfInterest[]> {
  const response = await fetch(`${serverUrl}/location`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ coordinates, userId }),
  });

  if (!response.ok) {
    throw new Error(`Location request failed: ${response.status}`);
  }

  const data = await response.json();
  return data.pois;
}

import { Coordinates, GuideResponse, PointOfInterest } from '../types';

function offsetCoords(
  base: Coordinates,
  latOffsetMeters: number,
  lonOffsetMeters: number,
): Coordinates {
  const latDeg = latOffsetMeters / 111320;
  const lonDeg = lonOffsetMeters / (111320 * Math.cos((base.latitude * Math.PI) / 180));
  return {
    latitude: base.latitude + latDeg,
    longitude: base.longitude + lonDeg,
  };
}

function buildMockPOIs(userLocation: Coordinates): PointOfInterest[] {
  return [
    {
      id: 'poi-1',
      name: 'Historic Monument',
      description: 'A significant landmark in this area',
      coordinates: offsetCoords(userLocation, 120, 80),
    },
    {
      id: 'poi-2',
      name: 'Old Cathedral',
      description: 'A centuries-old place of worship',
      coordinates: offsetCoords(userLocation, -100, 150),
    },
    {
      id: 'poi-3',
      name: 'City Museum',
      description: 'Local history and culture exhibits',
      coordinates: offsetCoords(userLocation, 200, -60),
    },
    {
      id: 'poi-4',
      name: 'Parliament Building',
      description: 'Seat of local government',
      coordinates: offsetCoords(userLocation, -180, -120),
    },
    {
      id: 'poi-5',
      name: 'Royal Gardens',
      description: 'A historic public park',
      coordinates: offsetCoords(userLocation, 50, -200),
    },
  ];
}

const MOCK_GUIDE_TEXTS: Record<string, string> = {
  'poi-1': 'You\'re standing before the Historic Monument, one of the area\'s most significant landmarks. Built centuries ago, it has witnessed the rise and fall of empires and remains a symbol of resilience.',
  'poi-2': 'The Old Cathedral has served this community for over 700 years. Its Gothic spires reach toward the sky, and inside you\'ll find remarkable stained glass windows depicting scenes from local history.',
  'poi-3': 'Welcome to the City Museum. This building itself dates back to the 1800s and houses a collection spanning thousands of years of local history, from ancient artifacts to modern art.',
  'poi-4': 'The Parliament Building stands as a testament to democratic governance. Designed in the neoclassical style, it has been the seat of government since the early 1900s.',
  'poi-5': 'The Royal Gardens have been a public retreat since the 18th century. Every spring, the cherry trees bloom in spectacular fashion. In winter, locals gather here for ice skating.',
};

let cachedMockPOIs: PointOfInterest[] | null = null;

const SIMULATED_DELAY_MS = 1500;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function clearMockPOICache(): void {
  cachedMockPOIs = null;
}

export async function mockFetchNearbyPOIs(
  _serverUrl: string,
  coordinates: Coordinates,
  _userId: string,
): Promise<PointOfInterest[]> {
  await delay(300);
  if (!cachedMockPOIs) {
    cachedMockPOIs = buildMockPOIs(coordinates);
  }
  return cachedMockPOIs;
}

export async function mockFetchGuideInfo(
  _serverUrl: string,
  poiId: string,
  poiName: string,
  _userCoordinates: Coordinates,
): Promise<GuideResponse> {
  await delay(SIMULATED_DELAY_MS);

  return {
    poiId,
    poiName,
    transcription: MOCK_GUIDE_TEXTS[poiId] ?? `This is a simulated guide response for ${poiName}. In production, the backend would return real information about this location.`,
    audioUrl: 'https://example.com/audio/placeholder.mp3',
    imageUrl: 'https://example.com/images/placeholder.jpg',
  };
}

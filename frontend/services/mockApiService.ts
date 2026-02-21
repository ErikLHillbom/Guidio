import mockData from '../mock_data/mock_backend_response.json';
import { Coordinates, GuideResponse, PointOfInterest } from '../types';

interface MockPOIEntry {
  entity_id: string;
  title: string;
  latitude: number;
  longitude: number;
  categories: string[];
  image_url: string;
}

const ALL_MOCK_POIS: PointOfInterest[] = (
  mockData.points_of_interest as MockPOIEntry[]
).map((p) => ({
  id: p.entity_id,
  name: p.title,
  coordinates: { latitude: p.latitude, longitude: p.longitude },
  imageUrl: p.image_url,
  categories: p.categories,
}));

const MOCK_START_LOCATION: Coordinates = {
  latitude: mockData.latitude,
  longitude: mockData.longitude,
};

let cachedMockPOIs: PointOfInterest[] | null = null;

const SIMULATED_DELAY_MS = 1500;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { MOCK_START_LOCATION };

export function clearMockPOICache(): void {
  cachedMockPOIs = null;
}

export async function mockFetchNearbyPOIs(
  _serverUrl: string,
  _coordinates: Coordinates,
  _userId: string,
): Promise<PointOfInterest[]> {
  await delay(300);
  if (!cachedMockPOIs) {
    cachedMockPOIs = ALL_MOCK_POIS;
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

  const poi = ALL_MOCK_POIS.find((p) => p.id === poiId);

  return {
    poiId,
    poiName,
    transcription: `You are now near ${poiName}. This is a notable location in Stockholm's Gamla Stan district, rich with history and cultural significance.`,
    audioUrl: 'https://example.com/audio/placeholder.mp3',
    imageUrl: poi?.imageUrl ?? 'https://example.com/images/placeholder.jpg',
  };
}

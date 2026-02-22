import { Asset } from 'expo-asset';
import mockData from '../mock_data/mock_backend_response.json';
import mockDetailData from '../mock_data/mock_backend_response_detailed.json';
import { Coordinates, GuideResponse, POIDetail, PointOfInterest } from '../types';
import { DataService } from './DataService';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const MOCK_AUDIO_MODULE = require('../mock_data/Q1754.mp3');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const MOCK_TRANSCRIPTION_MODULE = require('../mock_data/Q1754.txt');

let cachedTranscription: string | null = null;

async function loadMockTranscription(): Promise<string> {
  if (cachedTranscription) return cachedTranscription;
  const asset = Asset.fromModule(MOCK_TRANSCRIPTION_MODULE);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  const response = await fetch(uri);
  cachedTranscription = await response.text();
  return cachedTranscription;
}

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

export const MOCK_START_LOCATION: Coordinates = {
  latitude: mockData.latitude,
  longitude: mockData.longitude,
};

const SIMULATED_DELAY_MS = 1500;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockDataService implements DataService {
  private cachedPOIs: PointOfInterest[] | null = null;

  async fetchNearbyPOIs(_coordinates: Coordinates, _userId: string, _force?: boolean): Promise<PointOfInterest[]> {
    await delay(300);
    if (!this.cachedPOIs) {
      this.cachedPOIs = ALL_MOCK_POIS;
    }
    return this.cachedPOIs;
  }

  async fetchGuideInfo(
    poiId: string,
    poiName: string,
    _userCoordinates: Coordinates,
  ): Promise<GuideResponse> {
    await delay(SIMULATED_DELAY_MS);

    const poi = ALL_MOCK_POIS.find((p) => p.id === poiId);

    const asset = Asset.fromModule(MOCK_AUDIO_MODULE);
    await asset.downloadAsync();

    const transcription = await loadMockTranscription();

    return {
      poiId,
      poiName,
      transcription,
      audioUrl: asset.localUri ?? asset.uri,
      imageUrl: poi?.imageUrl ?? '',
    };
  }

  async fetchPOIDetail(poiId: string): Promise<POIDetail> {
    await delay(300);

    const poi = ALL_MOCK_POIS.find((p) => p.id === poiId);
    const title = poi?.name ?? poiId;

    // Use real detailed data if it matches, otherwise generate a placeholder
    if (mockDetailData.entity_id === poiId) {
      return {
        entityId: mockDetailData.entity_id,
        title: mockDetailData.title,
        text: mockDetailData.text,
        textAudio: mockDetailData.text_audio,
        audioFile: mockDetailData.audio_file,
      };
    }

    return {
      entityId: poiId,
      title,
      text: `<h1>${title}</h1>\n<p>${title} is a notable landmark located in Stockholm. It has a rich history and cultural significance that makes it a must-visit destination.</p>`,
      textAudio: '',
      audioFile: '',
    };
  }

  clearCache(): void {
    this.cachedPOIs = null;
  }
}

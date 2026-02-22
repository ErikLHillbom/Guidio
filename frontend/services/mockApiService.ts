import { Coordinates, GuideResponse, POIDetail, PointOfInterest } from '../types';
import { DataService } from './DataService';

// no audio or transcription data in simplified mock

// remove external mock JSON data; start with empty set
const ALL_MOCK_POIS: PointOfInterest[] = [];

// arbitrary default start location – application may override when mocking
export const MOCK_START_LOCATION: Coordinates = {
  latitude: 0,
  longitude: 0,
};

const SIMULATED_DELAY_MS = 1500;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockDataService implements DataService {
  private cachedPOIs: PointOfInterest[] | null = null; // will accumulate discovered POIs

  async fetchNearbyPOIs(_coordinates: Coordinates, _userId: string, _force?: boolean): Promise<PointOfInterest[]> {
    await delay(300);
    if (!this.cachedPOIs) {
      // start with base set; further fetches may push more entries
      this.cachedPOIs = [...ALL_MOCK_POIS];
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

    // return minimal guide info with no audio
    return {
      poiId,
      poiName,
      transcription: '',
      audioUrl: '',
      imageUrl: poi?.imageUrl ?? '',
    };
  }

  async fetchPOIDetail(poiId: string): Promise<POIDetail> {
    await delay(300);

    const poi = ALL_MOCK_POIS.find((p) => p.id === poiId);
    const title = poi?.name ?? poiId;

    // always return a simple placeholder for detail data
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

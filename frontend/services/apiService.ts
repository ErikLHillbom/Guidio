import { Coordinates, GuideResponse, POIDetail, PointOfInterest } from '../types';
import { geodesicDistanceMeters } from '../utils/geo';
import { DataService } from './DataService';

const API_PREFIX = '/api/v1/locations';
const POI_CACHE_RADIUS_M = 400;

interface BackendPOI {
  entity_id: string;
  title: string;
  latitude: number;
  longitude: number;
  categories: string[];
  image_url: string | null;
}

interface BackendDetailResponse {
  entity_id: string;
  title: string;
  text: string | null;
  text_audio: string | null;
  audio_file: string | null;
}

function mapPOI(raw: BackendPOI): PointOfInterest {
  return {
    id: raw.entity_id,
    name: raw.title,
    coordinates: { latitude: raw.latitude, longitude: raw.longitude },
    imageUrl: raw.image_url ?? undefined,
    categories: raw.categories,
  };
}

export class RealDataService implements DataService {
  private serverUrl: string;
  private cachedPois: PointOfInterest[] = [];
  private cacheOrigin: Coordinates | null = null;
  private detailCache = new Map<string, BackendDetailResponse>();

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl;
  }

  private isPOICacheValid(coords: Coordinates): boolean {
    if (!this.cacheOrigin || this.cachedPois.length === 0) return false;
    return geodesicDistanceMeters(this.cacheOrigin, coords) < POI_CACHE_RADIUS_M;
  }

  private audioUrl(entityId: string): string {
    return `${this.serverUrl}${API_PREFIX}/audio/${entityId}`;
  }

  private async fetchDetail(entityId: string): Promise<BackendDetailResponse> {
    const cached = this.detailCache.get(entityId);
    if (cached) return cached;

    const response = await fetch(
      `${this.serverUrl}${API_PREFIX}/detail/${entityId}`,
    );
    if (!response.ok) {
      throw new Error(`Detail request failed: ${response.status}`);
    }
    const data: BackendDetailResponse = await response.json();
    this.detailCache.set(entityId, data);
    return data;
  }

  async fetchNearbyPOIs(coordinates: Coordinates, _userId: string): Promise<PointOfInterest[]> {
    if (this.isPOICacheValid(coordinates)) {
      return this.cachedPois;
    }

    const response = await fetch(`${this.serverUrl}${API_PREFIX}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      }),
    });

    if (response.status === 204) {
      return this.cachedPois;
    }
    if (!response.ok) {
      throw new Error(`Location update failed: ${response.status}`);
    }

    const data = await response.json();
    const pois = (data.points_of_interest as BackendPOI[]).map(mapPOI);
    this.cachedPois = pois;
    this.cacheOrigin = coordinates;
    return pois;
  }

  async fetchGuideInfo(
    poiId: string,
    poiName: string,
    _userCoordinates: Coordinates,
  ): Promise<GuideResponse> {
    const detail = await this.fetchDetail(poiId);

    return {
      poiId,
      poiName,
      transcription: detail.text_audio ?? '',
      audioUrl: detail.audio_file ? this.audioUrl(poiId) : '',
      imageUrl: '',
    };
  }

  async fetchPOIDetail(poiId: string): Promise<POIDetail> {
    const data = await this.fetchDetail(poiId);
    return {
      entityId: data.entity_id,
      title: data.title,
      text: data.text ?? '',
      textAudio: data.text_audio ?? '',
      audioFile: data.audio_file ?? '',
    };
  }

  clearCache(): void {
    this.cachedPois = [];
    this.cacheOrigin = null;
    this.detailCache.clear();
  }
}

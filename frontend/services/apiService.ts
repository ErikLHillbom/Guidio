import { Coordinates, GuideResponse, POIDetail, PointOfInterest } from '../types';
import { geodesicDistanceMeters } from '../utils/geo';
import { DataService } from './DataService';

const API_PREFIX = '/api/v1/locations';
const POI_CACHE_RADIUS_M = 200;

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

function toPlayableAudioUrl(serverUrl: string, audioFile: string): string {
  const value = audioFile.trim();
  if (!value) return '';

  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  const normalized = value.replace(/\\/g, '/');
  if (normalized.startsWith('/app/ai/test/output/')) {
    return `${serverUrl}${normalized}`;
  }

  const filename = normalized.split('/').pop();
  if (filename && filename.toLowerCase().endsWith('.mp3')) {
    return `${serverUrl}/app/ai/test/output/${encodeURIComponent(filename)}`;
  }

  const separator = normalized.startsWith('/') ? '' : '/';
  return `${serverUrl}${separator}${normalized}`;
}

export class RealDataService implements DataService {
  private serverUrl: string;
  private cachedPois: PointOfInterest[] = [];
  private cacheOrigin: Coordinates | null = null;
  private detailCache = new Map<string, BackendDetailResponse>();
  private runtimeSessionId: string;

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl;
    this.runtimeSessionId = `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  private isPOICacheValid(coords: Coordinates): boolean {
    if (!this.cacheOrigin || this.cachedPois.length === 0) return false;
    return geodesicDistanceMeters(this.cacheOrigin, coords) < POI_CACHE_RADIUS_M;
  }

  private async requestPoiUpdate(
    coordinates: Coordinates,
    sessionId: string,
  ): Promise<Response> {
    return fetch(`${this.serverUrl}${API_PREFIX}/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Id': sessionId,
      },
      body: JSON.stringify({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      }),
    });
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

  // POST /api/v1/locations/update  { latitude, longitude }
  // Returns 200 with { latitude, longitude, points_of_interest } or 204 (no movement)
  async fetchNearbyPOIs(coordinates: Coordinates, userId: string): Promise<PointOfInterest[]> {
    if (this.isPOICacheValid(coordinates)) {
      return this.cachedPois;
    }
    const sessionId = userId.trim() || this.runtimeSessionId;

    let response = await this.requestPoiUpdate(coordinates, sessionId);

    if (response.status === 204 && this.cachedPois.length === 0) {
      const nudgedLatitude = Math.max(
        -90,
        Math.min(90, coordinates.latitude + 0.00055),
      );
      response = await this.requestPoiUpdate(
        { ...coordinates, latitude: nudgedLatitude },
        sessionId,
      );
    }

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

  // GET /api/v1/locations/detail/{entity_id}
  // text_audio → transcription, audio downloaded & cached locally
  async fetchGuideInfo(
    poiId: string,
    poiName: string,
    _userCoordinates: Coordinates,
  ): Promise<GuideResponse> {
    const detail = await this.fetchDetail(poiId);

    let audioUrl = '';
    if (detail.audio_file) {
      audioUrl = toPlayableAudioUrl(this.serverUrl, detail.audio_file);
    }

    return {
      poiId,
      poiName,
      transcription: detail.text_audio ?? '',
      audioUrl,
      imageUrl: '',
    };
  }

  // GET /api/v1/locations/detail/{entity_id}
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

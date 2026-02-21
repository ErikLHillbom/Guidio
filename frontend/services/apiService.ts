import { Coordinates, GuideResponse, POIDetail, PointOfInterest } from '../types';
import { geodesicDistanceMeters } from '../utils/geo';
import { DataService } from './DataService';

const CACHE_RADIUS_METERS = 200;

export class RealDataService implements DataService {
  private serverUrl: string;
  private cachedPois: PointOfInterest[] = [];
  private cacheOrigin: Coordinates | null = null;

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl;
  }

  private isCacheValid(coords: Coordinates): boolean {
    if (!this.cacheOrigin || this.cachedPois.length === 0) return false;
    return geodesicDistanceMeters(this.cacheOrigin, coords) < CACHE_RADIUS_METERS;
  }

  async fetchNearbyPOIs(coordinates: Coordinates, userId: string): Promise<PointOfInterest[]> {
    if (this.isCacheValid(coordinates)) {
      return this.cachedPois;
    }

    const response = await fetch(`${this.serverUrl}/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates, userId }),
    });

    if (!response.ok) {
      throw new Error(`Location request failed: ${response.status}`);
    }

    const data = await response.json();
    this.cachedPois = data.pois;
    this.cacheOrigin = coordinates;
    return this.cachedPois;
  }

  async fetchGuideInfo(
    poiId: string,
    poiName: string,
    userCoordinates: Coordinates,
  ): Promise<GuideResponse> {
    const response = await fetch(`${this.serverUrl}/guide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poiId, poiName, userCoordinates }),
    });

    if (!response.ok) {
      throw new Error(`Guide request failed: ${response.status}`);
    }

    return await response.json();
  }

  async fetchPOIDetail(poiId: string): Promise<POIDetail> {
    const response = await fetch(`${this.serverUrl}/poi/${poiId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`POI detail request failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      entityId: data.entity_id,
      title: data.title,
      text: data.text,
      textAudio: data.text_audio ?? '',
      audioFile: data.audio_file ?? '',
    };
  }

  clearCache(): void {
    this.cachedPois = [];
    this.cacheOrigin = null;
  }
}

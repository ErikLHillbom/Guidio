import { Coordinates, GuideResponse, POIDetail, PointOfInterest } from '../types';

export interface DataService {
  /**
   * Retrieve POIs near `coordinates`.  If `force` is true the implementation
   * should bypass any local cache and always hit the backend.
   */
  fetchNearbyPOIs(
    coordinates: Coordinates,
    userId: string,
    force?: boolean,
  ): Promise<PointOfInterest[]>;
  fetchGuideInfo(poiId: string, poiName: string, userCoordinates: Coordinates): Promise<GuideResponse>;
  fetchPOIDetail(poiId: string): Promise<POIDetail>;
  clearCache(): void;
}

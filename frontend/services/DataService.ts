import { Coordinates, GuideResponse, POIDetail, PointOfInterest } from '../types';

export interface DataService {
  fetchNearbyPOIs(coordinates: Coordinates, userId: string): Promise<PointOfInterest[]>;
  fetchGuideInfo(poiId: string, poiName: string, userCoordinates: Coordinates): Promise<GuideResponse>;
  fetchPOIDetail(poiId: string): Promise<POIDetail>;
  clearCache(): void;
}

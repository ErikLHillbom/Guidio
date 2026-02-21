export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface PointOfInterest {
  id: string;
  name: string;
  description?: string;
  coordinates: Coordinates;
}

export interface GuideResponse {
  poiId: string;
  poiName: string;
  text: string;
}

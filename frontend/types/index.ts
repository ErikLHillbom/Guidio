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
  transcription: string;
  audioUrl: string;
  imageUrl: string;
}

export interface Message {
  id: string;
  text: string;
  timestamp: Date;
}

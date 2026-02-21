export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface PointOfInterest {
  id: string;
  name: string;
  description?: string;
  coordinates: Coordinates;
  imageUrl?: string;
  categories?: string[];
}

export interface GuideResponse {
  poiId: string;
  poiName: string;
  transcription: string;
  audioUrl: string;
  imageUrl: string;
}

export interface POIDetail {
  entityId: string;
  title: string;
  text: string;
  textAudio: string;
  audioFile: string;
}

export interface Message {
  id: string;
  text: string;
  timestamp: Date;
}

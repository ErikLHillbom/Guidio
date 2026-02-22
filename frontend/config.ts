import Constants from 'expo-constants';
import { Coordinates } from './types';
import { DataService } from './services/DataService';
import { RealDataService } from './services/apiService';

/** Use bundled mock data instead of the real backend. */
export const MOCK_DATA = false;

/** Show joystick and override GPS with manual control. */
export const MOCK_GPS = true;

export const SERVER_URL: string =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
export const USER_ID = 'default';

/** Fallback location used when GPS is unavailable in mock-GPS mode (Stockholm). */
export const FALLBACK_LOCATION: Coordinates = {
  latitude: 59.3293,
  longitude: 18.0686,
};

function createDataService(): DataService {
  if (MOCK_DATA) {
    const { MockDataService } = require('./services/mockApiService');
    return new MockDataService();
  }
  return new RealDataService(SERVER_URL);
}

export const dataService: DataService = createDataService();

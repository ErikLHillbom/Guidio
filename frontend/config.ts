import Constants from 'expo-constants';
import { Coordinates } from './types';
import { RealDataService } from './services/apiService';

/** Show joystick and override GPS with manual control. */
export const MOCK_GPS = true;

export const SERVER_URL: string =
  Constants.expoConfig?.extra?.serverUrl ?? 'http://localhost:8000';
export const USER_ID: string =
  Constants.expoConfig?.extra?.userId ?? 'default';

/** Fallback location used when GPS is unavailable in mock-GPS mode (Stockholm). */
export const FALLBACK_LOCATION: Coordinates = {
  latitude: 59.3293,
  longitude: 18.0686,
};

export const dataService = new RealDataService(SERVER_URL);

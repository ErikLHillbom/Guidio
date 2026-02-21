import Constants from 'expo-constants';
import { DataService } from './services/DataService';
import { RealDataService } from './services/apiService';
import { MockDataService } from './services/mockApiService';

/**
 * When true, the app uses mock API responses and shows debug UI (joystick).
 * Set to false for production / real-backend testing.
 */
export const DEBUG_MODE = true;

export const SERVER_URL: string =
  Constants.expoConfig?.extra?.serverUrl ?? 'http://localhost:8080';
export const USER_ID: string =
  Constants.expoConfig?.extra?.userId ?? '';

export const dataService: DataService = DEBUG_MODE
  ? new MockDataService()
  : new RealDataService(SERVER_URL);

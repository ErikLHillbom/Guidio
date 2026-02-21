import Constants from 'expo-constants';
import { DataService } from './services/DataService';
import { RealDataService } from './services/apiService';
import { MockDataService } from './services/mockApiService';

/**
 * When true, the app uses mock API responses and shows debug UI (joystick).
 * Toggle with EXPO_PUBLIC_DEBUG_MODE=true|false.
 */
const rawDebugMode = (process.env.EXPO_PUBLIC_DEBUG_MODE ?? 'true').toLowerCase();
export const DEBUG_MODE = rawDebugMode === 'true' || rawDebugMode === '1';

/**
 * When true, frontend uses local mock API data instead of backend.
 * Toggle with EXPO_PUBLIC_USE_MOCK_API=true|false.
 */
const rawUseMockApi = (process.env.EXPO_PUBLIC_USE_MOCK_API ?? '').toLowerCase();
export const USE_MOCK_API = rawUseMockApi === 'true' || rawUseMockApi === '1';

export const SERVER_URL: string =
  Constants.expoConfig?.extra?.serverUrl ?? 'http://localhost:8000';
export const USER_ID: string =
  Constants.expoConfig?.extra?.userId ?? '';

export const dataService: DataService = USE_MOCK_API
  ? new MockDataService()
  : new RealDataService(SERVER_URL);

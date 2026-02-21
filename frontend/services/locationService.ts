import * as Location from 'expo-location';
import { Coordinates } from '../types';
import { geodesicDistanceMeters } from '../utils/geo';

const PROXIMITY_THRESHOLD_METERS = 10;

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function getCurrentLocation(): Promise<Coordinates> {
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}

export function watchLocation(
  onUpdate: (coords: Coordinates) => void,
): Promise<Location.LocationSubscription> {
  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      distanceInterval: 5,
      timeInterval: 2000,
    },
    (location) => {
      onUpdate({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    },
  );
}

export function isWithinProximity(
  a: Coordinates,
  b: Coordinates,
  thresholdMeters: number = PROXIMITY_THRESHOLD_METERS,
): boolean {
  return geodesicDistanceMeters(a, b) <= thresholdMeters;
}

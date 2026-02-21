import * as Location from 'expo-location';
import { Coordinates } from '../types';

const PROXIMITY_THRESHOLD_METERS = 300;

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
      distanceInterval: 10,
      timeInterval: 5000,
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
  return getDistanceMeters(a, b) <= thresholdMeters;
}

function getDistanceMeters(a: Coordinates, b: Coordinates): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const sinHalfDLat = Math.sin(dLat / 2);
  const sinHalfDLon = Math.sin(dLon / 2);
  const h =
    sinHalfDLat * sinHalfDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinHalfDLon * sinHalfDLon;

  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

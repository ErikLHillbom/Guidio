import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { Coordinates } from '../types';
import {
  requestLocationPermission,
  getCurrentLocation,
  watchLocation,
} from '../services/locationService';

interface UseTrackingOptions {
  debugMode: boolean;
  fallbackLocation: Coordinates;
}

export function useTracking({ debugMode, fallbackLocation }: UseTrackingOptions) {
  const [tracking, setTracking] = useState(false);
  const [startLoading, setStartLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const userLocationRef = useRef<Coordinates | null>(null);
  const locationSub = useRef<Location.LocationSubscription | null>(null);

  const updatePosition = useCallback((coords: Coordinates) => {
    setUserLocation(coords);
    userLocationRef.current = coords;
  }, []);

  const resolveInitialLocation = useCallback(async (): Promise<Coordinates | null> => {
    const granted = await requestLocationPermission();

    if (debugMode) {
      if (granted) {
        try {
          return await getCurrentLocation();
        } catch {
          return fallbackLocation;
        }
      }
      return fallbackLocation;
    }

    if (!granted) {
      Alert.alert(
        'Permission Required',
        'Location permission is needed to find nearby points of interest.',
      );
      return null;
    }
    return await getCurrentLocation();
  }, [debugMode, fallbackLocation]);

  const start = useCallback(
    async (onGPSUpdate?: (coords: Coordinates) => void): Promise<Coordinates | null> => {
      setTracking(true);
      setStartLoading(true);

      const initial = await resolveInitialLocation();
      if (!initial) {
        setTracking(false);
        setStartLoading(false);
        return null;
      }

      updatePosition(initial);

      if (!debugMode && onGPSUpdate) {
        const sub = await watchLocation((coords) => {
          updatePosition(coords);
          onGPSUpdate(coords);
        });
        locationSub.current = sub;
      }

      return initial;
    },
    [resolveInitialLocation, updatePosition, debugMode],
  );

  const stop = useCallback(() => {
    locationSub.current?.remove();
    locationSub.current = null;
    setTracking(false);
  }, []);

  const finishLoading = useCallback(() => {
    setStartLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      locationSub.current?.remove();
    };
  }, []);

  return {
    tracking,
    startLoading,
    userLocation,
    userLocationRef,
    updatePosition,
    start,
    stop,
    finishLoading,
  } as const;
}

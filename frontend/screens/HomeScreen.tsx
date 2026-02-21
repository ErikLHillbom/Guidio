import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import * as Location from 'expo-location';

import { DEBUG_MODE } from '../config';
import MapViewComponent from '../components/MapViewComponent';
import StartButton from '../components/StartButton';
import MessagePanel from '../components/MessagePanel';
import DebugJoystick from '../components/DebugJoystick';
import {
  requestLocationPermission,
  getCurrentLocation,
  watchLocation,
  isWithinProximity,
} from '../services/locationService';
import { fetchNearbyPOIs, fetchGuideInfo, clearPOICache } from '../services/apiService';
import { mockFetchNearbyPOIs, mockFetchGuideInfo, clearMockPOICache } from '../services/mockApiService';
import { Coordinates, Message, PointOfInterest } from '../types';

const SERVER_URL =
  Constants.expoConfig?.extra?.serverUrl ?? 'http://localhost:8080';
const USER_ID = Constants.expoConfig?.extra?.userId ?? '';

const getPOIs = DEBUG_MODE ? mockFetchNearbyPOIs : fetchNearbyPOIs;
const getGuide = DEBUG_MODE ? mockFetchGuideInfo : fetchGuideInfo;

export default function HomeScreen() {
  const [tracking, setTracking] = useState(false);
  const [startLoading, setStartLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [pois, setPois] = useState<PointOfInterest[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', text: 'Welcome to Guidio! Press Start to begin your tour.', timestamp: new Date() },
  ]);

  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());
  const locationSub = useRef<Location.LocationSubscription | null>(null);
  const visitedPoiIds = useRef<Set<string>>(new Set());
  const poisRef = useRef<PointOfInterest[]>([]);
  const messageCounter = useRef(1);

  const addMessage = useCallback((text: string) => {
    messageCounter.current += 1;
    setMessages((prev) => [
      ...prev,
      { id: String(messageCounter.current), text, timestamp: new Date() },
    ]);
  }, []);

  const checkProximity = useCallback(
    async (coords: Coordinates) => {
      for (const poi of poisRef.current) {
        if (visitedPoiIds.current.has(poi.id)) continue;
        if (!isWithinProximity(coords, poi.coordinates)) continue;

        visitedPoiIds.current.add(poi.id);
        setVisitedIds(new Set(visitedPoiIds.current));
        addMessage(`Approaching ${poi.name}... loading guide info.`);

        try {
          const guide = await getGuide(SERVER_URL, poi.id, poi.name, coords);
          addMessage(guide.transcription);
        } catch {
          addMessage(`Unable to load guide info for ${poi.name}.`);
        }
        break;
      }
    },
    [addMessage],
  );

  const handleLocationUpdate = useCallback(
    async (coords: Coordinates) => {
      setUserLocation(coords);

      try {
        const nearbyPois = await getPOIs(SERVER_URL, coords, USER_ID);
        setPois(nearbyPois);
        poisRef.current = nearbyPois;
      } catch {
        // Backend not available — keep existing POIs
      }

      await checkProximity(coords);
    },
    [checkProximity],
  );

  const handleJoystickMove = useCallback(
    (coords: Coordinates) => {
      handleLocationUpdate(coords);
    },
    [handleLocationUpdate],
  );

  const handleStart = useCallback(async () => {
    if (tracking) {
      locationSub.current?.remove();
      locationSub.current = null;
      setTracking(false);
      addMessage('Guide stopped.');
      return;
    }

    setTracking(true);
    setStartLoading(true);

    let initialLocation: Coordinates;
    const granted = await requestLocationPermission();

    if (DEBUG_MODE) {
      if (granted) {
        try {
          initialLocation = await getCurrentLocation();
        } catch {
          initialLocation = { latitude: 40.7128, longitude: -74.006 };
        }
      } else {
        initialLocation = { latitude: 40.7128, longitude: -74.006 };
      }
    } else {
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Location permission is needed to find nearby points of interest.',
        );
        setTracking(false);
        setStartLoading(false);
        return;
      }
      initialLocation = await getCurrentLocation();
    }
    setUserLocation(initialLocation);
    visitedPoiIds.current.clear();
    setVisitedIds(new Set());
    clearPOICache();
    clearMockPOICache();

    try {
      const nearbyPois = await getPOIs(SERVER_URL, initialLocation, USER_ID);
      setPois(nearbyPois);
      poisRef.current = nearbyPois;
      addMessage(`Guide started! Found ${nearbyPois.length} points of interest nearby.`);
    } catch {
      addMessage('Guide started! Walk around to discover points of interest.');
    }

    if (!DEBUG_MODE) {
      const sub = await watchLocation(handleLocationUpdate);
      locationSub.current = sub;
    }

    setStartLoading(false);
  }, [tracking, handleLocationUpdate, addMessage]);

  useEffect(() => {
    return () => {
      locationSub.current?.remove();
    };
  }, []);

  return (
    <View style={styles.container}>
      <MapViewComponent userLocation={userLocation} pois={pois} visitedIds={visitedIds} />

      <MessagePanel messages={messages} />

      <View style={styles.startContainer}>
        <StartButton active={tracking} loading={startLoading} onPress={handleStart} />
      </View>

      <View style={styles.notchCover} />

      {DEBUG_MODE && (
        <View style={styles.joystickLayer} pointerEvents="box-none">
          <DebugJoystick
            position={userLocation ?? { latitude: 37.7749, longitude: -122.4194 }}
            onMove={handleJoystickMove}
            disabled={!tracking}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  startContainer: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
  },
  notchCover: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 42,
    backgroundColor: '#ffffff',
    zIndex: 20,
    elevation: 20,
  },
  joystickLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    elevation: 50,
  },
});

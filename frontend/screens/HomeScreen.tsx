import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import * as Location from 'expo-location';

import MapViewComponent from '../components/MapViewComponent';
import AIResponseView from '../components/AIResponseView';
import StartButton from '../components/StartButton';
import ViewToggle, { ActiveView } from '../components/ViewToggle';
import {
  requestLocationPermission,
  getCurrentLocation,
  watchLocation,
  isWithinProximity,
} from '../services/locationService';
import { fetchNearbyPOIs } from '../services/apiService';
import { LLMProvider } from '../services/llm/LLMProvider';
import { DefaultLLMProvider } from '../services/llm/DefaultLLMProvider';
import { Coordinates, PointOfInterest } from '../types';

const SERVER_URL =
  Constants.expoConfig?.extra?.serverUrl ?? 'http://localhost:8080';
const USER_ID = Constants.expoConfig?.extra?.userId ?? '';

function createLLMProvider(): LLMProvider {
  return new DefaultLLMProvider(SERVER_URL);
}

export default function HomeScreen() {
  const [activeView, setActiveView] = useState<ActiveView>('map');
  const [tracking, setTracking] = useState(false);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [pois, setPois] = useState<PointOfInterest[]>([]);
  const [guideText, setGuideText] = useState<string | null>(null);
  const [guideLoading, setGuideLoading] = useState(false);
  const [activePoiName, setActivePoiName] = useState<string | null>(null);

  const locationSub = useRef<Location.LocationSubscription | null>(null);
  const guidedPoiIds = useRef<Set<string>>(new Set());
  const llmProvider = useRef<LLMProvider>(createLLMProvider());

  const handleLocationUpdate = useCallback(
    async (coords: Coordinates) => {
      setUserLocation(coords);

      try {
        const nearbyPois = await fetchNearbyPOIs(SERVER_URL, coords, USER_ID);
        setPois(nearbyPois);
      } catch {
        // Backend not available — keep existing POIs
      }

      for (const poi of pois) {
        if (guidedPoiIds.current.has(poi.id)) continue;
        if (!isWithinProximity(coords, poi.coordinates)) continue;

        guidedPoiIds.current.add(poi.id);
        setGuideLoading(true);
        setActivePoiName(poi.name);
        setActiveView('ai');

        try {
          const text = await llmProvider.current.requestGuideInfo(
            poi.id,
            poi.name,
            coords,
          );
          setGuideText(text);
        } catch {
          setGuideText('Unable to load guide information. Please try again.');
        } finally {
          setGuideLoading(false);
        }
        break;
      }
    },
    [pois],
  );

  const handleStart = useCallback(async () => {
    if (tracking) {
      locationSub.current?.remove();
      locationSub.current = null;
      setTracking(false);
      return;
    }

    const granted = await requestLocationPermission();
    if (!granted) {
      Alert.alert(
        'Permission Required',
        'Location permission is needed to find nearby points of interest.',
      );
      return;
    }

    const initialLocation = await getCurrentLocation();
    setUserLocation(initialLocation);

    const sub = await watchLocation(handleLocationUpdate);
    locationSub.current = sub;
    setTracking(true);
    guidedPoiIds.current.clear();
    setGuideText(null);
    setActivePoiName(null);
  }, [tracking, handleLocationUpdate]);

  useEffect(() => {
    return () => {
      locationSub.current?.remove();
    };
  }, []);

  return (
    <View style={styles.container}>
      {activeView === 'map' ? (
        <MapViewComponent userLocation={userLocation} pois={pois} />
      ) : (
        <AIResponseView
          text={guideText}
          loading={guideLoading}
          poiName={activePoiName}
        />
      )}

      <View style={styles.toggleContainer}>
        <ViewToggle activeView={activeView} onToggle={setActiveView} />
      </View>

      <View style={styles.startContainer}>
        <StartButton active={tracking} onPress={handleStart} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toggleContainer: {
    position: 'absolute',
    top: 56,
    right: 16,
  },
  startContainer: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
  },
});

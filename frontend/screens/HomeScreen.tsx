import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import * as Location from 'expo-location';

import MapViewComponent from '../components/MapViewComponent';
import StartButton from '../components/StartButton';
import {
  requestLocationPermission,
  getCurrentLocation,
  watchLocation,
  isWithinProximity,
} from '../services/locationService';
import { fetchNearbyPOIs } from '../services/apiService';
import { LLMProvider } from '../services/llm/LLMProvider';
import { DefaultLLMProvider } from '../services/llm/DefaultLLMProvider';
import MessagePanel from '../components/MessagePanel';
import { Coordinates, Message, PointOfInterest } from '../types';

const SERVER_URL =
  Constants.expoConfig?.extra?.serverUrl ?? 'http://localhost:8080';
const USER_ID = Constants.expoConfig?.extra?.userId ?? '';

function createLLMProvider(): LLMProvider {
  return new DefaultLLMProvider(SERVER_URL);
}

const PLACEHOLDER_MESSAGES: Message[] = [
  { id: '1', text: 'Welcome to Guidio! Start walking to discover nearby points of interest.', timestamp: new Date('2026-02-21T10:00:00') },
  { id: '2', text: 'You passed the Royal Palace — built in the 18th century, it remains the official residence of the Swedish monarch.', timestamp: new Date('2026-02-21T10:05:00') },
  { id: '3', text: 'Storkyrkan Cathedral is just ahead — Stockholm\'s oldest church, dating back to 1279.', timestamp: new Date('2026-02-21T10:10:00') },
  { id: '4', text: 'You\'re near Gamla Stan\'s narrowest alley, Mårten Trotzigs Gränd — only 90 cm wide!', timestamp: new Date('2026-02-21T10:15:00') },
  { id: '5', text: 'Nobel Prize Museum is around the corner. Did you know the first prizes were awarded in 1901?', timestamp: new Date('2026-02-21T10:20:00') },
  { id: '6', text: 'You\'re crossing Riksbron bridge — the Swedish Parliament building, Riksdagshuset, is on your left.', timestamp: new Date('2026-02-21T10:25:00') },
  { id: '7', text: 'Ahead is Kungsträdgården, Stockholm\'s oldest park. Cherry blossoms bloom here every April.', timestamp: new Date('2026-02-21T10:30:00') },
  { id: '8', text: 'The Vasa Museum is a short walk east. It houses a 17th-century warship that sank on its maiden voyage.', timestamp: new Date('2026-02-21T10:35:00') },
  { id: '9', text: 'You\'re near Fotografiska — one of the world\'s largest photography museums, opened in 2010.', timestamp: new Date('2026-02-21T10:40:00') },
  { id: '10', text: 'Djurgården island is just ahead. It\'s been a royal park since the 15th century.', timestamp: new Date('2026-02-21T10:45:00') },
  { id: '11', text: 'Skansen open-air museum is nearby — founded in 1891, it was the first of its kind in the world.', timestamp: new Date('2026-02-21T10:50:00') },
  { id: '12', text: 'You\'re passing ABBA The Museum. Sweden\'s legendary pop group sold over 385 million records worldwide.', timestamp: new Date('2026-02-21T10:55:00') },
  { id: '13', text: 'The Nordic Museum ahead was designed by Isak Gustaf Clason and took 19 years to build.', timestamp: new Date('2026-02-21T11:00:00') },
  { id: '14', text: 'Rosendals Trädgård is a biodynamic garden where you can pick your own flowers in summer.', timestamp: new Date('2026-02-21T11:05:00') },
  { id: '15', text: 'You\'ve reached Waldemarsudde — once home to Prince Eugen, now an art museum with stunning views.', timestamp: new Date('2026-02-21T11:10:00') },
];

export default function HomeScreen() {
  const [tracking, setTracking] = useState(false);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [pois, setPois] = useState<PointOfInterest[]>([]);
  const [guideText, setGuideText] = useState<string | null>(null);
  const [guideLoading, setGuideLoading] = useState(false);
  const [activePoiName, setActivePoiName] = useState<string | null>(null);
  const [messages] = useState<Message[]>(PLACEHOLDER_MESSAGES);

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
      <MapViewComponent userLocation={userLocation} pois={pois} />

      <MessagePanel messages={messages} />

      <View style={styles.startContainer}>
        <StartButton active={tracking} onPress={handleStart} />
      </View>

      <View style={styles.notchCover} />
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
});

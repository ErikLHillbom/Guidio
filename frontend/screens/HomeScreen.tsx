import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MOCK_GPS, FALLBACK_LOCATION, USER_ID, dataService } from '../config';
import { Coordinates, POIDetail, PointOfInterest } from '../types';

import { useMessages } from '../hooks/useMessages';
import { useTracking } from '../hooks/useTracking';
import { useProximity } from '../hooks/useProximity';

import MapViewComponent from '../components/MapViewComponent';
import StartButton from '../components/StartButton';
import MessagePanel from '../components/MessagePanel';
import DebugJoystick from '../components/DebugJoystick';
import POIDetailView from '../components/POIDetailView';

export default function HomeScreen() {
  const { messages, addMessage } = useMessages();

  const {
    tracking,
    startLoading,
    userLocation,
    userLocationRef,
    updatePosition,
    start,
    stop,
    finishLoading,
  } = useTracking({
    debugMode: MOCK_GPS,
    fallbackLocation: FALLBACK_LOCATION,
  });

  const {
    pois,
    visitedIds,
    queuedIds,
    gridLines,
    audioProgress,
    loadPOIs,
    rebuildIndex,
    startInterval,
    stopInterval,
    skipCurrent,
  } = useProximity({
    service: dataService,
    userLocationRef,
    addMessage,
    debugMode: MOCK_GPS,
    userId: USER_ID,
  });

  const handleStart = useCallback(async () => {
    if (tracking) {
      if (audioProgress > 0) {
        skipCurrent();
        addMessage('Skipped.');
        return;
      }
      stopInterval();
      stop();
      addMessage('Guide stopped.');
      return;
    }

    const onGPSUpdate = (coords: Coordinates) => {
      rebuildIndex(coords, USER_ID);
    };

    const initialLocation = await start(onGPSUpdate);
    if (!initialLocation) return;

    try {
      const counts = await loadPOIs(initialLocation, USER_ID);
      addMessage(
        `Guide started! Found ${counts.total} points of interest (${counts.nearby} nearby).`,
      );
    } catch {
      addMessage('Guide started! Walk around to discover points of interest.');
    }

    startInterval();
    finishLoading();
  }, [tracking, audioProgress, skipCurrent, stop, stopInterval, start, loadPOIs, startInterval, finishLoading, addMessage, rebuildIndex]);

  const handleJoystickMove = useCallback(
    (coords: Coordinates) => {
      updatePosition(coords);
    },
    [updatePosition],
  );

  const [selectedPOI, setSelectedPOI] = useState<PointOfInterest | null>(null);
  const [poiDetail, setPOIDetail] = useState<POIDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'hybrid'>('standard');

  const handlePOIPress = useCallback(
    async (poi: PointOfInterest) => {
      setSelectedPOI(poi);
      setPOIDetail(null);
      setDetailLoading(true);
      try {
        const detail = await dataService.fetchPOIDetail(poi.id);
        setPOIDetail(detail);
      } catch {
        setPOIDetail(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [],
  );

  const handleDetailClose = useCallback(() => {
    setSelectedPOI(null);
    setPOIDetail(null);
  }, []);

  return (
    <View style={styles.container}>
      <MapViewComponent
        userLocation={userLocation}
        pois={pois}
        visitedIds={visitedIds}
        queuedIds={queuedIds}
        gridLines={MOCK_GPS ? gridLines : null}
        showCustomUserMarker={MOCK_GPS}
        mapType={mapType}
        onPOIPress={handlePOIPress}
      />

      <MessagePanel messages={messages} />

      <View style={styles.startContainer}>
        <StartButton
          active={tracking}
          loading={startLoading}
          audioProgress={audioProgress}
          onPress={handleStart}
        />
      </View>

      <View style={styles.notchCover} />

      <View style={styles.mapToggle}>
        {([['standard', 'Map'], ['hybrid', 'Sat']] as const).map(([type, label]) => (
          <Pressable
            key={type}
            style={[
              styles.mapToggleBtn,
              mapType === type && styles.mapToggleBtnActive,
            ]}
            onPress={() => setMapType(type)}
          >
            <Text
              style={[
                styles.mapToggleText,
                mapType === type && styles.mapToggleTextActive,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <POIDetailView
        poi={selectedPOI}
        detail={poiDetail}
        loading={detailLoading}
        onClose={handleDetailClose}
      />

      {MOCK_GPS && (
        <View style={styles.joystickLayer} pointerEvents="box-none">
          <DebugJoystick
            position={userLocation ?? FALLBACK_LOCATION}
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
  mapToggle: {
    position: 'absolute',
    bottom: 48,
    left: 16,
    flexDirection: 'column',
    gap: 6,
    zIndex: 10,
    elevation: 10,
  },
  mapToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.15)',
  },
  mapToggleBtnActive: {
    backgroundColor: '#1b24d3',
    borderColor: '#1b24d3',
  },
  mapToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  mapToggleTextActive: {
    color: '#ffffff',
  },
  joystickLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    elevation: 50,
  },
});

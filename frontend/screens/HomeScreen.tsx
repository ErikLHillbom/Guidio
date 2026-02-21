import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DEBUG_MODE, USER_ID, dataService } from '../config';
import { MOCK_START_LOCATION } from '../services/mockApiService';
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
    debugMode: DEBUG_MODE,
    fallbackLocation: MOCK_START_LOCATION,
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
  } = useProximity({
    service: dataService,
    userLocationRef,
    addMessage,
    debugMode: DEBUG_MODE,
  });

  const handleStart = useCallback(async () => {
    if (tracking) {
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
  }, [tracking, stop, stopInterval, start, loadPOIs, startInterval, finishLoading, addMessage, rebuildIndex]);

  const handleJoystickMove = useCallback(
    (coords: Coordinates) => {
      updatePosition(coords);
    },
    [updatePosition],
  );

  const [selectedPOI, setSelectedPOI] = useState<PointOfInterest | null>(null);
  const [poiDetail, setPOIDetail] = useState<POIDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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
        gridLines={DEBUG_MODE ? gridLines : null}
        showCustomUserMarker={DEBUG_MODE}
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

      <POIDetailView
        poi={selectedPOI}
        detail={poiDetail}
        loading={detailLoading}
        onClose={handleDetailClose}
      />

      {DEBUG_MODE && (
        <View style={styles.joystickLayer} pointerEvents="box-none">
          <DebugJoystick
            position={userLocation ?? MOCK_START_LOCATION}
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

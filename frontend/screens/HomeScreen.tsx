import React, { useCallback, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { MOCK_GPS, FALLBACK_LOCATION, USER_ID, dataService } from '../config';
import { Coordinates } from '../types';
import { BRAND_BLUE } from '../constants/colors';

import { useMessages } from '../hooks/useMessages';
import { useTracking } from '../hooks/useTracking';
import { useProximity } from '../hooks/useProximity';
import { usePOIDetail } from '../hooks/usePOIDetail';

import MapViewComponent from '../components/MapViewComponent';
import StartButton from '../components/StartButton';
import MessagePanel from '../components/MessagePanel';
import DebugJoystick from '../components/DebugJoystick';
import POIDetailView from '../components/POIDetailView';

export default function HomeScreen() {
  const { messages, addMessage } = useMessages();

  const [initializing, setInitializing] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const {
    tracking,
    userLocation,
    userLocationRef,
    updatePosition,
    start,
    stop,
  } = useTracking({
    debugMode: MOCK_GPS,
    fallbackLocation: FALLBACK_LOCATION,
  });

  const {
    pois,
    visitedIds,
    queuedIds,
    audioProgress,
    wanderingAway,
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

  const {
    selectedPOI,
    detail: poiDetail,
    detailLoading,
    select: handlePOIPress,
    loadDetail: handleLoadDetail,
    close: handleDetailClose,
  } = usePOIDetail(dataService);

  const [mapType, setMapType] = useState<'standard' | 'hybrid'>('standard');

  const runLoadingAnimation = useCallback(
    (onLoaded: () => void) => {
      setInitializing(true);
      progressAnim.setValue(0);
      fadeAnim.setValue(1);

      Animated.timing(progressAnim, {
        toValue: 0.85,
        duration: 2500,
        useNativeDriver: false,
      }).start();

      onLoaded();
    },
    [progressAnim, fadeAnim],
  );

  const finishLoadingAnimation = useCallback(() => {
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => setInitializing(false));
    });
  }, [progressAnim, fadeAnim]);

  const handleStop = useCallback(() => {
    stopInterval();
    stop();
    addMessage('Guide stopped.');
  }, [stopInterval, stop, addMessage]);

  const handleSkip = useCallback(() => {
    skipCurrent();
    addMessage('Skipped.');
  }, [skipCurrent, addMessage]);

  const handleStartGuide = useCallback(async () => {
    const onGPSUpdate = (coords: Coordinates) => {
      rebuildIndex(coords, USER_ID);
    };

    const initialLocation = await start(onGPSUpdate);
    if (!initialLocation) return;

    runLoadingAnimation(async () => {
      try {
        const counts = await loadPOIs(initialLocation, USER_ID);
        addMessage(
          `Guide started! Found ${counts.total} points of interest (${counts.nearby} nearby).`,
        );
      } catch {
        addMessage('Guide started! Walk around to discover points of interest.');
      }

      finishLoadingAnimation();
      startInterval();
    });
  }, [start, rebuildIndex, runLoadingAnimation, finishLoadingAnimation, loadPOIs, addMessage, startInterval]);

  const handleButtonPress = useCallback(() => {
    if (tracking) {
      if (audioProgress > 0) {
        handleSkip();
      } else {
        handleStop();
      }
      return;
    }
    handleStartGuide();
  }, [tracking, audioProgress, handleSkip, handleStop, handleStartGuide]);

  const handleJoystickMove = useCallback(
    (coords: Coordinates) => {
      updatePosition(coords);
    },
    [updatePosition],
  );

  return (
    <View style={styles.container}>
      {initializing && (
        <Animated.View style={[styles.loadingOverlay, { opacity: fadeAnim }]} pointerEvents="none">
          <View style={styles.loadingContent}>
            <Text style={styles.loadingText}>Initializing your guide</Text>
            <View style={styles.loadingBarBg}>
              <Animated.View
                style={[styles.loadingBar, { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
            </View>
          </View>
        </Animated.View>
      )}
      <MapViewComponent
        userLocation={userLocation}
        pois={pois}
        visitedIds={visitedIds}
        queuedIds={queuedIds}
        gridLines={null}
        showCustomUserMarker={MOCK_GPS}
        mapType={mapType}
        onPOIPress={handlePOIPress}
      />

      <MessagePanel messages={messages} />

      <View style={styles.startContainer}>
        <StartButton
          active={tracking}
          audioProgress={audioProgress}
          wanderingAway={wanderingAway}
          onPress={handleButtonPress}
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
        detailLoading={detailLoading}
        onLoadDetail={handleLoadDetail}
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(30, 30, 30, 0.35)',
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    width: '80%',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.18)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  loadingBarBg: {
    width: '100%',
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
    marginBottom: 8,
  },
  loadingBar: {
    height: '100%',
    backgroundColor: BRAND_BLUE,
    borderRadius: 7,
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
    backgroundColor: BRAND_BLUE,
    borderColor: BRAND_BLUE,
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

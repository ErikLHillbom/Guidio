import { useCallback, useEffect, useRef, useState } from 'react';
import { Image as ExpoImage } from 'expo-image';
import { Coordinates, PointOfInterest } from '../types';
import { DataService } from '../services/DataService';
import { isWithinProximity, PROXIMITY_THRESHOLD_METERS } from '../services/locationService';
import { geodesicDistanceMeters } from '../utils/geo';
import {
  getBucketKey,
  getActiveKeys,
  buildBucketIndex,
  getActivePOIs,
  getGridLines,
  BucketIndex,
  BucketGridLines,
} from '../services/bucketService';
import { useAudioPlayer } from './useAudioPlayer';

const REFETCH_DISTANCE_M = 300;

interface UseProximityOptions {
  service: DataService;
  userLocationRef: React.RefObject<Coordinates | null>;
  addMessage: (text: string) => void;
  debugMode: boolean;
  userId: string;
}

export function useProximity({
  service,
  userLocationRef,
  addMessage,
  debugMode,
  userId,
}: UseProximityOptions) {
  const [pois, setPois] = useState<PointOfInterest[]>([]);
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());
  const [queuedIds, setQueuedIds] = useState<Set<string>>(new Set());
  const [gridLines, setGridLines] = useState<BucketGridLines | null>(null);

  const { audioProgress, wanderingAway, play: playAudio, skip: skipCurrent, cleanup: cleanupAudio } =
    useAudioPlayer(userLocationRef);

  const poisRef = useRef<PointOfInterest[]>([]);
  const visitedPoiIds = useRef<Set<string>>(new Set());
  const detectedPoiIds = useRef<Set<string>>(new Set());
  const bucketIndexRef = useRef<BucketIndex | null>(null);
  const currentBucketRef = useRef('');
  const guideQueue = useRef<PointOfInterest[]>([]);
  const guideRunning = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastFetchOrigin = useRef<Coordinates | null>(null);
  const refetchInFlight = useRef(false);

  const markVisited = useCallback((poiId: string) => {
    visitedPoiIds.current.add(poiId);
    setVisitedIds(new Set(visitedPoiIds.current));
  }, []);

  const processGuideQueue = useCallback(async () => {
    if (guideRunning.current) return;
    guideRunning.current = true;
    try {
      while (guideQueue.current.length > 0) {
        const poi = guideQueue.current.shift()!;
        const coords = userLocationRef.current;
        addMessage(`Approaching ${poi.name}...`);
        try {
          const guide = await service.fetchGuideInfo(
            poi.id,
            poi.name,
            coords ?? { latitude: 0, longitude: 0 },
          );
          addMessage(guide.transcription);
          if (guide.audioUrl) {
            await playAudio({
              uri: guide.audioUrl,
              breakpointsMs: guide.audioBreakpointsMs,
              poiCoordinates: poi.coordinates,
              onWanderingAway: () =>
                addMessage(`Moving away from ${poi.name}\u2026 ending at next pause.`),
            });
          }
        } catch {
          addMessage(`Unable to load guide info for ${poi.name}.`);
        }
        markVisited(poi.id);
      }
    } finally {
      guideRunning.current = false;
    }
  }, [service, userLocationRef, addMessage, playAudio, markVisited]);

  const checkProximity = useCallback(
    (coords: Coordinates) => {
      const latMargin = PROXIMITY_THRESHOLD_METERS / 111_320;
      const lngMargin =
        PROXIMITY_THRESHOLD_METERS /
        (111_320 * Math.cos((coords.latitude * Math.PI) / 180));

      const nearby: PointOfInterest[] = [];
      for (const poi of poisRef.current) {
        if (detectedPoiIds.current.has(poi.id)) continue;
        if (
          Math.abs(poi.coordinates.latitude - coords.latitude) > latMargin ||
          Math.abs(poi.coordinates.longitude - coords.longitude) > lngMargin
        ) continue;
        if (!isWithinProximity(coords, poi.coordinates)) continue;
        detectedPoiIds.current.add(poi.id);
        nearby.push(poi);
      }
      if (nearby.length === 0) return;

      guideQueue.current.push(...nearby);

      const userPos = userLocationRef.current ?? coords;
      guideQueue.current.sort(
        (a, b) =>
          geodesicDistanceMeters(userPos, a.coordinates) -
          geodesicDistanceMeters(userPos, b.coordinates),
      );

      setQueuedIds(new Set(detectedPoiIds.current));
      processGuideQueue();
    },
    [processGuideQueue, userLocationRef],
  );

  const updateBucket = useCallback(
    (pos: Coordinates) => {
      if (!bucketIndexRef.current) return;
      const key = getBucketKey(pos);
      if (key === currentBucketRef.current) return;

      currentBucketRef.current = key;
      const keys = getActiveKeys(pos);
      const active = getActivePOIs(bucketIndexRef.current, keys);
      poisRef.current = active;
      setPois(active);
      if (debugMode) setGridLines(getGridLines(pos));
    },
    [debugMode],
  );

  const applyFetchedPOIs = useCallback(
    (allPois: PointOfInterest[], origin: Coordinates) => {
      const index = buildBucketIndex(allPois);
      bucketIndexRef.current = index;
      lastFetchOrigin.current = origin;

      const keys = getActiveKeys(origin);
      const active = getActivePOIs(index, keys);
      currentBucketRef.current = getBucketKey(origin);
      poisRef.current = active;
      setPois(active);
      if (debugMode) setGridLines(getGridLines(origin));

      const urls = allPois.map((p) => p.imageUrl).filter((u): u is string => !!u);
      if (urls.length > 0) ExpoImage.prefetch(urls);
    },
    [debugMode],
  );

  const maybeRefetch = useCallback(
    async (pos: Coordinates) => {
      if (refetchInFlight.current) return;
      if (
        lastFetchOrigin.current &&
        geodesicDistanceMeters(lastFetchOrigin.current, pos) < REFETCH_DISTANCE_M
      ) {
        return;
      }
      refetchInFlight.current = true;
      try {
        const allPois = await service.fetchNearbyPOIs(pos, userId);
        applyFetchedPOIs(allPois, pos);
      } catch {
        // Backend unavailable
      } finally {
        refetchInFlight.current = false;
      }
    },
    [service, userId, applyFetchedPOIs],
  );

  const startInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const pos = userLocationRef.current;
      if (!pos) return;
      updateBucket(pos);
      checkProximity(pos);
      maybeRefetch(pos);
    }, 1000);
  }, [userLocationRef, updateBucket, checkProximity, maybeRefetch]);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    cleanupAudio();
    guideQueue.current = [];
    guideRunning.current = false;
  }, [cleanupAudio]);

  const loadPOIs = useCallback(
    async (coords: Coordinates, uid: string) => {
      visitedPoiIds.current.clear();
      detectedPoiIds.current.clear();
      setVisitedIds(new Set());
      setQueuedIds(new Set());
      bucketIndexRef.current = null;
      currentBucketRef.current = '';
      lastFetchOrigin.current = null;
      setGridLines(null);

      const allPois = await service.fetchNearbyPOIs(coords, uid, true);
      applyFetchedPOIs(allPois, coords);

      return { total: allPois.length, nearby: poisRef.current.length };
    },
    [service, applyFetchedPOIs],
  );

  const rebuildIndex = useCallback(
    async (coords: Coordinates, uid: string) => {
      try {
        const allPois = await service.fetchNearbyPOIs(coords, uid);
        bucketIndexRef.current = buildBucketIndex(allPois);
        currentBucketRef.current = '';
      } catch {
        // Backend not available
      }
    },
    [service],
  );

  useEffect(() => {
    return stopInterval;
  }, [stopInterval]);

  return {
    pois,
    visitedIds,
    queuedIds,
    gridLines,
    audioProgress,
    wanderingAway,
    loadPOIs,
    rebuildIndex,
    startInterval,
    stopInterval,
    skipCurrent,
  } as const;
}

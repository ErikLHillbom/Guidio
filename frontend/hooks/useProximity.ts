import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Coordinates, PointOfInterest } from '../types';
import { DataService } from '../services/DataService';
import { isWithinProximity } from '../services/locationService';
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
  const [audioProgress, setAudioProgress] = useState(0);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true });
  }, []);

  const poisRef = useRef<PointOfInterest[]>([]);
  const visitedPoiIds = useRef<Set<string>>(new Set());
  const detectedPoiIds = useRef<Set<string>>(new Set());
  const bucketIndexRef = useRef<BucketIndex | null>(null);
  const currentBucketRef = useRef('');
  const guideQueue = useRef<PointOfInterest[]>([]);
  const guideRunning = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentPlayer = useRef<AudioPlayer | null>(null);
  const progressPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastFetchOrigin = useRef<Coordinates | null>(null);
  const refetchInFlight = useRef(false);

  const playAudio = useCallback((uri: string): Promise<void> => {
    return new Promise<void>((resolve) => {
      try {
        if (progressPollRef.current) {
          clearInterval(progressPollRef.current);
          progressPollRef.current = null;
        }
        if (currentPlayer.current) {
          currentPlayer.current.remove();
          currentPlayer.current = null;
        }
        setAudioProgress(0);

        const player = createAudioPlayer(uri);
        currentPlayer.current = player;
        let hasStartedPlaying = false;

        progressPollRef.current = setInterval(() => {
          if (player.playing) hasStartedPlaying = true;

          if (player.isLoaded && player.duration > 0) {
            setAudioProgress(player.currentTime / player.duration);
          }

          if (hasStartedPlaying && !player.playing) {
            clearInterval(progressPollRef.current!);
            progressPollRef.current = null;
            setAudioProgress(0);
            player.remove();
            if (currentPlayer.current === player) currentPlayer.current = null;
            resolve();
          }
        }, 200);

        player.play();
      } catch {
        setAudioProgress(0);
        resolve();
      }
    });
  }, []);

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
            await playAudio(guide.audioUrl);
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
      const nearby: PointOfInterest[] = [];
      for (const poi of poisRef.current) {
        if (detectedPoiIds.current.has(poi.id)) continue;
        if (!isWithinProximity(coords, poi.coordinates)) continue;
        detectedPoiIds.current.add(poi.id);
        nearby.push(poi);
      }
      if (nearby.length === 0) return;

      nearby.sort(
        (a, b) =>
          geodesicDistanceMeters(coords, a.coordinates) -
          geodesicDistanceMeters(coords, b.coordinates),
      );

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
        const index = buildBucketIndex(allPois);
        bucketIndexRef.current = index;
        currentBucketRef.current = '';
        lastFetchOrigin.current = pos;

        const keys = getActiveKeys(pos);
        const active = getActivePOIs(index, keys);
        currentBucketRef.current = getBucketKey(pos);
        poisRef.current = active;
        setPois(active);
        if (debugMode) setGridLines(getGridLines(pos));
      } catch {
        // Backend unavailable
      } finally {
        refetchInFlight.current = false;
      }
    },
    [service, userId, debugMode],
  );

  const startInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const pos = userLocationRef.current;
      if (!pos) return;
      updateBucket(pos);
      checkProximity(pos);
      maybeRefetch(pos);
    }, 300);
  }, [userLocationRef, updateBucket, checkProximity, maybeRefetch]);

  const skipCurrent = useCallback(() => {
    if (currentPlayer.current) {
      currentPlayer.current.pause();
    }
  }, []);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (progressPollRef.current) {
      clearInterval(progressPollRef.current);
      progressPollRef.current = null;
    }
    if (currentPlayer.current) {
      currentPlayer.current.remove();
      currentPlayer.current = null;
    }
    setAudioProgress(0);
    guideQueue.current = [];
    guideRunning.current = false;
  }, []);

  const loadPOIs = useCallback(
    async (coords: Coordinates, userId: string) => {
      visitedPoiIds.current.clear();
      detectedPoiIds.current.clear();
      setVisitedIds(new Set());
      setQueuedIds(new Set());
      bucketIndexRef.current = null;
      currentBucketRef.current = '';
      lastFetchOrigin.current = null;
      setGridLines(null);

      const allPois = await service.fetchNearbyPOIs(coords, userId, true);
      const index = buildBucketIndex(allPois);
      bucketIndexRef.current = index;
      lastFetchOrigin.current = coords;

      const keys = getActiveKeys(coords);
      const active = getActivePOIs(index, keys);
      currentBucketRef.current = getBucketKey(coords);
      setPois(active);
      poisRef.current = active;

      if (debugMode) setGridLines(getGridLines(coords));

      return { total: allPois.length, nearby: active.length };
    },
    [service, debugMode],
  );

  const rebuildIndex = useCallback(
    async (coords: Coordinates, userId: string) => {
      try {
        const allPois = await service.fetchNearbyPOIs(coords, userId);
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
    loadPOIs,
    rebuildIndex,
    startInterval,
    stopInterval,
    skipCurrent,
  } as const;
}

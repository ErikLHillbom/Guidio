import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Coordinates } from '../types';
import { PROXIMITY_THRESHOLD_METERS } from '../services/locationService';
import { geodesicDistanceMeters } from '../utils/geo';

const WANDER_DISTANCE_M = 100;

interface PlayOptions {
  uri: string;
  breakpointsMs: number[];
  poiCoordinates: Coordinates;
  onWanderingAway?: () => void;
}

export function useAudioPlayer(
  userLocationRef: React.RefObject<Coordinates | null>,
) {
  const [audioProgress, setAudioProgress] = useState(0);
  const [wanderingAway, setWanderingAway] = useState(false);

  const currentPlayer = useRef<AudioPlayer | null>(null);
  const progressPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wanderTargetMs = useRef<number | null>(null);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true });
  }, []);

  const cleanup = useCallback(() => {
    if (progressPollRef.current) {
      clearInterval(progressPollRef.current);
      progressPollRef.current = null;
    }
    if (currentPlayer.current) {
      currentPlayer.current.remove();
      currentPlayer.current = null;
    }
    setAudioProgress(0);
    setWanderingAway(false);
    wanderTargetMs.current = null;
  }, []);

  const play = useCallback(
    ({ uri, breakpointsMs, poiCoordinates, onWanderingAway }: PlayOptions): Promise<void> => {
      return new Promise<void>((resolve) => {
        try {
          cleanup();

          const player = createAudioPlayer(uri);
          currentPlayer.current = player;
          let hasStartedPlaying = false;

          progressPollRef.current = setInterval(() => {
            if (player.playing) hasStartedPlaying = true;

            if (player.isLoaded && player.duration > 0) {
              const currentTimeMs = player.currentTime * 1000;
              setAudioProgress(player.currentTime / player.duration);

              if (wanderTargetMs.current !== null) {
                if (currentTimeMs >= wanderTargetMs.current) {
                  player.pause();
                }
              } else {
                const userPos = userLocationRef.current;
                if (userPos) {
                  const dist = geodesicDistanceMeters(userPos, poiCoordinates);
                  if (dist > PROXIMITY_THRESHOLD_METERS + WANDER_DISTANCE_M) {
                    const nextBp = breakpointsMs.find((bp) => bp > currentTimeMs);
                    if (nextBp !== undefined) {
                      wanderTargetMs.current = nextBp;
                      setWanderingAway(true);
                      onWanderingAway?.();
                    } else {
                      player.pause();
                    }
                  }
                }
              }
            }

            if (hasStartedPlaying && !player.playing) {
              clearInterval(progressPollRef.current!);
              progressPollRef.current = null;
              setAudioProgress(0);
              setWanderingAway(false);
              wanderTargetMs.current = null;
              player.remove();
              if (currentPlayer.current === player) currentPlayer.current = null;
              resolve();
            }
          }, 200);

          player.play();
        } catch {
          setAudioProgress(0);
          setWanderingAway(false);
          resolve();
        }
      });
    },
    [userLocationRef, cleanup],
  );

  const skip = useCallback(() => {
    if (currentPlayer.current) {
      currentPlayer.current.pause();
    }
  }, []);

  return { audioProgress, wanderingAway, play, skip, cleanup } as const;
}

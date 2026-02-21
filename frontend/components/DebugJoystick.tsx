import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';
import { Coordinates } from '../types';
import { offsetCoordinates } from '../utils/geo';

const BASE_SIZE = 120;
const KNOB_SIZE = 44;
const MAX_OFFSET = (BASE_SIZE - KNOB_SIZE) / 2;
const METERS_PER_TICK = 15;
const TICK_INTERVAL_MS = 200;

interface Props {
  position: Coordinates;
  onMove: (coords: Coordinates) => void;
  disabled?: boolean;
}

export default function DebugJoystick({ position, onMove, disabled }: Props) {
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const currentOffset = useRef({ x: 0, y: 0 });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const positionRef = useRef(position);
  const disabledRef = useRef(disabled);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  const startMoving = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      if (disabledRef.current) return;
      const { x, y } = currentOffset.current;
      const magnitude = Math.sqrt(x * x + y * y);
      if (magnitude < 5) return;

      const normalizedX = x / MAX_OFFSET;
      const normalizedY = -y / MAX_OFFSET;
      const dx = normalizedX * METERS_PER_TICK;
      const dy = normalizedY * METERS_PER_TICK;

      const newPos = offsetCoordinates(positionRef.current, dx, dy);
      onMove(newPos);
    }, TICK_INTERVAL_MS);
  }, [onMove]);

  const stopMoving = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return stopMoving;
  }, [stopMoving]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startMoving();
      },
      onPanResponderMove: (_, g) => {
        const dist = Math.sqrt(g.dx * g.dx + g.dy * g.dy);
        const clampedDist = Math.min(dist, MAX_OFFSET);
        const angle = Math.atan2(g.dy, g.dx);
        const clampedX = clampedDist * Math.cos(angle);
        const clampedY = clampedDist * Math.sin(angle);

        pan.setValue({ x: clampedX, y: clampedY });
        currentOffset.current = { x: clampedX, y: clampedY };
      },
      onPanResponderRelease: () => {
        stopMoving();
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
          bounciness: 8,
        }).start();
        currentOffset.current = { x: 0, y: 0 };
      },
    }),
  ).current;

  return (
    <View style={[styles.container, disabled && styles.containerDisabled]}>
      <Text style={styles.label}>{disabled ? 'PRESS START' : 'DEBUG GPS'}</Text>
      <View style={[styles.base, disabled && styles.baseDisabled]}>
        <View style={styles.crosshairH} />
        <View style={styles.crosshairV} />
        <Animated.View
          style={[
            styles.knob,
            disabled && styles.knobDisabled,
            { transform: pan.getTranslateTransform() },
          ]}
          {...(disabled ? {} : panResponder.panHandlers)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 36,
    left: 16,
    alignItems: 'center',
  },
  containerDisabled: {
    opacity: 0.4,
  },
  label: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#ff5722',
    letterSpacing: 1,
    marginBottom: 4,
  },
  base: {
    width: BASE_SIZE,
    height: BASE_SIZE,
    borderRadius: BASE_SIZE / 2,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderWidth: 2,
    borderColor: 'rgba(255, 87, 34, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseDisabled: {
    borderColor: 'rgba(0, 0, 0, 0.15)',
  },
  crosshairH: {
    position: 'absolute',
    width: '60%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  crosshairV: {
    position: 'absolute',
    width: 1,
    height: '60%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  knob: {
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    backgroundColor: 'rgba(27, 36, 211, 0.85)',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  knobDisabled: {
    backgroundColor: 'rgba(100, 100, 100, 0.5)',
  },
});

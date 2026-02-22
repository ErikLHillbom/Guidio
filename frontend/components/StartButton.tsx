import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

interface Props {
  active: boolean;
  loading: boolean;
  audioProgress: number;
  wanderingAway: boolean;
  onPress: () => void;
}

const BAR_COUNT = 12;
const DARK_BLUE = '#1b24d3';
const LIGHT_BLUE = '#5b6aff';
const AMBER = '#d97706';
const AMBER_LIGHT = '#f59e0b';

function VoiceBars({ animate }: { animate: boolean }) {
  const animations = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0)),
  ).current;
  const loopsRef = useRef<Animated.CompositeAnimation[]>([]);

  useEffect(() => {
    loopsRef.current.forEach((l) => l.stop());

    if (!animate) {
      animations.forEach((anim) => anim.setValue(0));
      return;
    }

    const loops = animations.map((anim) => {
      anim.setValue(0.15 + Math.random() * 0.2);
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 0.3 + Math.random() * 0.7,
            duration: 120 + Math.random() * 180,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 0.15 + Math.random() * 0.3,
            duration: 100 + Math.random() * 200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ]),
      );
    });

    loopsRef.current = loops;
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [animate, animations]);

  return (
    <View style={barStyles.container}>
      {animations.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            barStyles.bar,
            {
              height: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [3, 22],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
}

export default function StartButton({ active, loading, audioProgress, wanderingAway, onPress }: Props) {
  const isPlaying = active && audioProgress > 0;

  const buttonBg = wanderingAway ? AMBER_LIGHT : active ? LIGHT_BLUE : DARK_BLUE;
  const fillBg = wanderingAway ? AMBER : DARK_BLUE;

  return (
    <Pressable
      style={[styles.button, { backgroundColor: buttonBg }]}
      onPress={onPress}
    >
      {isPlaying && (
        <View style={StyleSheet.absoluteFill}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(audioProgress * 100, 100)}%`, backgroundColor: fillBg },
            ]}
          />
        </View>
      )}
      {isPlaying ? (
        wanderingAway ? (
          <Animated.Text style={styles.label}>ENDING...</Animated.Text>
        ) : (
          <VoiceBars animate={true} />
        )
      ) : (
        <Animated.Text style={styles.label}>{active ? 'STOP' : 'START'}</Animated.Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: DARK_BLUE,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 32,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    minWidth: 150,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: DARK_BLUE,
  },
  label: {
    fontFamily: 'Silkscreen_400Regular',
    fontSize: 18,
    color: '#ffffff',
    letterSpacing: 2,
  },
});

const barStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
    gap: 3,
  },
  bar: {
    width: 3,
    borderRadius: 1.5,
    backgroundColor: '#ffffff',
  },
});

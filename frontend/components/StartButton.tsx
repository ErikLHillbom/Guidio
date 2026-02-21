import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

interface Props {
  active: boolean;
  onPress: () => void;
}

const BAR_COUNT = 12;

function VoiceBars() {
  const animations = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.3)),
  ).current;

  useEffect(() => {
    const loops = animations.map((anim, i) =>
      Animated.loop(
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
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [animations]);

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

export default function StartButton({ active, onPress }: Props) {
  return (
    <Pressable
      style={[styles.button, active && styles.buttonActive]}
      onPress={onPress}
    >
      {active ? (
        <VoiceBars />
      ) : (
        <Animated.Text style={styles.label}>START</Animated.Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#1b24d3',
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
  },
  buttonActive: {
    backgroundColor: '#5b6aff',
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

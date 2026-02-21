import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

interface Props {
  active: boolean;
  onPress: () => void;
}

export default function StartButton({ active, onPress }: Props) {
  return (
    <Pressable
      style={[styles.button, active && styles.buttonActive]}
      onPress={onPress}
    >
      <Text style={[styles.label, active && styles.labelActive]}>
        {active ? 'STOP' : 'START'}
      </Text>
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
  },
  buttonActive: {
    backgroundColor: '#ef5350',
  },
  label: {
    fontFamily: 'Silkscreen_400Regular',
    fontSize: 18,
    color: '#ffffff',
    letterSpacing: 2,
  },
  labelActive: {
    color: '#fff',
  },
});

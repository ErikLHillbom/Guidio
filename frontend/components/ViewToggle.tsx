import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type ActiveView = 'map' | 'ai';

interface Props {
  activeView: ActiveView;
  onToggle: (view: ActiveView) => void;
}

export default function ViewToggle({ activeView, onToggle }: Props) {
  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.segment, activeView === 'map' && styles.segmentActive]}
        onPress={() => onToggle('map')}
      >
        <Text style={[styles.label, activeView === 'map' && styles.labelActive]}>MAP</Text>
      </Pressable>
      <Pressable
        style={[styles.segment, activeView === 'ai' && styles.segmentActive]}
        onPress={() => onToggle('ai')}
      >
        <Text style={[styles.label, activeView === 'ai' && styles.labelActive]}>AI</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(26, 26, 46, 0.85)',
    borderRadius: 20,
    padding: 3,
  },
  segment: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 17,
  },
  segmentActive: {
    backgroundColor: '#4fc3f7',
  },
  label: {
    fontFamily: 'Silkscreen_400Regular',
    fontSize: 12,
    color: '#888',
  },
  labelActive: {
    color: '#1a1a2e',
  },
});

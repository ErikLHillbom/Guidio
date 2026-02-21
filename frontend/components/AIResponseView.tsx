import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

interface Props {
  text: string | null;
  loading: boolean;
  poiName: string | null;
}

export default function AIResponseView({ text, loading, poiName }: Props) {
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4fc3f7" />
        <Text style={styles.loadingText}>Getting guide info{poiName ? ` for ${poiName}` : ''}...</Text>
      </View>
    );
  }

  if (!text) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No guide info yet.</Text>
        <Text style={styles.hintText}>Walk near a point of interest to get started.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {poiName && <Text style={styles.poiName}>{poiName}</Text>}
      <Text style={styles.guideText}>{text}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    padding: 24,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 24,
  },
  poiName: {
    fontFamily: 'Silkscreen_400Regular',
    fontSize: 20,
    color: '#4fc3f7',
    marginBottom: 16,
  },
  guideText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#e0e0e0',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#888',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  hintText: {
    fontSize: 14,
    color: '#555',
  },
});

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { POIDetail, PointOfInterest } from '../types';

interface Props {
  poi: PointOfInterest | null;
  detail: POIDetail | null;
  loading: boolean;
  onClose: () => void;
}

function stripHtml(html: string): string {
  return html
    .replace(/<h[1-6][^>]*>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function DetailImage({ uri }: { uri: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <Image
      source={{ uri }}
      style={styles.heroImage}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}

export default function POIDetailView({ poi, detail, loading, onClose }: Props) {
  if (!poi) return null;
  const detailText = detail ? stripHtml(detail.text) : '';

  return (
    <Modal
      visible={!!poi}
      animationType="slide"
      transparent={false}
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Back</Text>
          </Pressable>
          <Text style={styles.title} numberOfLines={2}>
            {detail?.title ?? poi.name}
          </Text>
        </View>

        {poi.imageUrl ? <DetailImage uri={poi.imageUrl} /> : null}

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#040ece" />
              <Text style={styles.loadingText}>Loading details...</Text>
            </View>
          ) : detail ? (
            <>
              {poi.categories && poi.categories.length > 0 && (
                <View style={styles.categories}>
                  {poi.categories.map((cat) => (
                    <View key={cat} style={styles.categoryChip}>
                      <Text style={styles.categoryText}>{cat}</Text>
                    </View>
                  ))}
                </View>
              )}
              <Text style={styles.detailText}>
                {detailText || 'No text available for this location.'}
              </Text>
            </>
          ) : (
            <Text style={styles.detailText}>
              {poi.description ?? 'No details available for this location.'}
            </Text>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ececec',
    gap: 10,
  },
  closeButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  closeText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
  },
  heroImage: {
    width: '100%',
    height: 220,
    backgroundColor: '#f2f2f2',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#888',
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 6,
  },
  categoryChip: {
    backgroundColor: '#e8eaff',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryText: {
    fontSize: 12,
    color: '#040ece',
    fontWeight: '500',
  },
  detailText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
});

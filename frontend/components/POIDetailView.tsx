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

  return (
    <Modal
      visible={!!poi}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={2}>
              {detail?.title ?? poi.name}
            </Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
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
                  {stripHtml(detail.text)}
                </Text>
              </>
            ) : (
              <Text style={styles.detailText}>
                {poi.description ?? 'No details available for this location.'}
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '75%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    flex: 1,
    marginRight: 12,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 18,
    color: '#555',
    fontWeight: 'bold',
  },
  heroImage: {
    width: '100%',
    height: 180,
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

import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import MapView, { Callout, Circle, Marker, Polyline } from 'react-native-maps';
import { Coordinates, PointOfInterest } from '../types';
import { BucketGridLines } from '../services/bucketService';

const DEFAULT_CENTER = { latitude: 59.3293, longitude: 18.0686 };
const MAP_RADIUS_M = 100;
const M_PER_DEG_LAT = 111_320;

function regionDeltasForRadius(
  latitude: number,
  radiusMeters: number,
): { latitudeDelta: number; longitudeDelta: number } {
  const latitudeDelta = (radiusMeters * 2) / M_PER_DEG_LAT;
  const cosLat = Math.cos((latitude * Math.PI) / 180);
  const metersPerDegreeLongitude = Math.max(M_PER_DEG_LAT * Math.abs(cosLat), 1);
  const longitudeDelta = (radiusMeters * 2) / metersPerDegreeLongitude;
  return { latitudeDelta, longitudeDelta };
}

function CalloutImage({ uri }: { uri: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <Image
      source={{ uri }}
      style={styles.calloutImage}
      onError={() => setFailed(true)}
    />
  );
}

interface Props {
  userLocation: Coordinates | null;
  pois: PointOfInterest[];
  visitedIds: Set<string>;
  queuedIds: Set<string>;
  gridLines: BucketGridLines | null;
  showCustomUserMarker: boolean;
  onPOIPress?: (poi: PointOfInterest) => void;
}

function getPinColor(id: string, visitedIds: Set<string>, queuedIds: Set<string>): string {
  if (visitedIds.has(id)) return '#4CAF50';
  if (queuedIds.has(id)) return '#FFC107';
  return '#1b24d3';
}

export default function MapViewComponent({
  userLocation,
  pois,
  visitedIds,
  queuedIds,
  gridLines,
  showCustomUserMarker,
  onPOIPress,
}: Props) {
  const center = userLocation ?? DEFAULT_CENTER;
  const deltas = regionDeltasForRadius(center.latitude, MAP_RADIUS_M);
  const region = {
    latitude: center.latitude,
    longitude: center.longitude,
    latitudeDelta: deltas.latitudeDelta,
    longitudeDelta: deltas.longitudeDelta,
  };

  return (
    <MapView
      style={styles.map}
      region={region}
      showsUserLocation={!showCustomUserMarker}
      showsMyLocationButton={!showCustomUserMarker}
      showsCompass
      showsPointsOfInterest={false}
    >
      {showCustomUserMarker && userLocation && (
        <>
          <Marker
            coordinate={userLocation}
            anchor={{ x: 0.5, y: 0.5 }}
            flat
          >
            <View style={styles.userDotOuter}>
              <View style={styles.userDotInner} />
            </View>
          </Marker>
          <Circle
            center={userLocation}
            radius={30}
            fillColor="rgba(0, 122, 255, 0.1)"
            strokeColor="rgba(0, 122, 255, 0.3)"
            strokeWidth={1}
          />
        </>
      )}
      {pois.map((poi) => (
        <Marker
          key={poi.id}
          coordinate={poi.coordinates}
          pinColor={getPinColor(poi.id, visitedIds, queuedIds)}
          onCalloutPress={() => onPOIPress?.(poi)}
        >
          <Callout tooltip={false}>
            <View style={styles.callout}>
              <Text style={styles.calloutTitle}>{poi.name}</Text>
              {poi.imageUrl ? <CalloutImage uri={poi.imageUrl} /> : null}
              {poi.description && (
                <Text style={styles.calloutDescription}>{poi.description}</Text>
              )}
              {visitedIds.has(poi.id) && (
                <Text style={styles.calloutVisited}>Visited</Text>
              )}
              {!visitedIds.has(poi.id) && queuedIds.has(poi.id) && (
                <Text style={styles.calloutQueued}>In queue...</Text>
              )}
              <Text style={styles.calloutTapHint}>Tap for details</Text>
            </View>
          </Callout>
        </Marker>
      ))}
      {gridLines?.horizontalLines.map((line, i) => (
        <Polyline
          key={`grid-h-${i}`}
          coordinates={[
            { latitude: line.latitude, longitude: line.lngMin },
            { latitude: line.latitude, longitude: line.lngMax },
          ]}
          strokeColor="rgba(255, 0, 0, 0.4)"
          strokeWidth={1}
        />
      ))}
      {gridLines?.verticalLines.map((line, i) => (
        <Polyline
          key={`grid-v-${i}`}
          coordinates={[
            { latitude: line.latMin, longitude: line.longitude },
            { latitude: line.latMax, longitude: line.longitude },
          ]}
          strokeColor="rgba(255, 0, 0, 0.4)"
          strokeWidth={1}
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  userDotOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 122, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  callout: {
    width: 200,
    padding: 8,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#222',
    marginBottom: 6,
  },
  calloutImage: {
    width: '100%',
    height: 100,
    borderRadius: 6,
    backgroundColor: '#e0e0e0',
    marginBottom: 6,
  },
  calloutDescription: {
    fontSize: 12,
    color: '#555',
    lineHeight: 16,
  },
  calloutVisited: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginTop: 4,
  },
  calloutQueued: {
    fontSize: 11,
    color: '#FFC107',
    fontWeight: 'bold',
    marginTop: 4,
  },
  calloutTapHint: {
    fontSize: 11,
    color: '#040ece',
    marginTop: 6,
    textAlign: 'center',
  },
});

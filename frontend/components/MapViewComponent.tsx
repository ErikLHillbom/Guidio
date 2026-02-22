import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import MapView, { Callout, Circle, Marker, Polyline } from 'react-native-maps';
import { Coordinates, PointOfInterest } from '../types';
import { BucketGridLines } from '../services/bucketService';
import { PROXIMITY_THRESHOLD_METERS } from '../services/locationService';
import { geodesicDistanceMeters } from '../utils/geo';

const FAR_DISTANCE_M = 300;

function CalloutImage({ uri }: { uri: string }) {
  return (
    <Image
      source={{ uri }}
      style={styles.calloutImage}
      placeholder={require('../assets/poi-placeholder.png')}
      placeholderContentFit="cover"
      transition={200}
      contentFit="cover"
      cachePolicy="disk"
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
  mapType?: 'standard' | 'satellite' | 'hybrid';
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
  mapType = 'standard',
  onPOIPress,
}: Props) {
  const initialRegion = userLocation
    ? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : {
        latitude: 59.3293,
        longitude: 18.0686,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

  return (
    <MapView
      style={styles.map}
      initialRegion={initialRegion}
      mapType={mapType}
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
            radius={PROXIMITY_THRESHOLD_METERS}
            fillColor="rgba(0, 122, 255, 0.1)"
            strokeColor="rgba(0, 122, 255, 0.3)"
            strokeWidth={1}
          />
        </>
      )}
      {pois.map((poi) => {
        const color = getPinColor(poi.id, visitedIds, queuedIds);
        const distance = userLocation
          ? geodesicDistanceMeters(userLocation, poi.coordinates)
          : 0;
        const isFar = distance > FAR_DISTANCE_M;

        return (
          <Marker
            key={poi.id}
            coordinate={poi.coordinates}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            {isFar ? (
              <View style={styles.farDot} />
            ) : (
              <View style={styles.rhombusWrapper}>
                <View style={[styles.rhombus, { backgroundColor: color }]} />
              </View>
            )}
            <Callout tooltip={false} onPress={() => onPOIPress?.(poi)}>
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
        );
      })}
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
  customPin: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  rhombusWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
  rhombus: {
    width: 20,
    height: 20,
    transform: [{ rotate: '45deg' }],
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  farDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#9E9E9E',
    borderWidth: 1,
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

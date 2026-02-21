import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import MapView, { Callout, Marker } from 'react-native-maps';
import { Coordinates, PointOfInterest } from '../types';

interface Props {
  userLocation: Coordinates | null;
  pois: PointOfInterest[];
  visitedIds: Set<string>;
}

export default function MapViewComponent({ userLocation, pois, visitedIds }: Props) {
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
      showsUserLocation
      showsMyLocationButton
      showsCompass
      showsPointsOfInterest={false}
    >
      {pois.map((poi) => (
        <Marker
          key={poi.id}
          coordinate={poi.coordinates}
          pinColor={visitedIds.has(poi.id) ? '#4CAF50' : '#1b24d3'}
        >
          <Callout tooltip={false}>
            <View style={styles.callout}>
              <Text style={styles.calloutTitle}>{poi.name}</Text>
              <Image
                source={{ uri: 'https://placehold.co/200x120/e0e0e0/999999?text=Photo' }}
                style={styles.calloutImage}
              />
              {poi.description && (
                <Text style={styles.calloutDescription}>{poi.description}</Text>
              )}
              {visitedIds.has(poi.id) && (
                <Text style={styles.calloutVisited}>Visited</Text>
              )}
            </View>
          </Callout>
        </Marker>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
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
});

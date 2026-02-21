import React from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Coordinates, PointOfInterest } from '../types';

interface Props {
  userLocation: Coordinates | null;
  pois: PointOfInterest[];
}

export default function MapViewComponent({ userLocation, pois }: Props) {
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
    >
      {pois.map((poi) => (
        <Marker
          key={poi.id}
          coordinate={poi.coordinates}
          title={poi.name}
          description={poi.description}
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});

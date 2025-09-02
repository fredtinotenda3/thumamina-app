import React from "react";
import { StyleSheet, View } from "react-native";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";

export default function App() {
  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: -17.8292, // Harare example
          longitude: 31.0522,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, // make sure all parents up the tree also allow space
  map: { flex: 1 }, // full area of the container
});

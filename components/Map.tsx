import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import MapView, { MapType, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";

import { icons } from "@/constants";
import { useFetch } from "@/lib/fetch";
import {
  calculateDriverTimes,
  calculateRegion,
  generateMarkersFromData,
} from "@/lib/map";
import { useDriverStore, useLocationStore } from "@/store";
import { Driver, MarkerData } from "@/types/type";

const directionsAPI = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;

const SAFE_MAP_TYPE: MapType =
  Platform.OS === "ios" ? "mutedStandard" : "standard";

// Helper function to validate coordinates - handle both numbers and strings
const isValidCoordinate = (coord: number | string | null): boolean => {
  if (typeof coord === "number") {
    return !isNaN(coord) && coord !== 0;
  }
  if (typeof coord === "string") {
    const num = parseFloat(coord);
    return !isNaN(num) && num !== 0;
  }
  return false;
};

// Helper to convert coordinate to number for MapView
const coordToNumber = (coord: number | string | null): number | null => {
  if (typeof coord === "number") return coord;
  if (typeof coord === "string") {
    const num = parseFloat(coord);
    return !isNaN(num) ? num : null;
  }
  return null;
};

// Safe coordinate formatter for display
const formatCoordinate = (
  coord: number | string | null | undefined
): string => {
  if (coord === null || coord === undefined) return "N/A";

  const num = typeof coord === "string" ? parseFloat(coord) : coord;
  return isNaN(num) ? "N/A" : num.toFixed(4);
};

export default function Map() {
  const {
    userLongitude,
    userLatitude,
    destinationLatitude,
    destinationLongitude,
  } = useLocationStore();
  const { selectedDriver, setDrivers } = useDriverStore();

  const {
    data: drivers,
    loading,
    error,
    refetch,
  } = useFetch<Driver[]>("/(api)/driver");
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [directionsError, setDirectionsError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  // Refresh drivers every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
      setLastUpdate(Date.now());
      console.log("Refreshing driver locations...");
    }, 30000);

    return () => clearInterval(interval);
  }, [refetch]);

  // Enhanced marker generation with validation
  useEffect(() => {
    if (!Array.isArray(drivers)) {
      console.log("Drivers data is not an array:", drivers);
      setMarkers([]);
      return;
    }

    const userLat = coordToNumber(userLatitude);
    const userLng = coordToNumber(userLongitude);

    if (!isValidCoordinate(userLat) || !isValidCoordinate(userLng)) {
      console.log("Invalid user coordinates:", { userLatitude, userLongitude });
      setMarkers([]);
      return;
    }

    try {
      console.log("Generating markers for", drivers.length, "drivers");

      const newMarkers = generateMarkersFromData({
        data: drivers,
        userLatitude: userLat!,
        userLongitude: userLng!,
      });

      console.log("Generated", newMarkers.length, "valid markers");
      setMarkers(newMarkers);

      // Debug log
      console.log(
        "Markers debug:",
        newMarkers.map((m) => ({
          id: m.id,
          lat: m.latitude,
          lng: m.longitude,
          latType: typeof m.latitude,
          lngType: typeof m.longitude,
        }))
      );
    } catch (err) {
      console.error("Error generating markers:", err);
      setMarkers([]);
    }
  }, [drivers, userLatitude, userLongitude, lastUpdate]);

  useEffect(() => {
    const userLat = coordToNumber(userLatitude);
    const userLng = coordToNumber(userLongitude);
    const destLat = coordToNumber(destinationLatitude);
    const destLng = coordToNumber(destinationLongitude);

    if (
      markers.length > 0 &&
      isValidCoordinate(destLat) &&
      isValidCoordinate(destLng) &&
      isValidCoordinate(userLat) &&
      isValidCoordinate(userLng)
    ) {
      console.log("Calculating driver times for", markers.length, "markers");

      calculateDriverTimes({
        markers,
        userLatitude: userLat!,
        userLongitude: userLng!,
        destinationLatitude: destLat!,
        destinationLongitude: destLng!,
      })
        .then((list) => {
          if (list && Array.isArray(list)) {
            const validList = list.filter(
              (item) =>
                item &&
                isValidCoordinate(item.latitude) &&
                isValidCoordinate(item.longitude)
            );
            console.log(
              "Setting",
              validList.length,
              "drivers with calculated times"
            );
            setDrivers(validList as MarkerData[]);
          }
        })
        .catch((err) => {
          console.error("Error calculating driver times:", err);
        });
    }
  }, [
    markers,
    destinationLatitude,
    destinationLongitude,
    userLatitude,
    userLongitude,
    setDrivers,
  ]);

  const region = useMemo(() => {
    try {
      const calculatedRegion = calculateRegion({
        userLatitude,
        userLongitude,
        destinationLatitude,
        destinationLongitude,
      });

      console.log("Calculated region:", calculatedRegion);
      return calculatedRegion;
    } catch (error) {
      console.error("Error calculating region:", error);
      return {
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
    }
  }, [userLatitude, userLongitude, destinationLatitude, destinationLongitude]);

  // Handle directions errors better
  const handleDirectionsError = (errorMessage: string) => {
    console.log("Directions error:", errorMessage);

    if (errorMessage.includes("ZERO_RESULTS")) {
      setDirectionsError("No route found between these locations");
    } else if (errorMessage.includes("OVER_QUERY_LIMIT")) {
      setDirectionsError("Google Maps API limit exceeded");
    } else if (errorMessage.includes("REQUEST_DENIED")) {
      setDirectionsError("Google Maps API key invalid");
    } else {
      setDirectionsError("Could not calculate route: " + errorMessage);
    }
  };

  // Debug info
  console.log("Map Debug:", {
    driversCount: drivers?.length || 0,
    markersCount: markers.length,
    userLocation: { userLatitude, userLongitude },
    destination: { destinationLatitude, destinationLongitude },
    region,
    loading,
    error,
  });

  // Global fallbacks
  if (loading) {
    return (
      <View className="w-full h-full items-center justify-center">
        <ActivityIndicator />
        <Text className="mt-2">Loading drivers...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="w-full h-full items-center justify-center px-4">
        <Text className="text-center text-red-500">
          Failed to load drivers: {String(error)}
        </Text>
        <Text className="text-center mt-2">
          Make sure you have online drivers registered.
        </Text>
      </View>
    );
  }

  return (
    <View className="w-full h-full rounded-2xl overflow-hidden">
      <MapView
        provider={PROVIDER_GOOGLE}
        style={{ width: "100%", height: "100%" }}
        mapType={SAFE_MAP_TYPE}
        showsPointsOfInterest={false}
        region={region}
        showsUserLocation={true}
        onMapReady={() => setMapReady(true)}
        userInterfaceStyle="light"
      >
        {/* User Location Marker */}
        {isValidCoordinate(userLatitude) &&
          isValidCoordinate(userLongitude) && (
            <Marker
              key="user"
              coordinate={{
                latitude: coordToNumber(userLatitude)!,
                longitude: coordToNumber(userLongitude)!,
              }}
              title="Your Location"
              pinColor="blue"
            />
          )}

        {/* Driver Markers */}
        {markers.map((marker) => {
          const lat = coordToNumber(marker.latitude);
          const lng = coordToNumber(marker.longitude);

          if (!isValidCoordinate(lat) || !isValidCoordinate(lng)) {
            console.log(`Skipping invalid marker ${marker.id}:`, { lat, lng });
            return null;
          }

          return (
            <Marker
              key={marker.id}
              coordinate={{
                latitude: lat!,
                longitude: lng!,
              }}
              title={marker.title}
              description={`${marker.car_seats} seats • Rating: ${marker.rating}`}
              image={
                selectedDriver === +marker.id
                  ? icons.selectedMarker
                  : icons.marker
              }
            />
          );
        })}

        {/* Destination and Route */}
        {isValidCoordinate(destinationLatitude) &&
          isValidCoordinate(destinationLongitude) && (
            <React.Fragment>
              <Marker
                key="destination"
                coordinate={{
                  latitude: coordToNumber(destinationLatitude)!,
                  longitude: coordToNumber(destinationLongitude)!,
                }}
                title="Destination"
                pinColor="red"
              />
              {isValidCoordinate(userLatitude) &&
                isValidCoordinate(userLongitude) && (
                  <MapViewDirections
                    origin={{
                      latitude: coordToNumber(userLatitude)!,
                      longitude: coordToNumber(userLongitude)!,
                    }}
                    destination={{
                      latitude: coordToNumber(destinationLatitude)!,
                      longitude: coordToNumber(destinationLongitude)!,
                    }}
                    apikey={directionsAPI ?? ""}
                    strokeColor="#0286FF"
                    strokeWidth={4}
                    onError={(errorMessage) =>
                      handleDirectionsError(
                        typeof errorMessage === "string"
                          ? errorMessage
                          : "Unknown error"
                      )
                    }
                    onReady={(result) => {
                      console.log("Directions calculated:", result);
                      setDirectionsError(null);
                    }}
                  />
                )}
            </React.Fragment>
          )}
      </MapView>

      {/* Debug Info Overlay */}
      <View className="absolute top-2 left-2 right-2">
        <View className="bg-black/70 rounded-lg p-3">
          <Text className="text-white text-sm">
            Drivers Online: {markers.length}
          </Text>
          <Text className="text-white text-sm">
            Your Location: {formatCoordinate(userLatitude)},{" "}
            {formatCoordinate(userLongitude)}
          </Text>
          {directionsError && (
            <Text className="text-yellow-400 text-sm">{directionsError}</Text>
          )}
        </View>
      </View>

      {/* Loading Overlay */}
      {!mapReady && (
        <View className="absolute bottom-2 left-2 right-2 items-center">
          <View className="px-3 py-2 rounded-xl bg-white/90">
            <Text>Loading map…</Text>
          </View>
        </View>
      )}
    </View>
  );
}

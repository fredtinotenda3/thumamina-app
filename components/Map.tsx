import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, MapType } from "react-native-maps";
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
    Platform.OS === "ios" ? "mutedStandard" : "standard"; // mutedStandard is iOS-only

export default function Map() {
    const {
        userLongitude,
        userLatitude,
        destinationLatitude,
        destinationLongitude,
    } = useLocationStore();
    const { selectedDriver, setDrivers } = useDriverStore();

    const { data: drivers, loading, error } = useFetch<Driver[]>("/(api)/driver");
    const [markers, setMarkers] = useState<MarkerData[]>([]);
    const [directionsError, setDirectionsError] = useState<string | null>(null);
    const [mapReady, setMapReady] = useState(false);

    useEffect(() => {
        if (!Array.isArray(drivers)) return;
        if (typeof userLatitude !== "number" || typeof userLongitude !== "number") return;

        const newMarkers = generateMarkersFromData({
            data: drivers,
            userLatitude,
            userLongitude,
        });
        setMarkers(newMarkers);
    }, [drivers, userLatitude, userLongitude]);

    useEffect(() => {
        if (
            markers.length > 0 &&
            typeof destinationLatitude === "number" &&
            typeof destinationLongitude === "number" &&
            typeof userLatitude === "number" &&
            typeof userLongitude === "number"
        ) {
            calculateDriverTimes({
                markers,
                userLatitude,
                userLongitude,
                destinationLatitude,
                destinationLongitude,
            }).then((list) => setDrivers(list as MarkerData[]));
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
            return calculateRegion({
                userLatitude,
                userLongitude,
                destinationLatitude,
                destinationLongitude,
            });
        } catch {
            return undefined;
        }
    }, [userLatitude, userLongitude, destinationLatitude, destinationLongitude]);

    // Global fallbacks
    if (loading || typeof userLatitude !== "number" || typeof userLongitude !== "number") {
        return (
            <View className="w-full h-full items-center justify-center">
                <ActivityIndicator />
                <Text className="mt-2">Loading your location…</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View className="w-full h-full items-center justify-center px-4">
                <Text className="text-center">Failed to load drivers: {String(error)}</Text>
            </View>
        );
    }

    // If we can’t compute a valid region, render a friendly fallback instead of mounting MapView
    if (!region || Number.isNaN(region.latitude) || Number.isNaN(region.longitude)) {
        return (
            <View className="w-full h-full items-center justify-center px-4">
                <Text className="text-center">
                    We couldn’t initialize the map. Please check location permissions and try again.
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
                initialRegion={region}
                showsUserLocation
                onMapReady={() => setMapReady(true)}
                userInterfaceStyle="light" // iOS-only; safe to leave
            >
                {markers.map((marker) => (
                    <Marker
                        key={marker.id}
                        coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
                        title={marker.title}
                        image={selectedDriver === +marker.id ? icons.selectedMarker : icons.marker}
                    />
                ))}

                {typeof destinationLatitude === "number" &&
                    typeof destinationLongitude === "number" &&
                    typeof userLatitude === "number" &&
                    typeof userLongitude === "number" && (
                        <React.Fragment>
                            <Marker
                                key="destination"
                                coordinate={{ latitude: destinationLatitude, longitude: destinationLongitude }}
                                title="Destination"
                                image={icons.pin}
                            />
                            <MapViewDirections
                                origin={{ latitude: userLatitude, longitude: userLongitude }}
                                destination={{ latitude: destinationLatitude, longitude: destinationLongitude }}
                                apikey={directionsAPI ?? ""}
                                strokeColor="#0286FF"
                                strokeWidth={2}
                                onError={(msg) => setDirectionsError(typeof msg === "string" ? msg : "Directions error")}
                            />
                        </React.Fragment>
                    )}
            </MapView>

            {/* Overlay non-blocking status/errors */}
            {!mapReady && (
                <View className="absolute bottom-2 left-2 right-2 items-center">
                    <View className="px-3 py-2 rounded-xl bg-white/90">
                        <Text>Loading map…</Text>
                    </View>
                </View>
            )}

            {directionsError && (
                <View className="absolute top-2 left-2 right-2 items-center">
                    <View className="px-3 py-2 rounded-xl bg-white/95">
                        <Text>Couldn’t load route: {directionsError}</Text>
                    </View>
                </View>
            )}
        </View>
    );
}

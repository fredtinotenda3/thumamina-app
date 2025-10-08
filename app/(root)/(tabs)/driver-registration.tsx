import { useAuth, useUser } from "@clerk/clerk-expo";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

import CustomButton from "@/components/CustomButton";
import InputField from "@/components/InputField";
import RideNotification from "@/components/RideNotification";
import { icons, images } from "@/constants";
import { fetchAPI } from "@/lib/fetch";

interface DriverData {
  id: number;
  first_name: string;
  last_name: string;
  car_seats: number;
  is_online: boolean;
  latitude: number | null;
  longitude: number | null;
  rating: number;
}

interface RideRequest {
  ride_id: number;
  origin_address: string;
  destination_address: string;
  fare_price: number;
  ride_time: number;
  user_id: string;
  status: string;
}

// Safe coordinate formatter
const formatCoordinate = (coord: number | null | undefined): string => {
  if (coord === null || coord === undefined || isNaN(coord)) {
    return "N/A";
  }
  return coord.toFixed(6);
};

const DriverRegistration = () => {
  const { user } = useUser();
  const { userId } = useAuth();
  const mapRef = useRef<MapView>(null);

  const [form, setForm] = useState({
    first_name: user?.firstName || "",
    last_name: user?.lastName || "",
    car_seats: "4",
  });

  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [isRegistered, setIsRegistered] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [checkingDriver, setCheckingDriver] = useState(true);
  const [driverData, setDriverData] = useState<DriverData | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // Ride request states
  const [rideRequests, setRideRequests] = useState<RideRequest[]>([]);
  const [processingRide, setProcessingRide] = useState(false);

  // Check if driver already exists on component mount
  useEffect(() => {
    checkDriverExistence();
  }, []);

  const handleRideAccepted = (rideId: number) => {
    console.log(`Ride ${rideId} accepted`);
    // Remove the accepted ride from the list
    setRideRequests((prev) => prev.filter((ride) => ride.ride_id !== rideId));
  };

  const handleRideRejected = (rideId: number) => {
    console.log(`Ride ${rideId} rejected`);
    // Remove the rejected ride from the list
    setRideRequests((prev) => prev.filter((ride) => ride.ride_id !== rideId));
  };

  // Get current location
  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Location permission is required");
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setLocation(newLocation);

      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: newLocation.latitude,
          longitude: newLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert("Error", "Failed to get current location");
    } finally {
      setLocationLoading(false);
    }
  };

  // Check if driver already exists
  const checkDriverExistence = async () => {
    if (!user?.firstName || !user?.lastName) {
      setCheckingDriver(false);
      return;
    }

    try {
      const response = await fetchAPI(
        `/(api)/driver/register?first_name=${encodeURIComponent(user.firstName)}&last_name=${encodeURIComponent(user.lastName)}`
      );

      if (response.exists && response.driver) {
        setIsRegistered(true);
        setDriverData(response.driver);
        setIsOnline(response.driver.is_online || false);
        setForm({
          first_name: response.driver.first_name,
          last_name: response.driver.last_name,
          car_seats: response.driver.car_seats?.toString() || "4",
        });

        // If driver has valid location, use it
        if (response.driver.latitude && response.driver.longitude) {
          setLocation({
            latitude: Number(response.driver.latitude),
            longitude: Number(response.driver.longitude),
          });
        } else {
          // Otherwise get current location
          await getCurrentLocation();
        }
      } else {
        // Not registered, get location for registration
        await getCurrentLocation();
      }
    } catch (error) {
      console.error("Error checking driver existence:", error);
      // Still try to get location even if check fails
      await getCurrentLocation();
    } finally {
      setCheckingDriver(false);
    }
  };

  const handleRegister = async () => {
    if (!location) {
      Alert.alert("Error", "Please allow location access to register");
      return;
    }

    setLoading(true);
    try {
      const response = await fetchAPI("/(api)/driver/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          car_seats: parseInt(form.car_seats) || 4,
          latitude: location.latitude,
          longitude: location.longitude,
        }),
      });

      if (response.data) {
        setIsRegistered(true);
        setDriverData(response.data);
        Alert.alert("Success", "You are now registered as a driver!");
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error.exists) {
        // Driver already exists - update state accordingly
        setIsRegistered(true);
        setDriverData(error.existingDriver);
        setIsOnline(error.existingDriver.is_online || false);
        Alert.alert("Info", "You are already registered as a driver!");
      } else {
        Alert.alert("Error", error.error || "Failed to register as driver");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOnline = async () => {
    if (!isRegistered || !driverData) {
      Alert.alert("Error", "Please register as a driver first");
      return;
    }

    if (!location) {
      Alert.alert("Error", "Location not available");
      return;
    }

    setToggleLoading(true);
    const newOnlineStatus = !isOnline;

    try {
      const response = await fetchAPI("/(api)/driver/location", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          driver_id: driverData.id,
          latitude: location.latitude,
          longitude: location.longitude,
          is_online: newOnlineStatus,
        }),
      });

      if (response.data) {
        setIsOnline(newOnlineStatus);
        setDriverData({ ...driverData, is_online: newOnlineStatus });
        Alert.alert(
          "Success",
          `You are now ${newOnlineStatus ? "online" : "offline"}`
        );

        // If going offline, clear ride requests
        if (!newOnlineStatus) {
          setRideRequests([]);
        }
      } else {
        throw new Error("No data in response");
      }
    } catch (error: any) {
      console.error("Error updating online status:", error);
      Alert.alert(
        "Error",
        `Failed to go ${newOnlineStatus ? "online" : "offline"}. Please try again.`
      );
    } finally {
      setToggleLoading(false);
    }
  };

  const handleUpdateLocation = async () => {
    if (!isRegistered || !driverData) {
      Alert.alert("Error", "Driver not registered");
      return;
    }

    try {
      await getCurrentLocation();

      if (location) {
        const response = await fetchAPI("/(api)/driver/location", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            driver_id: driverData.id,
            latitude: location.latitude,
            longitude: location.longitude,
            is_online: isOnline,
          }),
        });

        if (response.data) {
          Alert.alert("Success", "Location updated successfully!");
        }
      }
    } catch (error) {
      console.error("Error updating location:", error);
      Alert.alert("Error", "Failed to update location");
    }
  };

  // Safe location display
  const renderLocationInfo = () => {
    if (!location) {
      return (
        <Text className="text-sm text-gray-600 mt-2">
          Location: Not available
        </Text>
      );
    }

    return (
      <Text className="text-sm text-gray-600 mt-2">
        Latitude: {formatCoordinate(location.latitude)}, Longitude:{" "}
        {formatCoordinate(location.longitude)}
      </Text>
    );
  };

  // Render ride request section
  const renderRideRequests = () => {
    if (!isOnline) {
      return (
        <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
          <Text className="text-yellow-800 text-center">
            Go online to receive ride requests
          </Text>
        </View>
      );
    }

    if (rideRequests.length === 0) {
      return (
        <View className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
          <Text className="text-gray-600 text-center">
            No ride requests available
          </Text>
          <Text className="text-gray-500 text-center text-sm mt-1">
            You will receive notifications here when riders request your service
          </Text>
        </View>
      );
    }

    return (
      <View className="mt-4">
        <Text className="text-lg font-JakartaSemiBold mb-3">
          Active Ride Requests ({rideRequests.length})
        </Text>
        <Text className="text-gray-600 text-sm mb-3">
          Ride requests will appear as notifications above. Click on them to
          accept or reject.
        </Text>
      </View>
    );
  };

  // Show loading while checking driver existence
  if (checkingDriver) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" />
        <Text className="text-lg font-JakartaSemiBold mt-3">
          Checking driver status...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View className="px-5">
          <View className="flex flex-row items-center my-5">
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <Image source={icons.backArrow} className="w-6 h-6" />
            </TouchableOpacity>
            <Text className="text-2xl font-JakartaBold">
              {isRegistered ? "Driver Dashboard" : "Driver Registration"}
            </Text>
          </View>

          {/* Ride Notification Component */}
          {isRegistered && driverData && (
            <RideNotification
              driverId={driverData.id}
              isOnline={isOnline}
              onRideAccepted={handleRideAccepted}
              onRideRejected={handleRideRejected}
            />
          )}

          {!isRegistered ? (
            <>
              <Text className="text-lg font-JakartaSemiBold mb-3">
                Complete your driver profile
              </Text>

              <InputField
                label="First Name"
                placeholder="Enter first name"
                value={form.first_name}
                onChangeText={(value) =>
                  setForm({ ...form, first_name: value })
                }
              />

              <InputField
                label="Last Name"
                placeholder="Enter last name"
                value={form.last_name}
                onChangeText={(value) => setForm({ ...form, last_name: value })}
              />

              <InputField
                label="Car Seats"
                placeholder="Enter number of seats"
                keyboardType="numeric"
                value={form.car_seats}
                onChangeText={(value) => setForm({ ...form, car_seats: value })}
              />

              <View className="my-4">
                <Text className="text-lg font-JakartaSemiBold mb-3">
                  Current Location
                  {!location && (
                    <Text className="text-red-500"> * Required</Text>
                  )}
                </Text>

                {location ? (
                  <View className="h-64 rounded-lg overflow-hidden">
                    <MapView
                      ref={mapRef}
                      provider={PROVIDER_GOOGLE}
                      style={{ width: "100%", height: "100%" }}
                      initialRegion={{
                        latitude: location.latitude,
                        longitude: location.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      }}
                      showsUserLocation={true}
                    >
                      <Marker
                        coordinate={{
                          latitude: location.latitude,
                          longitude: location.longitude,
                        }}
                        title="Your Location"
                      />
                    </MapView>
                  </View>
                ) : (
                  <View className="h-64 bg-gray-100 rounded-lg items-center justify-center">
                    <Text className="text-gray-600 mb-4">
                      {locationLoading
                        ? "Getting location..."
                        : "Location not available"}
                    </Text>
                    <CustomButton
                      title="Get My Location"
                      onPress={getCurrentLocation}
                      className="w-48"
                      disabled={locationLoading}
                    />
                  </View>
                )}

                {renderLocationInfo()}
              </View>

              <CustomButton
                title={loading ? "Registering..." : "Register as Driver"}
                onPress={handleRegister}
                disabled={loading || !location}
                className="mt-4"
              />
            </>
          ) : (
            <>
              <View className="items-center my-6">
                <Image
                  source={{ uri: user?.imageUrl || images.noResult }}
                  className="w-32 h-32 rounded-full"
                />
                <Text className="text-xl font-JakartaBold mt-3">
                  {form.first_name} {form.last_name}
                </Text>
                <Text className="text-gray-600">
                  Status:{" "}
                  <Text
                    className={isOnline ? "text-green-600" : "text-red-600"}
                  >
                    {isOnline ? "ONLINE" : "OFFLINE"}
                  </Text>
                </Text>
                {driverData && (
                  <Text className="text-sm text-gray-500 mt-1">
                    Driver ID: {driverData.id} • Rating: {driverData.rating} ⭐
                  </Text>
                )}
              </View>

              <View className="bg-general-500 rounded-lg p-4 mb-6">
                <Text className="font-JakartaSemiBold text-lg mb-2">
                  Vehicle Information
                </Text>
                <Text>Seats: {form.car_seats}</Text>
                {renderLocationInfo()}
              </View>

              <CustomButton
                title={
                  toggleLoading
                    ? "Updating..."
                    : isOnline
                      ? "Go Offline"
                      : "Go Online"
                }
                onPress={handleToggleOnline}
                disabled={toggleLoading}
                bgVariant={isOnline ? "danger" : "success"}
                className="mb-4"
              />

              <CustomButton
                title="Update Location"
                onPress={handleUpdateLocation}
                bgVariant="outline"
                className="mb-4"
                disabled={locationLoading}
              />

              <Text className="text-center text-gray-600 mb-4">
                {isOnline
                  ? "✅ You are online and visible to riders"
                  : "❌ You are offline and not visible to riders"}
              </Text>

              <View className="mt-4">
                <Text className="font-JakartaSemiBold mb-2">
                  Your Location Map
                </Text>
                <View className="h-64 rounded-lg overflow-hidden">
                  {location ? (
                    <MapView
                      ref={mapRef}
                      provider={PROVIDER_GOOGLE}
                      style={{ width: "100%", height: "100%" }}
                      region={{
                        latitude: location.latitude,
                        longitude: location.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      }}
                      showsUserLocation={true}
                    >
                      <Marker
                        coordinate={{
                          latitude: location.latitude,
                          longitude: location.longitude,
                        }}
                        title={isOnline ? "Online - Available" : "Offline"}
                        description={`${form.first_name} ${form.last_name}`}
                      />
                    </MapView>
                  ) : (
                    <View className="h-full bg-gray-100 items-center justify-center">
                      <Text>Location not available</Text>
                      <CustomButton
                        title="Refresh Location"
                        onPress={getCurrentLocation}
                        className="mt-4 w-32"
                        disabled={locationLoading}
                      />
                    </View>
                  )}
                </View>
              </View>

              {/* Ride Requests Section - Below the Map */}
              {renderRideRequests()}

              <TouchableOpacity
                onPress={getCurrentLocation}
                disabled={locationLoading}
                className={`mt-4 p-3 border border-gray-300 rounded-lg items-center ${
                  locationLoading ? "opacity-50" : ""
                }`}
              >
                <Text className="text-gray-600">
                  {locationLoading ? "Getting Location..." : "Refresh Location"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DriverRegistration;

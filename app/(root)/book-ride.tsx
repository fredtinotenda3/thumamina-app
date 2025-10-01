import { useUser } from "@clerk/clerk-expo";
import { StripeProvider } from "@stripe/stripe-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Text, View } from "react-native";

import CustomButton from "@/components/CustomButton";
import Payment from "@/components/Payment";
import RideLayout from "@/components/RideLayout";
import { icons } from "@/constants";
import { fetchAPI } from "@/lib/fetch";
import { formatTime } from "@/lib/utils";
import { useDriverStore, useLocationStore } from "@/store";
import { router } from "expo-router";

const BookRide = () => {
  const { user } = useUser();
  const {
    userAddress,
    destinationAddress,
    userLatitude,
    userLongitude,
    destinationLatitude,
    destinationLongitude,
  } = useLocationStore();
  const { drivers, selectedDriver } = useDriverStore();
  const [rideStatus, setRideStatus] = useState<
    "pending" | "accepted" | "rejected"
  >("pending");
  const [rideId, setRideId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const driverDetails = drivers?.find(
    (driver) => +driver.id === selectedDriver
  );

  // Create ride request when component mounts
  useEffect(() => {
    if (selectedDriver && user?.id) {
      createRideRequest();
    }
  }, [selectedDriver, user?.id]);

  const createRideRequest = async () => {
    if (!selectedDriver || !user?.id) {
      setError("Missing driver or user information");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("🚗 Creating ride request for driver:", selectedDriver);

      // FIXED: Remove the * 100 from fare_price and ensure all coordinates are numbers
      const rideData = {
        origin_address: userAddress || "Current Location",
        destination_address: destinationAddress || "Destination",
        origin_latitude: Number(userLatitude) || -17.82944,
        origin_longitude: Number(userLongitude) || 31.03677,
        destination_latitude: Number(destinationLatitude) || -17.82927,
        destination_longitude: Number(destinationLongitude) || 31.03766,
        ride_time: driverDetails?.time || 15,
        fare_price: parseFloat(driverDetails?.price || "5.00"), // REMOVED * 100
        driver_id: selectedDriver,
        user_id: user.id,
      };

      console.log("📦 Sending ride data:", rideData);

      // FIXED: Use the correct endpoint and better error handling
      const response = await fetchAPI("/(api)/ride/create-ride", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(rideData),
      });

      console.log("✅ Ride creation response:", response);

      if (response.data && response.data.ride_id) {
        setRideId(response.data.ride_id);
        console.log("🎯 Ride created with ID:", response.data.ride_id);
        // Start polling for ride status
        pollRideStatus(response.data.ride_id);
      } else {
        console.error("❌ No ride_id in response:", response);
        throw new Error(
          response.error || "Failed to create ride - no ride_id returned"
        );
      }
    } catch (error: any) {
      console.error("❌ Error creating ride request:", error);
      setError(error.message || "Failed to create ride request");
      Alert.alert("Error", "Failed to create ride request. Please try again.");
      setLoading(false);
    }
  };

  const pollRideStatus = async (rideId: number) => {
    let pollCount = 0;
    const maxPolls = 40;

    const interval = setInterval(async () => {
      try {
        pollCount++;
        console.log(
          `🔄 Polling ride status (attempt ${pollCount}) for ride:`,
          rideId
        );

        // FIXED: Use the correct endpoint format for dynamic routes
        const response = await fetchAPI(`/(api)/ride/status?ride_id=${rideId}`);

        console.log("📊 Status response:", response);

        if (response.data) {
          const status = response.data.status;
          console.log("🎯 Current ride status:", status);

          if (status === "accepted") {
            setRideStatus("accepted");
            clearInterval(interval);
            setLoading(false);
            console.log("✅ Ride accepted! Proceeding to payment...");
          } else if (status === "rejected") {
            setRideStatus("rejected");
            clearInterval(interval);
            setLoading(false);
            Alert.alert(
              "Ride Rejected",
              "The driver rejected your ride request. Please choose another driver."
            );
          }
          // If status is 'requested', continue polling
        } else if (response.error) {
          console.error("❌ Error in status response:", response.error);
        }
      } catch (error) {
        console.error("❌ Error polling ride status:", error);

        // Only stop after multiple consecutive errors
        if (pollCount > 15) {
          clearInterval(interval);
          setLoading(false);
          Alert.alert("Error", "Unable to get ride status. Please try again.");
        }
      }
    }, 3000);

    // Clear interval after 2 minutes (timeout)
    setTimeout(() => {
      clearInterval(interval);
      if (rideStatus === "pending") {
        setLoading(false);
        Alert.alert(
          "Timeout",
          "Driver did not respond in time. Please try another driver."
        );
      }
    }, 120000);
  };

  // Debug info
  console.log("🔍 BookRide Debug:", {
    selectedDriver,
    rideId,
    rideStatus,
    loading,
    error,
    driverDetails,
    hasUser: !!user?.id,
  });

  if (error) {
    return (
      <RideLayout title="Error">
        <View className="flex-1 justify-center items-center px-5">
          <Text className="text-lg font-JakartaSemiBold text-red-500 mb-4">
            Error Creating Ride
          </Text>
          <Text className="text-gray-500 text-center mb-6">{error}</Text>
          <CustomButton title="Go Back" onPress={() => router.back()} />
        </View>
      </RideLayout>
    );
  }

  if (loading || rideStatus === "pending") {
    return (
      <RideLayout title="Waiting for Driver">
        <View className="flex-1 justify-center items-center px-5">
          <ActivityIndicator size="large" color="#0286FF" />
          <Text className="text-lg font-JakartaSemiBold mt-4 text-center">
            Waiting for driver to accept your ride...
          </Text>
          <Text className="text-gray-500 text-center mt-2">
            {driverDetails?.first_name} {driverDetails?.last_name} has been
            notified and will respond shortly.
          </Text>
          <Text className="text-gray-400 text-center mt-4 text-sm">
            This may take a few moments... (Polling:{" "}
            {rideId ? `Ride #${rideId}` : "Creating ride"})
          </Text>
        </View>
      </RideLayout>
    );
  }

  if (rideStatus === "rejected") {
    return (
      <RideLayout title="Ride Rejected">
        <View className="flex-1 justify-center items-center px-5">
          <Text className="text-lg font-JakartaSemiBold text-red-500 mb-4">
            Ride Request Rejected
          </Text>
          <Text className="text-gray-500 text-center mb-6">
            The driver was unable to accept your ride. Please go back and choose
            another driver.
          </Text>
          <CustomButton
            title="Choose Another Driver"
            onPress={() => router.back()}
          />
        </View>
      </RideLayout>
    );
  }

  // Only show payment if ride was accepted and we have all required data
  const canShowPayment =
    rideId && driverDetails?.id && driverDetails?.price && driverDetails?.time;

  if (!canShowPayment) {
    return (
      <RideLayout title="Error">
        <View className="flex-1 justify-center items-center px-5">
          <Text className="text-lg font-JakartaSemiBold text-red-500 mb-4">
            Missing Ride Information
          </Text>
          <Text className="text-gray-500 text-center mb-6">
            Unable to load payment information. Please try again.
            {` (Ride ID: ${rideId}, Driver: ${driverDetails?.id})`}
          </Text>
          <CustomButton title="Go Back" onPress={() => router.back()} />
        </View>
      </RideLayout>
    );
  }

  // Safe values for Payment component
  const paymentProps = {
    fullName: user?.fullName || "Customer",
    email: user?.emailAddresses[0]?.emailAddress || "customer@example.com",
    amount: driverDetails.price || "5.00",
    driverId: driverDetails.id,
    rideTime: driverDetails.time || 15,
    rideId: rideId,
  };

  return (
    <StripeProvider
      publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}
      merchantIdentifier="merchant.com.uber"
      urlScheme="myapp"
    >
      <RideLayout title="Book Ride">
        <>
          <Text className="text-xl font-JakartaSemiBold mb-3">
            Ride Information
          </Text>

          <View className="flex flex-col w-full items-center justify-center mt-10">
            <Image
              source={{ uri: driverDetails?.profile_image_url }}
              className="w-28 h-28 rounded-full"
            />

            <View className="flex flex-row items-center justify-center mt-5 space-x-2">
              <Text className="text-lg font-JakartaSemiBold">
                {driverDetails?.first_name} {driverDetails?.last_name}
              </Text>

              <View className="flex flex-row items-center space-x-0.5">
                <Image
                  source={icons.star}
                  className="w-5 h-5"
                  resizeMode="contain"
                />
                <Text className="text-lg font-JakartaRegular">
                  {driverDetails?.rating}
                </Text>
              </View>
            </View>
          </View>

          <View className="flex flex-col w-full items-start justify-center py-3 px-5 rounded-3xl bg-general-600 mt-5">
            <View className="flex flex-row items-center justify-between w-full border-b border-white py-3">
              <Text className="text-lg font-JakartaRegular">Ride Price</Text>
              <Text className="text-lg font-JakartaRegular text-[#0CC25F]">
                ${driverDetails?.price}
              </Text>
            </View>

            <View className="flex flex-row items-center justify-between w-full border-b border-white py-3">
              <Text className="text-lg font-JakartaRegular">Pickup Time</Text>
              <Text className="text-lg font-JakartaRegular">
                {formatTime(driverDetails?.time!)}
              </Text>
            </View>

            <View className="flex flex-row items-center justify-between w-full py-3">
              <Text className="text-lg font-JakartaRegular">Car Seats</Text>
              <Text className="text-lg font-JakartaRegular">
                {driverDetails?.car_seats}
              </Text>
            </View>
          </View>

          <View className="flex flex-col w-full items-start justify-center mt-5">
            <View className="flex flex-row items-center justify-start mt-3 border-t border-b border-general-700 w-full py-3">
              <Image source={icons.to} className="w-6 h-6" />
              <Text className="text-lg font-JakartaRegular ml-2">
                {userAddress}
              </Text>
            </View>

            <View className="flex flex-row items-center justify-start border-b border-general-700 w-full py-3">
              <Image source={icons.point} className="w-6 h-6" />
              <Text className="text-lg font-JakartaRegular ml-2">
                {destinationAddress}
              </Text>
            </View>
          </View>

          <Payment {...paymentProps} />
        </>
      </RideLayout>
    </StripeProvider>
  );
};

export default BookRide;

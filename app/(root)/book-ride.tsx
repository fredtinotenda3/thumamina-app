import { useUser } from "@clerk/clerk-expo";
import { StripeProvider } from "@stripe/stripe-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Text, View } from "react-native";

import CustomButton from "@/components/CustomButton";
import Payment from "@/components/Payment";
import RideLayout from "@/components/RideLayout";
import UserNotification from "@/components/UserNotification";
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
    "pending" | "accepted" | "rejected" | "timeout"
  >("pending");
  const [rideId, setRideId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);

  const driverDetails = drivers?.find(
    (driver) => +driver.id === selectedDriver
  );

  // Create ride request when component mounts
  useEffect(() => {
    if (selectedDriver && user?.id && !rideId) {
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
    setPollCount(0);

    try {
      console.log("🚗 Creating ride request for driver:", selectedDriver);

      const rideData = {
        origin_address: userAddress || "Current Location",
        destination_address: destinationAddress || "Destination",
        origin_latitude: Number(userLatitude) || -17.82944,
        origin_longitude: Number(userLongitude) || 31.03677,
        destination_latitude: Number(destinationLatitude) || -17.82927,
        destination_longitude: Number(destinationLongitude) || 31.03766,
        ride_time: driverDetails?.time || 15,
        fare_price: parseFloat(driverDetails?.price || "5.00"),
        driver_id: selectedDriver,
        user_id: user.id,
      };

      console.log("📦 Sending ride data:", rideData);

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
    let currentPollCount = 0;
    const maxPolls = 30; // 1.5 minutes at 3-second intervals

    const pollInterval = setInterval(async () => {
      try {
        currentPollCount++;
        setPollCount(currentPollCount);

        console.log(
          `🔄 Polling ride status (attempt ${currentPollCount}) for ride:`,
          rideId
        );

        // FIXED: Use the correct endpoint with query parameter
        const response = await fetchAPI(`/(api)/ride/status?ride_id=${rideId}`);

        console.log("📊 Status response:", response);

        if (response.data) {
          const status = response.data.status;
          console.log("🎯 Current ride status:", status);

          if (status === "accepted") {
            setRideStatus("accepted");
            clearInterval(pollInterval);
            setLoading(false);
            console.log("✅ Ride accepted! Proceeding to payment...");
          } else if (status === "rejected") {
            setRideStatus("rejected");
            clearInterval(pollInterval);
            setLoading(false);
          }
          // If status is 'requested', continue polling
        } else if (response.error) {
          console.error("❌ Error in status response:", response.error);
        }

        // Stop polling after max attempts
        if (currentPollCount >= maxPolls) {
          clearInterval(pollInterval);
          setRideStatus("timeout");
          setLoading(false);
        }
      } catch (error) {
        console.error("❌ Error polling ride status:", error);

        // Stop after multiple consecutive errors
        if (currentPollCount > 10) {
          clearInterval(pollInterval);
          setLoading(false);
        }
      }
    }, 3000); // Poll every 3 seconds

    // Cleanup on unmount
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  };

  const handlePaymentNavigate = (rideId: number) => {
    // The payment section will be shown automatically when ride is accepted
    console.log("Proceeding to payment for ride:", rideId);
    setRideStatus("accepted");
  };

  const handleSelectAnotherDriver = () => {
    router.back(); // Go back to driver selection
  };

  const handlePaymentConfirmed = (paymentMethod: string, amount: string) => {
    console.log(`💰 Payment confirmed: ${paymentMethod} - $${amount}`);
    // You can add additional logic here, like updating local state
    // or triggering notifications to the driver
  };

  // Debug info
  console.log("🔍 BookRide Debug:", {
    selectedDriver,
    rideId,
    rideStatus,
    loading,
    error,
    pollCount,
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

  // Safe values for Payment component
  const paymentProps = {
    fullName: user?.fullName || "Customer",
    email: user?.emailAddresses[0]?.emailAddress || "customer@example.com",
    amount: driverDetails?.price || "5.00",
    driverId: driverDetails?.id || 0,
    rideTime: driverDetails?.time || 15,
    rideId: rideId || 0,
    onPaymentConfirmed: handlePaymentConfirmed,
  };

  const canShowPayment =
    rideId && driverDetails?.id && driverDetails?.price && driverDetails?.time;

  // Show error states for rejected or timeout
  if (rideStatus === "rejected" || rideStatus === "timeout") {
    return (
      <RideLayout title="Ride Not Available">
        <View className="flex-1 justify-center items-center px-5">
          <Text className="text-lg font-JakartaSemiBold text-red-500 mb-4">
            {rideStatus === "rejected"
              ? "Ride Request Rejected"
              : "Request Timeout"}
          </Text>
          <Text className="text-gray-500 text-center mb-6">
            {rideStatus === "rejected"
              ? "The driver was unable to accept your ride."
              : "The driver did not respond in time."}{" "}
            Please go back and choose another driver.
          </Text>
          <CustomButton
            title="Choose Another Driver"
            onPress={() => router.back()}
          />
        </View>
      </RideLayout>
    );
  }

  return (
    <StripeProvider
      publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}
      merchantIdentifier="merchant.com.uber"
      urlScheme="myapp"
    >
      <RideLayout title="Book Ride">
        <>
          {/* User Notification Component */}
          {rideId && (
            <UserNotification
              rideId={rideId}
              userId={user?.id || ""}
              onPaymentNavigate={handlePaymentNavigate}
              onSelectAnotherDriver={handleSelectAnotherDriver}
            />
          )}

          {/* Show loading/status while waiting for driver response */}
          {(loading || rideStatus === "pending") && (
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
                Polling status... (Attempt: {pollCount})
              </Text>
              <View className="mt-6">
                <CustomButton
                  title="Cancel Request"
                  onPress={() => router.back()}
                  bgVariant="outline"
                />
              </View>
            </View>
          )}

          {/* Show payment section only when ride is accepted */}
          {rideStatus === "accepted" && canShowPayment ? (
            <>
              <Text className="text-xl font-JakartaSemiBold mb-3">
                Ride Confirmed! 🎉
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
                  <Text className="text-lg font-JakartaRegular">
                    Ride Price
                  </Text>
                  <Text className="text-lg font-JakartaRegular text-[#0CC25F]">
                    ${driverDetails?.price}
                  </Text>
                </View>

                <View className="flex flex-row items-center justify-between w-full border-b border-white py-3">
                  <Text className="text-lg font-JakartaRegular">
                    Pickup Time
                  </Text>
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
          ) : null}
        </>
      </RideLayout>
    </StripeProvider>
  );
};

export default BookRide;

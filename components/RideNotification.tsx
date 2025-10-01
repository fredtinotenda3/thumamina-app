import { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import { ReactNativeModal } from "react-native-modal";

import { fetchAPI } from "@/lib/fetch";
import CustomButton from "./CustomButton";

interface RideRequest {
  ride_id: number;
  origin_address: string;
  destination_address: string;
  fare_price: number;
  ride_time: number;
  user_id: string;
}

interface RideNotificationProps {
  driverId: number;
  isOnline: boolean;
}

const RideNotification = ({ driverId, isOnline }: RideNotificationProps) => {
  const [visible, setVisible] = useState(false);
  const [currentRide, setCurrentRide] = useState<RideRequest | null>(null);
  const [loading, setLoading] = useState(false);

  // Check for new ride requests every 10 seconds
  useEffect(() => {
    if (!isOnline || !driverId) return;

    const interval = setInterval(() => {
      checkForRideRequests();
    }, 10000);

    return () => clearInterval(interval);
  }, [driverId, isOnline]);

  const checkForRideRequests = async () => {
    try {
      const response = await fetchAPI(
        `/(api)/driver/rides?driver_id=${driverId}`
      );

      if (response.data && response.data.length > 0 && !visible) {
        setCurrentRide(response.data[0]);
        setVisible(true);
      }
    } catch (error) {
      console.error("Error checking ride requests:", error);
    }
  };

  const handleAccept = async () => {
    if (!currentRide) return;

    setLoading(true);
    try {
      await fetchAPI(`/(api)/ride/${currentRide.ride_id}/accept`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: true }),
      });

      setVisible(false);
      setCurrentRide(null);
      Alert.alert("Success", "Ride accepted! Get ready for pickup.");
      // Here you would navigate to ride navigation screen
    } catch (error) {
      Alert.alert("Error", "Failed to accept ride");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!currentRide) return;

    setLoading(true);
    try {
      await fetchAPI(`/(api)/ride/${currentRide.ride_id}/accept`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: false }),
      });

      setVisible(false);
      setCurrentRide(null);
    } catch (error) {
      Alert.alert("Error", "Failed to reject ride");
    } finally {
      setLoading(false);
    }
  };

  if (!currentRide) return null;

  return (
    <ReactNativeModal
      isVisible={visible}
      onBackdropPress={() => setVisible(false)}
      backdropOpacity={0.7}
    >
      <View className="bg-white rounded-2xl p-6 mx-4">
        <Text className="text-xl font-JakartaBold mb-4 text-center">
          New Ride Request! 🚗
        </Text>

        <View className="mb-4">
          <Text className="font-JakartaSemiBold text-lg">From:</Text>
          <Text className="text-gray-600 ml-2">
            {currentRide.origin_address}
          </Text>

          <Text className="font-JakartaSemiBold text-lg mt-2">To:</Text>
          <Text className="text-gray-600 ml-2">
            {currentRide.destination_address}
          </Text>
        </View>

        <View className="flex-row justify-between mb-4">
          <Text className="font-JakartaSemiBold">
            Fare: ${(currentRide.fare_price / 100).toFixed(2)}
          </Text>
          <Text className="font-JakartaSemiBold">
            Time: {currentRide.ride_time} min
          </Text>
        </View>

        <Text className="text-gray-600 mb-4 text-center">
          Rider ID: {currentRide.user_id}
        </Text>

        <View className="flex-row space-x-3">
          <CustomButton
            title="Reject"
            onPress={handleReject}
            bgVariant="danger"
            className="flex-1"
            disabled={loading}
          />
          <CustomButton
            title="Accept"
            onPress={handleAccept}
            bgVariant="success"
            className="flex-1"
            disabled={loading}
          />
        </View>
      </View>
    </ReactNativeModal>
  );
};

export default RideNotification;

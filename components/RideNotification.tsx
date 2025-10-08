import { useEffect, useRef, useState } from "react";
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
  user_name?: string;
}

interface RideNotificationProps {
  driverId: number;
  isOnline: boolean;
  onRideAccepted?: (rideId: number) => void;
  onRideRejected?: (rideId: number) => void;
}

const RideNotification = ({
  driverId,
  isOnline,
  onRideAccepted,
  onRideRejected,
}: RideNotificationProps) => {
  const [visible, setVisible] = useState(false);
  const [currentRide, setCurrentRide] = useState<RideRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const actualDriverId = driverId;

  // Check for new ride requests
  useEffect(() => {
    if (!isOnline || !actualDriverId) {
      return;
    }

    const checkForRideRequests = async () => {
      try {
        const response = await fetchAPI(
          `/(api)/driver/rides?driver_id=${actualDriverId}`
        );

        if (response.data && response.data.length > 0 && !visible) {
          const pendingRide = response.data[0];
          setCurrentRide(pendingRide);
          setVisible(true);

          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } catch (error) {
        console.error("Error checking ride requests:", error);
      }
    };

    checkForRideRequests();

    if (!visible && !intervalRef.current) {
      intervalRef.current = setInterval(
        checkForRideRequests,
        5000
      ) as unknown as number;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [actualDriverId, isOnline, visible]);

  const handleAccept = async () => {
    if (!currentRide) return;

    setLoading(true);
    try {
      const requestBody = {
        accepted: true,
        driver_id: actualDriverId,
      };

      const response = await fetchAPI(
        `/(api)/ride/${currentRide.ride_id}/accept`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }
      );

      if (response.data) {
        setVisible(false);
        setCurrentRide(null);
        onRideAccepted?.(currentRide.ride_id);
        Alert.alert("Success", "Ride accepted! Get ready for pickup.");
      } else {
        throw new Error(response.error || "Failed to accept ride");
      }
    } catch (error: any) {
      console.error("Error accepting ride:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to accept ride. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!currentRide) return;

    setLoading(true);
    try {
      const requestBody = {
        accepted: false,
        driver_id: actualDriverId,
      };

      const response = await fetchAPI(
        `/(api)/ride/${currentRide.ride_id}/accept`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }
      );

      if (response.data) {
        setVisible(false);
        setCurrentRide(null);
        onRideRejected?.(currentRide.ride_id);
      } else {
        throw new Error(response.error || "Failed to reject ride");
      }
    } catch (error: any) {
      console.error("Error rejecting ride:", error);
      Alert.alert("Error", error.message || "Failed to reject ride");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setVisible(false);
    setCurrentRide(null);
  };

  if (!currentRide) return null;

  return (
    <ReactNativeModal
      isVisible={visible}
      onBackdropPress={handleClose}
      backdropOpacity={0.7}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      avoidKeyboard={true}
    >
      <View className="bg-white rounded-2xl p-6 mx-4">
        <Text className="text-xl font-JakartaBold mb-4 text-center">
          New Ride Request! 🚗
        </Text>

        <View className="mb-4">
          <View className="flex-row items-start mb-3">
            <Text className="font-JakartaSemiBold text-lg mr-2">From:</Text>
            <Text className="text-gray-600 flex-1 text-base" numberOfLines={2}>
              {currentRide.origin_address}
            </Text>
          </View>

          <View className="flex-row items-start mb-3">
            <Text className="font-JakartaSemiBold text-lg mr-2">To:</Text>
            <Text className="text-gray-600 flex-1 text-base" numberOfLines={2}>
              {currentRide.destination_address}
            </Text>
          </View>
        </View>

        <View className="flex-row justify-between mb-4">
          <View className="flex-col">
            <Text className="font-JakartaSemiBold text-gray-700">Fare</Text>
            <Text className="text-green-600 font-JakartaBold text-lg">
              ${currentRide.fare_price}
            </Text>
          </View>

          <View className="flex-col">
            <Text className="font-JakartaSemiBold text-gray-700">Time</Text>
            <Text className="text-blue-600 font-JakartaBold text-lg">
              {currentRide.ride_time} min
            </Text>
          </View>
        </View>

        <Text className="text-gray-500 text-center mb-4 text-sm">
          Ride ID: #{currentRide.ride_id}
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

        {loading && (
          <Text className="text-center text-gray-500 mt-3 text-sm">
            Processing your response...
          </Text>
        )}
      </View>
    </ReactNativeModal>
  );
};

export default RideNotification;

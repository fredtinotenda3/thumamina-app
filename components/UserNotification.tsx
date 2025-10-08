import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { ReactNativeModal } from "react-native-modal";

import { fetchAPI } from "@/lib/fetch";
import CustomButton from "./CustomButton";

interface UserNotificationProps {
  rideId: number;
  userId: string;
  onPaymentNavigate: (rideId: number) => void;
  onSelectAnotherDriver: () => void;
  pollingInterval?: number;
  maxPolls?: number;
}

const UserNotification = ({
  rideId,
  userId,
  onPaymentNavigate,
  onSelectAnotherDriver,
  pollingInterval = 3000,
  maxPolls = 30,
}: UserNotificationProps) => {
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<
    "pending" | "accepted" | "rejected" | "timeout"
  >("pending");
  const [pollCount, setPollCount] = useState(0);
  const [driverName, setDriverName] = useState<string>("");

  useEffect(() => {
    if (rideId && userId) {
      setVisible(true);
      startPolling();
    }
  }, [rideId, userId]);

  const startPolling = () => {
    let currentPollCount = 0;

    const pollInterval = setInterval(async () => {
      try {
        currentPollCount++;
        setPollCount(currentPollCount);

        // FIXED: Use the correct endpoint with query parameter
        const response = await fetchAPI(`/(api)/ride/status?ride_id=${rideId}`);

        if (response.data) {
          const rideStatus = response.data.status;

          if (rideStatus === "accepted") {
            setStatus("accepted");
            // Try to get driver name from the response
            if (response.data.driver_name) {
              setDriverName(response.data.driver_name);
            } else if (response.data.driver_id) {
              // You could fetch driver details here if needed
              setDriverName("Your driver");
            }
            clearInterval(pollInterval);

            // Auto-navigate to payment after short delay
            setTimeout(() => {
              setVisible(false);
              onPaymentNavigate(rideId);
            }, 2000);
          } else if (rideStatus === "rejected") {
            setStatus("rejected");
            clearInterval(pollInterval);
          }
        }

        if (currentPollCount >= maxPolls) {
          setStatus("timeout");
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error("Error polling ride status:", error);

        if (currentPollCount > 10) {
          setStatus("timeout");
          clearInterval(pollInterval);
        }
      }
    }, pollingInterval);

    return () => {
      clearInterval(pollInterval);
    };
  };

  const getNotificationContent = () => {
    switch (status) {
      case "accepted":
        return {
          title: "Ride Accepted! 🎉",
          message: `${driverName} has accepted your ride request. Redirecting to payment...`,
          type: "success",
        };
      case "rejected":
        return {
          title: "Ride Not Available",
          message:
            "The driver was unable to accept your ride. Please choose another driver.",
          type: "error",
        };
      case "timeout":
        return {
          title: "Request Timeout",
          message: "No drivers responded in time. Please try another driver.",
          type: "error",
        };
      default:
        return {
          title: "Waiting for Driver",
          message: `We're finding a driver for you... (${pollCount}/${maxPolls})`,
          type: "info",
        };
    }
  };

  const handleClose = () => {
    setVisible(false);
    if (status === "rejected" || status === "timeout") {
      onSelectAnotherDriver();
    }
  };

  const handleSelectAnotherDriver = () => {
    setVisible(false);
    onSelectAnotherDriver();
  };

  const content = getNotificationContent();

  return (
    <ReactNativeModal
      isVisible={visible}
      onBackdropPress={handleClose}
      backdropOpacity={0.7}
      animationIn="slideInUp"
      animationOut="slideOutDown"
    >
      <View className="bg-white rounded-2xl p-6 mx-4">
        <Text
          className={`text-xl font-JakartaBold mb-4 text-center ${
            content.type === "success"
              ? "text-green-600"
              : content.type === "error"
                ? "text-red-600"
                : "text-blue-600"
          }`}
        >
          {content.title}
        </Text>

        <Text className="text-gray-600 text-center mb-6">
          {content.message}
        </Text>

        {(status === "rejected" || status === "timeout") && (
          <CustomButton
            title="Choose Another Driver"
            onPress={handleSelectAnotherDriver}
            bgVariant="primary"
          />
        )}

        {status === "pending" && (
          <View className="flex-row justify-center items-center">
            <View className="w-4 h-4 bg-blue-500 rounded-full animate-ping mr-2" />
            <Text className="text-blue-500 text-sm">Searching for drivers</Text>
          </View>
        )}
      </View>
    </ReactNativeModal>
  );
};

export default UserNotification;

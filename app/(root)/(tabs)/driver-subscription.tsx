// app/(tabs)/driver-subscription.tsx
import { useUser } from "@clerk/clerk-expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";

import CustomButton from "@/components/CustomButton";
import SubscriptionPlans from "@/components/SubscriptionPlans";
import { fetchAPI } from "@/lib/fetch";

const DriverSubscription = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const [driverId, setDriverId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkDriverAndSubscription();
  }, []);

  const checkDriverAndSubscription = async () => {
    try {
      // First, check if driver exists with current user's name
      if (user?.firstName && user?.lastName) {
        const driverCheck = await fetchAPI(
          `/(api)/driver/register?first_name=${encodeURIComponent(user.firstName)}&last_name=${encodeURIComponent(user.lastName)}`
        );

        if (driverCheck.exists && driverCheck.driver) {
          const driver = driverCheck.driver;
          setDriverId(driver.id);

          // Check subscription status
          const subscriptionStatus = await fetchAPI(
            `/(api)/subscription/status?driver_id=${driver.id}`
          );

          if (subscriptionStatus.hasActiveSubscription) {
            // Already has subscription, go to driver dashboard
            router.replace("/(root)/(tabs)/driver-registration");
            return;
          }
        } else {
          // Driver doesn't exist yet, go to registration first
          Alert.alert("Info", "Please complete driver registration first");
          router.replace("/(root)/(tabs)/driver-registration");
          return;
        }
      } else if (params.driver_id) {
        // Driver ID from params
        setDriverId(Number(params.driver_id));

        const subscriptionStatus = await fetchAPI(
          `/(api)/subscription/status?driver_id=${params.driver_id}`
        );

        if (subscriptionStatus.hasActiveSubscription) {
          router.replace("/(root)/(tabs)/driver-registration");
          return;
        }
      } else {
        Alert.alert("Error", "Driver information not found");
        router.back();
        return;
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscriptionComplete = () => {
    // Redirect to driver dashboard after subscription
    router.replace("/(root)/(tabs)/driver-registration");
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#0286FF" />
        <Text className="mt-2 text-gray-600">Loading...</Text>
      </View>
    );
  }

  if (!driverId) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <Text className="text-lg text-gray-600">Driver not found</Text>
        <CustomButton
          title="Go Back"
          onPress={() => router.back()}
          className="mt-4"
        />
      </View>
    );
  }

  return (
    <SubscriptionPlans
      driverId={driverId}
      onSubscriptionComplete={handleSubscriptionComplete}
    />
  );
};

export default DriverSubscription;

// components/SubscriptionPlans.tsx
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { fetchAPI } from "@/lib/fetch";
import CustomButton from "./CustomButton";
import InputField from "./InputField";

interface SubscriptionPlan {
  plan_id: number;
  name: string;
  amount: number;
  ride_count: number;
  description: string;
}

interface SubscriptionPlansProps {
  driverId: number;
  onSubscriptionComplete: () => void;
  showSkipOption?: boolean;
}

const SubscriptionPlans = ({
  driverId,
  onSubscriptionComplete,
  showSkipOption = false,
}: SubscriptionPlansProps) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(
    null
  );
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [ecoCashNumber, setEcoCashNumber] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const router = useRouter();

  const ECO_CASH_NUMBER = "0785391860";

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const response = await fetchAPI("/(api)/subscription/plans");
      if (response.data) {
        setPlans(response.data);
      }
    } catch (error) {
      console.error("Error loading plans:", error);
      // Fallback plans
      setPlans([
        {
          plan_id: 1,
          name: "Basic",
          amount: 5.0,
          ride_count: 12,
          description: "12 rides for $5",
        },
        {
          plan_id: 2,
          name: "Standard",
          amount: 10.0,
          ride_count: 25,
          description: "25 rides for $10",
        },
        {
          plan_id: 3,
          name: "Premium",
          amount: 20.0,
          ride_count: 55,
          description: "55 rides for $20",
        },
        {
          plan_id: 4,
          name: "Professional",
          amount: 50.0,
          ride_count: 150,
          description: "150 rides for $50",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const handlePurchase = async () => {
    if (!selectedPlan || !ecoCashNumber) {
      Alert.alert("Error", "Please enter your EcoCash number");
      return;
    }

    setPurchasing(true);
    try {
      const response = await fetchAPI("/(api)/subscription/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driver_id: driverId,
          plan_id: selectedPlan.plan_id,
          eco_cash_number: ecoCashNumber,
          payment_reference: paymentReference,
        }),
      });

      if (response.data) {
        Alert.alert("Success", "Subscription activated successfully!");
        setShowPaymentModal(false);
        onSubscriptionComplete();
      } else {
        throw new Error(response.error || "Purchase failed");
      }
    } catch (error: any) {
      console.error("Purchase error:", error);
      Alert.alert("Error", error.message || "Failed to activate subscription");
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#0286FF" />
        <Text className="mt-2 text-gray-600">Loading plans...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <Text className="text-2xl font-JakartaBold text-center my-6">
          Choose Your Subscription
        </Text>
        <Text className="text-gray-600 text-center mb-6">
          Subscribe to start receiving ride requests
        </Text>

        {plans.map((plan) => (
          <TouchableOpacity
            key={plan.plan_id}
            onPress={() => handlePlanSelect(plan)}
            className="bg-general-500 border-2 border-general-400 rounded-2xl p-5 mb-4 active:opacity-80"
          >
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-xl font-JakartaBold text-gray-800">
                {plan.name}
              </Text>
              <Text className="text-2xl font-JakartaBold text-green-600">
                ${plan.amount}
              </Text>
            </View>
            <Text className="text-lg font-JakartaSemiBold text-gray-700 mb-1">
              {plan.ride_count} rides
            </Text>
            <Text className="text-gray-600 text-sm">{plan.description}</Text>
          </TouchableOpacity>
        ))}

        {showSkipOption && (
          <CustomButton
            title="Skip for Now"
            onPress={onSubscriptionComplete}
            bgVariant="outline"
            className="mt-4"
          />
        )}
      </ScrollView>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View className="flex-1 bg-white p-6">
          <Text className="text-2xl font-JakartaBold text-center mb-6">
            Complete Payment
          </Text>

          {selectedPlan && (
            <View className="bg-general-500 rounded-xl p-4 mb-6">
              <Text className="text-lg font-JakartaBold text-center mb-2 text-gray-800">
                {selectedPlan.name} Plan
              </Text>
              <Text className="text-center text-gray-600 mb-2">
                {selectedPlan.ride_count} rides for ${selectedPlan.amount}
              </Text>
            </View>
          )}

          <Text className="text-lg font-JakartaSemiBold mb-4 text-gray-800">
            Payment Instructions:
          </Text>

          <View className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
            <Text className="font-JakartaSemiBold mb-2 text-gray-800">
              1. Send ${selectedPlan?.amount} to EcoCash:
            </Text>
            <Text className="text-xl font-JakartaBold text-center text-green-600 mb-4">
              {ECO_CASH_NUMBER}
            </Text>

            <Text className="font-JakartaSemiBold mb-2 text-gray-800">
              2. Enter your details below:
            </Text>
          </View>

          <InputField
            label="Your EcoCash Number"
            placeholder="0771234567"
            value={ecoCashNumber}
            onChangeText={setEcoCashNumber}
            keyboardType="phone-pad"
            className="mb-4"
          />

          <InputField
            label="Payment Reference (Optional)"
            placeholder="Enter reference from EcoCash"
            value={paymentReference}
            onChangeText={setPaymentReference}
            className="mb-6"
          />

          <View className="flex-row space-x-3 mt-6">
            <CustomButton
              title="Cancel"
              onPress={() => setShowPaymentModal(false)}
              bgVariant="outline"
              className="flex-1"
            />
            <CustomButton
              title={purchasing ? "Processing..." : "Confirm Payment"}
              onPress={handlePurchase}
              disabled={purchasing || !ecoCashNumber}
              className="flex-1"
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default SubscriptionPlans;

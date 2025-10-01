import { useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";

import { icons } from "@/constants";
import { fetchAPI } from "@/lib/fetch";
import CustomButton from "./CustomButton";

interface PaymentProps {
  fullName: string;
  email: string;
  amount: string;
  driverId: number;
  rideTime: number;
  rideId: number;
}

const Payment = ({
  fullName,
  email,
  amount,
  driverId,
  rideTime,
  rideId,
}: PaymentProps) => {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Validate all required props
  const isValidProps = rideId && driverId && amount && fullName && email;

  if (!isValidProps) {
    return (
      <View className="mt-10 p-4 bg-red-50 rounded-lg">
        <Text className="text-red-500 text-center font-JakartaSemiBold">
          Error: Missing payment information
        </Text>
        <Text className="text-red-400 text-center text-sm mt-1">
          Please try booking the ride again
        </Text>
      </View>
    );
  }

  const paymentMethods = [
    { id: "cash", name: "Cash", icon: icons.dollar },
    { id: "ecocash", name: "EcoCash", icon: icons.dollar },
    { id: "card", name: "Credit Card", icon: icons.dollar },
  ];

  const handlePayment = async () => {
    if (!selectedMethod) {
      Alert.alert("Error", "Please select a payment method");
      return;
    }

    setProcessing(true);

    try {
      // Update ride with payment method
      const paymentResponse = await fetchAPI(`/(api)/ride/${rideId}/payment`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_status: "confirmed",
          payment_method: selectedMethod,
        }),
      });

      if (!paymentResponse.data) {
        throw new Error("Failed to update payment status");
      }

      // Handle different payment methods
      let alertMessage = "";
      let alertTitle = "";

      switch (selectedMethod) {
        case "cash":
          alertTitle = "Ride Confirmed!";
          alertMessage =
            "Your ride has been confirmed. Please have cash ready for the driver.";
          break;
        case "ecocash":
          alertTitle = "EcoCash Payment";
          alertMessage =
            "EcoCash payment will be processed when you start your ride.";
          break;
        case "card":
          alertTitle = "Card Payment";
          alertMessage = "Card payment will be processed securely.";
          break;
        default:
          alertTitle = "Payment Confirmed";
          alertMessage = "Your payment has been confirmed.";
      }

      Alert.alert(alertTitle, alertMessage, [
        {
          text: "OK",
          onPress: () => {
            console.log("Payment confirmed for ride:", rideId);
            // Optionally navigate to ride tracking screen
          },
        },
      ]);

      // Notify driver about payment confirmation
      await fetchAPI(`/(api)/ride/${rideId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_confirmed: true,
          payment_method: selectedMethod,
        }),
      });
    } catch (error: any) {
      console.error("Payment error:", error);
      Alert.alert(
        "Payment Failed",
        error.message || "Failed to process payment. Please try again."
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View className="flex flex-col w-full mt-10">
      <Text className="text-xl font-JakartaSemiBold mb-5">
        Select Payment Method
      </Text>

      <View className="flex flex-col space-y-3 mb-8">
        {paymentMethods.map((method) => (
          <TouchableOpacity
            key={method.id}
            onPress={() => setSelectedMethod(method.id)}
            className={`flex flex-row items-center justify-between p-4 rounded-xl border-2 ${
              selectedMethod === method.id
                ? "border-general-400 bg-general-500"
                : "border-gray-200 bg-white"
            }`}
          >
            <View className="flex flex-row items-center">
              <Text className="text-lg font-JakartaMedium ml-3">
                {method.name}
              </Text>
            </View>

            <View
              className={`w-6 h-6 rounded-full border-2 ${
                selectedMethod === method.id
                  ? "bg-general-400 border-general-400"
                  : "border-gray-300"
              }`}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Payment Summary */}
      <View className="bg-general-500 rounded-lg p-4 mb-6">
        <Text className="font-JakartaSemiBold text-lg mb-2">
          Payment Summary
        </Text>
        <View className="flex-row justify-between">
          <Text className="text-gray-600">Ride Amount:</Text>
          <Text className="font-JakartaSemiBold">${amount}</Text>
        </View>
        <View className="flex-row justify-between mt-1">
          <Text className="text-gray-600">Payment Method:</Text>
          <Text className="font-JakartaSemiBold">
            {selectedMethod
              ? paymentMethods.find((m) => m.id === selectedMethod)?.name
              : "Not selected"}
          </Text>
        </View>
      </View>

      <CustomButton
        title={processing ? "Processing..." : "Confirm Payment"}
        onPress={handlePayment}
        disabled={processing || !selectedMethod}
      />
    </View>
  );
};

export default Payment;

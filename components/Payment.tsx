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
  onPaymentConfirmed?: (paymentMethod: string, amount: string) => void;
}

const Payment = ({
  fullName,
  email,
  amount,
  driverId,
  rideTime,
  rideId,
  onPaymentConfirmed,
}: PaymentProps) => {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

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
    {
      id: "cash",
      name: "Cash",
      icon: icons.dollar,
      description: "Pay with cash when you meet the driver",
    },
    {
      id: "ecocash",
      name: "EcoCash",
      icon: icons.dollar,
      description: "Mobile money payment via EcoCash",
    },
    {
      id: "card",
      name: "Credit Card",
      icon: icons.dollar,
      description: "Secure card payment processed via Stripe",
    },
  ];

  const handlePaymentConfirmation = async () => {
    if (!selectedMethod) {
      Alert.alert("Error", "Please select a payment method");
      return;
    }

    setProcessing(true);

    try {
      // SHORTENED FORMAT: "ECOCASH_83.71" instead of "ECOCASH_CONFIRMED_$83.71"
      const paymentStatusValue = `${selectedMethod.toUpperCase()}_${amount}`;

      console.log("💳 Processing payment confirmation:", {
        rideId,
        paymentMethod: selectedMethod,
        amount,
        paymentStatusValue,
      });

      // Update ride with payment method and amount in existing payment_status column
      const paymentResponse = await fetchAPI(`/(api)/ride/${rideId}/payment`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_status: paymentStatusValue,
          status: "confirmed",
        }),
      });

      if (!paymentResponse.data) {
        throw new Error(
          paymentResponse.error || "Failed to update payment status in database"
        );
      }

      console.log("✅ Payment recorded successfully:", paymentResponse.data);

      // Update local state
      setPaymentConfirmed(true);

      // Notify parent component about successful payment confirmation
      onPaymentConfirmed?.(selectedMethod, amount);

      // Show success confirmation with driver on the way message
      Alert.alert(
        "Payment Confirmed! 🎉",
        `Your ${selectedMethod} payment of $${amount} has been confirmed. Your driver is on the way and will arrive shortly.`,
        [
          {
            text: "Great!",
            onPress: () => {
              console.log("User acknowledged payment confirmation");
            },
          },
        ]
      );

      // Optional: Notify driver about payment confirmation
      try {
        // FIXED: Use the correct endpoint format
        await fetchAPI(`/(api)/ride/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ride_id: rideId,
            payment_confirmed: true,
            payment_method: selectedMethod,
          }),
        });
        console.log("✅ Driver notified about payment confirmation");
      } catch (notificationError) {
        console.warn(
          "⚠️ Could not notify driver, but payment was recorded:",
          notificationError
        );
      }
    } catch (error: any) {
      console.error("❌ Payment confirmation error:", error);

      let errorMessage = "Failed to confirm payment. Please try again.";

      if (error.message.includes("value too long")) {
        errorMessage = "Payment information too long. Please contact support.";
      } else if (error.message.includes("Ride not found")) {
        errorMessage = "Ride not found. Please start over.";
      } else if (error.message.includes("Invalid ride ID")) {
        errorMessage = "Invalid ride information. Please try booking again.";
      }

      Alert.alert("Payment Failed", errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  // If payment is already confirmed, show success state
  if (paymentConfirmed) {
    return (
      <View className="flex flex-col w-full mt-10 items-center justify-center">
        <View className="bg-green-50 border border-green-200 rounded-2xl p-6 w-full">
          <Text className="text-2xl font-JakartaBold text-green-600 text-center mb-3">
            Payment Confirmed! ✅
          </Text>
          <Text className="text-lg font-JakartaSemiBold text-center mb-2">
            {selectedMethod
              ? paymentMethods.find((m) => m.id === selectedMethod)?.name
              : "Payment"}{" "}
            of ${amount} Confirmed
          </Text>
          <Text className="text-green-700 text-center font-JakartaMedium">
            Your driver is on the way and will arrive shortly.
          </Text>
          <Text className="text-gray-600 text-center mt-3 text-sm">
            Ride ID: #{rideId}
          </Text>
        </View>

        <View className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 w-full">
          <Text className="text-blue-800 font-JakartaSemiBold text-center">
            What&apos;s Next?
          </Text>
          <Text className="text-blue-700 text-center mt-2 text-sm">
            • Driver is navigating to your location{"\n"}• Have your payment
            ready{"\n"}• You&apos;ll receive updates on driver&apos;s ETA
          </Text>
        </View>
      </View>
    );
  }

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
            <View className="flex flex-col flex-1">
              <View className="flex flex-row items-center">
                <Text className="text-lg font-JakartaMedium ml-3">
                  {method.name}
                </Text>
              </View>
              <Text className="text-gray-500 text-sm mt-1 ml-3">
                {method.description}
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
        <View className="flex-row justify-between mb-2">
          <Text className="text-gray-600">Ride Amount:</Text>
          <Text className="font-JakartaSemiBold text-green-600">${amount}</Text>
        </View>
        <View className="flex-row justify-between mb-2">
          <Text className="text-gray-600">Payment Method:</Text>
          <Text className="font-JakartaSemiBold">
            {selectedMethod
              ? paymentMethods.find((m) => m.id === selectedMethod)?.name
              : "Not selected"}
          </Text>
        </View>
        <View className="border-t border-gray-300 mt-2 pt-2">
          <Text className="text-gray-500 text-sm">
            This amount will be recorded with your selected payment method.
          </Text>
        </View>
      </View>

      <CustomButton
        title={
          processing
            ? "Confirming Payment..."
            : `Confirm ${selectedMethod ? paymentMethods.find((m) => m.id === selectedMethod)?.name : ""} Payment`
        }
        onPress={handlePaymentConfirmation}
        disabled={processing || !selectedMethod}
        bgVariant="success"
      />

      {processing && (
        <Text className="text-center text-gray-500 mt-3 text-sm">
          Securing your payment method and notifying driver...
        </Text>
      )}
    </View>
  );
};

export default Payment;

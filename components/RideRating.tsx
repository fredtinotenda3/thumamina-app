// components/RideRating.tsx
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { fetchAPI } from "@/lib/fetch";
import CustomButton from "./CustomButton";

interface RideRatingProps {
  rideId: number;
  driverId: number;
  userId: string;
  isVisible: boolean;
  onClose: () => void;
  onRatingSubmitted: () => void;
}

const RideRating = ({
  rideId,
  driverId,
  userId,
  isVisible,
  onClose,
  onRatingSubmitted,
}: RideRatingProps) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmitRating = async () => {
    if (rating === 0) {
      Alert.alert("Error", "Please select a rating");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetchAPI("/(api)/rating/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ride_id: rideId,
          driver_id: driverId,
          user_id: userId,
          rating,
          comment: comment || null,
        }),
      });

      if (response.data) {
        Alert.alert("Success", "Thank you for your rating!");
        onRatingSubmitted();
        resetForm();
      } else {
        throw new Error(response.error || "Failed to submit rating");
      }
    } catch (error: any) {
      console.error("Rating submission error:", error);
      Alert.alert("Error", error.message || "Failed to submit rating");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setRating(0);
    setComment("");
    onClose();
  };

  const StarRating = () => (
    <View className="flex-row justify-center my-6">
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => setRating(star)}
          className="mx-2"
        >
          <Text className="text-4xl">{star <= rating ? "⭐" : "☆"}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View className="flex-1 bg-white p-6">
        <Text className="text-2xl font-JakartaBold text-center mb-2">
          Rate Your Ride
        </Text>
        <Text className="text-gray-600 text-center mb-6">
          How was your experience with the driver?
        </Text>

        <StarRating />

        <Text className="text-lg font-JakartaSemiBold mb-3">
          Additional Comments (Optional)
        </Text>
        <TextInput
          value={comment}
          onChangeText={setComment}
          placeholder="Share your experience..."
          multiline
          numberOfLines={4}
          className="border border-gray-300 rounded-xl p-4 text-base"
          textAlignVertical="top"
        />

        <View className="flex-row space-x-3 mt-8">
          <CustomButton
            title="Skip"
            onPress={resetForm}
            bgVariant="outline"
            className="flex-1"
          />
          <CustomButton
            title={submitting ? "Submitting..." : "Submit Rating"}
            onPress={handleSubmitRating}
            disabled={submitting || rating === 0}
            className="flex-1"
          />
        </View>
      </View>
    </Modal>
  );
};

export default RideRating;

import { icons } from "@/constants";
import { GoogleInputProps } from "@/types/type";
import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Debounce hook
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const GoogleTextInput = ({
  icon,
  initialLocation,
  containerStyle,
  textInputBackgroundColor,
  handlePress,
}: GoogleInputProps) => {
  const [query, setQuery] = useState(initialLocation || "");
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 400);
  const sessionToken = useRef(Date.now().toString());

  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setPredictions([]);
      return;
    }

    setLoading(true);
    fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(debouncedQuery)}&key=${apiKey}&sessiontoken=${sessionToken.current}&types=geocode`
    )
      .then((response) => response.json())
      .then((data) => {
        setPredictions(data.predictions || []);
      })
      .catch((error) => {
        console.error("Autocomplete error:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [debouncedQuery, apiKey]);

  const selectPlace = async (placeId: string, description: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${apiKey}&fields=geometry,formatted_address`
      );
      const data = await response.json();

      if (data.result?.geometry?.location) {
        handlePress({
          latitude: data.result.geometry.location.lat,
          longitude: data.result.geometry.location.lng,
          address: data.result.formatted_address || description,
        });
      }
      setQuery(data.result.formatted_address || description);
      setPredictions([]);
    } catch (error) {
      console.error("Place details error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className={`relative z-50 ${containerStyle}`}>
      <View
        className="flex-row items-center rounded-xl mx-5 px-4"
        style={{
          backgroundColor: textInputBackgroundColor || "white",
          height: 50,
        }}
      >
        <Image
          source={icon || icons.search}
          className="w-6 h-6 mr-3"
          resizeMode="contain"
        />
        <TextInput
          className="flex-1 text-base font-semibold"
          placeholder="Where do you want to go?"
          placeholderTextColor="gray"
          value={query}
          onChangeText={setQuery}
        />
        {loading && <Text className="ml-2">...</Text>}
      </View>

      {predictions.length > 0 && (
        <ScrollView className="absolute top-12 left-5 right-5 bg-white rounded-lg max-h-40 border border-gray-200">
          {predictions.map((prediction) => (
            <TouchableOpacity
              key={prediction.place_id}
              className="p-3 border-b border-gray-100"
              onPress={() =>
                selectPlace(prediction.place_id, prediction.description)
              }
            >
              <Text className="text-base">{prediction.description}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

export default GoogleTextInput;

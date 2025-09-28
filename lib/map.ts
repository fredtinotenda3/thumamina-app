import { Driver, MarkerData } from "@/types/type";

const directionsAPI = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;

// Helper function to validate coordinates - handle both numbers and strings
const isValidCoordinate = (
  coord: number | string | null | undefined
): boolean => {
  if (typeof coord === "number") {
    return !isNaN(coord) && coord !== 0;
  }
  if (typeof coord === "string") {
    const num = parseFloat(coord);
    return !isNaN(num) && num !== 0;
  }
  return false;
};

// Helper to convert coordinate to number
const coordToNumber = (
  coord: number | string | null | undefined
): number | null => {
  if (typeof coord === "number") return coord;
  if (typeof coord === "string") {
    const num = parseFloat(coord);
    return !isNaN(num) ? num : null;
  }
  return null;
};

export const generateMarkersFromData = ({
  data,
  userLatitude,
  userLongitude,
}: {
  data: Driver[];
  userLatitude: number;
  userLongitude: number;
}): MarkerData[] => {
  if (!Array.isArray(data)) {
    console.log("generateMarkersFromData: data is not an array");
    return [];
  }

  console.log(`Processing ${data.length} drivers for markers`);

  const validMarkers = data
    .filter((driver) => {
      const hasCoords =
        isValidCoordinate(driver.latitude) &&
        isValidCoordinate(driver.longitude);
      const isOnline = driver.is_online !== false; // Default to true if undefined

      console.log(
        `Driver ${driver.id}: hasCoords=${hasCoords}, isOnline=${isOnline}, lat=${driver.latitude}, lng=${driver.longitude}`
      );

      return hasCoords && isOnline;
    })
    .map((driver) => {
      // Convert string coordinates to numbers
      const lat = coordToNumber(driver.latitude);
      const lng = coordToNumber(driver.longitude);

      if (!lat || !lng) {
        console.log(
          `Driver ${driver.id} has invalid coordinates after conversion`
        );
        return null;
      }

      const marker: MarkerData = {
        latitude: lat,
        longitude: lng,
        id: driver.id,
        title: `${driver.first_name} ${driver.last_name}`,
        profile_image_url: driver.profile_image_url,
        car_image_url: driver.car_image_url,
        car_seats: driver.car_seats,
        rating: driver.rating,
        first_name: driver.first_name,
        last_name: driver.last_name,
      };

      console.log(`Driver ${driver.id} marker created:`, {
        lat: marker.latitude,
        lng: marker.longitude,
        type: {
          latType: typeof marker.latitude,
          lngType: typeof marker.longitude,
        },
      });

      return marker;
    })
    .filter((marker): marker is MarkerData => marker !== null);

  console.log(
    `Generated ${validMarkers.length} valid markers from ${data.length} drivers`
  );

  return validMarkers;
};

export const calculateRegion = ({
  userLatitude,
  userLongitude,
  destinationLatitude,
  destinationLongitude,
}: {
  userLatitude: number | null;
  userLongitude: number | null;
  destinationLatitude?: number | null;
  destinationLongitude?: number | null;
}) => {
  const userLat = coordToNumber(userLatitude);
  const userLng = coordToNumber(userLongitude);
  const destLat = coordToNumber(destinationLatitude);
  const destLng = coordToNumber(destinationLongitude);

  if (!isValidCoordinate(userLat) || !isValidCoordinate(userLng)) {
    console.log("Using default region - invalid user coordinates");
    return {
      latitude: 37.78825,
      longitude: -122.4324,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    };
  }

  // If we have a destination, center map between user and destination
  if (isValidCoordinate(destLat) && isValidCoordinate(destLng)) {
    const minLat = Math.min(userLat!, destLat!);
    const maxLat = Math.max(userLat!, destLat!);
    const minLng = Math.min(userLng!, destLng!);
    const maxLng = Math.max(userLng!, destLng!);

    const latitudeDelta = (maxLat - minLat) * 1.5;
    const longitudeDelta = (maxLng - minLng) * 1.5;

    const latitude = (userLat! + destLat!) / 2;
    const longitude = (userLng! + destLng!) / 2;

    return {
      latitude,
      longitude,
      latitudeDelta: Math.max(latitudeDelta, 0.01),
      longitudeDelta: Math.max(longitudeDelta, 0.01),
    };
  }

  // Otherwise, just center on user with default zoom
  return {
    latitude: userLat!,
    longitude: userLng!,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };
};

export const calculateDriverTimes = async ({
  markers,
  userLatitude,
  userLongitude,
  destinationLatitude,
  destinationLongitude,
}: {
  markers: MarkerData[];
  userLatitude: number | null;
  userLongitude: number | null;
  destinationLatitude: number | null;
  destinationLongitude: number | null;
}) => {
  const userLat = coordToNumber(userLatitude);
  const userLng = coordToNumber(userLongitude);
  const destLat = coordToNumber(destinationLatitude);
  const destLng = coordToNumber(destinationLongitude);

  if (
    !isValidCoordinate(userLat) ||
    !isValidCoordinate(userLng) ||
    !isValidCoordinate(destLat) ||
    !isValidCoordinate(destLng) ||
    markers.length === 0
  ) {
    console.log(
      "Skipping driver time calculation - missing coordinates or no markers"
    );
    return markers.map((marker) => ({
      ...marker,
      time: 10,
      price: "5.00",
    }));
  }

  try {
    console.log(`Calculating times for ${markers.length} drivers`);

    const timesPromises = markers.map(async (marker) => {
      try {
        // Calculate time from driver to user
        const responseToUser = await fetch(
          `https://maps.googleapis.com/maps/api/directions/json?origin=${marker.latitude},${marker.longitude}&destination=${userLat},${userLng}&key=${directionsAPI}`
        );
        const dataToUser = await responseToUser.json();

        let timeToUser = 600;
        if (dataToUser.routes && dataToUser.routes.length > 0) {
          timeToUser = dataToUser.routes[0].legs[0]?.duration?.value || 600;
        }

        // Calculate time from user to destination
        const responseToDestination = await fetch(
          `https://maps.googleapis.com/maps/api/directions/json?origin=${userLat},${userLng}&destination=${destLat},${destLng}&key=${directionsAPI}`
        );
        const dataToDestination = await responseToDestination.json();

        let timeToDestination = 600;
        if (dataToDestination.routes && dataToDestination.routes.length > 0) {
          timeToDestination =
            dataToDestination.routes[0].legs[0]?.duration?.value || 600;
        }

        const totalTime = (timeToUser + timeToDestination) / 60;
        const price = (totalTime * 0.5).toFixed(2);

        return { ...marker, time: totalTime, price };
      } catch (error) {
        console.error(`Error calculating time for driver ${marker.id}:`, error);
        return { ...marker, time: 15, price: "7.50" };
      }
    });

    return await Promise.all(timesPromises);
  } catch (error) {
    console.error("Error calculating driver times:", error);
    return markers.map((marker) => ({
      ...marker,
      time: 15,
      price: "7.50",
    }));
  }
};

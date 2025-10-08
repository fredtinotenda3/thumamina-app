import { TextInputProps, TouchableOpacityProps } from "react-native";

declare interface Driver {
  id: number;
  first_name: string;
  last_name: string;
  profile_image_url: string;
  car_image_url: string;
  car_seats: number;
  rating: number;
  // Accept number | string | null because DB/transport may vary; we coerce later
  latitude: number | string | null;
  longitude: number | string | null;
  is_online?: boolean;
}

declare interface MarkerData {
  latitude: number;
  longitude: number;
  id: number;
  title: string;
  profile_image_url: string;
  car_image_url: string;
  car_seats: number;
  rating: number;
  first_name: string;
  last_name: string;
  time?: number;
  price?: string;
}

declare interface MapProps {
  destinationLatitude?: number;
  destinationLongitude?: number;
  onDriverTimesCalculated?: (driversWithTimes: MarkerData[]) => void;
  selectedDriver?: number | null;
  onMapReady?: () => void;
}

declare interface Ride {
  origin_address: string;
  destination_address: string;
  origin_latitude: number;
  origin_longitude: number;
  destination_latitude: number;
  destination_longitude: number;
  ride_time: number;
  fare_price: number;
  payment_status: string;
  driver_id: number;
  user_id: string;
  created_at: string;
  driver: {
    first_name: string;
    last_name: string;
    car_seats: number;
  };
}

declare interface RideRequest {
  ride_id: number;
  origin_address: string;
  destination_address: string;
  fare_price: number;
  ride_time: number;
  user_id: string;
  status: "requested" | "accepted" | "rejected" | "in_progress" | "completed";
}

declare interface ButtonProps extends TouchableOpacityProps {
  title: string;
  bgVariant?: "primary" | "secondary" | "danger" | "outline" | "success";
  textVariant?: "primary" | "default" | "secondary" | "danger" | "success";
  IconLeft?: React.ComponentType<any>;
  IconRight?: React.ComponentType<any>;
  className?: string;
}

declare interface GoogleInputProps {
  icon?: string;
  initialLocation?: string;
  containerStyle?: string;
  textInputBackgroundColor?: string;
  handlePress: ({
    latitude,
    longitude,
    address,
  }: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;
}

declare interface InputFieldProps extends TextInputProps {
  label: string;
  icon?: any;
  secureTextEntry?: boolean;
  labelStyle?: string;
  containerStyle?: string;
  inputStyle?: string;
  iconStyle?: string;
  className?: string;
}

declare interface PaymentProps {
  fullName: string;
  email: string;
  amount: string;
  driverId: number;
  rideTime: number;
  rideId: number;
}

declare interface LocationStore {
  userLatitude: number | null;
  userLongitude: number | null;
  userAddress: string | null;
  destinationLatitude: number | null;
  destinationLongitude: number | null;
  destinationAddress: string | null;
  setUserLocation: (args: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;
  setDestinationLocation: (args: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;
}

declare interface DriverStore {
  drivers: MarkerData[];
  selectedDriver: number | null;
  setSelectedDriver: (driverId: number) => void;
  setDrivers: (drivers: MarkerData[]) => void;
  clearSelectedDriver: () => void;
}

declare interface DriverCardProps {
  item: MarkerData;
  selected: number;
  setSelected: () => void;
}

// Add to your existing types...

declare interface RideRequestData {
  origin_address: string;
  destination_address: string;
  origin_latitude: number | null;
  origin_longitude: number | null;
  destination_latitude: number | null;
  destination_longitude: number | null;
  ride_time: number;
  fare_price: number;
  driver_id: number;
  user_id: string;
}

declare interface PaymentData {
  payment_status: string;
  payment_method?: string;
  payment_intent_id?: string;
}

declare interface RideStatus {
  ride_id: number;
  status: string;
  payment_status: string;
}

declare interface PaymentDetails {
  method: "cash" | "ecocash" | "card" | "unknown";
  amount: string;
  status: "confirmed" | "pending" | "failed";
  rawStatus: string;
}

declare interface PaymentProps {
  fullName: string;
  email: string;
  amount: string;
  driverId: number;
  rideTime: number;
  rideId: number;
  onPaymentConfirmed?: (paymentMethod: string, amount: string) => void;
}

declare interface RideNotificationProps {
  driverId: number;
  isOnline: boolean;
  onRideAccepted?: (rideId: number) => void;
  onRideRejected?: (rideId: number) => void;
}

declare interface UserNotificationProps {
  rideId: number;
  userId: string;
  onPaymentNavigate: (rideId: number) => void;
  onSelectAnotherDriver: () => void;
  pollingInterval?: number;
  maxPolls?: number;
}

export type {
  ButtonProps,
  Driver,
  DriverCardProps,
  DriverStore,
  GoogleInputProps,
  InputFieldProps,
  LocationStore,
  MapProps,
  MarkerData,
  PaymentData,
  PaymentProps,
  Ride,
  RideNotificationProps,
  RideRequest,
  RideRequestData,
  RideStatus,
  UserNotificationProps,
};

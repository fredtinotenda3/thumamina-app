export interface PaymentDetails {
  method: "cash" | "ecocash" | "card" | "unknown";
  amount: string;
  status: "confirmed" | "pending" | "failed";
  rawStatus: string;
}

export const parsePaymentStatus = (
  paymentStatus: string | null
): PaymentDetails => {
  if (!paymentStatus) {
    return {
      method: "unknown",
      amount: "0.00",
      status: "pending",
      rawStatus: paymentStatus || "null",
    };
  }

  // Parse formats like: "CASH_CONFIRMED_$15.00"
  const methodMatch = paymentStatus.match(/^(CASH|ECOCASH|CARD)/i);
  const statusMatch = paymentStatus.match(/_(CONFIRMED|PENDING|FAILED)_/i);
  const amountMatch = paymentStatus.match(/\$([0-9]+\.?[0-9]*)/);

  const method = methodMatch
    ? (methodMatch[1].toLowerCase() as "cash" | "ecocash" | "card")
    : "unknown";
  const status = statusMatch
    ? (statusMatch[1].toLowerCase() as "confirmed" | "pending" | "failed")
    : "pending";
  const amount = amountMatch ? amountMatch[1] : "0.00";

  return {
    method,
    amount,
    status,
    rawStatus: paymentStatus,
  };
};

export const formatPaymentStatus = (method: string, amount: string): string => {
  return `${method.toUpperCase()}_CONFIRMED_$${amount}`;
};

// Example usage:
// const paymentDetails = parsePaymentStatus("CASH_CONFIRMED_$15.00");
// console.log(paymentDetails);
// { method: 'cash', amount: '15.00', status: 'confirmed', rawStatus: 'CASH_CONFIRMED_$15.00' }

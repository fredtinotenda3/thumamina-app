import { useCallback, useEffect, useState } from "react";

export const fetchAPI = async (url: string, options?: RequestInit) => {
  try {
    console.log(`🌐 API Call: ${url}`, options?.method || "GET");

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(`⏰ Request timeout for: ${url}`);
      controller.abort();
    }, 15000); // 15 second timeout

    const fetchOptions: RequestInit = {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    };

    const response = await fetch(url, fetchOptions);

    // Clear timeout since we got a response
    clearTimeout(timeoutId);

    if (!response.ok) {
      // Try to get detailed error message from response
      let errorMessage = `HTTP error! status: ${response.status}`;
      let errorDetails = "";

      try {
        const errorData = await response.json();
        errorDetails = errorData.error || errorData.message || "";
        if (errorDetails) {
          errorMessage += ` - ${errorDetails}`;
        }
      } catch (parseError) {
        // If we can't parse JSON, use the status text
        errorMessage += ` - ${response.statusText}`;
      }

      console.error(`❌ API Error [${url}]: ${errorMessage}`);

      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).details = errorDetails;
      throw error;
    }

    const data = await response.json();
    console.log(`✅ API Success [${url}]:`, data);
    return data;
  } catch (error: any) {
    console.error(`💥 Fetch error [${url}]:`, error);

    // Handle specific error types
    if (error.name === "AbortError") {
      const timeoutError = new Error(
        "Request timeout - please check your connection and try again."
      );
      (timeoutError as any).isTimeout = true;
      throw timeoutError;
    }

    if (
      error.name === "TypeError" &&
      error.message.includes("Network request failed")
    ) {
      const networkError = new Error(
        "Network error - please check your internet connection."
      );
      (networkError as any).isNetworkError = true;
      throw networkError;
    }

    throw error;
  }
};

export const useFetch = <T>(url: string, options?: RequestInit) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    // Don't fetch if no URL provided
    if (!url) {
      setError("No URL provided");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchAPI(url, options);

      // Handle both response formats for backward compatibility
      const responseData = result.data !== undefined ? result.data : result;

      setData(responseData);
    } catch (err: any) {
      // Set user-friendly error messages
      let errorMessage = err.message || "An unexpected error occurred";

      if (err.isTimeout) {
        errorMessage = "Request timed out. Please try again.";
      } else if (err.isNetworkError) {
        errorMessage = "Network error. Please check your internet connection.";
      } else if (err.status === 404) {
        errorMessage = "Resource not found.";
      } else if (err.status === 500) {
        errorMessage = "Server error. Please try again later.";
      }

      setError(errorMessage);
      setData(null);

      // Log the original error for debugging
      console.error("Fetch error details:", {
        url,
        error: err.message,
        status: err.status,
        details: err.details,
      });
    } finally {
      setLoading(false);
    }
  }, [url, options]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};

// Enhanced version with retry logic
export const fetchWithRetry = async (
  url: string,
  options?: RequestInit,
  maxRetries: number = 3,
  retryDelay: number = 1000
) => {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${maxRetries} for: ${url}`);
      return await fetchAPI(url, options);
    } catch (error: any) {
      lastError = error;

      // Don't retry on certain errors
      if (error.status && error.status >= 400 && error.status < 500) {
        break; // Client errors shouldn't be retried
      }

      if (attempt < maxRetries) {
        console.log(`⏳ Retrying in ${retryDelay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        retryDelay *= 2; // Exponential backoff
      }
    }
  }

  throw lastError!;
};

// Hook for manual fetching (without automatic fetch on mount)
export const useManualFetch = <T>() => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (url: string, options?: RequestInit) => {
    if (!url) {
      setError("No URL provided");
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchAPI(url, options);
      const responseData = result.data !== undefined ? result.data : result;
      setData(responseData);
      return responseData;
    } catch (err: any) {
      let errorMessage = err.message || "An unexpected error occurred";

      if (err.isTimeout) {
        errorMessage = "Request timed out. Please try again.";
      } else if (err.isNetworkError) {
        errorMessage = "Network error. Please check your internet connection.";
      }

      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, execute, reset };
};

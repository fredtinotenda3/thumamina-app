import { useCallback, useEffect, useState } from "react";

export const fetchAPI = async (url: string, options?: RequestInit) => {
  try {
    console.log(`🌐 API Call: ${url}`, options?.method || "GET");

    const response = await fetch(url, options);
    if (!response.ok) {
      console.error(
        `❌ API Error [${url}]: ${response.status} ${response.statusText}`
      );
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ API Success [${url}]:`, data);
    return data;
  } catch (error) {
    console.error(`💥 Fetch error [${url}]:`, error);
    throw error;
  }
};

export const useFetch = <T>(url: string, options?: RequestInit) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchAPI(url, options);

      // Handle both response formats for backward compatibility
      const responseData = result.data !== undefined ? result.data : result;

      setData(responseData);
    } catch (err) {
      setError((err as Error).message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [url, options]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};

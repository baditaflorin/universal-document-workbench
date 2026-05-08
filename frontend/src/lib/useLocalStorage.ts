import { useEffect, useState } from "react";

export function useLocalStorage(
  key: string,
  fallback: string,
): [string, (value: string) => void] {
  const [value, setValue] = useState(
    () => window.localStorage.getItem(key) ?? fallback,
  );

  useEffect(() => {
    window.localStorage.setItem(key, value);
  }, [key, value]);

  return [value, setValue];
}

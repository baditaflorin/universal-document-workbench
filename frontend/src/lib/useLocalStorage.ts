import { useEffect, useState } from "react";
import type { ZodType } from "zod";

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

export function useLocalStorageJson<T>(
  key: string,
  fallback: T,
  schema: ZodType<T>,
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    const stored = window.localStorage.getItem(key);
    if (!stored) {
      return fallback;
    }

    try {
      return schema.parse(JSON.parse(stored));
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

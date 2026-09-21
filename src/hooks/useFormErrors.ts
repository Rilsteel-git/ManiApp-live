import { useCallback, useState } from 'react';

export function useFormErrors() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const clearError = useCallback((...fields: string[]) => {
    setErrors((current) => {
      if (!fields.some((field) => field in current)) return current;
      const next = { ...current };
      fields.forEach((field) => delete next[field]);
      return next;
    });
  }, []);
  return { errors, setErrors, clearError };
}

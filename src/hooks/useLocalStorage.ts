import { useState, useEffect, useCallback } from 'react';
import type { HandpanRecord } from '@/types/record';
import { migrateRecord } from '@/utils/storage';

const safeParseJSON = (data: string | null): any => {
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch (error) {
    console.error('JSON parse error:', error);
    return null;
  }
};

const safeMigrateRecords = (rawData: any, initialValue: any): HandpanRecord[] => {
  if (!Array.isArray(rawData)) {
    console.warn('Invalid data format, using initial value');
    return initialValue;
  }

  const validRecords: HandpanRecord[] = [];
  
  for (let i = 0; i < rawData.length; i++) {
    try {
      const raw = rawData[i];
      const migrated = migrateRecord(raw);
      if (migrated && migrated.id) {
        validRecords.push(migrated);
      } else {
        console.warn(`Skipping invalid record at index ${i}:`, raw);
      }
    } catch (error) {
      console.error(`Error migrating record at index ${i}:`, error);
    }
  }

  if (validRecords.length !== rawData.length) {
    console.warn(`Migrated ${validRecords.length}/${rawData.length} records successfully`);
  }

  return validRecords.length > 0 ? validRecords : initialValue;
};

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (!item) {
        return initialValue;
      }

      const parsed = safeParseJSON(item);
      
      if (key === 'handpan_records' && Array.isArray(initialValue) && initialValue.length > 0 && 'id' in initialValue[0]) {
        return safeMigrateRecords(parsed, initialValue) as unknown as T;
      }

      return parsed !== null ? parsed : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      setStoredValue(prev => {
        const valueToStore = value instanceof Function ? value(prev) : value;
        
        try {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
          console.error(`Error setting localStorage key "${key}":`, error);
        }
        
        return valueToStore;
      });
    } catch (error) {
      console.error(`Error in setValue for key "${key}":`, error);
    }
  }, [key]);

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}

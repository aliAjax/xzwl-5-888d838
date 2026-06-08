import { useState, useEffect, useCallback, useRef } from 'react';
import type { HandpanRecord } from '@/types/record';
import { migrateRecord } from '@/utils/storage';
import { dataStore, type DataChangeEvent } from '@/utils/dataStore';
import { STORAGE_KEYS, type StorageKey } from '@/utils/storageKeys';

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

const isKnownStorageKey = (key: string): key is StorageKey => {
  return Object.values(STORAGE_KEYS).includes(key as StorageKey);
};

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const isWritingRef = useRef(false);

  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (!item) {
        return initialValue;
      }

      const parsed = safeParseJSON(item);
      
      if (key === STORAGE_KEYS.RECORDS && Array.isArray(initialValue) && initialValue.length > 0 && 'id' in initialValue[0]) {
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
        
        if (isKnownStorageKey(key)) {
          isWritingRef.current = true;
          try {
            dataStore.writeItem(key as StorageKey, valueToStore);
          } finally {
            setTimeout(() => {
              isWritingRef.current = false;
            }, 0);
          }
        } else {
          try {
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
          } catch (error) {
            console.error(`Error setting localStorage key "${key}":`, error);
          }
        }
        
        return valueToStore;
      });
    } catch (error) {
      console.error(`Error in setValue for key "${key}":`, error);
    }
  }, [key]);

  useEffect(() => {
    if (!isKnownStorageKey(key)) return;

    const storageKey = key as StorageKey;

    const handleDataChange = (event: DataChangeEvent) => {
      if (isWritingRef.current) return;
      
      if (event.keys.includes(storageKey)) {
        try {
          const item = window.localStorage.getItem(key);
          if (!item) {
            setStoredValue(initialValue);
            return;
          }

          const parsed = safeParseJSON(item);
          
          if (key === STORAGE_KEYS.RECORDS && Array.isArray(initialValue) && initialValue.length > 0 && 'id' in initialValue[0]) {
            setStoredValue(safeMigrateRecords(parsed, initialValue) as unknown as T);
          } else {
            setStoredValue(parsed !== null ? parsed : initialValue);
          }
        } catch (error) {
          console.error(`Error syncing localStorage key "${key}":`, error);
        }
      }
    };

    const unsubscribe = dataStore.subscribe(handleDataChange);
    return unsubscribe;
  }, [key, initialValue]);

  useEffect(() => {
    if (!isKnownStorageKey(key)) {
      try {
        window.localStorage.setItem(key, JSON.stringify(storedValue));
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}
